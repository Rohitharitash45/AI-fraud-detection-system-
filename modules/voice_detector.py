import os
import logging
import numpy as np

logger = logging.getLogger(__name__)

# ── Scam keyword categories with weights ───────────────────────────────────────
SCAM_KEYWORD_GROUPS = {
    "kyc_fraud":     {"keywords": ["kyc", "aadhar", "pan card", "verify kyc", "kyc update", "link aadhaar"], "weight": 30},
    "bank_fraud":    {"keywords": ["bank", "account blocked", "debit card", "credit card", "atm", "ifsc", "net banking"], "weight": 28},
    "otp_theft":     {"keywords": ["otp", "one time", "password", "share otp", "tell otp", "do not share"], "weight": 35},
    "tax_fraud":     {"keywords": ["income tax", "itr", "tds", "tax notice", "tax refund", "it department", "tax evasion"], "weight": 30},
    "lottery_scam":  {"keywords": ["won", "prize", "lottery", "lucky", "claim", "congratulations", "selected"], "weight": 32},
    "loan_fraud":    {"keywords": ["loan", "emi", "approved", "low interest", "instant loan", "apply now"], "weight": 25},
    "job_fraud":     {"keywords": ["work from home", "part time", "earn daily", "salary", "offer letter", "joining"], "weight": 22},
    "legal_threat":  {"keywords": ["arrest", "police", "court", "legal action", "fir", "cybercrime", "warrant"], "weight": 40},
    "govt_fraud":    {"keywords": ["government", "pm scheme", "ration card", "subsidy", "yojana", "cm office"], "weight": 25},
    "urgency":       {"keywords": ["immediately", "urgent", "24 hours", "last chance", "expire", "final notice"], "weight": 18},
    "remote_access": {"keywords": ["teamviewer", "anydesk", "remote", "screen share", "install app", "download apk"], "weight": 45},
    "investment":    {"keywords": ["guaranteed return", "double money", "profit", "trading", "crypto", "forex"], "weight": 30},
}

# ── Suspicious audio file characteristics ─────────────────────────────────────
SUSPICIOUS_FORMATS = {'.m4a', '.ogg', '.amr', '.3gp'}   # less common, often used in scam recordings
SUSPICIOUS_NAMES   = [
    'scam', 'fraud', 'alert', 'warning', 'urgent', 'otp',
    'bank', 'kyc', 'verify', 'loan', 'prize', 'won', 'claim',
    'income', 'tax', 'refund', 'police', 'arrest',
]


def _analyze_filename(filename: str) -> tuple[int, list[str]]:
    """Score based on filename keywords."""
    name_lower = filename.lower()
    score      = 0
    patterns   = []

    for group_name, data in SCAM_KEYWORD_GROUPS.items():
        hits = [kw for kw in data["keywords"] if kw in name_lower]
        if hits:
            score += data["weight"]
            patterns.append(group_name.replace("_", " ").title())

    # Generic suspicious name check
    if any(s in name_lower for s in SUSPICIOUS_NAMES):
        score += 10

    return score, patterns


def _analyze_filesize(filesize: int) -> tuple[int, list[str]]:
    """Score based on audio file size heuristics."""
    score    = 0
    patterns = []

    if filesize < 10_000:          # < 10KB — too short to be a real call
        score += 20
        patterns.append("Suspiciously small audio file (<10KB)")
    elif filesize < 30_000:        # < 30KB
        score += 10
        patterns.append("Very short audio file (<30KB)")
    elif filesize > 50_000_000:    # > 50MB — unusually large
        score += 5
        patterns.append("Unusually large audio file")

    return score, patterns


def _analyze_format(filename: str) -> tuple[int, list[str]]:
    """Score based on file format."""
    score    = 0
    patterns = []
    ext      = os.path.splitext(filename.lower())[1]

    if ext in SUSPICIOUS_FORMATS:
        score += 12
        patterns.append(f"Less common audio format ({ext}) — often used in scam recordings")

    return score, patterns


def _analyze_audio_features(file_path: str) -> tuple[int, list[str], dict]:
    """
    ML audio feature analysis using librosa.
    Returns (score_boost, patterns, audio_details).
    """
    score    = 0
    patterns = []
    details  = {"voice_detected": False, "duration_sec": 0, "reason": "Not analysed"}

    try:
        import librosa

        y, sr = librosa.load(file_path, sr=None, duration=60)  # cap at 60s for speed
        duration = librosa.get_duration(y=y, sr=sr)
        details["duration_sec"] = round(duration, 1)

        if duration < 0.5:
            details["reason"] = "Audio too short to analyse"
            score += 15
            patterns.append("Audio clip extremely short — possibly a test/fake recording")
            return score, patterns, details

        # ── Feature extraction ─────────────────────────────────────────────
        zcr         = float(np.mean(librosa.feature.zero_crossing_rate(y)))
        rms_energy  = float(np.mean(librosa.feature.rms(y=y)))
        spectral_bw = float(np.mean(librosa.feature.spectral_bandwidth(y=y, sr=sr)))
        mfccs       = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
        mfcc_mean   = float(np.mean(mfccs))
        mfcc_std    = float(np.std(mfccs))

        details.update({
            "zcr":          round(zcr, 4),
            "rms_energy":   round(rms_energy, 4),
            "spectral_bw":  round(spectral_bw, 1),
            "mfcc_mean":    round(mfcc_mean, 2),
            "mfcc_std":     round(mfcc_std, 2),
        })

        # ── Voice detection ────────────────────────────────────────────────
        # Human voice: ZCR 0.01–0.25, RMS > 0.01, spectral BW 500–4000 Hz
        is_voice = (0.005 < zcr < 0.30 and rms_energy > 0.005 and 300 < spectral_bw < 6000)
        details["voice_detected"] = is_voice

        if not is_voice:
            details["reason"] = "No clear voice signal detected"
            score += 10
            patterns.append("Audio does not contain clear voice patterns")
        else:
            details["reason"] = "Voice-like audio detected"

        # ── Synthetic voice indicators ─────────────────────────────────────
        # AI/TTS voices often have very low ZCR variance and unnaturally stable energy
        zcr_frames = librosa.feature.zero_crossing_rate(y)[0]
        zcr_var    = float(np.var(zcr_frames))
        details["zcr_variance"] = round(zcr_var, 6)

        if zcr_var < 0.0005 and is_voice:
            score += 25
            patterns.append("Unusually uniform voice rhythm — possible AI/TTS speech")

        # Very flat energy profile = robocall/recorded message
        rms_frames = librosa.feature.rms(y=y)[0]
        rms_var    = float(np.var(rms_frames))
        details["rms_variance"] = round(rms_var, 6)

        if rms_var < 0.0001 and is_voice:
            score += 20
            patterns.append("Flat audio energy profile — likely pre-recorded robocall")

        # ── Silence ratio (robocalls have unnatural silence patterns) ──────
        silence_threshold = rms_energy * 0.1
        silent_frames     = np.sum(rms_frames < silence_threshold)
        silence_ratio     = silent_frames / len(rms_frames) if len(rms_frames) > 0 else 0
        details["silence_ratio"] = round(float(silence_ratio), 3)

        if silence_ratio > 0.5:
            score += 15
            patterns.append("High silence ratio — typical of robocall/scripted scam audio")

        # ── Clipping detection (common in compressed scam audio) ───────────
        clipping_ratio = float(np.mean(np.abs(y) > 0.95))
        details["clipping_ratio"] = round(clipping_ratio, 4)

        if clipping_ratio > 0.01:
            score += 10
            patterns.append("Audio clipping detected — low quality/compressed recording")

    except ImportError:
        details["reason"] = "librosa not installed — audio analysis skipped"
        logger.warning("librosa not available — audio features skipped")
    except Exception as e:
        details["reason"] = f"Audio analysis error: {str(e)}"
        logger.error(f"Audio analysis failed: {e}")

    return score, patterns, details


class VoiceDetector:

    def __init__(self):
        logger.info("VoiceDetector initialized")

    def predict(self, file) -> dict:
        filename = getattr(file, 'filename', 'unknown.mp3')
        temp_path = f"temp_voice_{os.getpid()}_{filename}"

        try:
            file.save(temp_path)
            filesize = os.path.getsize(temp_path)
        except Exception as e:
            logger.error(f"Could not save temp file: {e}")
            return {
                "label": "ERROR", "risk_score": 0,
                "detected_patterns": ["File save error"],
                "voice_detected": False,
                "audio_details": {}
            }

        score    = 0
        patterns = []

        # ── Layer 1: Filename analysis ─────────────────────────────────────
        fn_score, fn_patterns = _analyze_filename(filename)
        score    += fn_score
        patterns += fn_patterns

        # ── Layer 2: File size heuristics ──────────────────────────────────
        fs_score, fs_patterns = _analyze_filesize(filesize)
        score    += fs_score
        patterns += fs_patterns

        # ── Layer 3: Format analysis ───────────────────────────────────────
        fmt_score, fmt_patterns = _analyze_format(filename)
        score    += fmt_score
        patterns += fmt_patterns

        # ── Layer 4: Audio feature ML analysis ────────────────────────────
        audio_score, audio_patterns, audio_details = _analyze_audio_features(temp_path)
        score    += audio_score
        patterns += audio_patterns

        # ── Cleanup ────────────────────────────────────────────────────────
        try:
            os.remove(temp_path)
        except Exception:
            pass

        # ── Final verdict ──────────────────────────────────────────────────
        final_score = min(score, 100)

        if final_score >= 60:
            label = "FAKE"
        elif final_score >= 30:
            label = "SUSPICIOUS"
        else:
            label = "SAFE"

        return {
            "label":             label,
            "risk_score":        final_score,
            "detected_patterns": list(dict.fromkeys(patterns)),  # deduplicate
            "voice_detected":    audio_details.get("voice_detected", False),
            "audio_details":     audio_details,
        }