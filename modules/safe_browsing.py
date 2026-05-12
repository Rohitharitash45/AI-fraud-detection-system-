import requests
import os
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("GOOGLE_API_KEY")

def check_url_google(url):
    endpoint = f"https://safebrowsing.googleapis.com/v4/threatMatches:find?key={API_KEY}"

    payload = {
        "client": {
            "clientId": "phisGuard",
            "clientVersion": "1.0"
        },
        "threatInfo": {
            "threatTypes": ["MALWARE", "SOCIAL_ENGINEERING"],
            "platformTypes": ["ANY_PLATFORM"],
            "threatEntryTypes": ["URL"],
            "threatEntries": [{"url": url}]
        }
    }

    try:
        response = requests.post(endpoint, json=payload)
        result = response.json()

        if "matches" in result:
            return {
                "status": "malicious",
                "source": "Google Safe Browsing"
            }
        else:
            return {
                "status": "safe",
                "source": "Google Safe Browsing"
            }

    except Exception as e:
        return {
            "status": "unknown",
            "error": str(e)
        }