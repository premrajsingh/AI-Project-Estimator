"""
PlanningAgent  — UPGRADED
Changes vs original:
  1. Full CTO-mode system prompt with all 9 output sections
  2. Module-wise cost breakdown table
  3. Optimistic / Realistic / Worst-case time estimates
  4. Design errors surfaced before estimation
  5. AI suggestions (better stack, MVP, cost reduction)
  6. Code review section if code_snippet is provided in data
"""
import asyncio
import base64
import os
from pathlib import Path

from pypdf import PdfReader
from dotenv import load_dotenv

from agents.gemini_client    import GeminiClient
from agents.design_validator import DesignValidatorAgent
from agents.health_agent     import HealthScoreAgent
from database.mongo          import update_planning

load_dotenv(Path(__file__).resolve().parent.parent / ".env")


class PlanningAgent:
    def __init__(self, planning_id: str):
        self.planning_id  = planning_id
        self.gemini       = None
        key = (os.getenv("GEMINI_API_KEY") or "").strip()
        if key:
            self.gemini = GeminiClient(
                model           = os.getenv("GEMINI_MODEL") or None,
                timeout_seconds = int(os.getenv("GEMINI_TIMEOUT_SECONDS") or "120"),
            )

    # ── Entry Point ──────────────────────────────────────────────────────────

    async def analyze(self, data: dict, file_path: str = None, file_type: str = None, hourly_rate: int = 1000):
        try:
            print(f"[{self.planning_id}] Planning started")

            description   = (data.get("description") or "").strip()
            team_size     = data.get("team_size", 1)
            experience    = data.get("experience", "Intermediate")
            expected_days = data.get("expected_days", 30)
            code_snippet  = (data.get("code_snippet") or "").strip()

            # ── Step 1: Design Validation ────────────────────────────────────
            validator    = DesignValidatorAgent()
            design_check = validator.validate(description, expected_days, team_size)

            if not design_check["valid"]:
                await update_planning(self.planning_id, {
                    "status":        "design_error",
                    "design_result": design_check,
                    "error_message": "Design errors detected before estimation.",
                })
                return

            # ── Step 2: Extract file content ─────────────────────────────────
            extracted_text = ""
            base64_image   = None
            if file_path:
                if file_type == "application/pdf":
                    extracted_text = self._pdf_to_text(file_path)
                elif file_type and file_type.startswith("image/"):
                    base64_image = self._encode_image(file_path)

            # ── Step 3: AI Estimation ────────────────────────────────────────
            if not self.gemini:
                result = self._local_fallback(description, expected_days, team_size, hourly_rate)
            else:
                result = await self._ai_estimate(
                    description, team_size, experience,
                    expected_days, extracted_text, base64_image, code_snippet,
                    hourly_rate = hourly_rate
                )

            # ── Step 4: Health Score ─────────────────────────────────────────
            health_agent = HealthScoreAgent()
            health = health_agent.compute(
                metrics       = {"total_loc": 0, "avg_complexity": 0, "duplication_percentage": 0},
                design_errors = design_check.get("errors", []),
                estimations   = {
                    "predicted_time_days":    result.get("estimated_days", expected_days),
                    "predicted_cost_dollars": result.get("cost_breakdown", {}).get("total", 0),
                    "confidence":             0.75,
                },
            )

            await update_planning(self.planning_id, {
                "estimation":    result,
                "design_result": design_check,
                "health":        health,
                "status":        "completed",
            })
            print(f"[{self.planning_id}] Planning completed ✓")

        except Exception as e:
            print(f"[{self.planning_id}] Planning FAILED: {e}")
            await update_planning(self.planning_id, {
                "status":        "failed",
                "error_message": str(e),
            })

    # ── AI Estimation ────────────────────────────────────────────────────────

    async def _ai_estimate(
        self, description, team_size, experience,
        expected_days, extracted_text, base64_image, code_snippet,
        hourly_rate = 1000,
    ) -> dict:
        system_instruction = """
You are a Senior AI Software Architect, CTO, and Project Estimation Expert.
Be strict, short, and practical. No fluff.
Output SHORT, CUSTOMIZED, HIGH-VALUE responses.
Think like a real CTO — reject unrealistic inputs, flag real risks.
""".strip()

        doc_section = f"\n### Attached document\n{extracted_text}" if extracted_text else ""
        code_section = f"\n### Code to review\n```\n{code_snippet[:3000]}\n```" if code_snippet else ""

        prompt = f"""
Project description: {description}
Expected days: {expected_days} | Team size: {team_size} | Experience: {experience}
{doc_section}
{code_section}

Hourly Rate: ₹{hourly_rate}/hr

Return ONLY valid JSON with exactly these keys:

"summary": string — 2-3 sentence crisp project summary

"design_errors": list of objects with "code" and "message" — any architectural red flags

"cost_breakdown": object with:
  "total": int (INR)
  "min": int
  "expected": int
  "premium": int
  "by_module": list of {{"module": string, "cost": int, "percentage": int}}
  "by_role": list of {{"role": string, "hours": int, "rate": int, "total": int}}

"time_estimate": object with:
  "optimistic_days": int
  "realistic_days": int
  "worst_case_days": int
  "phases": list of {{"phase": string, "days": int, "deliverable": string}}

"estimated_days": int (use realistic_days value)

"health_inputs": object with "clarity": int(0-25), "feasibility": int(0-25)

"risks": list of objects with "type", "severity" ("high|medium|low"), "mitigation" (1 sentence)

"challenges": list of strings (concrete technical challenges identified)

"ai_suggestions": object with:
  "better_stack": list of strings (specific tech recommendations)
  "mvp_scope": string (what to cut for MVP)
  "cost_reduction_tips": list of strings

"code_review": object (only if code was provided, else null) with:
  "issues": list of {{"severity": "error|warning|info", "message": string}}
  "improvements": list of strings

"blueprint": string — Detailed Markdown architecture. Include: 
  - Backend/Frontend Stack (specific versions/libs)
  - Data Model (essential schemas)
  - API Design (core endpoints)
  - Security & Scalability strategy
  - Step-by-step build plan (numbered, 12–25 steps; from repo setup → deploy)
  - Feature roadmap (MVP → v1 → v2)
"""
        parts = [{"text": prompt}]
        if base64_image:
            parts.append({"inline_data": {"mime_type": "image/jpeg", "data": base64_image}})

        payload = {
            "system_instruction": {"parts": [{"text": system_instruction}]},
            "contents": [{"role": "user", "parts": parts}],
            "generationConfig": {
                "responseMimeType": "application/json",
                "temperature":      0.4,
                "maxOutputTokens":  3000,
            },
        }

        import requests as _req
        url     = f"https://generativelanguage.googleapis.com/v1beta/models/{self.gemini.model}:generateContent"
        headers = {"x-goog-api-key": self.gemini.api_key, "Content-Type": "application/json"}
        resp    = await asyncio.to_thread(
            lambda: _req.post(url, headers=headers, json=payload, timeout=self.gemini.timeout)
        )
        resp.raise_for_status()
        import json
        data = resp.json()
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        return json.loads(text)

    # ── Local Fallback ───────────────────────────────────────────────────────

    def _local_fallback(self, description, expected_days, team_size, hourly_rate=1000) -> dict:
        total_hours = expected_days * 8 * team_size
        total_cost  = total_hours * hourly_rate

        return {
            "summary": f"Project estimated at {expected_days} days with a team of {team_size}.",
            "design_errors": [],
            "cost_breakdown": {
                "total":    total_cost,
                "min":      int(total_cost * 0.7),
                "expected": total_cost,
                "premium":  int(total_cost * 1.4),
                "by_module": [
                    {"module": "Development", "cost": int(total_cost * 0.6), "percentage": 60},
                    {"module": "Testing",     "cost": int(total_cost * 0.2), "percentage": 20},
                    {"module": "DevOps",      "cost": int(total_cost * 0.1), "percentage": 10},
                    {"module": "Management",  "cost": int(total_cost * 0.1), "percentage": 10},
                ],
                "by_role": [
                    {"role": "Backend Dev",  "hours": int(total_hours * 0.4), "rate": 50, "total": int(total_hours * 0.4 * 50)},
                    {"role": "Frontend Dev", "hours": int(total_hours * 0.3), "rate": 45, "total": int(total_hours * 0.3 * 45)},
                    {"role": "QA Engineer",  "hours": int(total_hours * 0.2), "rate": 35, "total": int(total_hours * 0.2 * 35)},
                    {"role": "DevOps",       "hours": int(total_hours * 0.1), "rate": 60, "total": int(total_hours * 0.1 * 60)},
                ],
            },
            "time_estimate": {
                "optimistic_days": max(1, int(expected_days * 0.7)),
                "realistic_days":  expected_days,
                "worst_case_days": int(expected_days * 1.5),
                "phases": [
                    {"phase": "Discovery & Setup",   "days": max(1, int(expected_days * 0.1)), "deliverable": "Tech spec"},
                    {"phase": "Core Development",    "days": max(1, int(expected_days * 0.6)), "deliverable": "Working MVP"},
                    {"phase": "Testing & QA",        "days": max(1, int(expected_days * 0.2)), "deliverable": "Bug-free build"},
                    {"phase": "Deployment & Launch", "days": max(1, int(expected_days * 0.1)), "deliverable": "Live app"},
                ],
            },
            "estimated_days": expected_days,
            "risks": [
                {"type": "Underestimation", "severity": "medium", "mitigation": "Add 30% buffer to timeline."},
                {"type": "Scope Creep",     "severity": "high",   "mitigation": "Freeze requirements after sprint 1."},
            ],
            "challenges": [
                "Complex requirement validation logic.",
                "Real-time state synchronization.",
                "Frontend-backend data consistency."
            ],
            "ai_suggestions": {
                "better_stack":        ["FastAPI + React + PostgreSQL is a proven, cost-effective stack."],
                "mvp_scope":           "Launch with core CRUD + auth. Cut analytics and admin panels for v1.",
                "cost_reduction_tips": ["Use managed cloud DB to avoid DBA cost.", "Serverless for low-traffic endpoints."],
            },
            "code_review": None,
            "blueprint": (
                "# Blueprint\n\n"
                "## Stack\n"
                "FastAPI · React · PostgreSQL · Docker\n\n"
                "## Step-by-step build plan\n"
                "1. Create repo + env setup (Python venv, Node deps).\n"
                "2. Define data model (users, core entities) and migrations.\n"
                "3. Implement auth (register/login, JWT, RBAC).\n"
                "4. Build core CRUD APIs with validation.\n"
                "5. Implement file upload/storage if needed.\n"
                "6. Add background jobs / queues if required.\n"
                "7. Create frontend routes + layout.\n"
                "8. Implement forms + state management.\n"
                "9. Connect frontend to APIs + error handling.\n"
                "10. Add analytics/logging.\n"
                "11. Write tests (unit + integration) and CI.\n"
                "12. Dockerize + deploy (staging → prod) with monitoring.\n\n"
                "## Feature roadmap\n"
                "- MVP: Auth + core flows\n"
                "- v1: Reporting + admin\n"
                "- v2: Advanced automation\n"
            ),
        }

    # ── Utilities ────────────────────────────────────────────────────────────

    def _pdf_to_text(self, path: str) -> str:
        try:
            reader = PdfReader(path)
            return "\n".join(
                page.extract_text() for i, page in enumerate(reader.pages) if i < 5
            )
        except Exception as e:
            print(f"PDF extract error: {e}")
            return ""

    def _encode_image(self, path: str) -> str:
        try:
            with open(path, "rb") as f:
                return base64.b64encode(f.read()).decode("utf-8")
        except Exception as e:
            print(f"Image encode error: {e}")
            return ""
