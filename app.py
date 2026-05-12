from dotenv import load_dotenv
load_dotenv()  

import re
import logging
import socket
from datetime import datetime, timezone



from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_jwt_extended import (
    JWTManager, create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity
)
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename

import os

from config.db import scans_collection, blacklist_collection, stats_collection, users_collection
from modules.url_detector import analyze_url
from modules.sms_detector import analyze_sms_text
from modules.number_checker import check_phone_number
from modules.voice_detector import VoiceDetector
from modules.ocr_detector import analyze_image
import uuid
import tempfile


UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ── App Setup ─────────────────────────────────────────────────────────────────
app = Flask(__name__)

from flask import make_response

@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        response = make_response()

        response.headers["Access-Control-Allow-Origin"] = "http://localhost:5173"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Credentials"] = "true"

        return response, 200

# ✅ Fixed — added port 5173 (Vite's default port)
CORS(app,
     supports_credentials=True,
     resources={r"/*": {
         "origins": [
             "http://localhost:5173",    # ← Vite (your actual React port)
             "http://127.0.0.1:5173",   # ← Vite alternative
             "http://localhost:3000",    # ← Keep for safety
         ],
         "allow_headers": ["Content-Type", "Authorization"],
         "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
     }}
)

socket.setdefaulttimeout(3)

# ── JWT Config ────────────────────────────────────────────────────────────────
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "change-this-in-production")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = 3600        # 1 hour
app.config["JWT_REFRESH_TOKEN_EXPIRES"] = 2592000    # 30 days
jwt = JWTManager(app)

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

file_handler = logging.FileHandler('app.log')
file_handler.setLevel(logging.INFO)
file_handler.setFormatter(logging.Formatter('%(asctime)s [%(levelname)s] %(message)s'))
logger.addHandler(file_handler)

# ── Rate Limiting ─────────────────────────────────────────────────────────────
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["60 per hour"],
    storage_uri="memory://"
)

# ── Voice Model (lazy-loaded) ─────────────────────────────────────────────────
_voice_model = None

def get_voice_model():
    """Lazy-load the voice model to avoid slow cold starts."""
    global _voice_model
    if _voice_model is None:
        logger.info("Loading VoiceDetector model...")
        _voice_model = VoiceDetector()
        logger.info("VoiceDetector model loaded.")
    return _voice_model

# ── Helper: persistent stats ──────────────────────────────────────────────────
def increment_stat(field: str):
    """Atomically increment a stat counter in MongoDB."""
    stats_collection.update_one(
        {"_id": "global"},
        {"$inc": {field: 1}},
        upsert=True
    )

def get_stats() -> dict:
    doc = stats_collection.find_one({"_id": "global"}) or {}
    return {
        "total_scans":       doc.get("total_scans", 0),
        "scams_detected":    doc.get("scams_detected", 0),
        "community_reports": doc.get("community_reports", 0),
    }

# ── Helper: persistent blacklist ──────────────────────────────────────────────
def is_blacklisted(url: str) -> bool:
    return blacklist_collection.find_one({"url": url.lower()}) is not None

def add_to_blacklist(url: str):
    blacklist_collection.update_one(
        {"url": url.lower()},
        {"$set": {"url": url.lower(), "added_at": datetime.now(timezone.utc)}},
        upsert=True
    )

# ── Global Error Handler ──────────────────────────────────────────────────────
@app.errorhandler(Exception)
def handle_global_error(e):
    logger.error(f"Unhandled Exception: {str(e)}")
    return jsonify({"status": "ERROR", "message": "Something went wrong on the server"}), 500

# ── Security Headers ──────────────────────────────────────────────────────────
@app.after_request
def apply_security_headers(response):
    response.headers["X-Content-Type-Options"]   = "nosniff"
    response.headers["X-Frame-Options"]           = "DENY"
    response.headers["X-XSS-Protection"]          = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

# ─────────────────────────── AUTH ROUTES ─────────────────────────────────────

@app.route("/auth/register", methods=["POST"])
@limiter.limit("10 per hour")
def register():
    data = request.get_json()

    if not data:
        return jsonify({"error": "No data provided"}), 400

    email    = data.get("email", "").strip().lower()
    password = data.get("password", "")
    name     = data.get("name", "").strip()

    # Basic validation
    if not email or not password or not name:
        return jsonify({"error": "Name, email and password are required"}), 400

    if not re.match(r'^[\w\.-]+@[\w\.-]+\.\w{2,}$', email):
        return jsonify({"error": "Invalid email format"}), 400

    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400

    # Duplicate check
    if users_collection.find_one({"email": email}):
        return jsonify({"error": "Email already registered"}), 409

    hashed_pw = generate_password_hash(password)
    user = {
        "name":       name,
        "email":      email,
        "password":   hashed_pw,
        "created_at": datetime.now(timezone.utc),
        "role":       "user",
    }
    result = users_collection.insert_one(user)
    user_id = str(result.inserted_id)

    access_token  = create_access_token(identity=user_id)
    refresh_token = create_refresh_token(identity=user_id)

    logger.info(f"New user registered: {email}")
    return jsonify({
        "message":       "Registration successful",
        "access_token":  access_token,
        "refresh_token": refresh_token,
        "user": {"id": user_id, "name": name, "email": email}
    }), 201


@app.route("/auth/login", methods=["POST"])
@limiter.limit("20 per hour")
def login():
    data = request.get_json()

    if not data:
        return jsonify({"error": "No data provided"}), 400

    email    = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = users_collection.find_one({"email": email})


    # ADD THESE DEBUG LINES:
    print(f"--- LOGIN DEBUG ---")
    print(f"Target Email: {email}")
    print(f"User Found in DB: {user is not None}")
    if user:
        match = check_password_hash(user["password"], password)
        print(f"Password Match Result: {match}")
    print(f"-------------------")

    # Use same error message for both "not found" and "wrong password"
    # to avoid user enumeration attacks
    if not user or not check_password_hash(user["password"], password):
        logger.warning(f"Failed login attempt for: {email}")
        return jsonify({"error": "Invalid email or password"}), 401

    user_id = str(user["_id"])
    access_token  = create_access_token(identity=user_id)
    refresh_token = create_refresh_token(identity=user_id)

    logger.info(f"User logged in: {email}")
    return jsonify({
        "message":       "Login successful",
        "access_token":  access_token,
        "refresh_token": refresh_token,
        "user": {
            "id":    user_id,
            "name":  user.get("name"),
            "email": user.get("email"),
            "role":  user.get("role", "user"),
        }
    })


@app.route("/auth/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh_token():
    """Issue a new access token using a valid refresh token."""
    user_id      = get_jwt_identity()
    access_token = create_access_token(identity=user_id)
    return jsonify({"access_token": access_token})


@app.route("/auth/me", methods=["GET"])
@jwt_required()
def get_me():
    """Return the currently logged-in user's profile."""
    from bson import ObjectId
    user_id = get_jwt_identity()
    user    = users_collection.find_one({"_id": ObjectId(user_id)})

    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({
        "id":         str(user["_id"]),
        "name":       user.get("name"),
        "email":      user.get("email"),
        "role":       user.get("role", "user"),
        "created_at": user.get("created_at").isoformat() if user.get("created_at") else None,
    })

# ─────────────────────────── SCAN ROUTES ─────────────────────────────────────

@app.route("/")
def home():
    return render_template("index.html")


@app.route('/detect', methods=['POST'])           # FIX: was GET|POST — GET with body is wrong
@limiter.limit("20 per minute")
@jwt_required(optional=True)                      # works for both guests and logged-in users
def detect():
    data = request.get_json()

    if not data or "url" not in data:
        logger.warning("Bad request: missing URL in body")
        return jsonify({"error": "No URL provided"}), 400

    url = data.get("url", "").strip()

    if not url:
        return jsonify({"error": "URL cannot be empty"}), 400

    if len(url) > 2048:
        logger.warning(f"Bad request: URL too long ({len(url)} chars)")
        return jsonify({"error": "URL too long (max 2048 characters)"}), 400

    if not re.match(r'https?://', url):
        url = 'https://' + url

    logger.info(f"URL scan requested: {url[:80]}")
    increment_stat("total_scans")                 # FIX: persistent stat, not in-memory

    if is_blacklisted(url):                       # FIX: checks MongoDB, not in-memory set
        logger.info(f"Blacklisted URL blocked: {url[:80]}")
        increment_stat("scams_detected")
        return jsonify({
            "status":      "SCAM",
            "score":       100,
            "reasons":     ["Community Blacklisted"],
            "endee_match": None
        })

    result = analyze_url(url)

    if result.get("status") == "SCAM":
        increment_stat("scams_detected")

    user_id = get_jwt_identity()                  # None if guest

    scans_collection.insert_one({
        "type": "url",  # ✅ added
        "content": url,  # ✅ added
        "result": {
            "score": result.get("score"),
            "status": result.get("status")
        },
        "timestamp": datetime.now(timezone.utc),
        "user_id": user_id,
    })

    return jsonify(result)


@app.route('/analyze-sms', methods=['POST'])
@limiter.limit("30 per minute")
@jwt_required(optional=True)
def analyze_sms():
    data = request.get_json()

    if not data or "text" not in data:
        return jsonify({"error": "No text provided"}), 400

    text = data.get("text", "").strip()

    if not text:
        return jsonify({"error": "Text cannot be empty"}), 400
    if len(text) > 5000:
        return jsonify({"error": "Text too long (max 5000 characters)"}), 400

    logger.info(f"SMS scan: '{text[:50]}...'")
    increment_stat("total_scans")

    result   = analyze_sms_text(text)
    user_id  = get_jwt_identity()

    if result.get("status") == "SCAM":
        increment_stat("scams_detected")

    scans_collection.insert_one({
        "type": "sms",
        "content": text[:200],  # ✅ unified field
        "result": {
            "score": result["score"],
            "status": result["status"]
        },
        "timestamp": datetime.now(timezone.utc),
        "user_id": user_id,
    })

    logger.info(f"SMS result: {result['status']} (score={result['score']})")
    return jsonify({
        "status":      result["status"],
        "score":       result["score"],
        "reasons":     result["detections"],
        "endee_match": result["endee_match"]
    })


@app.route('/check-number', methods=['POST'])
@limiter.limit("30 per minute")
@jwt_required(optional=True)
def check_number():
    data = request.get_json()

    if not data or "number" not in data:
        return jsonify({"error": "No number provided"}), 400

    number = data.get('number', '').strip().replace(' ', '').replace('-', '')

    if not number:
        return jsonify({"error": "Number cannot be empty"}), 400

    logger.info(f"Phone check: {number[:6]}****")
    increment_stat("total_scans")

    result = check_phone_number(number)
    user_id = get_jwt_identity()

    scans_collection.insert_one({
        "type": "phone",
        "content": f"+{number}" if not number.startswith('+') else number,
        "result": {
            "score": result.get("score"),
            "status": result.get("status")
        },
        "timestamp": datetime.now(timezone.utc),
        "user_id": user_id,
    })

    return jsonify(result)

@app.route('/report-scam', methods=['POST'])
@jwt_required(optional=True)
def report_scam():
    data = request.get_json()
    url  = (data or {}).get("url", "").lower().strip()

    if not url:
        return jsonify({"status": "FAILED", "error": "No URL provided"}), 400

    add_to_blacklist(url)                         # FIX: persisted to MongoDB
    increment_stat("community_reports")
    logger.info(f"Scam reported: {url[:80]}")
    return jsonify({"status": "SUCCESS"})


@app.route('/api/stats', methods=['GET'])
def api_stats():
    return jsonify(get_stats())                   # FIX: reads from MongoDB, not memory


# FIX: protected — only logged-in users
@app.route('/history', methods=['GET'])
@jwt_required()
def get_history():
    try:
        user_id = get_jwt_identity()
        # Remove .limit(20) if you want the full persistent history
        scans = list(
            scans_collection
            .find({"user_id": user_id})
            .sort("timestamp", -1)
        )
        for scan in scans:
            scan["_id"] = str(scan["_id"])
            if isinstance(scan.get("timestamp"), datetime):
                scan["timestamp"] = scan["timestamp"].isoformat()
        return jsonify(scans), 200 # Added explicit 200
    except Exception as e:
        logger.error(f"History fetch error: {e}")
        return jsonify({"error": "Failed to fetch history"}), 500
    


ALLOWED_IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp'}

@app.route('/analyze-image', methods=['POST'])
@limiter.limit("10 per minute")
@jwt_required(optional=True)
def analyze_image_route():

    # ── 1. Get file ────────────────────────────────────────────────────────
    file = request.files.get('image')
    if not file or not file.filename:
        logger.warning("OCR: no file received. Keys: %s", list(request.files.keys()))
        return jsonify({"error": "No image file provided"}), 400

    # ── 2. Validate by extension (not MIME — browsers send wrong type on Windows) ──
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        return jsonify({"error": f"Unsupported file type '{ext}'. Use JPG, PNG, or WEBP."}), 400

    # ── 3. Save to OS temp dir ─────────────────────────────────────────────
    # Works on ALL platforms:
    #   Windows → C:\Users\USER\AppData\Local\Temp
    #   Linux   → /tmp
    #   Mac     → /var/folders/...
    temp_dir  = tempfile.gettempdir()
    temp_name = f"ocr_{uuid.uuid4().hex}{ext}"
    temp_path = os.path.join(temp_dir, temp_name)

    try:
        file.save(temp_path)
        logger.info(f"OCR temp saved: {temp_path}")

        # ── 4. Size check ──────────────────────────────────────────────────
        size_mb = os.path.getsize(temp_path) / (1024 * 1024)
        if size_mb > 5:
            return jsonify({"error": "File too large (max 5MB)"}), 400

        # ── 5. OCR analysis ────────────────────────────────────────────────
        from modules.ocr_detector import analyze_image
        result  = analyze_image(temp_path)
        user_id = get_jwt_identity()

        # ── 6. Persist ─────────────────────────────────────────────────────
        increment_stat("total_scans")
        if result.get("status") == "SCAM":
            increment_stat("scams_detected")

        scans_collection.insert_one({
            "type":      "ocr",
            "filename":  file.filename,
            "result":    result,
            "timestamp": datetime.now(timezone.utc),
            "user_id":   user_id,
        })

        logger.info(f"OCR complete: {result['status']} score={result['score']}")
        return jsonify(result)

    except Exception as e:
        logger.error(f"OCR route error: {e}", exc_info=True)
        return jsonify({"error": "Image analysis failed. Please try again."}), 500

    finally:
        try:
            if os.path.exists(temp_path):
                os.remove(temp_path)
        except Exception:
            pass




@app.route("/detect_voice", methods=["POST"])
@limiter.limit("10 per minute")
@jwt_required(optional=True)
def detect_voice():
    file = request.files.get("file")
    if not file:
        return jsonify({"error": "No file uploaded"}), 400

    voice_model = get_voice_model()               # FIX: lazy-loaded, not at module level
    result      = voice_model.predict(file)
    user_id     = get_jwt_identity()

    increment_stat("total_scans")

    scans_collection.insert_one({
        "type": "voice",
        "content": file.filename,
        "result": {
            "score": result["risk_score"],   # ✅ mapped correctly
            "status": result["label"]        # ✅ mapped correctly
        },
        "timestamp": datetime.now(timezone.utc),
        "user_id": user_id,
    })

    return jsonify(result)



@app.route('/debug-upload', methods=['POST'])
def debug_upload():
    print("FILES:", dict(request.files))
    print("FORM:", dict(request.form))
    print("CONTENT-TYPE:", request.content_type)
    return jsonify({
        "files_keys": list(request.files.keys()),
        "content_type": request.content_type,
    })


# ─────────────────────────── ENTRY POINT ─────────────────────────────────────
if __name__ == "__main__":
    logger.info("Starting PhishGuard AI server...")
    app.run(host="0.0.0.0", port=5000, debug=os.getenv("FLASK_DEBUG", "false").lower() == "true")