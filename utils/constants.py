# ─────────────────────────── THREAT INTELLIGENCE DATABASES ───────────────────

ABUSED_LEGIT_HOSTS = [
    'docs.google.com', 'drive.google.com', 'forms.gle',
    'github.io', 'raw.githubusercontent.com', 'dropbox.com',
    'onedrive.live.com', 'firebaseapp.com', 'web.app',
    'notion.site', 'netlify.app', 'vercel.app', 'workers.dev', 'pages.dev', 'glitch.me'
]

SUSPICIOUS_PATH_WORDS = [
    'login', 'verify', 'account', 'secure', 'update', 'confirm',
    'paypal', 'sbi', 'hdfc', 'bank', 'kyc', 'suspended', 'blocked',
    'reward', 'prize', 'free', 'claim', 'password', 'credentials', 'otp', 'aadhar', 'pan'
]

TYPOSQUAT_TARGETS = [
    ('google',    ['go0gle', 'g00gle', 'googIe', 'goog1e', 'gooogle']),
    ('paypal',    ['paypa1', 'paypaI', 'paypall', 'paypai']),
    ('amazon',    ['amaz0n', 'amazom', 'arnazon', 'amazzon']),
    ('netflix',   ['netfl1x', 'netf1ix', 'netfflix']),
    ('apple',     ['app1e', 'appl3', 'appie']),
    ('microsoft', ['micros0ft', 'micosoft']),
    ('facebook',  ['faceb00k', 'faceboook', 'facebok']),
    ('instagram', ['1nstagram', 'instagramm', 'lnstagram']),
    ('hdfc',      ['hdf0', 'hdtc', 'hdfcc']),
    ('sbi',       ['sb1', 'sbl', 's8i']),
]

EVASION_PATTERNS = [
    (r'blob:',                     "Blob URI (Memory-Only, Undetectable by Crawlers)"),
    (r'[?&]redirect=',             "Open Redirect Parameter"),
    (r'[?&]url=http',              "URL Injection Parameter"),
    (r'[?&]goto=',                 "Goto Redirect Parameter"),
    (r'%[0-9a-f]{2}%[0-9a-f]{2}', "Double URL Encoding (Obfuscation)"),
]

SUSPICIOUS_DOMAIN_WORDS = [
    'bank', 'secure', 'login', 'verify', 'update', 'account', 'payment', 'service',
    'support', 'portal', 'official', 'alert', 'confirm', 'free', 'prize', 'lucky',
    'win', 'reward', 'cashback', 'gift', 'lottery', 'restaurant', 'catering', 'garden',
    'shop', 'store', 'market', 'trade', 'solutions', 'services', 'group', 'enterprise',
    'global', 'india', 'wallet', 'kyc', 'otp',
]

SMS_SCAM_VECTORS = {
    'urgency': {
        'keywords': ['immediately', 'today', 'blocked', 'warning', '24 hours', 'expired',
                     'suspended', 'arrest', 'legal action',
                     'turant', 'abhi', 'aaj', 'band', 'rokna', 'khatam'],
        'score': 35, 'label': '🚨 Urgency / Pressure Tactic'
    },
    'financial': {
        'keywords': ['won', 'lottery', 'cashback', 'gift', 'prize', 'reward', 'kbc',
                     'refund', 'credited', 'free', 'lucky draw', 'jackpot',
                     'gpay', 'phonepe', 'bhim', 'paytm', 'upi', 'transfer now'],
        'score': 30, 'label': '💰 Financial Bait / UPI Scam'
    },
    'otp_fraud': {
        'keywords': ['otp', 'one time password', 'share otp', 'enter otp',
                     'verification code', '6 digit code', 'otp mat share'],
        'score': 40, 'label': '🔐 OTP Fraud Attempt'
    },
    'job_scam': {
        'keywords': ['job offer', 'work from home', 'earn daily', 'part time',
                     'per day earning', 'registration fee', 'joining fee',
                     'salary package', 'immediate joining', 'data entry job'],
        'score': 30, 'label': '💼 Fake Job Offer Scam'
    },
    'loan_scam': {
        'keywords': ['instant loan', 'loan approved', 'pre approved loan',
                     'low interest loan', 'apply now loan', 'loan disburse',
                     'personal loan offer', 'loan without documents'],
        'score': 30, 'label': '🏦 Fake Loan Offer Scam'
    },
    'action': {
        'keywords': ['click', 'bit.ly', 'tinyurl', 'verify', 'link', 'update',
                     'http', '.apk', 'download', 'install', 'scan qr'],
        'score': 25, 'label': '🔗 Suspicious Call-to-Action'
    },
    'authority': {
        'keywords': ['bank', 'kyc', 'official', 'department', 'manager', 'support',
                     'rbi', 'income tax', 'trai', 'police', 'government', 'court'],
        'score': 20, 'label': '🏛️ Authority Impersonation'
    },
    'ai_crafted': {
        'keywords': ['following up', 'as discussed', 'as mentioned', 'per our call',
                     'regarding your', 'as per our email', 'completing your kyc'],
        'score': 20, 'label': '🤖 AI-Crafted Contextual Lure'
    },
    'quishing': {
        'keywords': ['scan qr', 'qr code', 'scan this', 'scan the code', 'scan below'],
        'score': 25, 'label': '📷 QR Code Phishing (Quishing)'
    },
}

# ── Scam Number Database ────────────────────────────────────────────────────
KNOWN_SCAM_NUMBERS = {
    "9876543210": "Electricity Bill Scam",
    "9000011111": "Fake KYC Update",
    "8800000000": "Lottery / Prize Fraud",
    "7777777777": "KBC Scam",
    "9999999999": "Fake Bank Support",
    "8888888888": "Insurance Fraud",
    "9090909090": "Fake Government Scheme",
    "7700900900": "Telecom Fraud",
}

INDIAN_SCAM_PREFIXES = ['700', '900']

# ── Feature Names for ML Model ───────────────────────────────────────────────
FEATURE_NAMES = [
    'dots', 'is_ip', 'has_brand', 'is_shortened',
    'url_length', 'has_https', 'domain_length', 'is_typosquat'
]

# ── Phishing Patterns for Endee / Semantic Search ────────────────────────────
PHISHING_PATTERNS = [
    {"id": "p1",  "text": "verify your bank account immediately or it will be suspended", "label": "phishing"},
    {"id": "p2",  "text": "you won a lottery click here to claim your prize",             "label": "phishing"},
    {"id": "p3",  "text": "your paypal account has been limited please login now",        "label": "phishing"},
    {"id": "p4",  "text": "urgent kyc update required your account will be blocked",      "label": "phishing"},
    {"id": "p5",  "text": "sbi yono bank account suspended update details",               "label": "phishing"},
    {"id": "p6",  "text": "click this link to get free cashback reward",                  "label": "phishing"},
    {"id": "p7",  "text": "electricity bill payment link official government portal",     "label": "phishing"},
    {"id": "p8",  "text": "netflix subscription expired update payment method",           "label": "phishing"},
    {"id": "p9",  "text": "amazon delivery failed reschedule your package now",           "label": "phishing"},
    {"id": "p10", "text": "apple id verification required immediately",                   "label": "phishing"},
    {"id": "p11", "text": "following up on the email we sent about your delivery",        "label": "phishing"},
    {"id": "p12", "text": "as per our call please verify your identity to continue",      "label": "phishing"},
    {"id": "p13", "text": "your google drive file has been shared click to view",         "label": "phishing"},
    {"id": "p14", "text": "github repository access request please confirm login",        "label": "phishing"},
    {"id": "p15", "text": "your microsoft account suspicious activity detected verify",   "label": "phishing"},
    {"id": "s1",  "text": "your monthly bank statement is ready to download",             "label": "safe"},
    {"id": "s2",  "text": "order confirmation thank you for your purchase",               "label": "safe"},
    {"id": "s3",  "text": "meeting scheduled for tomorrow at 10am",                       "label": "safe"},
    {"id": "s4",  "text": "your password was changed successfully",                       "label": "safe"},
    {"id": "s5",  "text": "welcome to our newsletter you can unsubscribe anytime",        "label": "safe"},
]