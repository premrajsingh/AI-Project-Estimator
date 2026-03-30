# 2. Agentic AI Guide

An "Agentic" system uses multiple specialized AI agents that work together, passing data to each other to accomplish a complex goal. For this project, a Multi-Agent Architecture ensures the system is modular, scalable, and easy to debug.

## How to Structure Multiple Agents
Each agent should be a separate Python class or module within your FastAPI backend. A good directory structure looks like this:

```
backend/
├── agents/
│   ├── __init__.py
│   ├── orchestrator_agent.py   # Manages the workflow
│   ├── metrics_agent.py        # Parses code and extracts LOC, complexity
│   ├── estimation_agent.py     # Runs the ML model for cost/time
│   ├── risk_agent.py           # Evaluates risks based on rules/thresholds
│   ├── optimization_agent.py   # Generates refactoring/team size suggestions
│   └── report_agent.py         # Calls the LLM to write the final report
```
Each agent should have a clear `run()` or `execute()` method that takes a specific input and returns a structured output (like a Pydantic model or a dictionary).

## How Agents Communicate
In this system, agents communicate **sequentially via the Orchestrator**. They don't need to talk directly to each other; they pass their state back to a central hub.

1. **State Object:** Create a shared Python dictionary or data class (e.g., `ProjectState`) that holds the project data as it moves through the pipeline.
2. **Data Flow:**
   - Input: Code codebase path or ZIP.
   - Orchestrator passes the path to `MetricsAgent`.
   - `MetricsAgent` returns metrics JSON and Orchestrator adds it to `ProjectState`.
   - Orchestrator passes the metrics to `EstimationAgent` and `RiskAgent`.
   - They return their predictions/scores. Orchestrator updates `ProjectState`.
   - Orchestrator passes everything to `ReportAgent`.

## How to Orchestrate Them
The `OrchestratorAgent` is a central controller. You can build a simple orchestrator pattern like this:

```python
class OrchestratorAgent:
    def process_project(self, repo_path: str):
        state = {}
        
        # 1. Get Metrics
        metrics_agent = MetricsAgent()
        state['metrics'] = metrics_agent.analyze(repo_path)
        
        # 2. Estimate Cost & Time
        est_agent = EstimationAgent()
        state['estimations'] = est_agent.predict(state['metrics'])
        
        # 3. Analyze Risks
        risk_agent = RiskAgent()
        state['risks'] = risk_agent.assess(state['metrics'], state['estimations'])
        
        # 4. Generate AI Report
        report_agent = ReportAgent()
        state['final_report'] = report_agent.generate(state)
        
        return state
```

## Tools and Frameworks You Can Use
While you can build the agents using plain Python scripts (which is highly recommended for beginners to understand the flow), you can also use popular frameworks designed for Agentic AI:
1. **LangChain / LangGraph:** Excellent for connecting LLMs with tools, keeping memory, and orchestrating complex workflows using graphs (LangGraph).
2. **CrewAI:** A popular framework built on top of LangChain specifically designed to make multi-agent systems easy. You assign "roles," "goals," and "tools" to different agents.
3. **AutoGen (Microsoft):** Great for conversational multi-agent systems where agents talk to each other to solve a problem. 
*(For your project, a simple LangChain pipeline or plain object-oriented Python is best to start).*

## How to Extend the Agent System Later
Because the system is modular, extending it is easy:
1. **New Agent:** Suppose you want to add a *Security Agent* capable of scanning for vulnerabilities.
2. **Implementation:** Create `security_agent.py` which uses a tool like Bandit or an external LLM call.
3. **Integration:** Simply add one more step in your `OrchestratorAgent` before the `ReportAgent`.
4. **Update Prompt:** Update the `ReportAgent` prompt template to include `{{ security_vulnerabilities }}` so the final report knows about the new findings.
