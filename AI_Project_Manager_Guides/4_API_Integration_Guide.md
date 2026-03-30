# 4. API Integration Guide

This guide explains how to structure your internal APIs in FastAPI and connect them to external services and your React frontend.

## External APIs You May Need
1. **GitHub REST API:** Needed so users can paste a repository link and your backend can clone it or fetch its metadata without manual downloading.
   - Endpoint: `https://api.github.com/repos/{owner}/{repo}/zipball/{branch}`
2. **OpenAI / Anthropic API:** For Generative AI report creation.
3. **MongoDB Atlas API:** If you are using MongoDB Cloud instead of a local instance.

## Internal API Structure (FastAPI)
Your backend should expose clean RESTful routes. Group them logically using FastAPI's `APIRouter`.

### Suggested Routes:
1. **`POST /api/v1/projects/analyze`**
   - **Input:** JSON payload with a `github_url` or `file_upload`.
   - **Action:** Triggers the Orchestrator Agent. 
   - **Output:** A `project_id` pointing to the newly created analysis in MongoDB.
   - *Note: Because analysis takes time, this endpoint could return immediately with a "Processing" status, or you could use WebSockets for real-time progress updates.*

2. **`GET /api/v1/projects/{project_id}`**
   - **Action:** Fetches the full analysis results (Metrics, ML Predictions, LLM Report) from MongoDB.
   - **Output:** Complete JSON payload for the frontend to render.

3. **`GET /api/v1/projects`**
   - **Action:** Returns a list of all historical projects analyzed (for a dashboard list view).

## Best Practices for Connecting Frontend, Backend, and AI

### 1. Handling CORS (Cross-Origin Resource Sharing)
Your React frontend will likely run on `localhost:3000` (or 5173 with Vite), while your FastAPI backend runs on `localhost:8000`. Browsers block requests between different ports by default.
In your FastAPI `main.py`, you must configure CORS middleware:

```python
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 2. Connect Using Axios in React
In your React code, create a dedicated API service file (`services/api.js`) to keep your components clean:

```javascript
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/v1';

export const analyzeProject = async (repoUrl) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/projects/analyze`, {
            github_url: repoUrl
        });
        return response.data;
    } catch (error) {
        console.error("Error analyzing project", error);
        throw error;
    }
};
```

### 3. Asynchronous Execution for Agents
Agentic AI and LLM APIs take time (sometimes 10-30 seconds to generate a full report).
- **Basic approach:** Use `async/await` in your FastAPI route. The frontend will show a loading spinner until the 30-second request finishes.
- **Advanced approach (Future scope):** Use **Celery** or **RabbitMQ** to run the Orchestrator as a background task. The frontend polls a status endpoint (`/api/v1/projects/{id}/status`) every 3 seconds until it returns `"status": "completed"`.

### 4. Hide API Keys on the Backend
Never call OpenAI or MongoDB directly from the React frontend. Always route requests through your FastAPI backend so your secret keys remain hidden on the server.

### 5. Managing External API Keys (.env)
To connect the Generative AI agents securely, you must store your API keys as environment variables:

1. Inside your `backend/` folder, open or create the `.env` file.
2. Add your provider keys:
   ```env
   OPENAI_API_KEY=sk-proj-xxxxxxx...
   ANTHROPIC_API_KEY=sk-ant-xxxxxxx...
   GITHUB_PAT=ghp_xxxxxx...  # Optional: For fetching large/private repos
   ```
3. Read them safely in your Python code using `os` or `python-dotenv`:
   ```python
   import os
   from dotenv import load_dotenv

   load_dotenv()
   openai_key = os.getenv("OPENAI_API_KEY")

   if not openai_key:
       raise ValueError("OPENAI_API_KEY is not set in environment variables.")
   ```
This ensures that when you push your code to GitHub, your API keys remain secure locally and are not leaked to the public.
