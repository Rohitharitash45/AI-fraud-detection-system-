import re
import logging
from services.endee_service import endee_semantic_search

logger = logging.getLogger(__name__)

# ── Expanded SMS scam vectors ──────────────────────────────────────────────────
# Each vector has: keywords, score weight, display label
SMS_SCAM_VECTORS = {

    # ── Financial / Banking ──────────────────────────────────────────────────
    "kyc_block": {
        "keywords": ["kyc", "kyc update", "kyc expired", "kyc pending", "complete kyc",
                     "kyc verification", "kyc not done", "aadhar kyc", "pan kyc"],
        "score": 35, "label": "KYC fraud attempt"
    },
    "account_block": {
        "keywords": ["account blocked", "account suspended", "account deactivated",
                     "account on hold", "account frozen", "account closed"],
        "score": 40, "label": "Account block threat"
    },
    "bank_verify": {
        "keywords": ["bank verification", "verify bank", "bank account verify",
                     "net banking", "internet banking", "mobile banking update"],
        "score": 30, "label": "Bank verification scam"
    },
    "card_scam": {
        "keywords": ["debit card blocked", "credit card blocked", "card expired",
                     "card upgrade", "card renewal", "atm blocked", "card verification"],
        "score": 35, "label": "Card block scam"
    },
    "upi_scam": {
        "keywords": ["upi blocked", "upi limit", "gpay", "phonepe", "paytm",
                     "upi verification", "upi update", "bhim upi"],
        "score": 25, "label": "UPI/payment app scam"
    },

    # ── OTP / Credential Theft ───────────────────────────────────────────────
    "otp_share": {
        "keywords": ["share otp", "send otp", "otp share", "otp forward",
                     "tell otp", "give otp", "otp pe", "otp bata"],
        "score": 55, "label": "OTP sharing request (critical)"
    },
    "otp_generic": {
        "keywords": ["one time password", "otp generated", "your otp", "otp is",
                     "verification code", "auth code"],
        "score": 10, "label": "OTP mentioned"
    },
    "password_steal": {
        "keywords": ["share password", "send password", "password share",
                     "login password", "enter password", "password update"],
        "score": 45, "label": "Password theft attempt"
    },

    # ── Urgency / Pressure Tactics ───────────────────────────────────────────
    "urgency": {
        "keywords": ["immediately", "urgent", "urgently", "within 24 hours",
                     "last warning", "final notice", "act now", "do it now",
                     "within 2 hours", "expire today", "expires soon",
                     "account will be closed", "action required"],
        "score": 20, "label": "Urgency pressure tactic"
    },
    "threat": {
        "keywords": ["legal action", "arrest", "police", "court notice",
                     "fir filed", "cybercrime", "fraud case", "suo motu",
                     "penalty", "fine imposed"],
        "score": 40, "label": "Threat / legal intimidation"
    },

    # ── Prize / Lottery ──────────────────────────────────────────────────────
    "lottery": {
        "keywords": ["you have won", "you won", "congratulations you", "lucky winner",
                     "prize money", "lottery winner", "bumper prize", "lucky draw",
                     "claim your prize", "claim reward", "you are selected"],
        "score": 45, "label": "Lottery / prize scam"
    },
    "reward_click": {
        "keywords": ["click to claim", "claim now", "redeem now", "collect gift",
                     "free gift", "free reward", "free offer", "limited offer"],
        "score": 25, "label": "Fake reward / click-bait"
    },

    # ── Loan / Financial Offer ───────────────────────────────────────────────
    "loan_scam": {
        "keywords": ["instant loan", "loan approved", "pre-approved loan",
                     "personal loan offer", "business loan", "loan without documents",
                     "0% interest", "zero interest", "low emi", "apply now loan"],
        "score": 35, "label": "Fake loan offer"
    },
    "investment_scam": {
        "keywords": ["guaranteed return", "double your money", "triple investment",
                     "high return", "100% profit", "daily profit", "crypto profit",
                     "trading profit", "forex profit", "stock tip"],
        "score": 40, "label": "Investment / trading scam"
    },

    # ── Job / Work-from-home ─────────────────────────────────────────────────
    "job_scam": {
        "keywords": ["work from home", "part time job", "earn daily", "earn per day",
                     "online earning", "data entry job", "typing job",
                     "like and earn", "watch and earn", "simple task"],
        "score": 30, "label": "Fake job / earning scheme"
    },

    # ── Tax / Government Impersonation ───────────────────────────────────────
    "tax_scam": {
        "keywords": ["income tax", "it department", "tax refund", "tds refund",
                     "gst notice", "tax notice", "itr pending", "tax default",
                     "tax evasion"],
        "score": 35, "label": "Tax / government impersonation"
    },
    "govt_scam": {
        "keywords": ["government scheme", "pm yojana", "modi scheme", "cm relief",
                     "ration card update", "aadhaar update", "voter id update",
                     "driving license renewal", "apply online"],
        "score": 25, "label": "Government scheme impersonation"
    },

    # ── Tech Support / Device Scam ───────────────────────────────────────────
    "tech_support": {
        "keywords": ["virus detected", "device infected", "hacked", "your phone hacked",
                     "remote access", "install app", "download apk",
                     "click link to fix", "technical support"],
        "score": 40, "label": "Tech support / device scam"
    },

    # ── Suspicious Links ─────────────────────────────────────────────────────
    "suspicious_link": {
        "keywords": ["bit.ly", "tinyurl", "goo.gl", "t.co", "shorturl",
                     "click here", "open link", "visit link", "tap link",
                     ".tk", ".ml", ".xyz", ".top", ".click"],
        "score": 25, "label": "Suspicious / shortened link"
    },

    # ── Romance / Sextortion ─────────────────────────────────────────────────
    "romance_scam": {
        "keywords": ["i love you", "send money", "gift card", "itunes card",
                     "google play card", "western union", "moneygram",
                     "wire transfer", "nude", "private video"],
        "score": 45, "label": "Romance / sextortion scam"
    },

    # ── Delivery / Parcel ────────────────────────────────────────────────────
    "delivery_scam": {
        "keywords": ["parcel held", "package blocked", "delivery failed",
                     "customs duty", "pay customs", "fedex", "dhl notice",
                     "india post notice", "shipment on hold"],
        "score": 30, "label": "Fake delivery / parcel scam"
    },
}

# ── Common legitimate senders (reduce false positives) ────────────────────────
LEGITIMATE_SENDERS = [
    'sbi', 'hdfc', 'icici', 'axis', 'kotak',   # banks
    'irctc', 'uidai', 'epfo', 'nsdl',           # govt
    'amazon', 'flipkart', 'swiggy', 'zomato',   # commerce
    'otp', 'verify',                             # generic OTP senders
]

# ── Regex patterns for extra signals ──────────────────────────────────────────
LINK_PATTERN     = re.compile(r'https?://\S+|www\.\S+', re.IGNORECASE)
PHONE_IN_SMS     = re.compile(r'\b[6-9]\d{9}\b')
AMOUNT_PATTERN   = re.compile(r'rs\.?\s*\d+|inr\s*\d+|\d+\s*rupees', re.IGNORECASE)
CAPS_RATIO_LIMIT = 0.6   # >60% caps = suspicious


def _count_caps_ratio(text: str) -> float:
    letters = [c for c in text if c.isalpha()]
    if not letters:
        return 0.0
    return sum(1 for c in letters if c.isupper()) / len(letters)


def analyze_sms_text(text: str) -> dict:
    text_lower = text.lower().strip()
    score      = 0
    detections = []
    detail     = {}

    if not text_lower:
        return {"status": "SAFE", "score": 0, "detections": [], "endee_match": None}

    # ── 1. Keyword vector scoring ──────────────────────────────────────────
    matched_vectors = []
    for vector_name, data in SMS_SCAM_VECTORS.items():
        if any(kw in text_lower for kw in data["keywords"]):
            score += data["score"]
            detections.append(data["label"])
            matched_vectors.append(vector_name)

    # ── 2. Multi-vector amplifier ──────────────────────────────────────────
    # Multiple scam patterns together = much more suspicious
    if len(matched_vectors) >= 4:
        score += 30
        detections.append("Multiple scam signal types detected")
    elif len(matched_vectors) >= 2:
        score += 15

    # ── 3. Suspicious link in message ─────────────────────────────────────
    links = LINK_PATTERN.findall(text)
    if links:
        score += 20
        detections.append(f"URL present in message ({len(links)} link(s))")
        detail["links"] = links[:3]

    # ── 4. Excessive ALL CAPS ──────────────────────────────────────────────
    caps_ratio = _count_caps_ratio(text)
    if caps_ratio > CAPS_RATIO_LIMIT and len(text) > 20:
        score += 15
        detections.append("Excessive capital letters (pressure tactic)")

    # ── 5. Phone number embedded in SMS ───────────────────────────────────
    embedded_phones = PHONE_IN_SMS.findall(text)
    if embedded_phones:
        score += 10
        detections.append(f"Phone number embedded in message")
        detail["embedded_phones"] = embedded_phones[:2]

    # ── 6. Money amount mentioned ──────────────────────────────────────────
    if AMOUNT_PATTERN.search(text):
        score += 10
        detections.append("Monetary amount mentioned")

    # ── 7. Very short suspicious message ──────────────────────────────────
    word_count = len(text.split())
    if word_count < 8 and links:
        score += 15
        detections.append("Very short message with link (common smishing)")

    # ── 8. Endee semantic search ───────────────────────────────────────────
    endee_result = None
    try:
        similar = endee_semantic_search(text)
        if similar:
            top   = similar[0]
            sim   = top.get("score", 0)
            label = top.get("payload", {}).get("label", "unknown")

            endee_result = {
                "similarity":      round(sim * 100, 1),
                "matched_pattern": top.get("payload", {}).get("text", "")
            }

            if sim > 0.85 and label == "phishing":
                score += 35
                detections.append(f"Strong semantic phishing match ({sim*100:.0f}%)")
            elif sim > 0.75 and label == "phishing":
                score += 25
                detections.append(f"Semantic match to known phishing ({sim*100:.0f}%)")
            elif sim > 0.65 and label == "phishing":
                score += 12
                detections.append(f"Partial phishing pattern match ({sim*100:.0f}%)")
    except Exception as e:
        logger.warning(f"Endee SMS error: {e}")

    # ── Final status ───────────────────────────────────────────────────────
    final_score = min(score, 100)

    if final_score >= 55:
        status = "SCAM"
    elif final_score >= 25:
        status = "WARNING"
    else:
        status = "SAFE"

    return {
        "status":      status,
        "score":       final_score,
        "detections":  list(dict.fromkeys(detections)),  # deduplicate, preserve order
        "endee_match": endee_result,
        "detail":      detail,
    }