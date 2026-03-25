import json
import os
from pathlib import Path

from dotenv import load_dotenv

from agents.gemini_client import GeminiClient


load_dotenv(Path(__file__).resolve().parent.parent / ".env")

class OptimizationAgent:
    def __init__(self):
        self.gemini = None
        gemini_api_key = (os.getenv("GEMINI_API_KEY") or "").strip()
        if gemini_api_key:
            self.gemini = GeminiClient(model=os.getenv("GEMINI_MODEL_OPTIMIZATIONS") or None)

    def suggest(self, metrics: dict, risks: list) -> list:
        """Proposes optimizations based on identified risks and code metrics (Gemini when available)."""
        if self.gemini:
            try:
                brief_metrics = {
                    "total_loc": metrics.get("total_loc", 0),
                    "file_count": metrics.get("file_count", 0),
                    "avg_complexity": metrics.get("avg_complexity", 0),
                    "duplication_percentage": metrics.get("duplication_percentage", 0),
                    "top_complex_files": [
                        {"filename": f.get("filename"), "complexity": f.get("complexity")}
                        for f in (metrics.get("top_complex_files") or [])[:5]
                    ],
                }
                prompt = (
                    "Given repository metrics and a list of risks, suggest concrete engineering optimizations.\n\n"
                    f"Metrics JSON:\n{json.dumps(brief_metrics, indent=2)}\n\n"
                    f"Risks JSON:\n{json.dumps(risks, indent=2)}\n\n"
                    "Return ONLY valid JSON with exactly this format:\n"
                    '{\n  "optimizations": [\n    {\n      "type": "string",\n      "action": "string (imperative, specific)"\n    }\n  ]\n}\n\n'
                    "Rules:\n"
                    "- Provide 1 to 5 optimizations.\n"
                    "- Each optimization.action must address one or more risks directly.\n"
                    "- Prefer actions that are implementable in an MVP-to-beta timeline.\n"
                )
                system_instruction = (
                    "You are an expert software architect. "
                    "Return structured optimization recommendations in JSON."
                )
                data = self.gemini.generate_json(
                    system_instruction=system_instruction,
                    user_prompt=prompt,
                    temperature=0.35,
                    max_output_tokens=900,
                )
                return data.get("optimizations") or []
            except Exception as e:
                print(f"Gemini optimization generation failed, using fallback rules: {e}")

        suggestions = []
        
        # Look at risks
        risk_types = [r['type'] for r in risks]
        
        if "Code Quality" in risk_types:
            suggestions.append({
                "type": "Refactoring",
                "action": "Implement strict linting and rewrite the top 5 most complex functions into smaller micro-functions."
            })
            
        if "Budget Overrun" in risk_types and metrics.get('duplication_percentage', 0) > 20:
            suggestions.append({
                "type": "Tech Debt Reduction",
                "action": "Create reusable shared modules to eliminate the high percentage of duplicated code."
            })
            
        if metrics.get('total_loc', 0) > 50000:
            suggestions.append({
                "type": "Architecture",
                "action": "Consider breaking down the monolith into a microservices architecture to improve team velocity."
            })
            
        if not suggestions:
            suggestions.append({
                "type": "General",
                "action": "Codebase looks healthy. Continue with standard code review practices."
            })
            
        return suggestions
