from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from pydantic import BaseModel
from typing import Optional
from database.mongo import update_user_profile, get_user_by_email
from .auth import get_current_user
import os
import uuid
import shutil

router = APIRouter()

class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    title: Optional[str] = None

UPLOAD_DIR = "uploads/avatars"

@router.put("/profile")
async def update_profile(profile_data: UserProfileUpdate, current_user: dict = Depends(get_current_user)):
    """Update current user's profile details."""
    
    update_data = {}
    if profile_data.name is not None:
        update_data["name"] = profile_data.name
    if profile_data.title is not None:
        update_data["title"] = profile_data.title
        
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields provided for update")

    success = await update_user_profile(current_user["email"], update_data)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update profile in database",
        )
        
    updated_user = await get_user_by_email(current_user["email"])
    if not updated_user:
         raise HTTPException(status_code=404, detail="User not found after update")
         
    return {
        "email": updated_user["email"],
        "name": updated_user.get("name"),
        "title": updated_user.get("title"),
        "avatar_url": updated_user.get("avatar_url")
    }

@router.post("/profile/avatar")
async def upload_avatar(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """Upload and set a new profile avatar."""
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File provided is not an image.")
        
    # Create directory if it doesn't exist just in case
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    
    # Generate unique filename to avoid overwrites and cache issues
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    # Save the file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # The URL that the frontend will use to access the image
    avatar_url = f"http://localhost:8000/uploads/avatars/{unique_filename}"
    
    # Update the user's profile in the database
    success = await update_user_profile(current_user["email"], {"avatar_url": avatar_url})
    
    if not success:
        # Cleanup file if DB update fails
        os.remove(file_path)
        raise HTTPException(status_code=500, detail="Failed to save avatar to profile.")
        
    return {"avatar_url": avatar_url}
