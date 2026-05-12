import pandas as pd
import re
import tldextract
import math
import joblib

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score

from sklearn.preprocessing import StandardScaler

# ─────────────────────────────────────────────
# Feature Functions
# ─────────────────────────────────────────────

def calculate_entropy(text):
    prob = [float(text.count(c)) / len(text) for c in dict.fromkeys(list(text))]
    return -sum([p * math.log2(p) for p in prob])


import re
import math
import tldextract

HIGH_RISK_TLDS = [
    '.tk', '.ml', '.ga', '.cf', '.top', '.xyz', '.site', '.online'
]

SUSPICIOUS_WORDS = [
    'login', 'verify', 'secure', 'account', 'update',
    'bank', 'payment', 'wallet', 'confirm'
]

URL_SHORTENERS = [
    'bit.ly', 'tinyurl.com', 't.co', 'goo.gl'
]


def calculate_entropy(text):
    if not text:
        return 0
    prob = [float(text.count(c)) / len(text) for c in dict.fromkeys(list(text))]
    return -sum([p * math.log2(p) for p in prob])


def extract_features(url):
    url = str(url).lower()

    ext = tldextract.extract(url)
    domain = ext.domain
    subdomain = ext.subdomain
    suffix = ext.suffix

    features = {}

    # ── Basic features ─────────────────────────
    features["url_length"] = len(url)
    features["num_dots"] = url.count('.')
    features["num_hyphens"] = url.count('-')
    features["num_digits"] = sum(c.isdigit() for c in url)
    features["num_special_chars"] = len(re.findall(r'[^a-zA-Z0-9]', url))

    # ── Structure features ─────────────────────
    features["has_https"] = int(url.startswith("https"))
    features["has_http"] = int(url.startswith("http://"))
    features["has_at_symbol"] = int('@' in url)
    features["has_ip"] = int(bool(re.search(r"\d+\.\d+\.\d+\.\d+", url)))

    # ── Domain features ────────────────────────
    features["domain_length"] = len(domain)
    features["subdomain_length"] = len(subdomain)
    features["subdomain_depth"] = len(subdomain.split('.')) if subdomain else 0
    features["entropy"] = calculate_entropy(domain)

    # ── Intelligence features (🔥 IMPORTANT) ───
    features["has_high_risk_tld"] = int(f".{suffix}" in HIGH_RISK_TLDS)

    features["has_suspicious_words"] = int(
        any(word in url for word in SUSPICIOUS_WORDS)
    )

    TRUSTED_DOMAINS = [
    "google", "youtube", "amazon", "facebook", "microsoft"]
    features["is_trusted_brand"] = int(domain in TRUSTED_DOMAINS)

    features["is_shortened"] = int(
        any(short in url for short in URL_SHORTENERS)
    )

    # Simple brand detection (light version)
    features["has_brand"] = int(
        any(b in url for b in ["paypal", "google", "bank", "amazon"])
    )
    

    # Simple typo detection (basic)
    features["is_typo"] = int(
        any(fake in url for fake in ["paypol", "g00gle", "faceb00k"])
    )

    return features

# ─────────────────────────────────────────────
# Load Dataset
# ─────────────────────────────────────────────

print("📥 Loading dataset...")
df = pd.read_csv("dataSet/malicious_phish.csv")  # change filename if needed

print("Dataset shape:", df.shape)

# ─────────────────────────────────────────────
# Label Mapping
# ─────────────────────────────────────────────

print("🔄 Converting labels...")

def map_label(x):
    return 0 if x == "benign" else 1

df['label'] = df['type'].apply(map_label)

# ─────────────────────────────────────────────
# Feature Extraction
# ─────────────────────────────────────────────

print("⚙️ Extracting features... (this may take time)")

feature_list = []

for url in df['url']:
    try:
        feature_list.append(extract_features(url))
    except:
        feature_list.append({})

X = pd.DataFrame(feature_list).fillna(0)
y = df['label']

print("Features shape:", X.shape)

# ─────────────────────────────────────────────
# Train-Test Split
# ─────────────────────────────────────────────

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

scaler = StandardScaler()
X_train = scaler.fit_transform(X_train)
X_test = scaler.transform(X_test)
# ─────────────────────────────────────────────
# Model Training
# ─────────────────────────────────────────────

print("🤖 Training model...")

model = RandomForestClassifier(
    n_estimators=150,
    max_depth=15,
    class_weight="balanced",
    n_jobs=-1,
    random_state=42
)

model.fit(X_train, y_train)

# ─────────────────────────────────────────────
# Evaluation
# ─────────────────────────────────────────────

print("📊 Evaluating model...")

y_pred = model.predict(X_test)

print("\nAccuracy:", accuracy_score(y_test, y_pred))
print("\nClassification Report:\n")
print(classification_report(y_test, y_pred))

# ─────────────────────────────────────────────
# Save Model
# ─────────────────────────────────────────────

print("💾 Saving model...")
# Save model
joblib.dump(model, "phishing_model.pkl")

# Save feature order (VERY IMPORTANT)
joblib.dump(X.columns.tolist(), "feature_columns.pkl")

joblib.dump(scaler, "scaler.pkl")


print("✅ Model + feature columns saved")
