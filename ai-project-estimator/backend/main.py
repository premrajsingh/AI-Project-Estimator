from pathlib import Path
from dotenv import load_dotenv

# Load .env from this directory (backend/), not from the shell's CWD — so GEMINI_API_KEY works when
# you run uvicorn from the repo root or from backend.
load_dotenv(Path(__file__).resolve().parent / ".env")

from fastapi import FastAPI
# Force reload for bcrypt downgrade
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from routes import api
import uvicorn
import os

app = FastAPI(title="AI Project Estimator API", version="1.0.0")

# Ensure uploads directory exists
os.makedirs("uploads/avatars", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Configure CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api.router, prefix="/api/v1")

from routes import auth, user
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(user.router, prefix="/api/v1/user", tags=["user"])

@app.get("/")
def read_root():
    return {"status": "Backend is running"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
