from rapidfuzz import fuzz
import tldextract

POPULAR_BRANDS = [
    "google", "facebook", "amazon", "paypal",
    "microsoft", "apple", "netflix", "instagram",
    "bank", "hdfc", "sbi", "axis", "paytm"
]

def get_domain(url):
    ext = tldextract.extract(url)
    return ext.domain.lower()

def detect_fake_brand(url):
    domain = get_domain(url)

    for brand in POPULAR_BRANDS:
        similarity = fuzz.ratio(domain, brand)

        # High similarity but not exact match → suspicious
        if similarity > 80 and domain != brand:
            return True, brand, similarity

    return False, None, 0
