import os
import requests
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import RedirectResponse
from typing import List, Optional
from pydantic import BaseModel

from database.mongo import update_user_github_info, get_user_by_email, remove_user_github_info
from .auth import get_current_user, ALGORITHM, SECRET_KEY
import jwt

router = APIRouter()

GITHUB_CLIENT_ID     = os.getenv("GITHUB_CLIENT_ID")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET")
FRONTEND_URL         = os.getenv("FRONTEND_URL", "http://localhost:5175").rstrip("/")
BASE_URL             = os.getenv("BASE_URL", "http://localhost:8000").rstrip("/")

class GitHubRepo(BaseModel):
    id: int
    name: str
    full_name: str
    html_url: str
    description: Optional[str] = None
    language: Optional[str] = None
    stargazers_count: int
    updated_at: str

class GitHubManualConnect(BaseModel):
    username: str
    token: str

@router.get("/auth/github")
async def github_login(token: str):
    """Initiate GitHub OAuth flow. Requires user's application JWT."""
    if not GITHUB_CLIENT_ID:
        raise HTTPException(status_code=500, detail="GITHUB_CLIENT_ID not configured.")
    
    try:
        # Verify the user token first to know WHO is connecting
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if not email:
            raise HTTPException(status_code=401, detail="Invalid token")
    except Exception:
        raise HTTPException(status_code=401, detail="Authentication required to connect GitHub")

    # Use 'state' to carry the email securely through the OAuth dance
    redirect_uri = f"https://github.com/login/oauth/authorize?client_id={GITHUB_CLIENT_ID}&scope=repo,user&state={email}"
    return RedirectResponse(redirect_uri)

@router.get("/auth/github/callback")
async def github_callback(code: str, state: str):
    """Handle GitHub OAuth callback."""
    if not code:
        raise HTTPException(status_code=400, detail="Missing code")
    
    # Exchange code for token
    token_url = "https://github.com/login/oauth/access_token"
    headers = {"Accept": "application/json"}
    data = {
        "client_id": GITHUB_CLIENT_ID,
        "client_secret": GITHUB_CLIENT_SECRET,
        "code": code,
    }
    
    resp = requests.post(token_url, headers=headers, data=data)
    if not resp.ok:
        return RedirectResponse(f"{FRONTEND_URL}/repositories?error=github_token_exchange_failed")
    
    token_data = resp.json()
    access_token = token_data.get("access_token")
    if not access_token:
        error_desc = token_data.get("error_description", "Unknown error")
        return RedirectResponse(f"{FRONTEND_URL}/repositories?error={error_desc}")

    # Fetch GitHub user info
    user_resp = requests.get(
        "https://api.github.com/user",
        headers={"Authorization": f"token {access_token}"}
    )
    if not user_resp.ok:
        return RedirectResponse(f"{FRONTEND_URL}/repositories?error=github_user_fetch_failed")
    
    github_user = user_resp.json()
    github_username = github_user.get("login")

    # Save to our DB using the email carried in 'state'
    success = await update_user_github_info(state, access_token, github_username)
    
    if success:
        return RedirectResponse(f"{FRONTEND_URL}/repositories?connected=true")
    else:
        return RedirectResponse(f"{FRONTEND_URL}/repositories?error=database_update_failed")

@router.get("/github/repos", response_model=List[GitHubRepo])
async def list_github_repos(current_user: dict = Depends(get_current_user)):
    """Fetch user's repositories from GitHub."""
    token = current_user.get("github_token")
    if not token:
        raise HTTPException(status_code=400, detail="GitHub not connected")

    # Fetch repos from GitHub API
    resp = requests.get(
        "https://api.github.com/user/repos?sort=updated&per_page=100",
        headers={"Authorization": f"token {token}"}
    )
    
    if resp.status_code == 401:
        # Token might be expired or revoked
        raise HTTPException(status_code=401, detail="GitHub token invalid. Please reconnect.")
    
    if not resp.ok:
        raise HTTPException(status_code=500, detail="Failed to fetch repositories from GitHub")

    repos = resp.json()
    return [
        GitHubRepo(
            id=r["id"],
            name=r["name"],
            full_name=r["full_name"],
            html_url=r["html_url"],
            description=r.get("description"),
            language=r.get("language"),
            stargazers_count=r["stargazers_count"],
            updated_at=r["updated_at"],
        )
        for r in repos
    ]

@router.delete("/github/disconnect")
async def disconnect_github(current_user: dict = Depends(get_current_user)):
    """Disconnect GitHub account."""
    email = current_user.get("email")
    if not email:
        raise HTTPException(status_code=401, detail="Not authenticated")
    success = await remove_user_github_info(email)
    if success:
        return {"message": "GitHub disconnected"}
    raise HTTPException(status_code=500, detail="Failed to disconnect GitHub")

@router.post("/auth/github/manual")
async def connect_github_manual(data: GitHubManualConnect, current_user: dict = Depends(get_current_user)):
    """Connect GitHub using a manually provided token (bypassing OAuth session)."""
    email = current_user.get("email")
    if not email:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Verify the token works
    user_resp = requests.get(
        "https://api.github.com/user",
        headers={"Authorization": f"token {data.token}"}
    )
    if not user_resp.ok:
        raise HTTPException(status_code=400, detail="Invalid GitHub Token or Password")
        
    github_user = user_resp.json()
    github_username = github_user.get("login")
    
    # Save the token
    success = await update_user_github_info(email, data.token, github_username)
    if success:
        return {"message": "GitHub connected successfully", "username": github_username}
    raise HTTPException(status_code=500, detail="Failed to save GitHub connection")
