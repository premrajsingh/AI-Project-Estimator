import json
import os
import time
import asyncio
from pathlib import Path
from typing import Any, Optional

import httpx
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")


class OpenAIClient:
    DEFAULT_MODEL  = "gpt-4o-mini"
    RETRY_ATTEMPTS = 3
    RETRY_WAIT     = 5.0

    def __init__(
        self,
        api_key:         Optional[str] = None,
        model:           Optional[str] = None,
        timeout_seconds: int = 120,
    ):
        self.api_key = (api_key or os.getenv("OPENAI_API_KEY", "")).strip()
        self.model   = (model or os.getenv("OPENAI_MODEL", "") or self.DEFAULT_MODEL).strip()
        self.timeout = timeout_seconds

    async def generate_json(
        self,
        system_instruction: str,
        user_prompt:        str,
        *,
        temperature:        float = 0.5,
        max_tokens:         int   = 12000,
    ) -> Any:
        text = await self._call(
            system_instruction = system_instruction,
            user_prompt        = user_prompt,
            temperature        = temperature,
            max_tokens         = max_tokens,
            json_mode          = True
        )
        # Attempt 1: standard parse
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass
        
        # Attempt 2: strip markdown fences and retry
        extracted = self._extract_json(text)
        try:
            return json.loads(extracted)
        except json.JSONDecodeError:
            pass
        
        # Attempt 3: repair truncated/malformed JSON using json_repair
        try:
            from json_repair import repair_json
            repaired = repair_json(extracted or text, return_objects=True)
            if repaired and isinstance(repaired, (dict, list)):
                print(f"[OpenAIClient] JSON repaired successfully.")
                return repaired
        except Exception as repair_err:
            print(f"[OpenAIClient] json_repair also failed: {repair_err}")
        
        raise ValueError(f"OpenAI returned unparseable JSON: {text[:200]}")

    async def generate_text(
        self,
        system_instruction: str,
        user_prompt:        str,
        *,
        temperature:        float = 0.7,
        max_tokens:         int   = 4000,
    ) -> str:
        return await self._call(
            system_instruction = system_instruction,
            user_prompt        = user_prompt,
            temperature        = temperature,
            max_tokens         = max_tokens,
            json_mode          = False
        )

    async def _call(
        self,
        system_instruction: str,
        user_prompt:        str,
        temperature:        float,
        max_tokens:         int,
        json_mode:          bool = False
    ) -> str:
        if not self.api_key:
            raise RuntimeError("Missing OPENAI_API_KEY.")

        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type":  "application/json",
        }
        
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": user_prompt}
            ],
            "temperature":       temperature,
            "max_tokens":        max_tokens,
            "response_format":   {"type": "json_object"} if json_mode else {"type": "text"}
        }

        # Increase retries for stability
        max_retries = int(os.getenv("OPENAI_RETRY_ATTEMPTS", "8"))
        base_wait   = float(os.getenv("OPENAI_RETRY_WAIT", "5.0"))

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            for attempt in range(max_retries):
                try:
                    resp = await client.post(url, headers=headers, json=payload)
                    
                    if resp.status_code == 429:
                        wait = base_wait * (2 ** attempt)
                        print(f"[OpenAIClient] Rate limited. Retrying in {wait}s (attempt {attempt+1})")
                        await asyncio.sleep(wait)
                        continue
                        
                    resp.raise_for_status()
                    data = resp.json()
                    return data["choices"][0]["message"]["content"]
                    
                except (httpx.HTTPStatusError, httpx.RequestError) as e:
                    if attempt == max_retries - 1:
                        print(f"[OpenAIClient] Permanent failure after {max_retries} attempts: {e}")
                        raise e
                    wait = 2.0 * (attempt + 1)
                    print(f"[OpenAIClient] Request failed ({e}). Retrying in {wait}s...")
                    await asyncio.sleep(wait)
        
        raise RuntimeError(f"OpenAI call failed after {max_retries} attempts.")

    @staticmethod
    def _extract_json(text: str) -> str:
        start = text.find("{")
        end   = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            return text[start : end + 1]
        return text
