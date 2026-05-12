import re
import tldextract


def extract_features(url: str) -> dict:
    """
    Extracts the 8 numeric features used by the RandomForest model.

    Returns a dict with keys:
        dots, is_ip, has_brand, is_shortened,
        url_length, has_https, domain_length, is_typosquat
    """
    url = url.lower()
    ext = tldextract.extract(url)
    domain = ext.domain

    features = {}

    # 1. dots
    features["dots"] = url.count('.')

    # 2. is_ip
    features["is_ip"] = 1 if re.match(r'^\d{1,3}(\.\d{1,3}){3}', url) else 0

    # 3. has_brand
    brands = [
        "google", "facebook", "amazon", "microsoft", "apple",
        "paypal", "bank", "instagram", "netflix", "sbi", "hdfc", "axis", "paytm"
    ]
    features["has_brand"] = 1 if any(b in url for b in brands) else 0

    # 4. is_shortened
    shorteners = ["bit.ly", "tinyurl.com", "goo.gl", "t.co", "rebrand.ly"]
    features["is_shortened"] = 1 if any(s in url for s in shorteners) else 0

    # 5. url_length
    features["url_length"] = len(url)

    # 6. has_https
    features["has_https"] = 1 if url.startswith("https") else 0

    # 7. domain_length
    features["domain_length"] = len(domain)

    # 8. is_typosquat (basic heuristic)
    suspicious_patterns = ["g00gle", "faceb00k", "paypa1", "micr0soft"]
    POPULAR_BRANDS = [
    "google", "facebook", "amazon", "paypal",
    "microsoft", "apple", "netflix", "instagram"
    ]
    features["is_typosquat"] = 1 if any(p in url for p in suspicious_patterns) else 0

    return features