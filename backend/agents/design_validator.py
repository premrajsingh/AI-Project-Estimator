"""
DesignValidatorAgent
Detects scope/design errors BEFORE estimation runs.
Returns: list of DesignError objects or raises early if input is garbage.
"""
import json
import os
import re
from pathlib import Path
from dotenv import load_dotenv
from agents.gemini_client import GeminiClient

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

VAGUE_PHRASES = [
    "something like", "similar to", "kind of", "sort of",
    "idk", "etc", "blah", "test", "hello", "asap",
    "maybe", "quick", "simple", "basic", "just a",
]

MIN_WORDS = 25


class DesignValidatorAgent:
    def __init__(self):
        self.gemini = None
        key = (os.getenv("GEMINI_API_KEY") or "").strip()
        if key:
            self.gemini = GeminiClient(model=os.getenv("GEMINI_MODEL") or None)

    # ── Public ──────────────────────────────────────────────────────────────

    def validate(self, description: str, expected_days: int, team_size: int) -> dict:
        """
        Returns:
            {
              "valid": bool,
              "errors": [{"code": str, "message": str}],
              "warnings": [str],
              "project_type": str,
              "complexity": "low|medium|high|very_high"
            }
        """
        errors   = []
        warnings = []

        # ── Rule-based pre-checks ────────────────────────────────────────────
        word_count = len(description.split())
        if word_count < MIN_WORDS:
            errors.append({
                "code":    "DESCRIPTION_TOO_VAGUE",
                "message": f"Description has only {word_count} words. Provide at least {MIN_WORDS}.",
            })

        for phrase in VAGUE_PHRASES:
            if phrase.lower() in description.lower():
                warnings.append(f"Vague term detected: '{phrase}' — be more specific.")

        if expected_days < 1:
            errors.append({"code": "INVALID_TIMELINE", "message": "Expected days must be ≥ 1."})
        elif expected_days < 3 and word_count > 50:
            warnings.append("Timeline may be too tight for a complex project.")

        if team_size < 1:
            errors.append({"code": "INVALID_TEAM_SIZE", "message": "Team size must be ≥ 1."})

        # ── Bail early if obviously broken ──────────────────────────────────
        if any(e["code"] == "DESCRIPTION_TOO_VAGUE" for e in errors):
            return {
                "valid": False, "errors": errors, "warnings": warnings,
                "project_type": "unknown", "complexity": "unknown",
            }

        # ── AI validation ────────────────────────────────────────────────────
        if self.gemini:
            ai_result = self._ai_validate(description, expected_days, team_size)
            errors   += ai_result.get("errors", [])
            warnings += ai_result.get("warnings", [])
            return {
                "valid":        len(errors) == 0,
                "errors":       errors,
                "warnings":     warnings,
                "project_type": ai_result.get("project_type", "unknown"),
                "complexity":   ai_result.get("complexity", "medium"),
            }

        return {
            "valid":        len(errors) == 0,
            "errors":       errors,
            "warnings":     warnings,
            "project_type": "unknown",
            "complexity":   "medium",
        }

    # ── Private ─────────────────────────────────────────────────────────────

    def _ai_validate(self, description: str, days: int, team: int) -> dict:
        system_instruction = (
            "You are a strict CTO doing a pre-flight check on a project proposal. "
            "Be concise and ruthless — flag real problems only."
        )
        prompt = f"""
Project description: {description}
Expected days: {days} | Team size: {team}

Return ONLY valid JSON with these keys:
- "errors": list of objects with "code" (SCREAMING_SNAKE) and "message" (1 sentence, specific)
- "warnings": list of strings (1 sentence each, max 3)
- "project_type": one of [web_app, mobile_app, api_service, ml_system, data_pipeline, devtool, other]
- "complexity": one of [low, medium, high, very_high]

Flag these as errors if detected:
- NON_SOFTWARE_PROJECT: the description does not describe a software application, website, API, or technical system.
- AMBIGUOUS_SCOPE: the description is too high-level or lacks specific features to be estimated (e.g., "build a big app").
- UNREALISTIC_TIMELINE: feature count vs days makes no sense.
- MISSING_CORE_DETAILS: project needs a database/auth but neither are mentioned.
- TECHNOLOGY_CONFLICT: contradictory tech choices.

IMPORTANT: If the user asks for something nonsensical (e.g., "make a pizza", "baking"), you MUST return NON_SOFTWARE_PROJECT.
"""
        try:
            return self.gemini.generate_json(
                system_instruction=system_instruction,
                user_prompt=prompt,
                temperature=0.2,
                max_output_tokens=600,
            )
        except Exception as e:
            print(f"DesignValidator AI call failed: {e}")
            return {"errors": [], "warnings": [], "project_type": "unknown", "complexity": "medium"}
