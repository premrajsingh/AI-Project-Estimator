# 🚀 AI Project Estimator

[![Project License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Python Version](https://img.shields.io/badge/python-3.10%2B-blue)](https://www.python.org/)
[![Node Version](https://img.shields.io/badge/node-18%2B-green)](https://nodejs.org/)

An advanced AI-powered platform for estimating software development effort, cost, and risk. By analyzing GitHub repositories or evaluating project documentation, it generates comprehensive blueprints and financial estimates.

---

## ✨ Key Features

- **🔍 Repo Intelligence** — Analyze public GitHub repositories to extract complex code metrics and effort estimates.
- **💡 Idea-to-Blueprint** — Transform high-level project ideas into detailed technical requirements and development phases.
- **⚠️ Risk Mitigation** — Identify potential technical hurdles and architectural risks using AI-driven analysis.
- **📄 Expert Reports** — Generate professional reports covering timelines, tech stacks, and cost breakdowns.

---

## 🛠 Tech Stack

- **Backend**: FastAPI (Python), Google Gemini AI, MongoDB Atlas.
- **Frontend**: React (Vite), Tailwind CSS.
- **ML**: Multi-output regression models for data-driven effort estimation.

---

## 🚀 Getting Started

### 📋 Prerequisites
- Python 3.10+
- Node.js 18+
- MongoDB Atlas Account
- Google Gemini API Key

### ⚙️ Backend Setup

```bash
cd backend

# Virtual environment setup
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Environment configuration
cp .env.example .env
# Fill in GEMINI_API_KEY, MONGODB_URI, JWT_SECRET

# Launch FastAPI
uvicorn main:app --reload --port 8000
```

### 💻 Frontend Setup

```bash
cd frontend

# Install & start
npm install
cp .env.example .env
npm run dev
```

---

## 📁 Project Architecture

```bash
├── backend/
│   ├── agents/          # Multi-agent system (orchestrator, metrics, etc.)
│   ├── routes/          # API endpoints
│   ├── database/        # Storage layer
│   └── main.py          # Entry point
│
├── frontend/
│   └── src/
│       ├── pages/       # Application views
│       └── services/    # API integration
│
└── machine_learning/    # Model training and data synthesis
```

---

## 🌍 Deployment

- **Backend**: Deploy on Railway or Render (ensure `ALLOWED_ORIGINS` is set).
- **Frontend**: Deploy on Vercel or Netlify.

---

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.

---

*Built with ❤️ for the Developer Community.*

