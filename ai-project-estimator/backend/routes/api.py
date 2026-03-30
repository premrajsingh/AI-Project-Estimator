from fastapi import APIRouter, HTTPException, BackgroundTasks, File, Form, UploadFile
from pydantic import BaseModel
from typing import Optional, Dict, Any
from agents.orchestrator import OrchestratorAgent
from database.mongo import get_project, create_project, update_project
import os
import uuid
import shutil

router = APIRouter()

class ProjectStatusResponse(BaseModel):
    project_id: str
    status: str
    message: str

UPLOAD_ZIP_DIR = "uploads/zips"

@router.post("/projects/analyze", response_model=ProjectStatusResponse)
async def analyze_project(
    background_tasks: BackgroundTasks,
    github_url: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None)
):
    if not github_url and not file:
        raise HTTPException(status_code=400, detail="Must provide either github_url or upload a zip file.")
        
    try:
        # Create a skeleton project document in MongoDB
        # We can store the filename or the url as the project_url
        display_name = github_url if github_url else file.filename
        project_id = await create_project(display_name)
        
        zip_path = None
        if file:
            os.makedirs(UPLOAD_ZIP_DIR, exist_ok=True)
            zip_path = os.path.join(UPLOAD_ZIP_DIR, f"{uuid.uuid4()}_{file.filename}")
            with open(zip_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
        
        # We start the orchestration in the background because AI agents take time
        # This prevents the initial API call from timing out.
        orchestrator = OrchestratorAgent(project_id)
        background_tasks.add_task(orchestrator.run_pipeline, github_url=github_url, zip_path=zip_path)
        
        return ProjectStatusResponse(
            project_id=str(project_id),
            status="processing",
            message="Analysis has started. Poll the status using GET /projects/{project_id}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/projects/{project_id}")
async def get_project_details(project_id: str):
    project = await get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Convert ObjectId to string for JSON serialization
    project["_id"] = str(project["_id"])
    return project

from database.mongo import create_planning, get_planning
from agents.planning_agent import PlanningAgent

# -- New Planning Flow --

class PlanningStatusResponse(BaseModel):
    planning_id: str
    status: str
    message: str

UPLOAD_PLANNING_DIR = "uploads/planning"

@router.post("/planning/estimate", response_model=PlanningStatusResponse)
async def estimate_planning(
    background_tasks: BackgroundTasks,
    team_size: Optional[int] = Form(1),
    experience: Optional[str] = Form("Intermediate"),
    description: Optional[str] = Form("Not provided"),
    expected_days: Optional[int] = Form(30),
    file: Optional[UploadFile] = File(None)
):
    try:
        data = {
            "team_size": team_size,
            "experience": experience,
            "description": description,
            "expected_days": expected_days
        }
        
        planning_id = await create_planning(data)
        
        file_path = None
        file_type = None
        if file:
            os.makedirs(UPLOAD_PLANNING_DIR, exist_ok=True)
            file_path = os.path.join(UPLOAD_PLANNING_DIR, f"{uuid.uuid4()}_{file.filename}")
            file_type = file.content_type
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
                
        agent = PlanningAgent(planning_id)
        background_tasks.add_task(agent.analyze, data, file_path, file_type)
        
        return PlanningStatusResponse(
            planning_id=planning_id,
            status="processing",
            message="Idea estimation has started. Poll status using GET /planning/{planning_id}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/planning/{planning_id}")
async def get_planning_details(planning_id: str):
    planning = await get_planning(planning_id)
    if not planning:
        raise HTTPException(status_code=404, detail="Planning not found")
        
    planning["_id"] = str(planning["_id"])
    return planning
