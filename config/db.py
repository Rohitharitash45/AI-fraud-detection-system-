import os
import logging
from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.errors import ConnectionFailure

# Logger setup
logger = logging.getLogger(__name__)

# MongoDB URI from Render Environment Variables
MONGO_URI = os.getenv("MONGO_URI")

try:
    # Connect to MongoDB Atlas
    client = MongoClient(
        MONGO_URI,
        serverSelectionTimeoutMS=5000
    )

    # Test connection
    client.admin.command("ping")

    logger.info("MongoDB connected successfully.")

except ConnectionFailure as e:
    logger.critical(f"MongoDB connection failed: {e}")
    raise

# Database
db = client["phishguard"]

# Collections
scans_collection = db["scans"]
users_collection = db["users"]
blacklist_collection = db["blacklist"]
stats_collection = db["stats"]

# ── Indexes ─────────────────────────────────────────

# Scans indexes
scans_collection.create_index(
    [("user_id", ASCENDING), ("timestamp", DESCENDING)]
)

scans_collection.create_index(
    [("timestamp", DESCENDING)]
)

# Users unique email
users_collection.create_index(
    [("email", ASCENDING)],
    unique=True
)

# Blacklist unique URL
blacklist_collection.create_index(
    [("url", ASCENDING)],
    unique=True
)

logger.info("MongoDB indexes ensured.")
