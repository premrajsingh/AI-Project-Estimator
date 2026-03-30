import os
# Added comment to trigger uvicorn reload for new MONGODB_URI
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
from bson import ObjectId
from dotenv import load_dotenv

load_dotenv()

MONGO_DETAILS = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGO_DETAILS)
database = client.ai_estimator
project_collection = database.get_collection("projects")

async def create_project(github_url: str) -> str:
    """Create a new project document and return its ID."""
    project = {
        "github_url": github_url,
        "status": "processing",
        "created_at": datetime.utcnow(),
        "metrics": {},
        "estimations": {},
        "risks": [],
        "optimizations": [],
        "final_report": ""
    }
    result = await project_collection.insert_one(project)
    return str(result.inserted_id)

async def update_project(project_id: str, update_data: dict) -> bool:
    """Update an existing project document."""
    try:
        result = await project_collection.update_one(
            {"_id": ObjectId(project_id)},
            {"$set": update_data}
        )
        return result.modified_count > 0
    except Exception as e:
        print(f"Failed to update project {project_id}: {e}")
        return False

async def get_project(project_id: str) -> dict:
    """Retrieve a project by ID."""
    try:
        project = await project_collection.find_one({"_id": ObjectId(project_id)})
        return project
    except Exception:
        return None

# User-related database functions
user_collection = database.get_collection("users")

async def create_user(user_data: dict) -> dict:
    """Create a new user document."""
    user = {
        **user_data,
        "created_at": datetime.utcnow()
    }
    result = await user_collection.insert_one(user)
    return {**user, "_id": str(result.inserted_id)}

async def get_user_by_email(email: str) -> dict:
    """Retrieve a user by email."""
    try:
        user = await user_collection.find_one({"email": email})
        if user:
            user["_id"] = str(user["_id"])
        return user
    except Exception:
        return None

async def update_user_profile(email: str, update_data: dict) -> bool:
    """Update an existing user's profile information by email."""
    try:
        # Filter only allowed fields to be updated
        allowed_fields = {"name", "title", "avatar_url"}
        filtered_data = {k: v for k, v in update_data.items() if k in allowed_fields}
        
        if not filtered_data:
            return False
            
        result = await user_collection.update_one(
            {"email": email},
            {"$set": filtered_data}
        )
        return result.modified_count > 0 or result.matched_count > 0
    except Exception as e:
        print(f"Failed to update user {email}: {e}")
        return False

async def update_user_password(email: str, new_hashed_password: str) -> bool:
    """Update an existing user's hashed password."""
    try:
        result = await user_collection.update_one(
            {"email": email},
            {"$set": {"hashed_password": new_hashed_password}}
        )
        return result.modified_count > 0 or result.matched_count > 0
    except Exception as e:
        print(f"Failed to update password for {email}: {e}")
        return False

# Planning-related database functions
planning_collection = database.get_collection("plannings")

async def create_planning(planning_data: dict) -> str:
    """Create a new planning estimation document and return its ID."""
    planning = {
        **planning_data,
        "status": "processing",
        "created_at": datetime.utcnow(),
        "estimation": None
    }
    result = await planning_collection.insert_one(planning)
    return str(result.inserted_id)

async def update_planning(planning_id: str, update_data: dict) -> bool:
    """Update an existing planning document."""
    try:
        result = await planning_collection.update_one(
            {"_id": ObjectId(planning_id)},
            {"$set": update_data}
        )
        return result.modified_count > 0
    except Exception as e:
        print(f"Failed to update planning {planning_id}: {e}")
        return False

async def get_planning(planning_id: str) -> dict:
    """Retrieve a planning by ID."""
    try:
        planning = await planning_collection.find_one({"_id": ObjectId(planning_id)})
        return planning
    except Exception:
        return None
