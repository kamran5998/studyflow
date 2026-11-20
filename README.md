# StudyPilot — AI-Powered Adaptive Study Planner

StudyPilot is a full-stack academic productivity workspace with explainable AI weakness diagnostics, adaptive daily study scheduling, exam readiness tracking, focus timer sessions, learning analytics, and an integrated AI study tutor.

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Recharts, Lucide Icons
- **Backend:** Node.js, Express (`server.ts`), session-cookie auth & persistent JSON store (`src/server/db.ts`)
- **AI & Intelligence Engines:** Server-side `@google/genai` integration + deterministic weakness, adaptive planning, recommendation, and analytics engines

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` file based on `.env.example` and add your Gemini API key:
   ```bash
   cp .env.example .env
   ```
   Set `GEMINI_API_KEY=your_api_key_here` inside `.env`.
3. Start the full-stack development server (port `3000`):
   ```bash
   npm run dev
   ```
4. Run verification checks:
   ```bash
   npm run lint
   npm test
   npm run build
   ```

## Deploying Live from GitHub

Because StudyPilot runs a Node.js/Express backend (`/api/*` and `/ai/*` routes + session auth + server-side Gemini API calls), **GitHub Pages alone (static-only hosting) cannot run the backend**.

Instead, host the repository on **GitHub** and deploy it as a **Web Service** on **Render** (free tier supported) or **Railway**:

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: StudyPilot AI"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo>.git
   git push -u origin main
   ```
2. **Deploy on Render (recommended — `render.yaml` included)**
   - Go to [render.com](https://render.com) and sign in with GitHub.
   - Click **New + → Blueprint** (or **New + → Web Service**) and select your GitHub repository.
   - Render detects `render.yaml` automatically (`Build Command: npm ci && npm run build`, `Start Command: npm start`, `Health Check: /api/health`).
   - Add the environment variable `GEMINI_API_KEY` in the Render dashboard and click **Deploy**.
   - Note: On Render's free tier without a persistent disk, `data/studypilot-db.json` resets when the instance spins down or redeploys. Attach a persistent disk and set `STUDYPILOT_DB_PATH` if you need permanent file storage across redeploys.
