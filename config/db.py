import logging
from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.errors import ConnectionFailure

logger = logging.getLogger(__name__)

MONGO_URI = "mongodb+srv://rohit20050928_db_user:Q7N1eyENuj73PX3p@cluster0.casxz1g.mongodb.net/phishguard?retryWrites=true&w=majority&appName=Cluster0"

try:
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    client.admin.command("ping")
    logger.info("MongoDB connected successfully.")
except ConnectionFailure as e:
    logger.critical(f"MongoDB connection failed: {e}")
    raise

db = client.get_default_database()

scans_collection = db["scans"]
users_collection = db["users"]
blacklist_collection = db["blacklist"]
stats_collection = db["stats"]