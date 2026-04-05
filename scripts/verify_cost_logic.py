import asyncio
import os
import sys
from pathlib import Path

# Add backend to path for direct testing (faster than hitting API for local verification)
sys.path.append(str(Path(__file__).resolve().parent.parent / "backend"))

from agents.estimation_agent import EstimationAgent

async def test_estimation():
    agent = EstimationAgent()
    
    # 1. Standard Project (Small/Medium)
    standard_metrics = {
        "functional_points": 50,
        "total_loc": 2000,
        "avg_complexity": 3.0,
        "top_complex_files": [
            {"filename": "utils.js", "content_excerpt": "function doWork() { console.log('hello'); }"}
        ]
    }
    
    print("\n--- Testing Standard Project ---")
    standard_result = await agent.predict(standard_metrics)
    print(f"Cost: ₹{standard_result.get('predicted_cost_inr'):,}")
    print(f"Source: {standard_result.get('source')}")
    
    # 2. AI Specialized Project
    ai_metrics = {
        "functional_points": 50,
        "total_loc": 2000,
        "avg_complexity": 3.0,
        "top_complex_files": [
            {"filename": "llm_service.py", "content_excerpt": "import openai\nresult = openai.ChatCompletion.create(model='gpt-4')"}
        ]
    }
    
    print("\n--- Testing AI Specialized Project ---")
    ai_result = await agent.predict(ai_metrics)
    print(f"Cost: ₹{ai_result.get('predicted_cost_inr'):,}")
    print(f"Source: {ai_result.get('source')}")
    
    # 3. Crypto Specialized Project
    crypto_metrics = {
        "functional_points": 50,
        "total_loc": 2000,
        "avg_complexity": 3.0,
        "top_complex_files": [
            {"filename": "Contract.sol", "content_excerpt": "pragma solidity ^0.8.0;\ncontract MyToken { mapping(address => uint) public balances; }"}
        ]
    }
    
    print("\n--- Testing Crypto Specialized Project ---")
    crypto_result = await agent.predict(crypto_metrics)
    print(f"Cost: ₹{crypto_result.get('predicted_cost_inr'):,}")
    print(f"Source: {crypto_result.get('source')}")

    # Cost ratios check
    if ai_result['predicted_cost_inr'] > standard_result['predicted_cost_inr']:
        print("\n✅ Success: AI specialization premium applied.")
    else:
        print("\n❌ Failure: AI premium not applied.")

    if crypto_result['predicted_cost_inr'] > ai_result['predicted_cost_inr']:
        print("✅ Success: Crypto (Tier 1) specialization premium applied.")

if __name__ == "__main__":
    asyncio.run(test_estimation())
