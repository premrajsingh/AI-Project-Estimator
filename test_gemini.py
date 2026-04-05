import asyncio
from backend.agents.gemini_client import GeminiClient
import os
import json
import httpx

async def main():
    gemini = GeminiClient()
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{gemini.model}:generateContent"
    headers = {"x-goog-api-key": gemini.api_key, "Content-Type": "application/json"}
    
    prompt = """Project description: Develop a full-stack e-commerce platform using the MERN stack.
Expected days: 30 | Team size: 1 | Experience: Intermediate
Hourly Rate: ₹1000/hr

Return ONLY valid JSON with exactly these keys:
"summary": string
"design_errors": list of objects
"cost_breakdown": object ...
"blueprint": string ...
"""
    payload = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {"responseMimeType": "application/json"}
    }
    
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, headers=headers, json=payload)
        print("Status", resp.status_code)
        try:
            print(resp.json())
        except Exception as e:
            print("Failed to decode:", resp.text)

asyncio.run(main())
