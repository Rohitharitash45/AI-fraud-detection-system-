import os
from dotenv import load_dotenv
from utils.constants import PHISHING_PATTERNS

load_dotenv()

ENDEE_URL       = os.getenv("ENDEE_URL", "http://localhost:8080")
ENDEE_AVAILABLE = False
embedding_model = None

# ── Try to load sentence-transformers + Endee ─────────────────────────────────
try:
    from sentence_transformers import SentenceTransformer
    import requests as http_requests

    embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
    ENDEE_AVAILABLE = False          # flip to True when Endee server is running
    print("[Endee] Embedding model loaded ✓")

except Exception as e:
    print(f"[Endee] Not available – running without vector search. ({e})")


def setup_endee_index():
    """Pushes all known phishing patterns into the Endee vector index."""
    if not ENDEE_AVAILABLE:
        return
    try:
        http_requests.post(
            f"{ENDEE_URL}/indexes",
            json={"name": "phishing_patterns", "dimension": 384, "metric": "cosine"},
            timeout=5
        )
        for item in PHISHING_PATTERNS:
            vector = embedding_model.encode(item["text"]).tolist()
            http_requests.post(
                f"{ENDEE_URL}/indexes/phishing_patterns/vectors",
                json={"id": item["id"], "vector": vector,
                      "payload": {"text": item["text"], "label": item["label"]}},
                timeout=5
            )
        print(f"[Endee] Loaded {len(PHISHING_PATTERNS)} patterns ✓")
    except Exception as e:
        print(f"[Endee] Setup failed: {e}")


def endee_semantic_search(query_text: str, top_k: int = 3) -> list:
    """
    Encodes query_text and searches the Endee index for similar phishing patterns.
    Returns a list of result dicts, or [] if Endee is unavailable.
    """
    if not ENDEE_AVAILABLE or embedding_model is None:
        return []
    try:
        query_vector = embedding_model.encode(query_text).tolist()
        response = http_requests.post(
            f"{ENDEE_URL}/indexes/phishing_patterns/search",
            json={"vector": query_vector, "top_k": top_k},
            timeout=5
        )
        return response.json().get("results", [])
    except Exception as e:
        print(f"[Endee] Search failed: {e}")
        return []


# Run once at import time to populate the index
setup_endee_index()