import os
import json
import base64
import asyncio
import requests
from pathlib import Path
from pypdf import PdfReader
from database.mongo import update_planning
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

class PlanningAgent:
    def __init__(self, planning_id: str):
        self.planning_id = planning_id
        self.api_key = (os.getenv("GEMINI_API_KEY") or "").strip()
        self.model = (os.getenv("GEMINI_MODEL") or "gemini-2.5-flash-lite").strip()

    def _extract_json_object(self, text: str) -> str:
        """Best-effort extraction of the first JSON object from text."""
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            return text[start : end + 1]
        return text

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

    async def _generate_json(self, system_instruction: str, parts: list, temperature: float = 0.7) -> dict:
        payload = {
            "system_instruction": {"parts": [{"text": system_instruction}]},
            "contents": [{"role": "user", "parts": parts}],
            "generationConfig": {
                "responseMimeType": "application/json",
                "temperature": temperature,
            },
        }
        data = await asyncio.to_thread(self._post_gemini, payload)
        candidates = data.get("candidates") or []
        if not candidates:
            raise RuntimeError(f"Gemini returned no candidates: {data}")

        content = candidates[0].get("content") or {}
        gemini_parts = content.get("parts") or []
        result_text = gemini_parts[0].get("text") if gemini_parts else ""
        if not result_text:
            raise RuntimeError(f"Gemini returned empty text content: {data}")

        try:
            return json.loads(result_text)
        except json.JSONDecodeError:
            return json.loads(self._extract_json_object(result_text))

    async def analyze(self, data: dict, file_path: str = None, file_type: str = None):
        try:
            print(f"[{self.planning_id}] Starting Planning Analysis...")
            
            # Extract basic data
            team_size = data.get("team_size", 1)
            experience = data.get("experience", "Intermediate")
            description = data.get("description", "Not provided")
            expected_days = data.get("expected_days", 30)

            # Extract Document Content
            extracted_text = ""
            base64_image = None

            if file_path:
                if file_type == 'application/pdf':
                    extracted_text = self._extract_text_from_pdf(file_path)
                elif file_type and file_type.startswith('image/'):
                    base64_image = self._encode_image(file_path)

            if not self.api_key:
                print("No API Key. Running Dummy Planner.")
                dummy_result = self._local_fallback(description, expected_days)
                await update_planning(self.planning_id, {"estimation": dummy_result, "status": "completed"})
                return

            print(f"[{self.planning_id}] Calling AI model...")
            system_instruction = "You are an expert Software Architect and Project Manager. Your job is to estimate the time, risks, and challenges of a proposed software project."

            prompt_content = f"""
I need a comprehensive estimation and a detailed **Project Blueprint** for a new software project.

### Project Details
- Description/Idea: {description}
- Expected Completion: {expected_days} days
- Team Size: {team_size} members
- Average Team Experience: {experience}

### Extracted Requirements/Notes
{extracted_text if extracted_text else "None"}

Please provide a structured response in JSON format with the following keys:
1. "estimated_days": (integer) Realistically, how long will this take in days?
2. "risks": (list of strings) Potential highest risks.
3. "challenges": (list of strings) Technical challenges we might face.
4. "summary": (string) A concise Markdown overview covering Optimizations, Cost, Timeline, Bugs, and Comments.
5. "blueprint": (string) A deep-dive, professional **Project Blueprint** in Markdown. This MUST be the most detailed part of the response and should include:
   - **Architecture Design**: Detailed breakdown of frontend, backend, and infrastructure.
   - **Recommended Tech Stack**: Specific technologies with justification.
   - **Data Models**: Proposed database schema and key entities.
   - **Core Features**: Detailed roadmap for building the features.
   - **API Design**: Key endpoints and interaction patterns.
   - **Security & Reliability**: How to handle scale, security, and data integrity.

Output ONLY in valid JSON format matching the keys exactly.
"""

            parts = [{"text": prompt_content}]
            if base64_image:
                parts.append(
                    {
                        "inline_data": {
                            "mime_type": file_type,
                            "data": base64_image,
                        }
                    }
                )

            parsed_result = await self._generate_json(
                system_instruction=system_instruction,
                parts=parts,
                temperature=0.7,
            )

            await update_planning(self.planning_id, {
                "estimation": parsed_result,
                "status": "completed"
            })
            print(f"[{self.planning_id}] Planning Analysis Completed.")

        except Exception as e:
            print(f"[{self.planning_id}] Planning Failed: {e}")
            await update_planning(self.planning_id, {"status": "failed", "error_message": str(e)})

    def _extract_text_from_pdf(self, file_path: str) -> str:
        try:
            reader = PdfReader(file_path)
            text = ""
            # Extract first 5 pages max to save tokens
            for i, page in enumerate(reader.pages):
                if i >= 5: break
                text += page.extract_text() + "\n"
            return text
        except Exception as e:
            print(f"PDF extraction error: {e}")
            return ""

    def _encode_image(self, file_path: str) -> str:
        try:
            with open(file_path, "rb") as image_file:
                return base64.b64encode(image_file.read()).decode('utf-8')
        except Exception as e:
            print(f"Image encode error: {e}")
            return None

    def _local_fallback(self, desc, days):
        cost = days * 8 * 50 # Assumption: $50/hr, 8hr day
        summary = f"""### 1. Optimizations
- Use a microservices architecture to handle the scale described.
- Implement caching to reduce database load.

### 2. Cost
- **Total Estimated Cost: ${cost}**
- Development: ${int(cost * 0.7)}
- Testing: ${int(cost * 0.2)}
- Infrastructure: ${int(cost * 0.1)}

### 3. Timeline
- **Estimated Time: {days * 1.5} days**
- Research: 10%
- Development: 60%
- QA: 30%

### 4. Bugs
- No code provided for bug analysis, but concept implies race conditions in concurrent users.

### 5. Additional Comments
- Project viability is high if MVP is focused."""

        blueprint = f"""# Project Blueprint: {desc[:50]}...

## 1. Technical Architecture
We recommend a full-stack JavaScript approach using React for the frontend and Node.js for the backend. The system will be hosted on AWS using Lambda for cost-effectiveness.

## 2. Recommended Tech Stack
- **Frontend**: React, TailwindCSS, Lucide Icons
- **Backend**: Node.js, Express, MongoDB
- **Auth**: Firebase Authentication or NextAuth.js
- **Deployment**: Vercel (Frontend), AWS (Backend)

## 3. Data Model
- **User**: ID, Name, Email, Role, CreatedAt
- **Project**: ID, Name, Description, OwnerID, Status
- **Tasks**: ID, ProjectID, Title, Deadline, Completed

## 4. Feature Roadmap
- **Phase 1**: Authentication and Basic Dashboard
- **Phase 2**: Project Management and Data persistence
- **Phase 3**: Analytics and Notification System
"""

        return {
            "estimated_days": days * 1.5,
            "summary": summary,
            "blueprint": blueprint,
            "risks": ["Underestimation of complexity", "Lack of GEMINI_API_KEY"],
            "challenges": ["Manual deployment", "Building without AI"]
        }
