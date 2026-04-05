import json
import os
from pathlib import Path

from dotenv import load_dotenv

from agents.gemini_client import GeminiClient


load_dotenv(Path(__file__).resolve().parent.parent / ".env")

class RiskAgent:
    def __init__(self):
        self.gemini = None
        gemini_api_key = (os.getenv("GEMINI_API_KEY") or "").strip()
        if gemini_api_key:
            self.gemini = GeminiClient(model=os.getenv("GEMINI_MODEL_RISKS") or None)

    async def analyze(self, metrics: dict, estimations: dict) -> list:
        """Evaluates risks based on metrics and Gemini (fallback to rules). Returns a list of risk objects."""
        if self.gemini:
            try:
                brief_metrics = {
                    "total_loc": metrics.get("total_loc", 0),
                    "file_count": metrics.get("file_count", 0),
                    "avg_complexity": metrics.get("avg_complexity", 0),
                    "duplication_percentage": metrics.get("duplication_percentage", 0),
                    "primary_language": metrics.get("primary_language", "Unknown"),
                    "language_breakdown": metrics.get("language_breakdown", {}),
                    "top_complex_files": [
                        {"filename": f.get("filename"), "complexity": f.get("complexity")}
                        for f in (metrics.get("top_complex_files") or [])[:5]
                    ],
                }

                system_instruction = (
                    "You are an expert software risk analyst. "
                    "Given code metrics and estimation outputs, predict realistic project risks."
                )
                prompt = (
                    "Input JSON:\n"
                    f"{json.dumps({'metrics': brief_metrics, 'estimations': estimations}, indent=2)}\n\n"
                    "Return ONLY valid JSON in this exact format:\n"
                    '{\n  "risks": [\n    {\n      "type": "string",\n      "score": "integer (1-10)",\n      "reason": "string"\n    }\n  ]\n}\n\n'
                    "Rules:\n"
                    "- Provide 3 to 6 risks.\n"
                    "- Include at least one risk whose `type` contains one of these substrings "
                    "`auth`, `schedule`, or `velocity` when predicted_time_days is high (>45). "
                    "This helps UI risk labeling.\n"
                    "- Scores: 8-10 critical, 5-7 moderate, 1-4 low.\n"
                    "- Keep reasons specific and actionable."
                )

                data = await self.gemini.generate_json(
                    system_instruction=system_instruction,
                    user_prompt=prompt,
                    temperature=0.4,
                    max_output_tokens=900,
                )
                risks = data.get("risks") or []
                # Normalize score/type/reason.
                normalized = []
                for r in risks[:8]:
                    normalized.append(
                        {
                            "type": str(r.get("type") or ""),
                            "score": int(round(float(r.get("score") or 0))) if r.get("score") is not None else 0,
                            "reason": str(r.get("reason") or ""),
                        }
                    )
                # Ensure scores are within [1,10] when possible.
                for r in normalized:
                    r["score"] = min(10, max(1, int(r.get("score") or 1)))
                return normalized
            except Exception as e:
                print(f"Gemini risk generation failed, using fallback rules: {e}")

        risks = []
        
        loc = metrics.get('total_loc', 0)
        complexity = metrics.get('avg_complexity', 0)
        duplication = metrics.get('duplication_percentage', 0)
        
        # Schedule Risk
        if loc > 50000:
            risks.append({"type": "Schedule Delay", "score": 8, "reason": "Large codebase increases risk of integration issues."})
        elif loc > 10000:
            risks.append({"type": "Schedule Delay", "score": 5, "reason": "Medium codebase requires careful planning."})
            
        # Code Quality Risk
        if complexity > 15:
            risks.append({"type": "Code Quality", "score": 9, "reason": f"High cyclomatic complexity ({complexity}) indicates difficult-to-maintain code."})
        elif complexity > 8:
            risks.append({"type": "Code Quality", "score": 6, "reason": "Moderate complexity. Refactoring suggested."})
            
        # Tech Debt / Budget Risk
        if duplication > 20:
            risks.append({"type": "Budget Overrun", "score": 7, "reason": f"High duplication ({duplication}%) increases maintenance costs over time."})
            
        return risks
