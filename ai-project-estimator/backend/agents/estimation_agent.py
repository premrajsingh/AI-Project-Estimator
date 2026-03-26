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

    def predict(self, metrics: dict) -> dict:
        """Predict effort, time, and cost"""

        team_size = metrics.get('suggested_team_size', 5)

        # 🔥 1. ML MODEL (PRIMARY)
        if self.model:
            try:
                features = [[
                    metrics.get('total_loc', 1000),
                    metrics.get('file_count', 10),
                    metrics.get('avg_complexity', 5.0),
                    metrics.get('duplication_percentage', 5.0),
                    team_size
                ]]

                predictions = self.model.predict(features)[0]

                return {
                    "predicted_effort_hours": max(8, int(predictions[0])),
                    "predicted_time_days": max(1, int(predictions[1])),
                    "predicted_cost_dollars": max(100, int(predictions[2])),
                    "assumed_team_size": team_size,
                    "confidence": 0.85,
                    "source": "ml_model"
                }

            except Exception as e:
                print(f"ML prediction failed: {e}")

        # 🔥 2. GEMINI FALLBACK
        if self.gemini:
            try:
                brief_metrics = self._build_brief_metrics(metrics)

                system_instruction = "You are an expert software project estimator."

                prompt = f"""
                Metrics:
                {json.dumps(brief_metrics, indent=2)}

                Return JSON:
                - predicted_effort_hours
                - predicted_time_days
                - predicted_cost_dollars
                - assumed_team_size
                """

                data = self.gemini.generate_json(
                    system_instruction=system_instruction,
                    user_prompt=prompt,
                    temperature=0.3,
                    max_output_tokens=500,
                )

                return {
                    "predicted_effort_hours": self._to_int(data.get("predicted_effort_hours"), 100),
                    "predicted_time_days": self._to_int(data.get("predicted_time_days"), 10),
                    "predicted_cost_dollars": self._to_int(data.get("predicted_cost_dollars"), 5000),
                    "assumed_team_size": self._to_int(data.get("assumed_team_size"), team_size),
                    "confidence": 0.7,
                    "source": "gemini"
                }

            except Exception as e:
                print(f"Gemini failed: {e}")

        # 🔥 3. FINAL FALLBACK
        loc = metrics.get('total_loc', 1000)
        effort = max(8, int(loc / 10))

        return {
            "predicted_effort_hours": effort,
            "predicted_time_days": max(1, int(effort / (team_size * 8))),
            "predicted_cost_dollars": effort * 50,
            "assumed_team_size": team_size,
            "confidence": 0.5,
            "source": "fallback"
        }