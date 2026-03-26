# 6. Learning Roadmap

To build this massive Agentic AI Project Manager, follow this structured roadmap. Don't build the whole thing at once; break it down into phases.

## Phase 1: Backend & Basic Extraction (Weeks 1-2)
**Goal:** Be able to pass a repository and get code metrics via API.
1. **Learn FastAPI Fundamentals:**
   - Learn how to define routes (`@app.post("/analyze")`).
   - Learn Pydantic for data validation.
2. **Learn File Downloading in Python:**
   - Understand how to download a ZIP file from GitHub using the `requests` library.
   - Use the built-in `zipfile` module to extract it.
3. **Build the Metrics Agent:**
   - Write Python scripts to traverse directories (`os.walk`), count lines of code, and count files.
   - Look into the `radon` Python package to automatically compute Cyclomatic Complexity.

## Phase 2: Machine Learning Prediction (Weeks 3-4)
**Goal:** Given metrics, predict cost and effort.
1. **Learn ML Basics:**
   - Regression vs Classification.
   - Read up on the COCOMO II software cost estimation model to understand how theoretical estimation works.
2. **Learn Pandas & Scikit-Learn:**
   - Find or create a synthetic software project dataset (`.csv`).
   - Train a `RandomForestRegressor`.
3. **Integration:**
   - Save the model using `joblib`.
   - Build the `EstimationAgent` class that loads the model and calls `model.predict()`.

## Phase 3: Generative AI & Orchestration (Weeks 5-6)
**Goal:** Connect the agents and generate the natural language report.
1. **Learn Multi-Agent Concepts:**
   - Read about the Orchestrator pattern.
   - Build a simple Python class that calls the scripts you wrote in Phases 1 and 2 sequentially.
2. **Learn Generative AI APIs:**
   - Watch a tutorial on the OpenAI Python SDK.
   - Practice Writing Prompts: Learn the difference between System prompts and User prompts.
3. **Build the Report Agent:**
   - Inject the JSON from earlier steps into a formatted prompt.
   - Return the generated Markdown text via your FastAPI route.

## Phase 4: Database & State Management (Week 7)
**Goal:** Save analyses so they don't disappear when the server restarts.
1. **Learn MongoDB (NoSQL):**
   - Understand JSON Documents vs SQL Tables.
   - Set up a free MongoDB Atlas cluster online.
2. **Learn PyMongo/Motor:**
   - Connect FastAPI to MongoDB using the connection string.
   - Write CRUD operations (Create, Read, Update, Delete) to save the `OrchestratorAgent` state.

## Phase 5: Frontend Dashboard (Weeks 8-9)
**Goal:** Build the React SaaS UI.
1. **Learn React Basics:**
   - Components, State (`useState`), and Hooks (`useEffect`).
2. **Learn Frontend Routing & Styling:**
   - Use React Router for navigation (`/dashboard`, `/project/:id`).
   - Use Tailwind CSS or Material UI for a polished, modern SaaS look.
3. **Connect to Backend API:**
   - Use `axios` to send the repository link to FastAPI.
   - Render the Markdown report using a package like `react-markdown`.

## Phase 6: Deployment (Week 10)
**Goal:** Put the app on the internet.
1. **Backend Deployment:** Use **Render.com** (Free tier) or Heroku to host your FastAPI Python server.
2. **Frontend Deployment:** Use **Vercel** or **Netlify** to host your Vite/React app.
3. **Database:** Ensure your MongoDB Atlas cluster allows connections from your Render backend's IP address.
4. **Environment Variables:** Make sure you successfully add your `OPENAI_API_KEY` and MongoDB URI to the Render secret settings, not in your code!

### Project Tech Stack

Python, FastAPI, React.js, Machine Learning (Random Forest/Regression), Generative AI (LLMs: OpenAI GPT-4o, Google Gemini, Anthropic Claude), Agentic AI (Multi-Agent System), MongoDB, Tailwind CSS, REST APIs, GitHub

### Project Tech Stack (Updated)

Python, FastAPI, React.js, Machine Learning (Random Forest/Regression), Generative AI (LLMs: OpenAI GPT-4o, Google Gemini, Anthropic Claude), Agentic AI (Multi-Agent System), MongoDB, Tailwind CSS, REST APIs, GitHub

---
