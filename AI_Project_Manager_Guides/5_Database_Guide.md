# 5. Database Guide

MongoDB, a NoSQL database, fits perfectly into this AI Agentic system because agents output data in JSON format, which maps effortlessly into MongoDB documents.

## Where MongoDB Fits in the System
MongoDB acts as the persistent memory for the AI Project Manager.
Everything is saved here:
- When a user uploads a project link.
- What metrics the `MetricsAgent` extracted.
- What `EstimationAgent` predicted.
- The final Markdown report from `ReportAgent`.

By saving this data, the React frontend can quickly list all historical projects analyzed without having to run the time-consuming agents again.

## What Collections You Need
In MongoDB, a "Collection" is like a table in SQL. You should start with just **one main collection** for simplicity, since a project document can contain nested JSON objects.

### Collection: `projects`
**Schema Structure (using Python/Pydantic or Motor):**
```json
{
  "_id": "uuid-string-or-mongodb-object-id",
  "project_name": "My_ECommerce_App",
  "github_url": "https://github.com/user/repo",
  "status": "completed", 
  "created_at": "2024-05-10T14:22:11Z",
  
  "metrics": {
    "total_loc": 15042,
    "cyclomatic_complexity": 34.5,
    "file_count": 42
  },
  
  "estimations": {
    "predicted_time_days": 45,
    "predicted_effort_hours": 360,
    "predicted_cost_dollars": 18000
  },
  
  "risks": [
    {"type": "schedule", "score": 8, "reason": "High complexity and small team"}
  ],
  
  "optimizations": [
    {"type": "refactoring", "suggestion": "Break down monolith into microservices"}
  ],
  
  "final_report": "## Executive Summary\n\nThis project..."
}
```

## How Data Flows from Agents to Database
1. When the `OrchestratorAgent` starts processing, it inserts a skeleton document into MongoDB with `"status": "processing"`.
2. As each agent finishes, the Orchestrator runs an update command (`$set`) to append the new data (e.g., adding the `"metrics"` dictionary).
3. When the `ReportAgent` finishes, it updates the `"final_report"` and flips the status to `"completed"`.

_Using a Python driver like **Motor** (async MongoDB) or **PyMongo** is required inside your FastAPI app._

## How to Scale Storage Later
1. **Indexing:** Once you have thousands of projects, add indexes to `project_name` and `created_at` so search queries remain fast.
2. **Cloud Storage (Atlas):** Instead of installing MongoDB on your local laptop, sign up for a free tier at MongoDB Atlas. It gives you an connection string (`mongodb+srv://...`) to put in your `.env` file. It's secure, backed up, and ready to connect to a deployed backend on Render or AWS.
3. **Analytics Pipeline:** Connect MongoDB to tools like Metabase or use MongoDB's built-in charts to build a dashboard analyzing *all* projects across your system over time.

## Setting up MongoDB Connection
To actually connect your FastAPI backend to MongoDB, follow these steps:

1. Create a `.env` file in your `backend/` directory:
   ```env
   # Example .env file
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/?retryWrites=true&w=majority
   DB_NAME=ai_project_manager
   ```

2. Install Motor (Async Python driver):
   ```bash
   pip install motor python-dotenv
   ```

3. Create a `database.py` file in `backend/database/`:
   ```python
   import os
   from motor.motor_asyncio import AsyncIOMotorClient
   from dotenv import load_dotenv

   load_dotenv()

   MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
   DB_NAME = os.getenv("DB_NAME", "ai_project_manager")

   client = AsyncIOMotorClient(MONGODB_URI)
   db = client[DB_NAME]
   projects_collection = db.get_collection("projects")
   ```

You can now import `projects_collection` anywhere in your API routes or agents to securely save and load JSON data!
