import re
import logging

logger = logging.getLogger(__name__)

# ── Known scam numbers (crowd-sourced) ────────────────────────────────────────
# Format: "10-digit-number": "report description"
KNOWN_SCAM_NUMBERS = {
    "9999999999": "Test/fake number",
    "8800000000": "Reported telecom fraud",
    "7777777777": "Repeated pattern — fake number",
    "9090909090": "Reported investment scam",
    "8888888888": "Repeated pattern — fake number",
    # Add community-reported numbers here
}

# ── Prefixes with elevated scam risk ──────────────────────────────────────────
# Based on TRAI complaint data patterns
HIGH_RISK_PREFIXES = [
    '140', '141', '142', '143', '144', '145', '146', '147', '148', '149',
    # Telemarketing / commercial ranges
    '160', '161',
]

# These prefixes are sometimes associated with VoIP spoofing
VOIP_PREFIXES = ['700', '701', '702', '703']

# ── Indian operator prefix validation ─────────────────────────────────────────
# Valid Indian mobile numbers start with 6, 7, 8, or 9
VALID_FIRST_DIGITS = set('6789')

# ── Known spam/robocall patterns ──────────────────────────────────────────────
SEQUENTIAL_NUMBERS = {
    '1234567890', '0987654321', '9876543210',
    '1111111111', '2222222222', '3333333333',
    '4444444444', '5555555555', '6666666666',
    '7777777777', '8888888888', '9999999999',
    '0000000000',
}

# ── International country code risk map ───────────────────────────────────────
HIGH_RISK_COUNTRY_CODES = {
    '+234': 'Nigeria (advance-fee fraud)',
    '+233': 'Ghana (romance/lottery scam)',
    '+254': 'Kenya (investment scam)',
    '+255': 'Tanzania',
    '+225': 'Côte d\'Ivoire',
    '+212': 'Morocco',
    '+216': 'Tunisia',
    '+44':  'UK (spoofed — verify carefully)',
    '+1':   'US/Canada (spoofed robocall risk)',
}

MODERATE_RISK_CODES = {'+91': 'India — check local patterns'}


def _normalize_number(raw: str) -> tuple[str, str | None]:
    """
    Returns (normalized_10_digit_or_full, country_code_or_None).
    Handles +91, 0, and plain 10-digit Indian numbers.
    Also detects international numbers.
    """
    clean = re.sub(r'[\s\-\(\)\.]', '', raw.strip())

    # Detect high-risk international codes first
    for code in HIGH_RISK_COUNTRY_CODES:
        if clean.startswith(code):
            return clean, code

    # Indian normalization
    if clean.startswith('+91'):
        return clean[3:], '+91'
    if clean.startswith('091'):
        return clean[3:], '+91'
    if clean.startswith('91') and len(clean) == 12:
        return clean[2:], '+91'
    if clean.startswith('0') and len(clean) == 11:
        return clean[1:], '+91'

    return clean, None


def _is_sequential(number: str) -> bool:
    if number in SEQUENTIAL_NUMBERS:
        return True
    # Ascending/descending run check
    digits = [int(d) for d in number]
    diffs  = [digits[i+1] - digits[i] for i in range(len(digits)-1)]
    if all(d == 1 for d in diffs) or all(d == -1 for d in diffs):
        return True
    return False


def _is_repeating(number: str) -> bool:
    unique = set(number)
    if len(unique) <= 2:
        return True
    # Check for repeating blocks like 123123123
    n = len(number)
    for block_len in range(1, n // 2 + 1):
        if n % block_len == 0:
            block = number[:block_len]
            if number == block * (n // block_len):
                return True
    return False


def check_phone_number(number: str) -> dict:
    """
    Comprehensive phone number scam analysis.
    Returns: { status, score, reasons, details }
    """
    raw_input = number.strip()
    if not raw_input:
        return {"status": "ERROR", "score": 0, "reasons": ["No number provided"], "details": {}}

    normalized, country_code = _normalize_number(raw_input)
    score   = 0
    reasons = []
    details = {
        "normalized":    normalized,
        "country_code":  country_code,
        "input":         raw_input,
        "is_indian":     country_code == '+91' or (len(normalized) == 10 and normalized[0] in VALID_FIRST_DIGITS),
    }

    # ── CHECK 1: Known scam number ─────────────────────────────────────────
    if normalized in KNOWN_SCAM_NUMBERS:
        return {
            "status":  "SCAM",
            "score":   98,
            "reasons": [
                f"Community reported: {KNOWN_SCAM_NUMBERS[normalized]}",
                "Flagged in PhishGuard scam database",
            ],
            "details": details,
        }

    # ── CHECK 2: High-risk international country code ──────────────────────
    if country_code in HIGH_RISK_COUNTRY_CODES:
        score   += 45
        reasons.append(f"High-risk country code ({country_code}): {HIGH_RISK_COUNTRY_CODES[country_code]}")
        details["risk_country"] = True

    # ── CHECK 3: Indian number format validation ────────────────────────────
    is_indian = country_code in ('+91', None) and len(normalized) == 10

    if is_indian:
        # Valid first digit check
        if normalized[0] not in VALID_FIRST_DIGITS:
            score   += 50
            reasons.append(f"Invalid Indian mobile prefix — must start with 6, 7, 8, or 9")
            details["invalid_prefix"] = True

        # High-risk prefixes (telemarketing/spoofed ranges)
        three_digit = normalized[:3]
        if three_digit in HIGH_RISK_PREFIXES:
            score   += 30
            reasons.append(f"High-risk number range ({three_digit}xxx) — often used in telecom fraud")

        if three_digit in VOIP_PREFIXES:
            score   += 20
            reasons.append(f"VoIP number range — caller identity may be spoofed")

    elif len(normalized) != 10 and country_code == '+91':
        score   += 40
        reasons.append(f"Invalid length ({len(normalized)} digits) — Indian mobile must be 10 digits")
        details["invalid_length"] = True

    elif len(normalized) < 7:
        score   += 50
        reasons.append(f"Too short to be a real phone number ({len(normalized)} digits)")

    # ── CHECK 4: Repeating digit pattern ───────────────────────────────────
    if _is_repeating(normalized):
        score   += 40
        reasons.append("Suspicious repeating digit pattern — likely fake or test number")
        details["repeating_pattern"] = True

    # ── CHECK 5: Sequential pattern ────────────────────────────────────────
    if _is_sequential(normalized):
        score   += 40
        reasons.append("Sequential digit pattern — almost certainly a fake number")
        details["sequential_pattern"] = True

    # ── CHECK 6: All same digit ────────────────────────────────────────────
    if len(set(normalized)) == 1:
        score   += 50
        reasons.append("All digits identical — invalid number")

    # ── CHECK 7: Unique digit poverty (very low variety) ──────────────────
    unique_digits = len(set(normalized))
    if unique_digits <= 2 and not _is_repeating(normalized):
        score   += 25
        reasons.append(f"Very low digit variety ({unique_digits} unique digits)")

    # ── CHECK 8: Number contains non-numeric chars ─────────────────────────
    if not normalized.replace('+', '').isdigit():
        score   += 20
        reasons.append("Number contains invalid characters")

    # ── Final status ───────────────────────────────────────────────────────
    final_score = min(score, 100)

    if final_score >= 60:
        status = "SCAM"
    elif final_score >= 30:
        status = "WARNING"
    else:
        status = "SAFE"

    if not reasons:
        reasons = ["No red flags detected — number appears legitimate"]

    details["score_breakdown"] = score

    return {
        "status":  status,
        "score":   final_score,
        "reasons": reasons,
        "details": details,
    }