# AI Project Estimator

An AI-powered platform for estimating software development effort, cost, and risk from GitHub repositories or project requirements.

---

## Features

- **Code Analysis** — Analyze any public GitHub repository to get effort, cost, and risk estimates
- **Idea Estimator** — Describe your project requirements and get an AI-generated development blueprint
- **Risk Analysis** — Identify technical risks and challenges before development starts
- **Reports** — Detailed AI-generated reports with timeline, architecture, and tech stack recommendations

---

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- MongoDB Atlas account
- Google Gemini API key

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and fill in: GEMINI_API_KEY, MONGODB_URI, JWT_SECRET

# Start server
uvicorn main:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Set VITE_API_URL if your backend is not on localhost:8000

# Start dev server
npm run dev
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | ✅ | Google AI Studio API key |
| `MONGODB_URI` | ✅ | MongoDB Atlas connection string |
| `JWT_SECRET` | ✅ | Secret key for JWT tokens (use a long random string) |
| `GEMINI_MODEL` | Optional | Gemini model name (default: `gemini-2.5-flash-lite`) |
| `ALLOWED_ORIGINS` | Production | Comma-separated frontend URLs for CORS |
| `GEMINI_TIMEOUT_SECONDS` | Optional | API timeout (default: `120`) |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | Production | Backend URL e.g. `https://your-api.railway.app/api/v1` |

---

## Project Structure

```
├── backend/
│   ├── agents/              # AI agent pipeline
│   │   ├── orchestrator.py  # Coordinates all agents
│   │   ├── metrics_agent.py # Code metrics extraction
│   │   ├── estimation_agent.py # ML + AI effort estimation
│   │   ├── planning_agent.py   # Idea-to-blueprint AI agent
│   │   ├── risk_agent.py       # Risk analysis
│   │   └── report_agent.py     # Final report generation
│   ├── routes/              # FastAPI route handlers
│   ├── database/            # MongoDB connection & queries
│   ├── models/              # ML model (effort_model.pkl)
│   └── main.py              # App entry point
│
├── frontend/
│   └── src/
│       ├── pages/           # Route-level page components
│       ├── services/api.js  # API client
│       └── context/         # React context providers
│
└── machine_learning/        # ML model training scripts
```

---

## Deployment

### Backend (Railway / Render)
1. Push to GitHub
2. Create a new service pointing to the `backend/` directory
3. Set all required environment variables in the platform dashboard
4. Set `ALLOWED_ORIGINS` to your frontend's deployed URL

### Frontend (Vercel)
1. Connect your GitHub repo to Vercel
2. Set the root directory to `frontend/`
3. Add `VITE_API_URL` pointing to your deployed backend

---

## Notes

- **GitHub URLs only**: The repository analyzer only supports public GitHub repository URLs
- **Idea Estimator**: Requires a detailed project description (50+ characters) for meaningful results
- **ML Model**: The `effort_model.pkl` is a multi-output regression model trained on synthetic project data
