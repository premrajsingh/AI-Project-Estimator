import os
import requests
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")

api_key = (os.getenv("GEMINI_API_KEY") or "").strip()
model = (os.getenv("GEMINI_MODEL") or "gemini-2.0-flash").strip()

url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

try:
    payload = {
        "contents": [
            {"role": "user", "parts": [{"text": "Say exactly: ok"}]}
        ],
        "generationConfig": {"temperature": 0.0, "maxOutputTokens": 10},
    }
    headers = {"x-goog-api-key": api_key, "Content-Type": "application/json"}
    resp = requests.post(url, headers=headers, json=payload, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    print("API Key is VALID.")
except Exception as e:
    print(f"API Key is INVALID: {e}")
