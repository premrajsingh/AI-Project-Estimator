import os
import json
import certifi
from uuid import uuid4
from datetime import datetime, timezone

from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from dotenv import load_dotenv

load_dotenv()

MONGO_DETAILS = os.getenv("MONGODB_URI", "mongodb://localhost:27017")

_LOCAL_STORE_PATH = os.getenv(
    "LOCAL_STORE_PATH",
    os.path.join(os.path.dirname(__file__), "local_store.json"),
)
_use_local_store = False


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _json_default(o):
    if isinstance(o, datetime):
        return o.isoformat()
    return str(o)


def _read_local_store() -> dict:
    if not os.path.exists(_LOCAL_STORE_PATH):
        return {"projects": {}, "users": {}, "plannings": {}}
    try:
        with open(_LOCAL_STORE_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        if not isinstance(data, dict):
            return {"projects": {}, "users": {}, "plannings": {}}
        data.setdefault("projects", {})
        data.setdefault("users", {})
        data.setdefault("plannings", {})
        return data
    except Exception:
        return {"projects": {}, "users": {}, "plannings": {}}


def _write_local_store(data: dict) -> None:
    os.makedirs(os.path.dirname(_LOCAL_STORE_PATH), exist_ok=True)
    with open(_LOCAL_STORE_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2, default=_json_default)


def _mark_local_store(reason: Exception) -> None:
    global _use_local_store
    if not _use_local_store:
        _use_local_store = True
        print(f"[db] Mongo unavailable, using local store: {reason}")


def _mongo_client() -> AsyncIOMotorClient:
    if MONGO_DETAILS.startswith("mongodb+srv://"):
        return AsyncIOMotorClient(MONGO_DETAILS, tlsCAFile=certifi.where())
    return AsyncIOMotorClient(MONGO_DETAILS)


client = _mongo_client()
database = client.ai_estimator
project_collection = database.get_collection("projects")

async def create_project(github_url: str) -> str:
    """Create a new project document and return its ID."""
    project = {
        "github_url": github_url,
        "status": "processing",
        "created_at": _utcnow(),
        "metrics": {},
        "estimations": {},
        "risks": [],
        "optimizations": [],
        "final_report": "",
    }
    if _use_local_store:
        store = _read_local_store()
        project_id = uuid4().hex
        project["_id"] = project_id
        store["projects"][project_id] = project
        _write_local_store(store)
        return project_id
    try:
        result = await project_collection.insert_one(project)
        return str(result.inserted_id)
    except Exception as e:
        _mark_local_store(e)
        store = _read_local_store()
        project_id = uuid4().hex
        project["_id"] = project_id
        store["projects"][project_id] = project
        _write_local_store(store)
        return project_id

async def update_project(project_id: str, update_data: dict) -> bool:
    """Update an existing project document."""
    if _use_local_store:
        store = _read_local_store()
        proj = store["projects"].get(str(project_id))
        if not proj:
            return False
        proj.update(update_data)
        store["projects"][str(project_id)] = proj
        _write_local_store(store)
        return True
    try:
        oid = ObjectId(project_id) if ObjectId.is_valid(project_id) else project_id
        result = await project_collection.update_one(
            {"_id": oid},
            {"$set": update_data}
        )
        return result.modified_count > 0
    except Exception as e:
        _mark_local_store(e)
        print(f"Failed to update project {project_id}: {e}")
        return False

async def get_project(project_id: str) -> dict:
    """Retrieve a project by ID."""
    if _use_local_store:
        store = _read_local_store()
        return store["projects"].get(str(project_id))
    try:
        oid = ObjectId(project_id) if ObjectId.is_valid(project_id) else project_id
        project = await project_collection.find_one({"_id": oid})
        if project and "_id" in project:
            project["_id"] = str(project["_id"])
        return project
    except Exception as e:
        _mark_local_store(e)
        return None

# User-related database functions
user_collection = database.get_collection("users")

async def create_user(user_data: dict) -> dict:
    """Create a new user document."""
    user = {
        **user_data,
        "created_at": _utcnow()
    }
    if _use_local_store:
        store = _read_local_store()
        user_id = uuid4().hex
        user["_id"] = user_id
        store["users"][user_id] = user
        _write_local_store(store)
        return {**user, "_id": user_id}
    try:
        result = await user_collection.insert_one(user)
        return {**user, "_id": str(result.inserted_id)}
    except Exception as e:
        _mark_local_store(e)
        store = _read_local_store()
        user_id = uuid4().hex
        user["_id"] = user_id
        store["users"][user_id] = user
        _write_local_store(store)
        return {**user, "_id": user_id}

async def get_user_by_email(email: str) -> dict:
    """Retrieve a user by email."""
    if _use_local_store:
        store = _read_local_store()
        for u in store["users"].values():
            if u.get("email") == email:
                return {**u, "_id": str(u.get("_id"))}
        return None
    try:
        user = await user_collection.find_one({"email": email})
        if user:
            user["_id"] = str(user["_id"])
        return user
    except Exception as e:
        _mark_local_store(e)
        return None

async def update_user_profile(email: str, update_data: dict) -> bool:
    """Update an existing user's profile information by email."""
    try:
        # Filter only allowed fields to be updated
        allowed_fields = {"name", "title", "avatar_url"}
        filtered_data = {k: v for k, v in update_data.items() if k in allowed_fields}
        
        if not filtered_data:
            return False
            
        if _use_local_store:
            store = _read_local_store()
            for uid, u in store["users"].items():
                if u.get("email") == email:
                    u.update(filtered_data)
                    store["users"][uid] = u
                    _write_local_store(store)
                    return True
            return False

        result = await user_collection.update_one({"email": email}, {"$set": filtered_data})
        return result.modified_count > 0 or result.matched_count > 0
    except Exception as e:
        _mark_local_store(e)
        print(f"Failed to update user {email}: {e}")
        return False

async def update_user_github_info(email: str, github_token: str, github_username: str) -> bool:
    """Store GitHub OAuth token and username for the user."""
    try:
        update_data = {
            "github_token": github_token,
            "github_username": github_username,
            "github_connected_at": _utcnow()
        }
        if _use_local_store:
            store = _read_local_store()
            for uid, u in store["users"].items():
                if u.get("email") == email:
                    u.update(update_data)
                    store["users"][uid] = u
                    _write_local_store(store)
                    return True
            return False

        result = await user_collection.update_one({"email": email}, {"$set": update_data})
        return result.modified_count > 0 or result.matched_count > 0
    except Exception as e:
        _mark_local_store(e)
        print(f"Failed to update GitHub info for {email}: {e}")
        return False

async def update_user_password(email: str, new_hashed_password: str) -> bool:
    """Update an existing user's hashed password."""
    try:
        if _use_local_store:
            store = _read_local_store()
            for uid, u in store["users"].items():
                if u.get("email") == email:
                    u["hashed_password"] = new_hashed_password
                    store["users"][uid] = u
                    _write_local_store(store)
                    return True
            return False

        result = await user_collection.update_one({"email": email}, {"$set": {"hashed_password": new_hashed_password}})
        return result.modified_count > 0 or result.matched_count > 0
    except Exception as e:
        _mark_local_store(e)
        print(f"Failed to update password for {email}: {e}")
        return False

# Planning-related database functions
planning_collection = database.get_collection("plannings")

async def create_planning(planning_data: dict) -> str:
    """Create a new planning estimation document and return its ID."""
    planning = {
        **planning_data,
        "status": "processing",
        "created_at": _utcnow(),
        "estimation": None
    }
    if _use_local_store:
        store = _read_local_store()
        planning_id = uuid4().hex
        planning["_id"] = planning_id
        store["plannings"][planning_id] = planning
        _write_local_store(store)
        return planning_id
    try:
        result = await planning_collection.insert_one(planning)
        return str(result.inserted_id)
    except Exception as e:
        _mark_local_store(e)
        store = _read_local_store()
        planning_id = uuid4().hex
        planning["_id"] = planning_id
        store["plannings"][planning_id] = planning
        _write_local_store(store)
        return planning_id

async def update_planning(planning_id: str, update_data: dict) -> bool:
    """Update an existing planning document."""
    if _use_local_store:
        store = _read_local_store()
        doc = store["plannings"].get(str(planning_id))
        if not doc:
            return False
        doc.update(update_data)
        store["plannings"][str(planning_id)] = doc
        _write_local_store(store)
        return True
    try:
        oid = ObjectId(planning_id) if ObjectId.is_valid(planning_id) else planning_id
        result = await planning_collection.update_one(
            {"_id": oid},
            {"$set": update_data}
        )
        return result.modified_count > 0
    except Exception as e:
        _mark_local_store(e)
        print(f"Failed to update planning {planning_id}: {e}")
        return False

async def get_planning(planning_id: str) -> dict:
    """Retrieve a planning by ID."""
    if _use_local_store:
        store = _read_local_store()
        return store["plannings"].get(str(planning_id))
    try:
        oid = ObjectId(planning_id) if ObjectId.is_valid(planning_id) else planning_id
        planning = await planning_collection.find_one({"_id": oid})
        if planning and "_id" in planning:
            planning["_id"] = str(planning["_id"])
        return planning
    except Exception as e:
        _mark_local_store(e)
        return None


async def get_all_projects(limit: int = 50) -> list:
    """Retrieve all projects, newest first."""
    if _use_local_store:
        store = _read_local_store()
        projects = list(store["projects"].values())
        projects.sort(key=lambda p: p.get("created_at", ""), reverse=True)
        return projects[:limit]
    try:
        cursor = project_collection.find({}).sort("created_at", -1).limit(limit)
        projects = []
        async for p in cursor:
            p["_id"] = str(p["_id"])
            projects.append(p)
        return projects
    except Exception as e:
        _mark_local_store(e)
        print(f"Failed to get all projects: {e}")
        return []


async def get_all_plannings(limit: int = 50) -> list:
    """Retrieve all planning estimations, newest first."""
    if _use_local_store:
        store = _read_local_store()
        plannings = list(store["plannings"].values())
        plannings.sort(key=lambda p: p.get("created_at", ""), reverse=True)
        return plannings[:limit]
    try:
        cursor = planning_collection.find({}).sort("created_at", -1).limit(limit)
        plannings = []
        async for p in cursor:
            p["_id"] = str(p["_id"])
            plannings.append(p)
        return plannings
    except Exception as e:
        _mark_local_store(e)
        print(f"Failed to get all plannings: {e}")
        return []


# ── Deletion Functions ────────────────────────────────────────────────────────

async def delete_project(project_id: str) -> bool:
    """Delete a single project by ID."""
    if _use_local_store:
        store = _read_local_store()
        existed = str(project_id) in store["projects"]
        if existed:
            del store["projects"][str(project_id)]
            _write_local_store(store)
        return existed
    try:
        oid = ObjectId(project_id) if ObjectId.is_valid(project_id) else project_id
        result = await project_collection.delete_one({"_id": oid})
        return result.deleted_count > 0
    except Exception as e:
        _mark_local_store(e)
        print(f"Failed to delete project {project_id}: {e}")
        return False


async def delete_all_projects() -> int:
    """Delete all projects."""
    if _use_local_store:
        store = _read_local_store()
        count = len(store["projects"])
        store["projects"] = {}
        _write_local_store(store)
        return count
    try:
        result = await project_collection.delete_many({})
        return result.deleted_count
    except Exception as e:
        _mark_local_store(e)
        print(f"Failed to delete all projects: {e}")
        return 0


async def delete_planning(planning_id: str) -> bool:
    """Delete a single planning by ID."""
    if _use_local_store:
        store = _read_local_store()
        existed = str(planning_id) in store["plannings"]
        if existed:
            del store["plannings"][str(planning_id)]
            _write_local_store(store)
        return existed
    try:
        result = await planning_collection.delete_one({"_id": ObjectId(planning_id)})
        return result.deleted_count > 0
    except Exception as e:
        _mark_local_store(e)
        print(f"Failed to delete planning {planning_id}: {e}")
        return False


async def delete_all_plannings() -> int:
    """Delete all plannings."""
    if _use_local_store:
        store = _read_local_store()
        count = len(store["plannings"])
        store["plannings"] = {}
        _write_local_store(store)
        return count
    try:
        result = await planning_collection.delete_many({})
        return result.deleted_count
    except Exception as e:
        _mark_local_store(e)
        print(f"Failed to delete all plannings: {e}")
        return 0
