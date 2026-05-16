from dotenv import load_dotenv
load_dotenv()

import os
import re
import uuid
import logging
import tempfile
from datetime import datetime, timezone

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_jwt_extended import JWTManager, jwt_required, get_jwt_identity

from werkzeug.security import generate_password_hash, check_password_hash

# ---------------- DB IMPORT (MUST WORK FILE EXISTS)
from config.db import (
    scans_collection,
    blacklist_collection,
    stats_collection,
    users_collection
)

app = Flask(__name__)

# ---------------- BASIC CONFIG
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "dev-secret")

jwt = JWTManager(app)
CORS(app)

limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["60 per hour"]
)

logging.basicConfig(level=logging.INFO)

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ---------------- HEALTH CHECK (IMPORTANT FOR RENDER)
@app.route("/")
def home():
    return {"status": "running", "message": "PhishGuard AI API Live"}

@app.route("/health")
def health():
    return {"status": "ok"}

# ---------------- SAFE STATS
def increment_stat(field):
    try:
        stats_collection.update_one(
            {"_id": "global"},
            {"$inc": {field: 1}},
            upsert=True
        )
    except:
        pass

# ---------------- BLACKLIST SAFE
def is_blacklisted(url):
    try:
        return blacklist_collection.find_one({"url": url}) is not None
    except:
        return False

# ---------------- AUTH (REGISTER)
@app.route("/auth/register", methods=["POST"])
def register():
    data = request.get_json()

    email = data.get("email", "").lower().strip()
    password = data.get("password", "")
    name = data.get("name", "")

    if not email or not password:
        return {"error": "missing fields"}, 400

    if users_collection.find_one({"email": email}):
        return {"error": "user exists"}, 409

    user = {
        "email": email,
        "name": name,
        "password": generate_password_hash(password),
        "created_at": datetime.utcnow()
    }

    users_collection.insert_one(user)

    return {"message": "registered successfully"}

# ---------------- LOGIN
@app.route("/auth/login", methods=["POST"])
def login():
    data = request.get_json()

    email = data.get("email", "").lower().strip()
    password = data.get("password", "")

    user = users_collection.find_one({"email": email})

    if not user or not check_password_hash(user["password"], password):
        return {"error": "invalid credentials"}, 401

    return {"message": "login success"}

# ---------------- URL DETECT (SAFE PLACEHOLDER)
@app.route("/detect", methods=["POST"])
@jwt_required(optional=True)
def detect():
    data = request.get_json()

    url = data.get("url", "").strip()
    if not url:
        return {"error": "no url"}, 400

    if not re.match(r"https?://", url):
        url = "https://" + url

    increment_stat("total_scans")

    if is_blacklisted(url):
        return {
            "status": "SCAM",
            "score": 100,
            "reason": "blacklisted"
        }

    # ⚠️ SAFE fallback (no ML crash)
    result = {
        "status": "SAFE",
        "score": 20,
        "url": url
    }

    scans_collection.insert_one({
        "type": "url",
        "content": url,
        "result": result,
        "timestamp": datetime.utcnow(),
        "user_id": get_jwt_identity()
    })

    return result

# ---------------- SMS
@app.route("/analyze-sms", methods=["POST"])
def sms():
    data = request.get_json()
    text = data.get("text", "")

    return {
        "status": "SAFE",
        "text": text
    }

# ---------------- NUMBER CHECK
@app.route("/check-number", methods=["POST"])
def number():
    return {"status": "SAFE"}

# ---------------- IMAGE (SAFE)
@app.route("/analyze-image", methods=["POST"])
def image():
    return {"status": "SAFE", "message": "image analysis disabled for deploy stability"}

# ---------------- VOICE (SAFE)
@app.route("/detect_voice", methods=["POST"])
def voice():
    return {"status": "SAFE", "message": "voice module disabled for deploy stability"}

# ---------------- RUN
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)
