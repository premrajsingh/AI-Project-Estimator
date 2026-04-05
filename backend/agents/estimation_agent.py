import json
import joblib
import os
from pathlib import Path
from dotenv import load_dotenv

from agents.gemini_client import GeminiClient

load_dotenv(Path(__file__).resolve().parent.parent / ".env")


class EstimationAgent:
    def __init__(self):
        model_path = os.path.join(os.path.dirname(__file__), '..', 'models', 'effort_model.pkl')

        self.model = None
        self.gemini = None

        # Load ML model
        try:
            self.model = joblib.load(model_path)
            print("ML model loaded successfully")
        except Exception as e:
            print(f"Warning: Could not load ML model. {e}")

        # Load Gemini (optional fallback)
        gemini_api_key = (os.getenv("GEMINI_API_KEY") or "").strip()
        if gemini_api_key:
            self.gemini = GeminiClient(
                model=os.getenv("GEMINI_MODEL_ESTIMATION") or None,
                timeout_seconds=int(os.getenv("GEMINI_TIMEOUT_SECONDS") or "120"),
            )

    def _to_int(self, value, default: int) -> int:
        try:
            if value is None:
                return default
            return int(round(float(value)))
        except Exception:
            return default

    def _build_brief_metrics(self, metrics: dict) -> dict:
        top = metrics.get("top_complex_files") or []
        compact_top = []

        for f in top[:5]:
            compact_top.append({
                "filename": f.get("filename"),
                "complexity": f.get("complexity"),
            })

        return {
            "total_loc": metrics.get("total_loc", 0),
            "file_count": metrics.get("file_count", 0),
            "avg_complexity": metrics.get("avg_complexity", 0.0),
            "duplication_percentage": metrics.get("duplication_percentage", 0.0),
            "top_complex_files": compact_top,
        }

    def _detect_specialization(self, metrics: dict) -> float:
        """Determines cost multiplier based on specialized technology usage."""
        top_files = metrics.get("top_complex_files") or []
        excerpts = " ".join([f.get("content_excerpt") or "" for f in top_files]).lower()
        
        # Specialties & Multipliers (Adjusted for competitive student/freelance context)
        specialties = {
            "ai": (["openai", "tensorflow", "pytorch", "transformers", "langchain", "llama", "gemini", "numpy", "pandas"], 1.2),
            "crypto": (["solidity", "web3", "blockchain", "ethereum", "ethers", "contract", "ipfs"], 1.4),
            "high_perf": (["cuda", "simd", "kernel", "assembly", "lock-free", "concurrency", "multithreading"], 1.2),
            "fintech": (["payment", "gateway", "stripe", "razorpay", "transaction", "ledger", "pci-dss"], 1.1),
        }
        
        max_multiplier = 1.0
        for name, (keywords, multiplier) in specialties.items():
            if any(kw in excerpts for kw in keywords):
                max_multiplier = max(max_multiplier, multiplier)
                
        return max_multiplier

    def _get_fixed_fee_baseline(self, fp: int, loc: int) -> int:
        """Determines the base market fixed-fee (INR) based on project scale."""
        # Scale Tiers (Competitive Student/Micro-Freelance Bids in INR)
        if fp > 500 or loc > 30000:
            return 350000  # Large (₹3.5L)
        elif fp > 150 or loc > 8000:
            return 120000  # Medium (₹1.2L)
        elif fp > 40 or loc > 1500:
            return 35000   # Small (₹35k)
        elif fp > 12 or loc > 400:
            return 12000   # Micro (₹12k)
        else:
            return 4000    # Utility (₹4k)

    def _get_seniority_multiplier(self, seniority: str) -> float:
        """Returns a cost multiplier based on developer seniority/experience."""
        mapped = {
            "Student":      0.15, # Stipend/Honorarium (₹5k - ₹25k baseline)
            "Beginner":     0.4,  # Junior Freelancer (₹15k - ₹50k baseline)
            "Intermediate": 0.8,  # Middle (Standard Market ₹45k - ₹1.2L)
            "Advanced":     1.2,  # Senior (₹1.5L - ₹3L)
            "Expert":       1.8,  # Specialist (₹5L+)
        }
        return mapped.get(seniority, 0.8)

    async def predict(self, metrics: dict, hourly_rate: int = 0, num_developers: int = 0, seniority: str = "Intermediate") -> dict:
        """Predict effort, time, and cost using a Value-Based Fixed Fee model."""

        # AI-determined team size if 0
        if not num_developers:
            num_developers = max(1, int(metrics.get("functional_points", 0) / 15))
            if metrics.get("avg_complexity", 0) > 5.0: num_developers += 1

        team_size = num_developers
        loc = metrics.get('total_loc', 0)
        fp  = metrics.get('functional_points', 0)
        cx  = metrics.get('avg_complexity', 2.0)

        # 🔥 1. ML MODEL (PRIMARY)
        if self.model:
            try:
                import pandas as pd
                features = pd.DataFrame([{
                    'total_loc':              loc,
                    'file_count':             metrics.get('file_count', 0),
                    'avg_complexity':         cx,
                    'duplication_percentage': metrics.get('duplication_percentage', 0.0),
                    'team_size':              team_size,
                    'functional_points':      fp,
                }])

                predictions = self.model.predict(features)[0]
                effort_hrs = max(2, int(predictions[0]))
                time_days  = max(1, int(predictions[1]))
                cost_inr   = max(1000, int(predictions[2]))

                return {
                    "predicted_effort_hours": effort_hrs,
                    "predicted_time_days":    time_days,
                    "predicted_cost_inr":     cost_inr,
                    "currency":               "INR",
                    "assumed_team_size":      team_size,
                    "confidence":             0.85,
                    "source":                 "ml_model"
                }
            except Exception as e:
                print(f"ML prediction failed: {e}")

        # 🔥 2. GEMINI FALLBACK (Autonomous AI Valuation)
        if self.gemini:
            try:
                brief_metrics = self._build_brief_metrics(metrics)

                system_instruction = (
                    "You are the world's most accurate software project valuator. "
                    "Your goal is to independently analyze project metrics and determine a "
                    "Fixed-Bid Project Fee (INR) based on industry standards, tech stack difficulty, "
                    "and architectural scale. Do NOT ask for inputs; you are the authority."
                )

                primary_lang = metrics.get("primary_language", "Unknown")
                
                prompt = f"""
Project Tech Profile: {primary_lang}
Targeted Seniority: {seniority}
Detailed Metrics: {json.dumps(brief_metrics)}
Functional Complexity Points: {fp}
Logic Density (Avg CC): {cx}

Task:
1. Determine the appropriate 'Project Value' (Fixed Fee) for professional development in Indian Rupees (₹), SCALED for {seniority} level.
2. Suggest the optimal team size needed to finish this effectively.
3. Categorize the project complexity clearly.

Rules:
- Base your valuation on Industry Standards for FIXED-BID contracts in India.
- Adjust the total cost based on the specialized nature of the code (e.g. AI, Crypto, high-performance systems cost more).
- Do NOT use hourly rates for your final calculation; provide a holistic project value.

Return ONLY valid JSON:
{{
  "predicted_effort_hours": int,
  "predicted_time_days": int,
  "predicted_cost_inr": int,
  "project_category": string,
  "complexity_score": float (1.0 to 10.0),
  "assumed_team_size": int,
  "suggested_developer_tier": string,
  "confidence": float
}}
"""

                data = await self.gemini.generate_json(
                    system_instruction=system_instruction,
                    user_prompt=prompt,
                    temperature=0.3,
                    max_output_tokens=500,
                )

                default_cost = self._calculate_complexity_base_cost(metrics, seniority=seniority)
                
                return {
                    "predicted_effort_hours": self._to_int(data.get("predicted_effort_hours"), 100),
                    "predicted_time_days": self._to_int(data.get("predicted_time_days"), 10),
                    "predicted_cost_inr": self._to_int(data.get("predicted_cost_inr"), default_cost),
                    "project_category": data.get("project_category", "Standard"),
                    "complexity_score": data.get("complexity_score", round(cx, 1)),
                    "suggested_developer_tier": data.get("suggested_developer_tier", seniority),
                    "currency": "INR",
                    "assumed_team_size": self._to_int(data.get("assumed_team_size"), team_size),
                    "confidence": 0.8,
                    "source": "autonomous_ai_valuation"
                }

            except Exception as e:
                print(f"Gemini failed: {e}")

        # 🔥 3. FINAL FALLBACK (Value-Based Heuristic)
        cost_inr = self._calculate_complexity_base_cost(metrics, seniority=seniority)
        
        # Scale effort hours significantly down for students (they work faster, less documentation/testing)
        effort_mult = 0.2 if seniority == "Student" else (0.6 if seniority == "Beginner" else 1.0)
        effort = max(8, int(((fp * 2.5) + (loc / 40)) * (1.0 + (cx / 10.0)) * effort_mult))

        return {
            "predicted_effort_hours": effort,
            "predicted_time_days":    max(1, int(effort / (team_size * 8))),
            "predicted_cost_inr":     cost_inr,
            "currency":               "INR",
            "assumed_team_size":      team_size,
            "confidence":             0.5,
            "source":                 "complexity_heuristic"
        }

    def _calculate_complexity_base_cost(self, metrics: dict, seniority: str = "Intermediate") -> int:
        """Heuristic for Fixed Project Fee based on functionality and logic density."""
        fp = metrics.get("functional_points", 0)
        loc = metrics.get("total_loc", 0)
        cx = metrics.get("avg_complexity", 2.0)
        
        base_fee = self._get_fixed_fee_baseline(fp, loc)
        special_mult = self._detect_specialization(metrics)
        seniority_mult = self._get_seniority_multiplier(seniority)
        
        complexity_mod = 0.8 + (cx / 10.0) # Scale complexity modifier
        return int(base_fee * special_mult * seniority_mult * complexity_mod)