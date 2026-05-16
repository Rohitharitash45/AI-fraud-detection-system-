from dotenv import load_dotenv
load_dotenv()

import os
import re
import uuid
import socket
import logging
import tempfile
import warnings

warnings.filterwarnings("ignore")

from datetime import datetime, timezone

from flask import (
    Flask,
    request,
    jsonify,
    render_template,
    make_response
)

from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity
)

from werkzeug.security import (
    generate_password_hash,
    check_password_hash
)

from config.db import (
    scans_collection,
    blacklist_collection,
    stats_collection,
    users_collection
)

from modules.url_detector import analyze_url
from modules.sms_detector import analyze_sms_text
from modules.number_checker import check_phone_number
from modules.ocr_detector import analyze_image

# ─────────────────────────────────────────────────────────────
# App Setup
# ─────────────────────────────────────────────────────────────

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app = Flask(__name__)

# ─────────────────────────────────────────────────────────────
# CORS
# ─────────────────────────────────────────────────────────────

@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        response = make_response()

        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"

        return response, 200


CORS(
    app,
    resources={r"/*": {"origins": "*"}},
    supports_credentials=True
)

socket.setdefaulttimeout(3)

# ─────────────────────────────────────────────────────────────
# JWT Config
# ─────────────────────────────────────────────────────────────

app.config["JWT_SECRET_KEY"] = os.getenv(
    "JWT_SECRET_KEY",
    "change-this-in-production"
)

app.config["JWT_ACCESS_TOKEN_EXPIRES"] = 3600
app.config["JWT_REFRESH_TOKEN_EXPIRES"] = 2592000

jwt = JWTManager(app)

# ─────────────────────────────────────────────────────────────
# Logging
# ─────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────
# Rate Limiting
# ─────────────────────────────────────────────────────────────

limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["60 per hour"],
    storage_uri="memory://"
)

# ─────────────────────────────────────────────────────────────
# Lazy Voice Model
# ─────────────────────────────────────────────────────────────

_voice_model = None

def get_voice_model():
    global _voice_model

    if _voice_model is None:
        logger.info("Loading VoiceDetector model...")

        from modules.voice_detector import VoiceDetector

        _voice_model = VoiceDetector()

        logger.info("VoiceDetector loaded successfully")

    return _voice_model

# ─────────────────────────────────────────────────────────────
# Stats Helpers
# ─────────────────────────────────────────────────────────────

def increment_stat(field: str):
    stats_collection.update_one(
        {"_id": "global"},
        {"$inc": {field: 1}},
        upsert=True
    )

def get_stats():
    doc = stats_collection.find_one({"_id": "global"}) or {}

    return {
        "total_scans": doc.get("total_scans", 0),
        "scams_detected": doc.get("scams_detected", 0),
        "community_reports": doc.get("community_reports", 0)
    }

# ─────────────────────────────────────────────────────────────
# Blacklist
# ─────────────────────────────────────────────────────────────

def is_blacklisted(url):
    return blacklist_collection.find_one(
        {"url": url.lower()}
    ) is not None

def add_to_blacklist(url):
    blacklist_collection.update_one(
        {"url": url.lower()},
        {
            "$set": {
                "url": url.lower(),
                "added_at": datetime.now(timezone.utc)
            }
        },
        upsert=True
    )

# ─────────────────────────────────────────────────────────────
# Error Handler
# ─────────────────────────────────────────────────────────────

@app.errorhandler(Exception)
def handle_global_error(e):
    logger.error(f"Unhandled Exception: {str(e)}")

    return jsonify({
        "status": "ERROR",
        "message": "Something went wrong"
    }), 500

# ─────────────────────────────────────────────────────────────
# Security Headers
# ─────────────────────────────────────────────────────────────

@app.after_request
def apply_security_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response

# ─────────────────────────────────────────────────────────────
# Home
# ─────────────────────────────────────────────────────────────

@app.route("/")
def home():
    return jsonify({
        "message": "PhishGuard AI Backend Running Successfully"
    })

# ─────────────────────────────────────────────────────────────
# Register
# ─────────────────────────────────────────────────────────────

@app.route("/auth/register", methods=["POST"])
@limiter.limit("10 per hour")
def register():

    data = request.get_json()

    if not data:
        return jsonify({"error": "No data provided"}), 400

    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    name = data.get("name", "").strip()

    if not email or not password or not name:
        return jsonify({
            "error": "Name, email and password required"
        }), 400

    if users_collection.find_one({"email": email}):
        return jsonify({
            "error": "Email already exists"
        }), 409

    hashed_pw = generate_password_hash(password)

    user = {
        "name": name,
        "email": email,
        "password": hashed_pw,
        "role": "user",
        "created_at": datetime.now(timezone.utc)
    }

    result = users_collection.insert_one(user)

    user_id = str(result.inserted_id)

    access_token = create_access_token(identity=user_id)
    refresh_token = create_refresh_token(identity=user_id)

    return jsonify({
        "message": "Registration successful",
        "access_token": access_token,
        "refresh_token": refresh_token
    }), 201

# ─────────────────────────────────────────────────────────────
# Login
# ─────────────────────────────────────────────────────────────

@app.route("/auth/login", methods=["POST"])
@limiter.limit("20 per hour")
def login():

    data = request.get_json()

    if not data:
        return jsonify({"error": "No data provided"}), 400

    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    user = users_collection.find_one({"email": email})

    if not user or not check_password_hash(
        user["password"],
        password
    ):
        return jsonify({
            "error": "Invalid email or password"
        }), 401

    user_id = str(user["_id"])

    access_token = create_access_token(identity=user_id)
    refresh_token = create_refresh_token(identity=user_id)

    return jsonify({
        "message": "Login successful",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": {
            "id": user_id,
            "name": user.get("name"),
            "email": user.get("email")
        }
    })

# ─────────────────────────────────────────────────────────────
# Detect URL
# ─────────────────────────────────────────────────────────────

@app.route("/detect", methods=["POST"])
@limiter.limit("20 per minute")
@jwt_required(optional=True)
def detect():

    data = request.get_json()

    if not data or "url" not in data:
        return jsonify({"error": "No URL provided"}), 400

    url = data.get("url", "").strip()

    if not re.match(r'https?://', url):
        url = "https://" + url

    increment_stat("total_scans")

    if is_blacklisted(url):

        increment_stat("scams_detected")

        return jsonify({
            "status": "SCAM",
            "score": 100,
            "reasons": ["Community Blacklisted"]
        })

    result = analyze_url(url)

    if result.get("status") == "SCAM":
        increment_stat("scams_detected")

    scans_collection.insert_one({
        "type": "url",
        "content": url,
        "result": result,
        "timestamp": datetime.now(timezone.utc),
        "user_id": get_jwt_identity()
    })

    return jsonify(result)

# ─────────────────────────────────────────────────────────────
# SMS Detection
# ─────────────────────────────────────────────────────────────

@app.route("/analyze-sms", methods=["POST"])
@jwt_required(optional=True)
def analyze_sms():

    data = request.get_json()

    text = data.get("text", "").strip()

    if not text:
        return jsonify({"error": "No text provided"}), 400

    result = analyze_sms_text(text)

    increment_stat("total_scans")

    if result.get("status") == "SCAM":
        increment_stat("scams_detected")

    return jsonify(result)

# ─────────────────────────────────────────────────────────────
# Number Check
# ─────────────────────────────────────────────────────────────

@app.route("/check-number", methods=["POST"])
@jwt_required(optional=True)
def check_number():

    data = request.get_json()

    number = data.get("number", "").strip()

    if not number:
        return jsonify({"error": "No number provided"}), 400

    result = check_phone_number(number)

    increment_stat("total_scans")

    return jsonify(result)

# ─────────────────────────────────────────────────────────────
# OCR Image Detection
# ─────────────────────────────────────────────────────────────

ALLOWED_IMAGE_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp"
}

@app.route("/analyze-image", methods=["POST"])
@jwt_required(optional=True)
def analyze_image_route():

    file = request.files.get("image")

    if not file:
        return jsonify({
            "error": "No image uploaded"
        }), 400

    ext = os.path.splitext(file.filename)[1].lower()

    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        return jsonify({
            "error": "Unsupported image type"
        }), 400

    temp_dir = tempfile.gettempdir()

    temp_path = os.path.join(
        temp_dir,
        f"{uuid.uuid4().hex}{ext}"
    )

    try:
        file.save(temp_path)

        result = analyze_image(temp_path)

        increment_stat("total_scans")

        if result.get("status") == "SCAM":
            increment_stat("scams_detected")

        return jsonify(result)

    except Exception as e:
        logger.error(f"OCR Error: {e}")

        return jsonify({
            "error": "Image analysis failed"
        }), 500

    finally:
        try:
            if os.path.exists(temp_path):
                os.remove(temp_path)
        except:
            pass

# ─────────────────────────────────────────────────────────────
# Voice Detection
# ─────────────────────────────────────────────────────────────

@app.route("/detect_voice", methods=["POST"])
@jwt_required(optional=True)
def detect_voice():

    file = request.files.get("file")

    if not file:
        return jsonify({
            "error": "No file uploaded"
        }), 400

    voice_model = get_voice_model()

    result = voice_model.predict(file)

    increment_stat("total_scans")

    return jsonify(result)

# ─────────────────────────────────────────────────────────────
# Stats
# ─────────────────────────────────────────────────────────────

@app.route("/api/stats")
def api_stats():
    return jsonify(get_stats())

# ─────────────────────────────────────────────────────────────
# Report Scam
# ─────────────────────────────────────────────────────────────

@app.route("/report-scam", methods=["POST"])
def report_scam():

    data = request.get_json()

    url = (data or {}).get("url", "").strip()

    if not url:
        return jsonify({
            "error": "No URL provided"
        }), 400

    add_to_blacklist(url)

    increment_stat("community_reports")

    return jsonify({
        "status": "SUCCESS"
    })

# ─────────────────────────────────────────────────────────────
# Entry Point
# ─────────────────────────────────────────────────────────────

if __name__ == "__main__":

    logger.info("Starting PhishGuard AI server...")

    port = int(os.environ.get("PORT", 10000))

    app.run(
        host="0.0.0.0",
        port=port,
        debug=False
    )
