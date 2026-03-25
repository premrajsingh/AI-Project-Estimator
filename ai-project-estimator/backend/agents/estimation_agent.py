import json
import joblib
import os
import random
from pathlib import Path

from dotenv import load_dotenv

from agents.gemini_client import GeminiClient


load_dotenv(Path(__file__).resolve().parent.parent / ".env")

class EstimationAgent:
    def __init__(self):
        # We assume the model is placed in backend/models/effort_model.pkl
        model_path = os.path.join(os.path.dirname(__file__), '..', 'models', 'effort_model.pkl')
        self.model = None
        self.gemini = None
        try:
            self.model = joblib.load(model_path)
        except Exception as e:
            print(f"Warning: Could not load ML model from {model_path}. Using fallback estimation rules. Error: {e}")

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
            compact_top.append(
                {
                    "filename": f.get("filename"),
                    "complexity": f.get("complexity"),
                }
            )
        return {
            "total_loc": metrics.get("total_loc", 0),
            "file_count": metrics.get("file_count", 0),
            "avg_complexity": metrics.get("avg_complexity", 0.0),
            "duplication_percentage": metrics.get("duplication_percentage", 0.0),
            "top_complex_files": compact_top,
        }

    def predict(self, metrics: dict) -> dict:
        """Predicts time, effort, and cost based on metrics."""
        
        team_size = metrics.get('suggested_team_size', random.randint(2, 5)) 

        # Prefer Gemini for dashboard parameters when available.
        if self.gemini:
            try:
                brief_metrics = self._build_brief_metrics(metrics)
                system_instruction = (
                    "You are an expert software project estimator. "
                    "Given repository metrics, you must produce realistic estimates for "
                    "effort, timeline, and cost."
                )
                prompt = (
                    "Repository metrics (JSON):\n"
                    f"{json.dumps(brief_metrics, indent=2)}\n\n"
                    "Return ONLY valid JSON with exactly these keys:\n"
                    '- "predicted_effort_hours" (number, integer)\n'
                    '- "predicted_time_days" (number, integer)\n'
                    '- "predicted_cost_dollars" (number, integer)\n'
                    '- "assumed_team_size" (number, integer)\n\n'
                    "Constraints:\n"
                    "- predicted_effort_hours must be >= 8\n"
                    "- predicted_time_days must be >= 1\n"
                    "- assumed_team_size must be between 1 and 20\n"
                    "- predicted_cost_dollars should be computed with an assumed rate of $50/hr if needed\n"
                    "- Keep values consistent (cost ~ effort * 50)\n"
                )

                data = self.gemini.generate_json(
                    system_instruction=system_instruction,
                    user_prompt=prompt,
                    temperature=0.3,
                    max_output_tokens=800,
                )

                predicted_effort_hours = self._to_int(data.get("predicted_effort_hours"), default=max(8, int(metrics.get("total_loc", 1000) / 10)))
                predicted_time_days = self._to_int(data.get("predicted_time_days"), default=max(1, int(predicted_effort_hours / (team_size * 8))))
                predicted_cost_dollars = self._to_int(data.get("predicted_cost_dollars"), default=max(100, int(predicted_effort_hours * 50)))
                assumed_team_size = self._to_int(data.get("assumed_team_size"), default=team_size)

                return {
                    "predicted_effort_hours": predicted_effort_hours,
                    "predicted_time_days": predicted_time_days,
                    "predicted_cost_dollars": predicted_cost_dollars,
                    "assumed_team_size": assumed_team_size,
                }
            except Exception as e:
                print(f"Gemini estimation failed, using fallback: {e}")
        
        if self.model:
            # Match the feature order from training: ['total_loc', 'file_count', 'avg_complexity', 'duplication_percentage', 'team_size']
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
                "assumed_team_size": team_size
            }
        else:
            # Fallback dumb estimation if model fails to load
            loc = metrics.get('total_loc', 1000)
            effort = max(8, int(loc / 10))
            return {
                "predicted_effort_hours": effort,
                "predicted_time_days": max(1, int(effort / (team_size * 8))),
                "predicted_cost_dollars": effort * 50, # assuming $50/hr
                "assumed_team_size": team_size
            }
