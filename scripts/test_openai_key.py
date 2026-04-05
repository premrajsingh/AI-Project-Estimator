import os
import requests
import sys

def test_key(api_key):
    url = "https://api.openai.com/v1/models"
    headers = {
        "Authorization": f"Bearer {api_key}"
    }
    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            print("✅ Success: OpenAI API key is working.")
            return True
        else:
            print(f"❌ Failure: OpenAI API key returned status {response.status_code}.")
            print(f"Error Details: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error: Could not connect to OpenAI API. {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python test_openai_key.py <API_KEY>")
        sys.exit(1)
    
    key = sys.argv[1]
    test_key(key)
