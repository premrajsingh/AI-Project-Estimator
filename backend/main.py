from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")

import os
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from routes import api, auth, user, github
from database.mongo import cleanup_stale_tasks

app = FastAPI(title="AI Project Estimator API", version="1.0.0")

@app.on_event("startup")
async def startup_event():
    await cleanup_stale_tasks()

# ── Uploads ───────────────────────────────────────────────────────────────────
os.makedirs("uploads/avatars", exist_ok=True)
os.makedirs("uploads/planning", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# ── CORS ──────────────────────────────────────────────────────────────────────
# In production, set ALLOWED_ORIGINS env var (comma-separated).
# Example: ALLOWED_ORIGINS=https://yourapp.vercel.app,https://yourapp.com
_raw_origins = os.getenv("ALLOWED_ORIGINS", "")
ALLOWED_ORIGINS = (
    [o.strip() for o in _raw_origins.split(",") if o.strip()]
    if _raw_origins
    else [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
    ]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(api.router,  prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(user.router, prefix="/api/v1/user", tags=["user"])
app.include_router(github.router, prefix="/api/v1", tags=["github"])

@app.get("/")
def read_root():
    return {"status": "ok", "service": "AI Project Estimator API"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
