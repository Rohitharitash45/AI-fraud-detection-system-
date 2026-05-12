import os
import re
import logging
import cv2
import numpy as np
import pytesseract

logger = logging.getLogger(__name__)

# ── Scam keyword scoring ───────────────────────────────────────────────────────
SCAM_KEYWORDS = {
    # Critical — OTP / credential theft
    "otp":               35,
    "share otp":         50,
    "send otp":          50,
    "password":          30,
    "share password":    50,
    "pin":               20,
    # Account threats
    "account blocked":   35,
    "account suspended": 35,
    "account deactivated":35,
    "kyc":               30,
    "kyc expired":       40,
    "kyc update":        35,
    "verify your":       25,
    "verify account":    30,
    # Urgency
    "urgent":            18,
    "immediately":       18,
    "last warning":      25,
    "final notice":      25,
    "act now":           20,
    "expires":           15,
    "within 24":         18,
    # Legal threats
    "arrest":            35,
    "legal action":      30,
    "court notice":      30,
    "fir":               25,
    "cybercrime":        28,
    # Prizes / lottery
    "you have won":      40,
    "you won":           35,
    "prize":             22,
    "lottery":           28,
    "lucky winner":      35,
    "claim":             15,
    "congratulations":   12,
    # Banking
    "bank account":      20,
    "debit card":        22,
    "credit card":       22,
    "net banking":       20,
    "atm blocked":       30,
    "upi":               15,
    # Investment scam
    "guaranteed return": 30,
    "double money":      35,
    "100% profit":       35,
    "daily profit":      30,
    # Links
    "click here":        22,
    "tap here":          20,
    "open link":         18,
    # Generic
    "free":              10,
    "reward":            12,
    "refund":            15,
    "loan approved":     25,
    "work from home":    20,
    "income tax":        25,
    "tax notice":        25,
}

URL_PATTERN   = re.compile(r'https?://[^\s]+|www\.[^\s]+', re.IGNORECASE)
PHONE_PATTERN = re.compile(r'\b[6-9]\d{9}\b|\+91[\s-]?\d{10}')
SUSPICIOUS_TLDS = ['.tk', '.ml', '.xyz', '.top', '.click', '.site', '.online', '.cf', '.ga']


def preprocess_image(image_path: str) -> np.ndarray:
    """Multi-pass preprocessing for best OCR accuracy."""
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Cannot read image: {image_path}")

    # ── Upscale for OCR accuracy ───────────────────────────────────────────
    h, w  = img.shape[:2]
    scale = max(1.5, 1400 / max(h, w, 1))
    img   = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_LANCZOS4)

    # ── Grayscale ─────────────────────────────────────────────────────────
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # ── Denoise ───────────────────────────────────────────────────────────
    gray = cv2.fastNlMeansDenoising(gray, h=10)

    # ── Adaptive threshold ────────────────────────────────────────────────
    thresh = cv2.adaptiveThreshold(
        gray, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        15, 8
    )
    return thresh


def extract_text(image_path: str) -> str:
    """Run Tesseract with multiple PSM configs, return longest result."""
    try:
        processed = preprocess_image(image_path)
        best = ''
        for cfg in [r'--oem 3 --psm 6', r'--oem 3 --psm 3', r'--oem 3 --psm 11']:
            try:
                t = pytesseract.image_to_string(processed, config=cfg).strip()
                if len(t) > len(best):
                    best = t
            except Exception:
                continue
        return best
    except Exception as e:
        logger.error(f"OCR extract error: {e}")
        return ''


def score_text(text: str) -> tuple[int, list[str]]:
    """Score full text block against scam keyword list."""
    text_lower = text.lower()
    score = 0
    hits  = []
    for kw, weight in SCAM_KEYWORDS.items():
        if kw in text_lower:
            score += weight
            hits.append(kw)
    return score, hits


def analyze_line(line: str) -> dict:
    """Analyse a single line — keyword + URL heuristics only (no network calls)."""
    line_lower = line.lower()
    score      = 0
    reasons    = []

    # Keyword scoring
    k_score, k_hits = score_text(line)
    if k_hits:
        score += k_score
        reasons.append(f"Scam keywords: {', '.join(k_hits[:4])}")

    # URL detection (heuristic only — no network call to avoid timeout)
    urls = URL_PATTERN.findall(line)
    for url in urls:
        score += 20
        reasons.append("URL detected in text")
        # Check for suspicious TLD without making network call
        if any(tld in url.lower() for tld in SUSPICIOUS_TLDS):
            score += 25
            reasons.append(f"Suspicious TLD in URL")
        break   # count once per line

    # Phone number
    if PHONE_PATTERN.search(line):
        score += 8
        reasons.append("Phone number embedded")

    final = min(score, 100)
    return {
        "content": line,
        "score":   final,
        "status":  "SCAM" if final >= 50 else ("WARNING" if final >= 22 else "SAFE"),
        "reasons": list(dict.fromkeys(reasons)),
    }


def analyze_image(image_path: str) -> dict:
    """
    Main OCR analysis entry point.
    Returns dict with: status, score, message, reasons, extracted_text, lines
    """
    # ── Extract text ───────────────────────────────────────────────────────
    text = extract_text(image_path)

    if not text or len(text.strip()) < 3:
        return {
            "status":         "SAFE",
            "score":          0,
            "message":        "No readable text found in image",
            "reasons":        [],
            "lines":          [],
            "extracted_text": "",
        }

    # ── Line-level analysis ────────────────────────────────────────────────
    lines        = [l.strip() for l in text.split('\n') if len(l.strip()) > 3]
    line_results = [analyze_line(l) for l in lines] if lines else []

    scam_lines    = [r for r in line_results if r["status"] == "SCAM"]
    warning_lines = [r for r in line_results if r["status"] == "WARNING"]

    # ── Whole-document keyword score ───────────────────────────────────────
    full_score, full_hits = score_text(text)
    top_reasons = []

    # Condense hits into display reasons
    if len(full_hits) >= 5:
        top_reasons.append(f"Very high scam keyword density ({len(full_hits)} signals)")
    elif len(full_hits) >= 3:
        top_reasons.append(f"Multiple scam keywords found: {', '.join(full_hits[:4])}")
    elif full_hits:
        top_reasons.append(f"Scam keyword found: {full_hits[0]}")

    # URL count
    all_urls = URL_PATTERN.findall(text)
    if all_urls:
        top_reasons.append(f"{len(all_urls)} URL(s) detected in image")
        for url in all_urls[:3]:
            if any(tld in url.lower() for tld in SUSPICIOUS_TLDS):
                top_reasons.append("Suspicious domain TLD in URL")
                full_score += 25
                break

    # ── Combined score ─────────────────────────────────────────────────────
    # Weight full-doc score + scam line count
    avg_line_score = sum(r["score"] for r in line_results) // max(len(lines), 1) if lines else 0
    combined = (full_score + avg_line_score) // 2

    if len(scam_lines) >= 3:    combined += 30
    elif len(scam_lines) == 2:  combined += 20
    elif len(scam_lines) == 1:  combined += 10
    if len(warning_lines) >= 2: combined += 10

    final_score = min(combined, 100)

    if final_score >= 50:
        status  = "SCAM"
        message = "High-risk phishing or scam content detected"
    elif final_score >= 25:
        status  = "WARNING"
        message = "Suspicious content — review carefully"
    else:
        status  = "SAFE"
        message = "No significant threats detected"

    return {
        "status":         status,
        "score":          final_score,
        "message":        message,
        "reasons":        list(dict.fromkeys(top_reasons)),
        "extracted_text": text[:1500],   # ✅ key the frontend reads
        "lines":          line_results,
    }