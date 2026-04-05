# 1. Generative AI Guide

The Generative AI component of your system is responsible for taking the raw metrics, risk predictions, and optimization suggestions, and turning them into a cohesive, natural-language report that a non-technical project manager can easily understand.

## Which LLM APIs to Use
For a production-ready application that balances cost and performance:
1. **OpenAI API (GPT-4o or GPT-4o-mini)**: Industry standard, highly reliable, excellent for reasoning and report generation. GPT-4o-mini is cost-effective for large texts.
2. **Anthropic API (Claude 3.5 Sonnet)**: Exceptional at coding and analytical reasoning, making it perfect for interpreting software metrics and codebase analysis.
3. **Google Gemini API (Gemini 1.5 Pro/Flash)**: Great context window (up to 2M tokens) if you want to pass large chunks of code or massive project logs directly into the prompt.

**Recommendation:** Start with **OpenAI API (GPT-4o-mini)** for your development phase due to extensive documentation and community support, and upgrade to GPT-4o or Claude 3.5 Sonnet if you need higher quality reasoning.

## Where to Connect Them in the System
The LLM should be connected in the **Report Agent** of your backend.
The flow looks like this:
1. *Metrics Agent*, *Estimation Agent*, *Risk Analysis Agent*, and *Optimization Agent* complete their tasks and produce JSON outputs.
2. The *Orchestrator Agent* passes these JSON outputs to the *Report Agent*.
3. The *Report Agent* interpolates the JSON data into a large prompt and sends it to the LLM via its API.
4. The LLM returns a formatted Markdown report.
5. The backend saves the report to MongoDB and returns it to the frontend React app.

## Example Prompts Used Internally

**System Prompt (Role Definition):**
```text
You are an expert AI Project Manager Assistant. Your job is to analyze software project metrics, ML-based effort/cost estimations, and risk factors to generate a comprehensive, executive-level project health report. Provide actionable recommendations that are polite but firm about project risks. Output the response in clean Markdown.
```

**User Prompt (Data Injection):**
```text
Please analyze the following project data and generate a comprehensive health report.

### 1. Code Metrics
- Lines of Code: {{ loc }}
- Cyclomatic Complexity: {{ complexity }}
- Code Duplication: {{ duplication_percentage }}%

### 2. Estimations
- Estimated Development Time: {{ estimated_time_days }} days
- Estimated Effort: {{ estimated_effort_hours }} hours
- Estimated Cost: ${{ estimated_cost }}

### 3. Identified Risks
{{ risk_list }}

### 4. Optimization Suggestions
{{ optimization_list }}

Format the report with the following sections: Executive Summary, Metric Analysis, Risk Assessment, and Recommended Next Steps. Do not use generic filler text; be highly specific to the provided metrics.
```

## How to Handle API Keys
**Security is critical.** Never expose your API keys in the frontend React app or commit them to GitHub.
1. Create a `.env` file in your Python FastAPI backend directory.
2. Add your key: `OPENAI_API_KEY=sk-your-secret-key-here`
3. Add `.env` to your `.gitignore` file so it doesn't get pushed to GitHub.
4. In Python, load the key using the `python-dotenv` package:
   ```python
   import os
   from dotenv import load_dotenv
   load_dotenv()
   api_key = os.getenv("OPENAI_API_KEY")
   ```

## How to Test Report Generation
1. **Unit Testing:** Create mock JSON responses representing output from the other agents.
2. **Prompt Playground:** Before writing code, use the OpenAI Playground or Anthropic Console to test your system and user prompts with the mock JSON data. Tweak the prompts until the generated report looks perfect.
3. **Integration Testing:** Write a script or a basic FastAPI endpoint (`/api/v1/test-report`) that hardcodes the mock data, calls the LLM, and prints the result. This isolates the Report Agent so you can test it without needing the ML models or code parsers to be fully built yet.
