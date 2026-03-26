import os
import json
import asyncio
import requests
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

class ReportAgent:
    def __init__(self):
        self.api_key = (os.getenv("GEMINI_API_KEY") or "").strip()
        self.model = (os.getenv("GEMINI_MODEL_REPORT") or "gemini-2.5-flash-lite").strip()

    def _post_gemini(self, payload: dict) -> dict:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent"
        headers = {
            "x-goog-api-key": self.api_key,
            "Content-Type": "application/json",
        }
        timeout_seconds = int(os.getenv("GEMINI_TIMEOUT_SECONDS") or "120")
        resp = requests.post(url, headers=headers, json=payload, timeout=timeout_seconds)
        resp.raise_for_status()
        return resp.json()

    async def _generate_text(self, system_instruction: str, prompt: str) -> str:
        payload = {
            "system_instruction": {"parts": [{"text": system_instruction}]},
            "contents": [
                {"role": "user", "parts": [{"text": prompt}]}
            ],
            "generationConfig": {
                "responseMimeType": "text/plain",
                "temperature": 0.7,
                "maxOutputTokens": 2500,
            },
        }
        data = await asyncio.to_thread(self._post_gemini, payload)
        candidates = data.get("candidates") or []
        if not candidates:
            raise RuntimeError(f"Gemini returned no candidates: {data}")

        content = candidates[0].get("content") or {}
        parts = content.get("parts") or []
        return parts[0].get("text") if parts else ""

    async def generate_report(self, metrics: dict, estimations: dict, risks: list, optimizations: list) -> str:
        """Generates a natural language report using OpenAI or a local fallback."""
        
        prompt = self._build_prompt(metrics, estimations, risks, optimizations)
        
        if self.api_key:
            try:
                system_instruction = (
                    "You are an expert AI Software Architect and Project Manager. "
                    "Your task is to analyze project data and provide a highly descriptive, "
                    "point-wise overview of the project focusing on Optimizations, Cost, Timeline, "
                    "Bugs, and General Comments."
                )
                return await self._generate_text(system_instruction=system_instruction, prompt=prompt)
            except Exception as e:
                print(f"Gemini Generation failed: {e}. Falling back to local generation.")
                return self._local_fallback_generation(
                    metrics, estimations, risks, optimizations,
                    footer="*(Locally generated: Gemini API call failed — check quota, billing, network, or model access.)*",
                )
        else:
            print("No GEMINI_API_KEY found. Falling back to local template generation.")
            return self._local_fallback_generation(
                metrics, estimations, risks, optimizations,
                footer="*(Locally generated: no GEMINI_API_KEY found — use `GEMINI_API_KEY` in `backend/.env`.)*",
            )

    def _build_prompt(self, metrics: dict, estimations: dict, risks: list, optimizations: list) -> str:
        top_complex_files_info = ""
        if "top_complex_files" in metrics and metrics["top_complex_files"]:
            top_complex_files_info = "\n### Source Code for Analysis (Most Complex Files)\n"
            for file_data in metrics["top_complex_files"]:
                top_complex_files_info += f"\nFile: {file_data['filename']}\n"
                # To prevent excessive token usage, we only send the first ~250 lines of the file if it's very large
                lines = file_data['content'].splitlines()[:250]
                # Adding line numbers for the LLM to reference
                numbered_lines = [f"{i+1}: {line}" for i, line in enumerate(lines)]
                top_complex_files_info += "```\n" + "\n".join(numbered_lines) + "\n```\n"

        return f"""
Please analyze the following project data and generate a comprehensive health report.

### 1. Code Metrics
- Lines of Code: {metrics.get('total_loc')}
- Cyclomatic Complexity: {metrics.get('avg_complexity')}
- Code Duplication: {metrics.get('duplication_percentage')}%

### 2. General Estimations
- Estimated Total Effort: {estimations.get('predicted_effort_hours')} hours
- Estimated Total Cost: ${estimations.get('predicted_cost_dollars')}
- Estimated Timeline: {estimations.get('predicted_time_days')} days
- Assumed Team Size: {estimations.get('assumed_team_size')}

### 3. Identified Risks
{json.dumps(risks, indent=2)}

### 4. Rule-based Optimizations
{json.dumps(optimizations, indent=2)}

{top_complex_files_info}

You MUST generate a report with exactly the following sections in Markdown:

1. **Optimizations**: Go through the provided source code and tell the user about specific optimizations that can be made. For each optimization, you MUST include:
   - File name
   - Line numbers
   - Description of the optimization and why it's needed
2. **Cost**: Provide the total estimated cost (${estimations.get('predicted_cost_dollars')}) and a detailed breakdown of the cost (e.g., Development, Testing, Infrastructure, Management). Explain which parts of the project will cost how much.
3. **Timeline**: Provide a timeline on how much time is required to complete the project (total {estimations.get('predicted_time_days')} days). Break this down into phases (e.g., Setup, Development, Testing, Deployment).
4. **Bugs**: Analyze the provided code snippets and list any potential bugs, edge cases, or security vulnerabilities you identified.
5. **Additional Comments**: Any other relevant insights, suggestions for the team, or project health observations.

Keep the tone professional and the advice actionable.
"""

    def _local_fallback_generation(
        self, metrics, estimations, risks, optimizations, footer: Optional[str] = None
    ) -> str:
        loc = metrics.get('total_loc')
        time = estimations.get('predicted_time_days')
        cost = estimations.get('predicted_cost_dollars')
        
        report = f"# AI Project Manager Health Report\n\n"
        
        report += f"### 1. Optimizations\n"
        if "top_complex_files" in metrics and metrics["top_complex_files"]:
             for f in metrics["top_complex_files"]:
                 report += f"- **File: {f['filename']}**: Consider refactoring code near high complexity areas. (Complexity Score: {f['complexity']})\n"
        else:
            report += "No specific code optimizations identified in the local scan.\n"
        report += "\n"
        
        report += f"### 2. Cost\n"
        report += f"**Total Estimated Cost: ${cost}**\n\n"
        report += "**Cost Breakdown:**\n"
        report += f"- Development (60%): ${int(cost * 0.6)}\n"
        report += f"- Testing & QA (20%): ${int(cost * 0.2)}\n"
        report += f"- Infrastructure & DevOps (10%): ${int(cost * 0.1)}\n"
        report += f"- Project Management (10%): ${int(cost * 0.1)}\n\n"
        
        report += f"### 3. Timeline\n"
        report += f"**Estimated Completion Time: {time} days**\n\n"
        report += "Phases:\n"
        report += f"- Initialization: {max(1, int(time * 0.1))} days\n"
        report += f"- Core Development: {max(1, int(time * 0.6))} days\n"
        report += f"- Testing & Refinement: {max(1, int(time * 0.2))} days\n"
        report += f"- Deployment & Handover: {max(1, int(time * 0.1))} days\n\n"
        
        report += f"### 4. Bugs\n"
        report += "No critical bugs detected by local heuristic scan. Manual review of complex files is recommended.\n\n"
        
        report += f"### 5. Additional Comments\n"
        report += f"The project has {loc} lines of code across {metrics.get('file_count', 0)} files. Team velocity should be monitored closely.\n\n"
        
        report += "\n" + (footer or "*(Locally generated summary.)*") + "\n"
        return report
