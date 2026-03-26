# AI-Powered Software Project Estimation System
**Implementation Guides and Master Folder Structure**

Use this set of guides to build out a production-ready AI Software Project Manager. 

## Project Structure (To Be Created)
When you are ready to begin coding, set up your folders exactly like this:

```text
ai-project-estimator/
├── frontend/                  # React / Vite Application
│   ├── src/
│   │   ├── components/        # Reusable UI (Cards, Charts)
│   │   ├── pages/             # Dashboard, Upload, Report details
│   │   ├── services/          # api.js for Axios requests to backend
│   │   └── App.jsx
│   ├── package.json
│   └── .env                   # For VITE_API_URL
│
├── backend/                   # FastAPI Python Application
│   ├── agents/
│   │   ├── orchestrator.py
│   │   ├── metrics_agent.py
│   │   ├── estimation_agent.py
│   │   ├── risk_agent.py
│   │   └── report_agent.py
│   ├── models/                # Scikit-Learn saved models (.pkl)
│   ├── routes/                # FastAPI endpoints (api/v1/)
│   ├── database/              # MongoDB connection and schemas
│   ├── main.py                # Server entry point
│   ├── requirements.txt
│   └── .env                   # MUST hold your OPENAI_API_KEY
│
├── machine_learning/          # Offline Training area
│   ├── data/                  # CSV datasets (PROMISE, ISBSG)
│   ├── notebooks/             # Jupyter notebooks for data exploration
│   └── train_model.py         # Script to output the .pkl model
│
└── docs/                      # Guides to help you build
    ├── 1_Generative_AI_Guide.md
    ├── 2_Agentic_AI_Guide.md
    ├── 3_Machine_Learning_Guide.md
    ├── 4_API_Integration_Guide.md
    ├── 5_Database_Guide.md
    ├── 6_Learning_Roadmap.md
    └── README.md
```

## How to use these guides

Review the guides in this order:
1. **6_Learning_Roadmap.md** - To understand the chronological steps required.
2. **3_Machine_Learning_Guide.md** - Start with your models.
3. **2_Agentic_AI_Guide.md** - To see how to structure your Python backend agents.
4. **1_Generative_AI_Guide.md** - To understand LLM integration for the final report.
5. **5_Database_Guide.md** - To understand storage.
6. **4_API_Integration_Guide.md** - To tie everything together into a fast web app.

Good luck! This is an excellent, portfolio-ready final year project.
