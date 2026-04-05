import os
import requests
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")

api_key = (os.getenv("GEMINI_API_KEY") or "").strip()
url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"

try:
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    models = [m['name'] for m in data.get('models', [])]
    print("Available Models:")
    for m in models:
        print(f" - {m}")
except Exception as e:
    print(f"Error fetching models: {e}")
