import os
import logging
from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.errors import ConnectionFailure

logger = logging.getLogger(__name__)

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/phishguard")

try:
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    client.admin.command("ping")          # fail fast if Mongo is unreachable
    logger.info("MongoDB connected successfully.")
except ConnectionFailure as e:
    logger.critical(f"MongoDB connection failed: {e}")
    raise

db = client.get_default_database()       # uses the DB name in the URI

# ── Collections ───────────────────────────────────────────────────────────────
scans_collection     = db["scans"]
users_collection     = db["users"]
blacklist_collection = db["blacklist"]
stats_collection     = db["stats"]

# ── Indexes (idempotent — safe to run on every startup) ───────────────────────
# Scans: fast lookup by user and time
scans_collection.create_index([("user_id", ASCENDING), ("timestamp", DESCENDING)])
scans_collection.create_index([("timestamp", DESCENDING)])

# Users: unique email
users_collection.create_index([("email", ASCENDING)], unique=True)

# Blacklist: unique URL, fast lookup
blacklist_collection.create_index([("url", ASCENDING)], unique=True)

logger.info("MongoDB indexes ensured.")