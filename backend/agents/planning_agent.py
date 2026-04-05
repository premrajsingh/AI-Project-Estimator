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
import json
import os
from pathlib import Path

from pypdf import PdfReader
from dotenv import load_dotenv

from agents.gemini_client import GeminiClient
from agents.openai_client import OpenAIClient
from agents.design_validator import DesignValidatorAgent
from agents.health_agent     import HealthScoreAgent
from database.mongo          import update_planning

load_dotenv(Path(__file__).resolve().parent.parent / ".env")


class PlanningAgent:
    def __init__(self, planning_id: str):
        self.planning_id = planning_id
        self.gemini      = None
        self.openai      = None
        
        g_key = (os.getenv("GEMINI_API_KEY") or "").strip()
        if g_key:
            self.gemini = GeminiClient(
                model           = os.getenv("GEMINI_MODEL") or "gemini-1.5-flash",
                timeout_seconds = int(os.getenv("GEMINI_TIMEOUT_SECONDS") or "300"),
            )
            
        o_key = (os.getenv("OPENAI_API_KEY") or "").strip()
        if o_key:
            self.openai = OpenAIClient(
                model           = os.getenv("OPENAI_MODEL") or "gpt-4o-mini",
                timeout_seconds = int(os.getenv("OPENAI_TIMEOUT_SECONDS") or "120"),
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

            # ── Step 0: Extract file content ─────────────────────────────────
            extracted_text = ""
            base64_image   = None
            if file_path:
                if file_type == "application/pdf":
                    extracted_text = self._pdf_to_text(file_path)
                elif file_type and file_type.startswith("image/"):
                    base64_image = self._encode_image(file_path)

            # ── Step 1 & 2: Parallel Design Validation & AI Estimation ──────
            validator    = DesignValidatorAgent()
            engine       = "openai" if self.openai else "gemini"
            client       = self.openai or self.gemini
            
            print(f"[{self.planning_id}] Parallel AI Analysis started ({engine})")
            
            # Start both tasks concurrently to meet the 10-20s target
            validation_task = validator.validate(description, expected_days, team_size, engine=engine)
            
            if not client:
                # Fallback if no AI client available
                design_check = await validation_task
                result = self._local_fallback(description, expected_days, team_size, hourly_rate)
            else:
                estimation_task = self._ai_estimate(
                    description, team_size, experience,
                    expected_days, extracted_text, base64_image, code_snippet,
                    client      = client,
                    hourly_rate = hourly_rate
                )
                
                # Wait for both to complete
                design_check, result = await asyncio.gather(validation_task, estimation_task)
            
            print(f"[{self.planning_id}] AI Analysis Complete")

            if not design_check["valid"]:
                await update_planning(self.planning_id, {
                    "status":        "design_error",
                    "design_result": design_check,
                    "error_message": "Design errors detected before estimation.",
                })
                return

            # ── Step 3b: Team-size scaling ───────────────────────────────────
            # If team_size > 1, show both solo and team estimates
            solo_days = int(result.get("estimated_days") or expected_days)
            team_days = max(1, round(solo_days / team_size)) if team_size > 1 else solo_days
            result["estimated_days"]  = team_days
            result["solo_days"]       = solo_days
            result["team_days"]       = team_days
            result["team_size_used"]  = team_size
            # Scale time_estimate fields too
            if "time_estimate" in result and isinstance(result["time_estimate"], dict):
                te = result["time_estimate"]
                if team_size > 1:
                    for key in ("optimistic_days", "realistic_days", "worst_case_days"):
                        if key in te:
                            te[key] = max(1, round(te[key] / team_size))
                result["time_estimate"] = te

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
        client,
        hourly_rate = 1000,
    ) -> dict:
        system_instruction = """
You are the Lead Project Architect and Financial Strategist. Your goal is to analyze project ideas using a rigorous 7-step thinking process and 8 key parameters (A-H).

### 🔍 Step-by-Step Thinking (Your Core Logic)
1. **Problem Understanding**: Identify the core problem, users, and value proposition.
2. **Break into Modules**: Categorize features into logical blocks (Auth, Dashboard, Data, AI/Search, etc.).
3. **Core vs Extra**: Distinguish 'Must-haves' from 'Nice-to-haves'.
4. **Data Flow Analysis**: Trace data through: User → Frontend → Backend → Database → Response.
5. **System Architecture**: Define Monolithic vs Microservices, API structure, and Basic ER model.
6. **Effort Estimation per Feature**: Assign time (days) based on complexity (Simple/Medium/Complex).
7. **Add Buffers**: ALWAYS add a **+25% effort buffer** for bugs, testing, and unforeseen changes.

### 📌 Key Parameters (Your Estimation Model)
- **A. Functional Scope**: Detailed feature list, user roles, and core workflows.
- **B. Complexity Level**: Tag features as Simple (CRUD, Forms), Medium (Filters, Dashboards, APIs), or Complex (AI, Real-time, Automation).
- **C. Tech Stack**: Adjust time based on the detected stack (e.g., React, Node, AI APIs).
- **D. UI/UX**: Custom UI/Animations add 20-40% to the effort.
- **E. Integrations**: Each third-party API (Payments, OpenAI) increases effort and testing needs.
- **F. Data Complexity**: Number of entities and ER relationship complexity.
- **G. Non-Functional Requirements**: Performance, Security, and Scalability needs.
- **H. Team & Timeline**: Adjust scaling based on Solo vs Team and Experience level.

Return a valid JSON object that reflects this architectural rigor.
""".strip()

        doc_section = f"\n### Attached document\n{extracted_text}" if extracted_text else ""
        code_section = f"\n### Code to review\n```\n{code_snippet[:3000]}\n```" if code_snippet else ""

        prompt = f"""
Project description: {description}
Target Days for Completion: {expected_days}
{doc_section}
{code_section}

Task:
1. Conduct the 7-Step Analysis Flow for this idea.
2. Breakdown the project into modules and features with individual complexity tags (🟢|🟡|🔴).
3. Calculate the 'Total Effort' using the formula: Total Effort = (Sum of Feature Times) + 25% Buffer.
4. Define the System Architecture (ER model, API structure, and Data Flow).
5. Suggest the Optimal Team and Tech Stack.

Return ONLY valid JSON with exactly these keys:

"summary": string (Executive summary step 1)
"project_category": string
"complexity_level": string ('Simple' | 'Moderate' | 'Complex' | 'Enterprise')

"feature_analysis": list of {{"feature": string, "module": string, "complexity": "Simple|Medium|Complex", "effort_days": int}}

"data_flow": string (Step 4: Describe the User -> Frontend -> Backend -> DB flow)

"er_diagram_mermaid": string (RAW Mermaid.js erDiagram syntax. START with 'erDiagram'. DO NOT include markdown backticks like ```mermaid. 
    Example: 
    erDiagram
      USER ||--o{{ POST : "makes"
      POST ||--o{{ COMMENT : "has"
)

"suggested_team": {{
  "size": int,
  "roles": list of {{"role": string, "reason": string}}
}}

"design_errors": list of objects with "code" and "message"

"cost_breakdown": object with:
  "total": int (INR - STRICT SCALE based on experience '{experience}'): 
      Student: ₹15,000 - ₹25,000 (TOTAL Project Stipend. Max 120-180 hours effort only), 
      Beginner: ₹40,000 - ₹65,000 (Junior Freelance. Max 350-500 hours), 
      Intermediate: ₹1.0L - ₹2.5L (Middle Professional), 
      Expert: ₹4.5L - ₹8.0L (Specialist Premium))
  "min": int (MVP version)
  "expected": int (Full scope)
  "premium": int (High availability/Enterprise version)
  "by_module": list of {{"module": string, "cost": int, "percentage": int}}
  "openai_operational_costs": string (Briefly mention estimated monthly API cost for GPT-4o mini vs GPT-4o)

"time_estimate": object with:
  "optimistic_days": int
  "realistic_days": int (This must include the 25% buffer)
  "worst_case_days": int
  "phases": list of {{"phase": string, "days": int, "deliverable": string}}

"estimated_days": int (realistic_days value)

"health_inputs": object with "clarity": int(0-25), "feasibility": int(0-25)

"risks": list of objects with "type", "severity" ("high|medium|low"), "mitigation" (1 sentence)

"challenges": list of strings (concrete technical challenges identified)

"ai_suggestions": object with:
  "better_stack": list of strings
  "mvp_scope": string
  "cost_reduction_tips": list of strings

"code_review": object (only if code was provided) with:
  "issues": list of {{"severity": "error|warning|info", "message": string}}
  "improvements": list of strings

"blueprint": string — Generate a structured development plan in Markdown format. Use these sections:
- ## 🗺️ Clear Project Roadmap: A chronological roadmap based on Step 2 modules.
- ## 🗄️ Database schema / ER Model: Textual ER representation from Step 5.
- ## 🛠 Step-by-Step Implementation Guide: Logical build steps from Step 6.
- ## ⚠️ Key Technical Challenges: Specific hurdles from Step 7.
- ## 🚨 Risk Factors: From Step 7.
- ## 🧠 Difficulty Level: With reasoning.
- ## 💰 Estimated Cost (INR): Total fee analysis.
- ## 🧱 Recommended Tech Stack: Specific choices.

IMPORTANT FOR BLUEPRINT:
* Do NOT generate dashboards, charts, or analytics-style output
* Do NOT give high-level summaries
* Focus on practical, actionable steps like guiding a developer
* Keep output structured and easy to follow.

CRITICAL RULES FOR JSON:
1. Output MUST be a single valid JSON object.
2. The entire markdown text for the blueprint must be assigned to the "blueprint" key.
3. Escape all newlines in the string as \\n, so it parses as valid JSON.
"""
        # Note: base64_image support for OpenAI would require GPT-4o vision format.
        if base64_image:
            prompt += "\n(Note: An image of the design/wireframe was also uploaded. Incorporate visual insights if possible.)"

        print(f"[{self.planning_id}] Step 2: AI Estimation started")
        
        try:
            parsed = await client.generate_json(
                system_instruction=system_instruction,
                user_prompt=prompt,
                temperature=0.4,
                max_tokens=6000,
            )
            print(f"[{self.planning_id}] Step 2: AI Estimation Complete")
            return parsed
        except Exception as e:
            print(f"[{self.planning_id}] AI Estimation error: {e}")
            raise

    # ── Robust JSON Parser ──────────────────────────────────────────────

    def _robust_json_parse(self, text: str) -> dict:
        """Parse JSON from AI, repairing common issues like literal newlines in strings."""
        from json_repair import repair_json

        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        repaired = repair_json(text, return_objects=True)
        if repaired and isinstance(repaired, dict):
            return repaired

        raise ValueError(
            f"AI returned JSON that could not be repaired. "
            f"First 300 chars: {text[:300]}"
        )

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
