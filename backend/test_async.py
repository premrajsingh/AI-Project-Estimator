import asyncio
from agents.planning_agent import PlanningAgent
import agents.planning_agent

async def mock_update_planning(*args, **kwargs):
    print("MOCK UPDATE PLANNING:", args, kwargs)

agents.planning_agent.update_planning = mock_update_planning

async def run():
    agent = PlanningAgent("test_id_123")
    data = {
        "description": "I want to build a simple e-commerce website with user auth, shopping cart, and payment gateway integration.",
        "team_size": 2,
        "experience": "Intermediate",
        "expected_days": 40
    }
    
    try:
        await agent.analyze(data)
    except Exception as e:
        print(f"ERROR CAUGHT: {e}")

if __name__ == "__main__":
    asyncio.run(run())
