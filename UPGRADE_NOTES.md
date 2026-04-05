# 🚀 Upgrade Notes — AI Project Health + Cost + Code Optimization System

## 📋 Code Audit: Issues Found in Your Original Code

| File | Issue | Severity | Fix |
|---|---|---|---|
| `orchestrator.py` | Sequential pipeline — each agent blocks the next | 🔴 HIGH | `asyncio.gather()` for parallel Stage 1 |
| `metrics_agent.py` | Duplication = `file_count/100*2` (not real detection) | 🔴 HIGH | Use AST hash-based detection or ML |
| `metrics_agent.py` | Stores full file `content` in metrics dict (memory bomb) | 🟡 MED | Truncate to 250 lines max |
| `estimation_agent.py` | `effort_model.pkl` missing — silent fallback every time | 🔴 HIGH | Document or auto-train on startup |
| `gemini_client.py` | No retry on 429/503/timeout — fails hard | 🔴 HIGH | Exponential backoff, 3 retries |
| `risk_agent.py` | Gemini returns `score` as string sometimes — crashes `int()` | 🟡 MED | `str(r.get("score"))` guard added |
| `routes/api.py` | No file size limit — 100MB ZIP accepted | 🔴 HIGH | 50MB ZIP, 10MB PDF cap |
| `routes/api.py` | `UPLOAD_ZIP_DIR` created only on first request, not on startup | 🟡 MED | Move to module-level `os.makedirs` |
| `planning_agent.py` | No design validation before estimation | 🟡 MED | Run `DesignValidatorAgent` first |
| `planning_agent.py` | No health score output | 🟡 MED | Added `HealthScoreAgent` |
| `main.py` | CORS `allow_methods=["*"]` + `allow_headers=["*"]` in prod | 🟡 MED | Restrict to needed methods/headers |
| All agents | No project type detection | 🟡 MED | Added to `DesignValidatorAgent` |
| Missing | No health score (0-100) | 🔴 HIGH | New `health_agent.py` |
| Missing | No design error detection | 🔴 HIGH | New `design_validator.py` |
| Missing | No standalone code review endpoint | 🟡 MED | `POST /api/v1/code/review` |
| Missing | No optimistic/worst-case time estimates | 🟡 MED | Added to `planning_agent.py` |
| Missing | No module/role cost breakdown | 🟡 MED | Added to `planning_agent.py` |
| Missing | No MVP suggestion or cost reduction tips | 🟡 MED | `ai_suggestions` section added |


## 🗂️ New Files (drop into your project)

```
backend/agents/health_agent.py       ← NEW  — 0-100 health scorer
backend/agents/design_validator.py   ← NEW  — scope/error detection
backend/agents/code_review_agent.py  ← REPLACES optimization_agent.py
backend/agents/orchestrator.py       ← UPGRADED — parallel pipeline
backend/agents/planning_agent.py     ← UPGRADED — full CTO prompt
backend/agents/gemini_client.py      ← UPGRADED — retry logic
backend/routes/api.py                ← UPGRADED — file limits + new endpoints
```


## 🏗️ Backend Flow (Upgraded)

```
Input
  ↓
InputRouter + Validator (sync, blocks bad input early)
  ↓
┌─────────────────────────────────────┐
│ PARALLEL  asyncio.gather()          │
│  MetricsAgent    → metrics          │
│  DesignValidator → design_result    │
└─────────────────────────────────────┘
  ↓
HealthScoreAgent (preliminary, from metrics + design)
  ↓
┌─────────────────────────────────────┐
│ SEQUENTIAL                          │
│  EstimationAgent → estimations      │
│  RiskAgent       → risks            │
│  CodeReviewAgent → code_review      │
└─────────────────────────────────────┘
  ↓
HealthScoreAgent (final, with estimation data)
  ↓
ReportAgent (Gemini → markdown report)
  ↓
MongoDB (full record) + JSON response
```


## 🧠 Prompt Logic (CTO Mode)

### System instruction (all agents inherit this spirit):
```
You are a Senior AI Software Architect, CTO, and Project Estimation Expert.
Be strict, short, and practical. No fluff.
Think like a real CTO — reject unrealistic inputs, flag real risks.
```

### Design Validator prompt pattern:
```
Flag as ERRORS: UNREALISTIC_TIMELINE | MISSING_AUTH | MISSING_DATABASE |
               SCOPE_CREEP | TECHNOLOGY_CONFLICT
Return: {"errors": [...], "warnings": [...], "project_type": "...", "complexity": "..."}
```

### Planning Agent full output schema:
```json
{
  "summary": "2-3 sentence crisp summary",
  "design_errors": [{"code": "...", "message": "..."}],
  "cost_breakdown": {
    "total": 50000,
    "min": 35000,
    "expected": 50000,
    "premium": 70000,
    "by_module": [{"module": "Backend", "cost": 30000, "percentage": 60}],
    "by_role":   [{"role": "Backend Dev", "hours": 400, "rate": 75, "total": 30000}]
  },
  "time_estimate": {
    "optimistic_days": 60,
    "realistic_days":  90,
    "worst_case_days": 130,
    "phases": [{"phase": "Setup", "days": 5, "deliverable": "Repo + CI"}]
  },
  "health": {"score": 78, "status": "🟢 Healthy"},
  "risks":  [{"type": "Scope Creep", "severity": "high", "mitigation": "Freeze scope after sprint 1"}],
  "ai_suggestions": {
    "better_stack":        ["FastAPI is better than Flask for async I/O here"],
    "mvp_scope":           "Cut admin panel and analytics for v1",
    "cost_reduction_tips": ["Use managed DB", "Serverless for low-traffic routes"]
  },
  "code_review": {
    "issues":       [{"severity": "error", "line": 42, "message": "eval() usage is a security risk"}],
    "improvements": ["Use list comprehensions instead of loops for O(n) clarity"]
  },
  "blueprint": "# Blueprint\n## Stack\n..."
}
```


## 📥 Sample Input

```
POST /api/v1/planning/estimate
Content-Type: multipart/form-data

description  = "Build a multi-tenant SaaS project management tool with Kanban boards,
                real-time collaboration, file uploads, Slack notifications, and an
                AI assistant that summarizes project status weekly."
team_size    = 4
experience   = Advanced
expected_days = 120
code_snippet = "def get_users(db): return db.query('SELECT * FROM users')"
```


## 📤 Sample Output

```
📌 Summary
Multi-tenant Kanban SaaS with AI assistant. High complexity.
Feasible with 4 senior devs in 120 days if scope is controlled.

❌ Errors
• MISSING_AUTH — no auth provider mentioned for multi-tenant system

💰 Cost
| Tier     | Amount  |
|----------|---------|
| Min      | $72,000 |
| Expected | $96,000 |
| Premium  | $135,000|

Module breakdown:
• Backend API:   40% ($38,400)
• Frontend:      25% ($24,000)
• Realtime/WS:  15% ($14,400)
• AI assistant: 10% ($9,600)
• DevOps/Infra:  10% ($9,600)

⏱ Time
| Scenario   | Days |
|------------|------|
| Optimistic | 85   |
| Realistic  | 120  |
| Worst-case | 175  |

📊 Health Score: 72/100 🟡 Needs Attention
• Clarity: 22/25
• Code Quality: 18/25
• Feasibility: 20/25
• Risk: 12/25

⚠️ Risks
• Scope Creep (HIGH) → Freeze features after sprint 2
• Real-time complexity (HIGH) → Use Ably/Pusher instead of raw WebSockets
• AI cost overrun (MED) → Cap GPT calls per team per day

🚀 AI Suggestions
• Stack: FastAPI + Next.js + PostgreSQL + Redis + Ably
• MVP: Ship without AI assistant and Slack integration — add in v2
• Cost reduction: Use Supabase (saves ~$1,200/mo DBA cost)

💻 Code Review
❌ Issues Found:
• [error] Line 1: SELECT * fetches all columns — specify fields
• [warning] Line 1: No input sanitization on db.query() — SQL injection risk

✅ Optimized Code:
def get_users(db, limit: int = 100) -> list[dict]:
    return db.execute(
        "SELECT id, name, email FROM users LIMIT :limit",
        {"limit": limit}
    ).fetchall()

⚡ Improvements:
• Add pagination to prevent full-table scans
• Use parameterized queries to prevent SQL injection
• Add return type annotation for IDE support
```


## 🔧 .env.example — New Keys

```bash
# Code review model (can be lighter/faster than report model)
GEMINI_MODEL_CODE_REVIEW=gemini-2.0-flash

# Risk model
GEMINI_MODEL_RISKS=gemini-2.0-flash

# Optimizations model
GEMINI_MODEL_OPTIMIZATIONS=gemini-2.0-flash

# Report model (use a smarter model here)
GEMINI_MODEL_REPORT=gemini-2.5-flash-lite

# Retry attempts for Gemini calls (default: 3)
GEMINI_RETRY_ATTEMPTS=3
```


## 🚫 What NOT to Change (Working Well)

- `database/mongo.py` — solid async implementation
- `routes/auth.py` — JWT auth flow is correct
- `machine_learning/data_synthesizer.py` — good synthetic data generator
- `frontend/` — well-structured React app with good component separation
