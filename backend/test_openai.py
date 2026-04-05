import os
import httpx
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("OPENAI_API_KEY")
model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

print(f"Testing OpenAI Key: {api_key[:10]}...{api_key[-5:]}")
print(f"Model: {model}")

url = "https://api.openai.com/v1/chat/completions"
headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json",
}
payload = {
    "model": model,
    "messages": [
        {"role": "user", "content": "Say hello world"}
    ],
    "max_tokens": 5
}

try:
    resp = httpx.post(url, headers=headers, json=payload, timeout=20)
    print(f"Status Code: {resp.status_code}")
    if resp.status_code == 200:
        print("Success! Key is working.")
        print(resp.json()["choices"][0]["message"]["content"])
    else:
        print("Error details:")
        print(resp.json())
except Exception as e:
    print(f"Network error: {e}")
