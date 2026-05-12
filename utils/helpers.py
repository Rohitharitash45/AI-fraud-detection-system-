import math
import re
from utils.constants import (
    ABUSED_LEGIT_HOSTS, SUSPICIOUS_PATH_WORDS,
    TYPOSQUAT_TARGETS, EVASION_PATTERNS, SUSPICIOUS_DOMAIN_WORDS
)


def calculate_entropy(text: str) -> float:
    """Shannon entropy of a string — high entropy → random/obfuscated domain."""
    if not text:
        return 0.0
    probs = [text.count(c) / len(text) for c in set(text)]
    return -sum(p * math.log2(p) for p in probs)


def check_typosquatting(domain_part: str):
    """
    Returns (True, legit_brand) if domain_part matches a known typosquat variant,
    otherwise (False, None).
    """
    for legit, variants in TYPOSQUAT_TARGETS:
        if any(v in domain_part for v in variants):
            return True, legit
    return False, None


def check_abused_legitimate(url: str):
    """
    Returns (is_abused, path_hits, host) if URL uses a trusted platform
    with suspicious path keywords.
    """
    for host in ABUSED_LEGIT_HOSTS:
        if host in url:
            path = url.split(host)[-1]
            path_hits = sum(1 for w in SUSPICIOUS_PATH_WORDS if w in path)
            return True, path_hits, host
    return False, 0, None


def check_evasion_patterns(url: str):
    """Returns list of (label, pattern) tuples for matched evasion techniques."""
    return [(label, p) for p, label in EVASION_PATTERNS if re.search(p, url)]


def count_suspicious_domain_words(domain_name: str) -> int:
    """Counts how many suspicious keywords appear in the domain name."""
    return sum(1 for w in SUSPICIOUS_DOMAIN_WORDS if w in domain_name)