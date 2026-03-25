import json
import os
from pathlib import Path
from typing import Any, Dict, Optional

import requests
from dotenv import load_dotenv


# Load backend/.env regardless of current working directory.
load_dotenv(Path(__file__).resolve().parent.parent / ".env")


class GeminiClient:
    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        timeout_seconds: int = 120,
    ):
        self.api_key = ((api_key or "").strip()) or os.getenv("GEMINI_API_KEY", "").strip()
        self.model = (model or os.getenv("GEMINI_MODEL", "") or "gemini-2.5-flash-lite").strip()
        self.timeout_seconds = timeout_seconds

    def _extract_json_object(self, text: str) -> str:
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            return text[start : end + 1]
        return text

    def generate_json(
        self,
        system_instruction: str,
        user_prompt: str,
        *,
        temperature: float = 0.4,
        max_output_tokens: int = 1200,
        model: Optional[str] = None,
    ) -> Any:
        """
        Generates JSON using Gemini REST API.
        Returns the parsed JSON result (dict or list).
        """
        if not self.api_key:
            raise RuntimeError("Missing GEMINI_API_KEY.")

        used_model = (model or self.model).strip()
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{used_model}:generateContent"
        headers = {
            "x-goog-api-key": self.api_key,
            "Content-Type": "application/json",
        }
        payload: Dict[str, Any] = {
            "system_instruction": {"parts": [{"text": system_instruction}]},
            "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
            "generationConfig": {
                "responseMimeType": "application/json",
                "temperature": temperature,
                "maxOutputTokens": max_output_tokens,
            },
        }

        resp = requests.post(url, headers=headers, json=payload, timeout=self.timeout_seconds)
        resp.raise_for_status()
        data = resp.json()

        candidates = data.get("candidates") or []
        if not candidates:
            raise RuntimeError(f"Gemini returned no candidates: {data}")

        content = candidates[0].get("content") or {}
        parts = content.get("parts") or []
        text = parts[0].get("text") if parts else ""
        if not text:
            raise RuntimeError(f"Gemini returned empty text: {data}")

        try:
            return json.loads(text)
        except json.JSONDecodeError:
            return json.loads(self._extract_json_object(text))

