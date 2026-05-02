# 🌍 Live Deployment Guide: AI Project Estimator

This guide provides a step-by-step walkthrough to deploy your AI Project Estimator to a live production environment using **MongoDB Atlas**, **Render**, and **Vercel**.

---

## 🏗️ Phase 1: local Preparation (Important!)

I have already prepared your local files (ML model and gitignore). You must ensure these are pushed to your GitHub repository first.

1. Open your terminal in the project root.
2. Run these commands:
   ```bash
   git add backend/models/effort_model.pkl .gitignore
   git commit -m "chore: include ML model for production"
   git push origin main
   ```

---

## 🍃 Phase 2: Database Setup (MongoDB Atlas)

1. **Sign Up**: Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) and create a free account.
2. **Create Cluster**: Select the **Free M0** tier and choose a region close to you.
3. **Network Access**: 
   - Go to "Network Access" in the sidebar.
   - Click "Add IP Address".
   - Click **Allow Access from Anywhere** (`0.0.0.0/0`) and Confirm.
4. **Database Access**:
   - Go to "Database Access".
   - Create a new user (e.g., `db_admin`).
   - Choose "Read and write to any database".
   - **Save the password safely!**
5. **Get Connection String**:
   - Click "Database" in the sidebar.
   - Click **Connect** on your cluster.
   - Select **Drivers** -> **Python**.
   - Copy the string: `mongodb+srv://db_admin:<password>@cluster0...`

---

## 🚀 Phase 3: Backend Deployment (Render)

1. **Sign Up**: Log in to [Render.com](https://render.com/) using your GitHub account.
2. **New Web Service**: Click **New +** -> **Web Service**.
3. **Connect Repository**: Select your `AI-Project-Estimator` repo.
4. **Configure Service**:
   - **Name**: `ai-estimator-api`
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python -m uvicorn main:app --host 0.0.0.0 --port $PORT`
5. **Environment Variables**: Click **Advanced** -> **Add Environment Variable**:
   - `MONGODB_URI`: *Your Atlas string (replace <password>)*
   - `GEMINI_API_KEY`: *Your Google AI Studio Key*
   - `JWT_SECRET`: *A random string (e.g., use a password generator)*
   - `ALLOWED_ORIGINS`: `*` (We'll tighten this later)
   - `FRONTEND_URL`: `https://your-app.vercel.app` (Add this AFTER Phase 4)
   - `BASE_URL`: `https://ai-estimator-api.onrender.com` (Your Render URL)
6. **Deploy**: Click **Create Web Service**.

---

## 🎨 Phase 4: Frontend Deployment (Vercel)

1. **Sign Up**: Log in to [Vercel.com](https://vercel.com/) with GitHub.
2. **Add Project**: Click **Add New** -> **Project**.
3. **Import**: Select your repository.
4. **Configure**:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
5. **Environment Variables**:
   - `VITE_API_URL`: `https://ai-estimator-api.onrender.com/api/v1` (Your Render URL + /api/v1)
6. **Deploy**: Click **Deploy**.

---

## 🔒 Phase 5: Final Security Polish

Once Vercel gives you your live URL (e.g., `https://ai-project-estimator.vercel.app`):

1. Go back to your **Render Dashboard**.
2. Go to **Environment Variables**.
3. Update `ALLOWED_ORIGINS` to: `https://your-vercel-url.vercel.app,http://localhost:5173`.
4. Update `FRONTEND_URL` to: `https://your-vercel-url.vercel.app`.
5. Render will automatically redeploy.

---

## ✅ Verification Checklist

- [ ] Can you register a new user on the live site?
- [ ] Does the "Repositories" page show your GitHub projects?
- [ ] Can you run a "New Analysis" on a public repo?
- [ ] Does the "Idea Estimator" generate a blueprint?

---

### 🆘 Troubleshooting
- **White Screen?** Check the Browser Console (F12) for CORS errors.
- **500 Error?** Check Render Logs for "Authentication Failed" (usually MongoDB password).
- **GitHub Connection Failed?** Ensure `FRONTEND_URL` in Render matches your Vercel URL exactly.

*Built with ❤️ by Antigravity*
