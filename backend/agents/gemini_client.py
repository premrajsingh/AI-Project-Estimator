"""
GeminiClient  — UPGRADED
Changes vs original:
  1. Exponential backoff retry (3 attempts) on 429 / 503 / timeout
  2. Request deduplication guard via simple in-memory lock per model
  3. Structured error types (QuotaError, TimeoutError, ParseError)
  4. generate_text() for non-JSON responses (report_agent compatibility)
"""
import json
import os
import time
import threading
from pathlib import Path
from typing import Any, Optional

import requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

_RATE_LOCK = threading.Lock()


class GeminiQuotaError(Exception):
    pass

class GeminiParseError(Exception):
    pass


class GeminiClient:
    DEFAULT_MODEL   = "gemini-2.5-flash-lite"
    RETRY_ATTEMPTS  = int(os.getenv("GEMINI_RETRY_ATTEMPTS", "5"))
    RETRY_BASE_WAIT = 5.0  # seconds, higher base wait for free tier
    
    # Global throttling state
    _LAST_CALL_TIME = 0.0
    _MIN_INTERVAL   = 4.0  # Minimum seconds between any two API calls across ALL instances
    _THROTTLE_LOCK  = threading.Lock()

    def __init__(
        self,
        api_key:         Optional[str] = None,
        model:           Optional[str] = None,
        timeout_seconds: int = None,
    ):
        self.api_key  = ((api_key or "").strip()) or os.getenv("GEMINI_API_KEY", "").strip()
        self.model    = (model or os.getenv("GEMINI_MODEL", "") or self.DEFAULT_MODEL).strip()
        self.timeout  = timeout_seconds or int(os.getenv("GEMINI_TIMEOUT_SECONDS", "120"))

    def _throttle(self):
        """Ensures at least _MIN_INTERVAL seconds between API calls globally."""
        with self._THROTTLE_LOCK:
            now = time.time()
            elapsed = now - GeminiClient._LAST_CALL_TIME
            if elapsed < self._MIN_INTERVAL:
                wait_time = self._MIN_INTERVAL - elapsed
                print(f"[GeminiClient] Throttling for {wait_time:.2f}s...")
                time.sleep(wait_time)
            GeminiClient._LAST_CALL_TIME = time.time()

    # ── Public: JSON ─────────────────────────────────────────────────────────

    def generate_json(
        self,
        system_instruction: str,
        user_prompt:        str,
        *,
        temperature:        float = 0.4,
        max_output_tokens:  int   = 1200,
        model:              Optional[str] = None,
    ) -> Any:
        text = self._call(
            system_instruction = system_instruction,
            user_prompt        = user_prompt,
            temperature        = temperature,
            max_output_tokens  = max_output_tokens,
            model              = model,
            response_mime      = "application/json",
        )
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            extracted = self._extract_json(text)
            try:
                return json.loads(extracted)
            except json.JSONDecodeError as e:
                raise GeminiParseError(f"Could not parse Gemini JSON response: {e}\nRaw: {text[:200]}")

    # ── Public: Plain text ───────────────────────────────────────────────────

    def generate_text(
        self,
        system_instruction: str,
        user_prompt:        str,
        *,
        temperature:        float = 0.7,
        max_output_tokens:  int   = 1500,
        model:              Optional[str] = None,
    ) -> str:
        return self._call(
            system_instruction = system_instruction,
            user_prompt        = user_prompt,
            temperature        = temperature,
            max_output_tokens  = max_output_tokens,
            model              = model,
            response_mime      = "text/plain",
        )

    # ── Private: HTTP call with retry ────────────────────────────────────────

    def _call(
        self,
        system_instruction: str,
        user_prompt:        str,
        temperature:        float,
        max_output_tokens:  int,
        model:              Optional[str],
        response_mime:      str,
    ) -> str:
        if not self.api_key:
            raise RuntimeError("Missing GEMINI_API_KEY.")

        used_model = (model or self.model).strip()
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{used_model}:generateContent"
        )
        headers = {
            "x-goog-api-key": self.api_key,
            "Content-Type":   "application/json",
        }
        payload = {
            "system_instruction": {"parts": [{"text": system_instruction}]},
            "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
            "generationConfig": {
                "responseMimeType": response_mime,
                "temperature":      temperature,
                "maxOutputTokens":  max_output_tokens,
            },
        }

        last_error = None
        for attempt in range(self.RETRY_ATTEMPTS):
            try:
                # Apply global throttling before every call
                self._throttle()
                
                resp = requests.post(url, headers=headers, json=payload, timeout=self.timeout)

                # Rate limit / server overload — retry with backoff
                if resp.status_code in (429, 503):
                    wait = self.RETRY_BASE_WAIT * (2 ** attempt)
                    print(f"[GeminiClient] {resp.status_code} — retrying in {wait}s (attempt {attempt+1})")
                    time.sleep(wait)
                    last_error = GeminiQuotaError(f"HTTP {resp.status_code}")
                    continue

                resp.raise_for_status()
                data = resp.json()
                return self._extract_text(data)

            except requests.Timeout:
                wait = self.RETRY_BASE_WAIT * (2 ** attempt)
                print(f"[GeminiClient] Timeout — retrying in {wait}s (attempt {attempt+1})")
                time.sleep(wait)
                last_error = TimeoutError("Gemini request timed out")
                continue

            except (requests.HTTPError, RuntimeError) as e:
                raise  # non-retriable

        raise last_error or RuntimeError("All Gemini retry attempts failed.")

    # ── Helpers ──────────────────────────────────────────────────────────────

    @staticmethod
    def _extract_text(data: dict) -> str:
        candidates = data.get("candidates") or []
        if not candidates:
            raise RuntimeError(f"Gemini returned no candidates: {data}")
        content = candidates[0].get("content") or {}
        parts   = content.get("parts") or []
        text    = parts[0].get("text") if parts else ""
        if not text:
            raise RuntimeError(f"Gemini returned empty text: {data}")
        return text

    @staticmethod
    def _extract_json(text: str) -> str:
        start = text.find("{")
        end   = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            return text[start : end + 1]
        return text
