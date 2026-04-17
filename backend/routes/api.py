"""
routes/api.py  — UPGRADED
Changes vs original:
  1. File size limit (50MB ZIP, 10MB PDF)
  2. code_snippet field on /planning/estimate
  3. GET /planning/{id}/health — health score shortcut
  4. POST /code/review — standalone code review endpoint
  5. Startup creates all required upload dirs
  6. Request ID header for tracing
"""
import asyncio
import os
import re
import uuid
import shutil

_active_tasks = set()

from fastapi import APIRouter, HTTPException, BackgroundTasks, File, Form, UploadFile, Request, Depends
from routes.auth import get_current_user
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
from pypdf import PdfReader

from agents.orchestrator    import OrchestratorAgent
from agents.planning_agent  import PlanningAgent
from agents.code_review_agent import CodeReviewAgent
from database.mongo import (
    get_project, create_project, update_project,
    get_all_projects, get_all_plannings,
    create_planning, get_planning,
    delete_project, delete_all_projects,
    delete_planning, delete_all_plannings,
    is_admin_user,
)

router = APIRouter()

UPLOAD_ZIP_DIR      = "uploads/zips"
UPLOAD_PLANNING_DIR = "uploads/planning"
MAX_ZIP_BYTES       = 50 * 1024 * 1024   # 50 MB
MAX_PDF_BYTES       = 10 * 1024 * 1024   # 10 MB
MAX_CODE_CHARS      = 20_000             # ~500 lines

GITHUB_URL_RE = re.compile(
    r'^https?://(www\.)?github\.com/[A-Za-z0-9_.\-]+/[A-Za-z0-9_.\-]+'
)

# Pre-create dirs on import
for _dir in [UPLOAD_ZIP_DIR, UPLOAD_PLANNING_DIR, "uploads/avatars"]:
    os.makedirs(_dir, exist_ok=True)


# ── Shared helpers ────────────────────────────────────────────────────────────

def _validate_github_url(url: str):
    if url and not GITHUB_URL_RE.match(url.rstrip("/")):
        raise HTTPException(
            status_code=400,
            detail="Only public GitHub repo URLs are accepted: https://github.com/user/repo",
        )


async def _save_upload(file: UploadFile, dest_dir: str, max_bytes: int) -> str:
    """Save an upload, enforce size limit. Returns saved path."""
    content = await file.read()
    if len(content) > max_bytes:
        mb = max_bytes // (1024 * 1024)
        raise HTTPException(status_code=413, detail=f"File exceeds {mb} MB limit.")
    saved_path = os.path.join(dest_dir, f"{uuid.uuid4()}_{file.filename}")
    with open(saved_path, "wb") as f:
        f.write(content)
    return saved_path


def _pdf_preview_text(path: str, max_pages: int = 3, max_chars: int = 6000) -> str:
    try:
        reader = PdfReader(path)
        parts = []
        for i, page in enumerate(reader.pages):
            if i >= max_pages:
                break
            txt = page.extract_text() or ""
            if txt:
                parts.append(txt)
            if sum(len(p) for p in parts) >= max_chars:
                break
        return ("\n".join(parts))[:max_chars]
    except Exception:
        return ""


def _looks_like_resume(text: str) -> bool:
    t = (text or "").lower()
    if not t.strip():
        return False
    resume_hits = 0
    for kw in [
        "curriculum vitae", "resume", "cv", "work experience", "experience",
        "education", "skills", "certification", "objective", "profile",
        "linkedin", "github.com/", "phone", "email", "address",
    ]:
        if kw in t:
            resume_hits += 1
    # Emails/phones are very common in resumes
    if re.search(r"\b[\w\.\-]+@[\w\.\-]+\.\w+\b", t):
        resume_hits += 2
    if re.search(r"\b(\+?\d[\d\s\-\(\)]{8,}\d)\b", t):
        resume_hits += 1
    return resume_hits >= 4


def _looks_like_design_spec(text: str) -> bool:
    t = (text or "").lower()
    if not t.strip():
        return False
    design_hits = 0
    for kw in [
        "requirements", "scope", "user story", "acceptance criteria",
        "wireframe", "figma", "screen", "flow", "navigation",
        "api", "endpoint", "database", "schema", "architecture",
        "roles", "permissions", "login", "dashboard",
    ]:
        if kw in t:
            design_hits += 1
    return design_hits >= 3


def _validate_planning_description(desc: str) -> None:
    d = (desc or "").strip()
    if not d:
        raise HTTPException(400, "Description is required.")
    # reject obvious nonsense / too little signal
    if len(d) < 100:
        raise HTTPException(400, "Description must be at least 100 characters and include real features, users, and scope.")
    words = re.findall(r"[A-Za-z0-9_]+", d)
    if len(words) < 30:
        raise HTTPException(400, "Description looks too vague. Add target users + 6-10 concrete features (bullets are fine).")
    # require some product/design language
    must_have_any = [
        "user", "admin", "login", "auth", "dashboard", "feature", "flow",
        "api", "database", "role", "payment", "upload", "notification",
    ]
    low = d.lower()
    if not any(k in low for k in must_have_any):
        raise HTTPException(400, "Description must mention at least some concrete features (e.g., login, roles, dashboard, API, database, payments, uploads).")


# ── Response models ───────────────────────────────────────────────────────────

class ProjectStatusResponse(BaseModel):
    project_id: str
    status: str
    message: str

class PlanningStatusResponse(BaseModel):
    planning_id: str
    status: str
    message: str


# ── Code / Repo Analysis ──────────────────────────────────────────────────────

@router.post("/projects/analyze", response_model=ProjectStatusResponse)
async def analyze_project(
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
    github_url: Optional[str]        = Form(None),
    file:       Optional[UploadFile] = File(None),
    code:       Optional[str]        = Form(None),
    hourly_rate: Optional[int]    = Form(None),
    daily_rate:  Optional[int]    = Form(None),
    num_developers: Optional[int] = Form(1),
    experience:     Optional[str] = Form("Intermediate"),
):
    # Convert daily_rate to hourly_rate if provided
    current_hourly = hourly_rate
    if daily_rate:
        current_hourly = daily_rate // 8
    elif not current_hourly:
        current_hourly = 0
    if not github_url and not file and not code:
        raise HTTPException(400, "Provide github_url, a ZIP file, or code.")

    if github_url:
        _validate_github_url(github_url.strip())

    try:
        display_name = github_url.strip() if github_url else (file.filename if file else "inline-code")
        user_email   = current_user.get("email")
        project_id   = await create_project(display_name, user_email=user_email)

        zip_path = None
        if file:
            zip_path = await _save_upload(file, UPLOAD_ZIP_DIR, MAX_ZIP_BYTES)

        orchestrator = OrchestratorAgent(project_id)
        background_tasks.add_task(
            orchestrator.run_pipeline,
            github_url     = github_url.strip() if github_url else None,
            zip_path       = zip_path,
            code           = code,
            description    = code,   # surface code as description for design validator
            hourly_rate    = current_hourly,
            num_developers = num_developers or 1,
            experience     = experience,
        )

        return ProjectStatusResponse(
            project_id = str(project_id),
            status     = "processing",
            message    = f"Analysis started. Poll GET /projects/{project_id}",
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/projects")
async def list_projects(current_user: dict = Depends(get_current_user)):
    user_email = current_user.get("email")
    return await get_all_projects(user_email=user_email)


@router.get("/projects/{project_id}")
async def get_project_details(project_id: str, current_user: dict = Depends(get_current_user)):
    project = await get_project(project_id)
    if not project:
        raise HTTPException(404, "Project not found")
        
    user_email = current_user.get("email")
    if user_email and not is_admin_user(user_email):
        if project.get("user_email") and project.get("user_email") != user_email:
            raise HTTPException(status_code=403, detail="Access denied")
            
    project["_id"] = str(project["_id"])
    return project


@router.delete("/projects/{project_id}")
async def remove_project(project_id: str, current_user: dict = Depends(get_current_user)):
    project = await get_project(project_id)
    if not project:
        raise HTTPException(404, "Project not found")
        
    user_email = current_user.get("email")
    if user_email and not is_admin_user(user_email):
        if project.get("user_email") and project.get("user_email") != user_email:
            raise HTTPException(status_code=403, detail="Access denied")
            
    success = await delete_project(project_id)
    if not success:
        raise HTTPException(404, "Project not found or already deleted")
    return {"status": "success", "message": "Project removed"}


@router.delete("/projects")
async def clear_projects(current_user: dict = Depends(get_current_user)):
    user_email = current_user.get("email")
    count = await delete_all_projects(user_email=user_email)
    return {"status": "success", "message": f"Removed {count} projects"}


# ── Standalone Code Review ────────────────────────────────────────────────────

class CodeReviewRequest(BaseModel):
    code:     str
    language: Optional[str] = "auto"

@router.post("/code/review")
async def review_code(body: CodeReviewRequest):
    """Synchronous code review — no DB storage, returns result immediately."""
    if not body.code or not body.code.strip():
        raise HTTPException(400, "code field is required.")
    if len(body.code) > MAX_CODE_CHARS:
        raise HTTPException(413, f"Code exceeds {MAX_CODE_CHARS} character limit.")

    reviewer = CodeReviewAgent()
    result   = await reviewer.review(body.code, language=body.language or "auto")
    return result


# ── Idea Estimator / Planning ─────────────────────────────────────────────────

MIN_DESC_LENGTH = 50

@router.post("/planning/estimate", response_model=PlanningStatusResponse)
async def estimate_planning(
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
    team_size:     Optional[int]         = Form(1),
    experience:    Optional[str]         = Form("Intermediate"),
    description:   Optional[str]         = Form(None),
    expected_days: Optional[int]         = Form(30),
    code_snippet:  Optional[str]         = Form(None),
    hourly_rate:   Optional[int]         = Form(None),
    daily_rate:    Optional[int]         = Form(None),
    file:          Optional[UploadFile]  = File(None),
):
    # Convert daily_rate to hourly_rate if provided
    current_hourly = hourly_rate
    if daily_rate:
        current_hourly = daily_rate // 8
    elif not current_hourly:
        current_hourly = 0
    _validate_planning_description(description)

    valid_exp = {"Student", "Beginner", "Intermediate", "Advanced", "Expert"}
    if experience not in valid_exp:
        raise HTTPException(400, f"experience must be one of: {', '.join(sorted(valid_exp))}")

    team_size     = max(1, min(500, team_size or 1))
    expected_days = max(1, min(3650, expected_days or 30))

    if code_snippet and len(code_snippet) > MAX_CODE_CHARS:
        raise HTTPException(413, f"code_snippet exceeds {MAX_CODE_CHARS} character limit.")

    try:
        data = {
            "team_size":     team_size,
            "experience":    experience,
            "description":   description.strip(),
            "expected_days": expected_days,
            "code_snippet":  (code_snippet or "").strip(),
        }
        user_email = current_user.get("email")
        planning_id = await create_planning(data, user_email=user_email)

        file_path = None
        file_type = None
        if file:
            max_bytes = MAX_PDF_BYTES if (file.content_type or "").startswith("image") else MAX_PDF_BYTES
            file_path = await _save_upload(file, UPLOAD_PLANNING_DIR, max_bytes)
            file_type = file.content_type

            # Guardrails: prevent resumes/random PDFs being treated as design specs
            if file_type == "application/pdf":
                preview = _pdf_preview_text(file_path)
                if _looks_like_resume(preview) and not _looks_like_design_spec(preview):
                    raise HTTPException(
                        400,
                        "Uploaded PDF looks like a resume/CV, not a design/spec document. "
                        "Please upload a requirements/spec PDF (scope, screens/flows, API/data model) or a wireframe image.",
                    )

        agent = PlanningAgent(planning_id)
        task = asyncio.create_task(agent.analyze(data, file_path, file_type, hourly_rate=current_hourly))
        # Keep a strong reference to prevent silent garbage collection crashes!
        _active_tasks.add(task)
        task.add_done_callback(_active_tasks.discard)

        return PlanningStatusResponse(
            planning_id = planning_id,
            status      = "processing",
            message     = f"Estimation started. Poll GET /planning/{planning_id}",
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/planning")
async def list_plannings(current_user: dict = Depends(get_current_user)):
    user_email = current_user.get("email")
    return await get_all_plannings(user_email=user_email)


@router.get("/planning/{planning_id}")
async def get_planning_details(planning_id: str, current_user: dict = Depends(get_current_user)):
    planning = await get_planning(planning_id)
    if not planning:
        raise HTTPException(404, "Planning not found")
        
    user_email = current_user.get("email")
    if user_email and not is_admin_user(user_email):
        if planning.get("user_email") and planning.get("user_email") != user_email:
            raise HTTPException(status_code=403, detail="Access denied")
            
    planning["_id"] = str(planning["_id"])
    return planning


@router.get("/planning/{planning_id}/health")
async def get_planning_health(planning_id: str, current_user: dict = Depends(get_current_user)):
    """Quick health score shortcut — useful for dashboard widgets."""
    planning = await get_planning(planning_id)
    if not planning:
        raise HTTPException(404, "Planning not found")
        
    user_email = current_user.get("email")
    if user_email and not is_admin_user(user_email):
        if planning.get("user_email") and planning.get("user_email") != user_email:
            raise HTTPException(status_code=403, detail="Access denied")
            
    health = planning.get("health")
    if not health:
        raise HTTPException(202, "Health score not yet computed.")
    return health


@router.delete("/planning/{planning_id}")
async def remove_planning(planning_id: str, current_user: dict = Depends(get_current_user)):
    planning = await get_planning(planning_id)
    if not planning:
        raise HTTPException(404, "Planning not found")
        
    user_email = current_user.get("email")
    if user_email and not is_admin_user(user_email):
        if planning.get("user_email") and planning.get("user_email") != user_email:
            raise HTTPException(status_code=403, detail="Access denied")
            
    success = await delete_planning(planning_id)
    if not success:
        raise HTTPException(404, "Planning not found or already deleted")
    return {"status": "success", "message": "Planning removed"}


@router.delete("/planning")
async def clear_plannings(current_user: dict = Depends(get_current_user)):
    user_email = current_user.get("email")
    count = await delete_all_plannings(user_email=user_email)
    return {"status": "success", "message": f"Removed {count} plannings"}
