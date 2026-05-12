import os
import logging
import certifi
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure

logger = logging.getLogger(__name__)

MONGO_URI = os.getenv("MONGO_URI")

try:
    client = MongoClient(
        MONGO_URI,
        tls=True,
        tlsCAFile=certifi.where(),
        serverSelectionTimeoutMS=5000
    )

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
