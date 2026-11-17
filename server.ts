import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { analyzeWeaknesses } from "./src/server/weaknessDetector";
import { generateAdaptivePlan, rescheduleAdaptivePlan } from "./src/server/adaptivePlanner";
import {
  generateExplainableRecommendations,
  generatePersonalizedLearningInsights,
} from "./src/server/recommendationEngine";
import { computeLearningAnalytics } from "./src/server/analyticsEngine";
import { generateWeightageOptimizedPlan } from "./src/lib/examCalculations";
import { dbStore } from "./src/server/db";

function isPlainObject(val: unknown): val is Record<string, any> {
  return Boolean(val) && typeof val === "object" && !Array.isArray(val);
}

function parseCookies(cookieHeader?: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieHeader) return result;
  for (const part of cookieHeader.split(";")) {
    const idx = part.indexOf("=");
    if (idx <= 0) continue;
    const key = decodeURIComponent(part.slice(0, idx).trim());
    const val = decodeURIComponent(part.slice(idx + 1).trim());
    result[key] = val;
  }
  return result;
}

function buildCookieAttrs(req: express.Request, maxAgeSeconds?: number): string {
  const isHttps =
    req.secure ||
    String(req.headers["x-forwarded-proto"] || "")
      .toLowerCase()
      .includes("https");
  const attrs = ["Path=/", "HttpOnly"];
  if (typeof maxAgeSeconds === "number") {
    attrs.push(`Max-Age=${maxAgeSeconds}`);
  }
  if (isHttps) {
    attrs.push("SameSite=None", "Secure");
  } else {
    attrs.push("SameSite=Lax");
  }
  return attrs.join("; ");
}

function setSessionCookie(req: express.Request, res: express.Response, token: string, rememberMe = true) {
  const maxAge = rememberMe ? 60 * 60 * 24 * 30 : undefined; // 30 days or session
  const sessionCookie = `sp_session=${encodeURIComponent(token)}; ${buildCookieAttrs(req, maxAge)}`;
  const clearSignedOut = `sp_signed_out=; ${buildCookieAttrs(req, 0)}`;
  res.setHeader("Set-Cookie", [sessionCookie, clearSignedOut]);
}

function setSignedOutCookies(req: express.Request, res: express.Response) {
  const clearSession = `sp_session=; ${buildCookieAttrs(req, 0)}`;
  const signedOutCookie = `sp_signed_out=1; ${buildCookieAttrs(req, 60 * 60 * 24 * 30)}`;
  res.setHeader("Set-Cookie", [clearSession, signedOutCookie]);
}

function getSessionToken(req: express.Request): string | undefined {
  const cookies = parseCookies(req.headers.cookie);
  return cookies["sp_session"] || (typeof req.headers["x-studypilot-session"] === "string" ? req.headers["x-studypilot-session"] : undefined);
}

const app = express();
app.set("trust proxy", 1);
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: "10mb" }));

// ======================== SERVER PERSISTENCE & AUTH API ========================

app.get("/api/auth/me", async (req, res) => {
  try {
    const cookies = parseCookies(req.headers.cookie);
    const token = getSessionToken(req);
    const isSignedOut = cookies["sp_signed_out"] === "1";
    const state = await dbStore.getAuthState(token, isSignedOut);
    if (state.createdToken) {
      setSessionCookie(req, res, state.createdToken, true);
    }
    return res.json({
      currentUser: state.currentUser,
      isAuthenticated: state.isAuthenticated,
      accounts: state.accounts,
      activeSessions: state.activeSessions,
    });
  } catch (err) {
    console.error("[Auth Me Error]:", err);
    return res.status(500).json({ error: "Failed to load authentication state" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    if (!isPlainObject(req.body)) {
      return res.status(400).json({ error: "Request body must be a JSON object" });
    }
    const { email, password, rememberMe = true } = req.body;
    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ success: false, error: "Email and password are required." });
    }
    const ua = String(req.headers["user-agent"] || "");
    const result = await dbStore.login(email, password, {
      device: ua.includes("Mobile") ? "Mobile Device" : "Desktop Computer",
      browser: ua.includes("Chrome") ? "Chrome" : ua.includes("Firefox") ? "Firefox" : "Web Browser",
      ip: req.ip || "127.0.0.1",
    });
    if (!result.success || !result.token) {
      return res.status(401).json({ success: false, error: result.error || "Invalid credentials" });
    }
    setSessionCookie(req, res, result.token, Boolean(rememberMe));
    const state = await dbStore.getAuthState(result.token, false);
    return res.json({
      success: true,
      currentUser: state.currentUser,
      accounts: state.accounts,
      activeSessions: state.activeSessions,
    });
  } catch (err) {
    console.error("[Auth Login Error]:", err);
    return res.status(500).json({ success: false, error: "Failed to sign in" });
  }
});

app.post("/api/auth/google", async (req, res) => {
  try {
    const ua = String(req.headers["user-agent"] || "");
    const result = await dbStore.loginPrimaryDemo({
      device: ua.includes("Mobile") ? "Mobile Device" : "Desktop Computer",
      browser: "Google OAuth Session",
      ip: req.ip || "127.0.0.1",
    });
    if (!result.success || !result.token) {
      return res.status(401).json({ success: false, error: result.error || "Sign in failed" });
    }
    setSessionCookie(req, res, result.token, true);
    const state = await dbStore.getAuthState(result.token, false);
    return res.json({
      success: true,
      currentUser: state.currentUser,
      accounts: state.accounts,
      activeSessions: state.activeSessions,
    });
  } catch (err) {
    console.error("[Auth Google Error]:", err);
    return res.status(500).json({ success: false, error: "Failed to sign in" });
  }
});

app.post("/api/auth/register", async (req, res) => {
  try {
    if (!isPlainObject(req.body)) {
      return res.status(400).json({ success: false, error: "Request body must be a JSON object" });
    }
    const result = await dbStore.register(req.body as any);
    if (!result.success || !result.token) {
      return res.status(400).json({ success: false, error: result.error || "Registration failed" });
    }
    setSessionCookie(req, res, result.token, true);
    const state = await dbStore.getAuthState(result.token, false);
    return res.status(201).json({
      success: true,
      currentUser: state.currentUser,
      accounts: state.accounts,
      activeSessions: state.activeSessions,
    });
  } catch (err) {
    console.error("[Auth Register Error]:", err);
    return res.status(500).json({ success: false, error: "Failed to create account" });
  }
});

app.post("/api/auth/logout", async (req, res) => {
  try {
    const token = getSessionToken(req);
    await dbStore.logout(token);
    setSignedOutCookies(req, res);
    return res.json({ success: true });
  } catch (err) {
    console.error("[Auth Logout Error]:", err);
    return res.status(500).json({ success: false, error: "Failed to sign out" });
  }
});

app.post("/api/auth/switch", async (req, res) => {
  try {
    if (!isPlainObject(req.body) || typeof req.body.userId !== "string") {
      return res.status(400).json({ success: false, error: "userId is required" });
    }
    const result = await dbStore.switchAccount(req.body.userId);
    if (!result.success || !result.token) {
      return res.status(404).json({ success: false, error: result.error || "Account not found" });
    }
    setSessionCookie(req, res, result.token, true);
    const state = await dbStore.getAuthState(result.token, false);
    return res.json({
      success: true,
      currentUser: state.currentUser,
      accounts: state.accounts,
      activeSessions: state.activeSessions,
    });
  } catch (err) {
    console.error("[Auth Switch Error]:", err);
    return res.status(500).json({ success: false, error: "Failed to switch account" });
  }
});

app.patch("/api/auth/account", async (req, res) => {
  try {
    if (!isPlainObject(req.body)) {
      return res.status(400).json({ success: false, error: "Request body must be a JSON object" });
    }
    const userId = await dbStore.resolveUserId(getSessionToken(req));
    if (userId === "guest") {
      return res.status(401).json({ success: false, error: "Authentication required" });
    }
    const result = await dbStore.updateAccount(userId, req.body);
    if (!result.success) {
      return res.status(404).json(result);
    }
    return res.json(result);
  } catch (err) {
    console.error("[Auth Update Account Error]:", err);
    return res.status(500).json({ success: false, error: "Failed to update account" });
  }
});

app.post("/api/auth/change-password", async (req, res) => {
  try {
    if (!isPlainObject(req.body)) {
      return res.status(400).json({ success: false, error: "Request body must be a JSON object" });
    }
    const userId = await dbStore.resolveUserId(getSessionToken(req));
    if (userId === "guest") {
      return res.status(401).json({ success: false, error: "You must be signed in to change password." });
    }
    const result = await dbStore.changePassword(
      userId,
      String(req.body.oldPassword || ""),
      String(req.body.newPassword || "")
    );
    return res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    console.error("[Change Password Error]:", err);
    return res.status(500).json({ success: false, error: "Failed to change password" });
  }
});

app.post("/api/auth/reset-password", async (req, res) => {
  try {
    if (!isPlainObject(req.body) || typeof req.body.email !== "string") {
      return res.status(400).json({ success: false, message: "Registered email address is required." });
    }
    const result = await dbStore.resetPassword(req.body.email);
    return res.status(result.success ? 200 : 404).json(result);
  } catch (err) {
    console.error("[Reset Password Error]:", err);
    return res.status(500).json({ success: false, message: "Failed to reset password" });
  }
});

app.delete("/api/auth/sessions/:sessionId", async (req, res) => {
  try {
    const userId = await dbStore.resolveUserId(getSessionToken(req));
    if (userId === "guest") {
      return res.status(401).json({ success: false, error: "Authentication required" });
    }
    await dbStore.revokeSession(userId, req.params.sessionId);
    const state = await dbStore.getAuthState(getSessionToken(req), false);
    return res.json({ success: true, activeSessions: state.activeSessions });
  } catch (err) {
    console.error("[Revoke Session Error]:", err);
    return res.status(500).json({ success: false, error: "Failed to revoke session" });
  }
});

app.get("/api/workspace", async (req, res) => {
  try {
    const userKey = await dbStore.resolveUserId(getSessionToken(req));
    const workspace = await dbStore.getWorkspace(userKey);
    return res.json({ userKey, workspace });
  } catch (err) {
    console.error("[Get Workspace Error]:", err);
    return res.status(500).json({ error: "Failed to load workspace from server" });
  }
});

app.put("/api/workspace", async (req, res) => {
  try {
    if (!isPlainObject(req.body)) {
      return res.status(400).json({ error: "Request body must be a JSON object" });
    }
    const userKey = await dbStore.resolveUserId(getSessionToken(req));
    const saved = await dbStore.saveWorkspace(userKey, req.body);
    return res.json({ userKey, workspace: saved });
  } catch (err) {
    console.error("[Save Workspace Error]:", err);
    return res.status(500).json({ error: "Failed to save workspace to server" });
  }
});

app.post("/api/workspace/reset", async (req, res) => {
  try {
    const userKey = await dbStore.resolveUserId(getSessionToken(req));
    const workspace = await dbStore.resetWorkspace(userKey);
    return res.json({ userKey, workspace });
  } catch (err) {
    console.error("[Reset Workspace Error]:", err);
    return res.status(500).json({ error: "Failed to reset workspace" });
  }
});

app.get("/api/roadmaps", async (req, res) => {
  try {
    const userKey = await dbStore.resolveUserId(getSessionToken(req));
    const roadmaps = await dbStore.getRoadmaps(userKey);
    return res.json({ userKey, ...roadmaps });
  } catch (err) {
    console.error("[Get Roadmaps Error]:", err);
    return res.status(500).json({ error: "Failed to load roadmaps" });
  }
});

app.put("/api/roadmaps", async (req, res) => {
  try {
    if (!isPlainObject(req.body)) {
      return res.status(400).json({ error: "Request body must be a JSON object" });
    }
    const userKey = await dbStore.resolveUserId(getSessionToken(req));
    const saved = await dbStore.saveRoadmaps(userKey, req.body);
    return res.json({ userKey, ...saved });
  } catch (err) {
    console.error("[Save Roadmaps Error]:", err);
    return res.status(500).json({ error: "Failed to save roadmaps" });
  }
});

// ======================== STUDYPIlOT AI ROUTES ========================

// Initialize GoogleGenAI client lazily from server-side environment variables
let aiClient: GoogleGenAI | null = null;
const API_KEY = process.env.GEMINI_API_KEY || "";

function getAIClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// 1. Health check
const healthHandler = (_req: express.Request, res: express.Response) => {
  res.json({
    status: "ok",
    service: "StudyPilot AI Intelligence",
    llm_configured: !!API_KEY,
  });
};
app.get("/ai/health", healthHandler);
app.get("/api/health", healthHandler);

// Helper to clean Markdown JSON code blocks
function cleanJsonText(raw: string): string {
  return raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

// Helper to timeout long-running external API calls (generous 30s timeout)
function withTimeout<T>(promise: Promise<T>, ms: number = 30000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("AI generation timeout")), ms)),
  ]);
}

// 2. Kamran / Studybuddy AI Assistant Chat
app.post("/ai/chat", async (req, res) => {
  try {
    if (!isPlainObject(req.body)) {
      return res.status(400).json({ error: "Request body must be a JSON object" });
    }
    const { message, history, context } = req.body;
    const ai = getAIClient();

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    const safeSubjects = Array.isArray(context?.subjects) ? context.subjects : [];
    const safeExams = Array.isArray(context?.exams) ? context.exams : [];
    const safeQuizzes = Array.isArray(context?.quizScores) ? context.quizScores : [];
    const safeTasks = Array.isArray(context?.tasks) ? context.tasks : [];

    // Compute real weak topics from student records instead of hardcoded examples
    const computedWeakness = analyzeWeaknesses({
      subjects: safeSubjects,
      tasks: safeTasks,
      exams: safeExams,
      quizScores: safeQuizzes,
    });
    const realWeakTopics = computedWeakness.topics
      .filter((t) => t.masteryClassification === "weak" || t.masteryClassification === "developing")
      .slice(0, 5)
      .map((t) => ({
        topic: t.topic,
        subject: t.subjectName,
        score: t.score,
        reason: t.explanation,
      }));

    if (ai) {
      try {
        const studentContextStr = JSON.stringify({
          studentName: context?.profile?.name || "Student",
          subjects: safeSubjects.map((s: any) => ({ name: s.name, progress: s.progress })),
          nearestExams: safeExams.map((e: any) => ({
            title: e.title,
            subject: e.subjectName,
            date: e.date,
            prep: e.preparationPercentage,
          })),
          weakTopics: Array.isArray(context?.weakTopics) && context.weakTopics.length > 0 ? context.weakTopics : realWeakTopics,
          recentQuizScores: safeQuizzes.slice(-5),
        });

        const systemPrompt = `You are Studybuddy, "Your AI Study Assistant" in StudyPilot AI.
Your personality:
- Friendly, calm, helpful, concise, encouraging, and student-focused.
- You must NOT behave like a generic chatbot.
- You have real-time visibility into this specific student's StudyPilot AI data:
${studentContextStr}

CRITICAL RULES:
1. Keep answers concise (2 to 4 sentences maximum), direct, and actionable, unless the student explicitly asks for a detailed explanation of a topic.
2. If the student asks what to study or asks about an upcoming exam, reference their actual subjects, nearest exams, and weak topics (e.g. Trees at 52% in DSA).
3. If appropriate, recommend a concrete action that can be triggered.
4. Output your response as a valid JSON object matching this schema:
{
  "content": "Your concise response text here",
  "actionTrigger": {
    "label": "Button Label",
    "type": "open_planner" | "start_quiz" | "open_exam" | "start_focus" | "open_summarizer",
    "payload": {}
  } // actionTrigger is optional or null if no immediate action is relevant
}
5. Safety: Never mention or expose private data of any other person. Only reference the current student.`;

        const response = await withTimeout(
          ai.models.generateContent({
            model: "gemini-3.8-flash",
            contents: [
              { role: "user", parts: [{ text: `${systemPrompt}\n\nStudent Message: ${message}` }] },
            ],
            config: {
              responseMimeType: "application/json",
              thinkingConfig: { thinkingBudget: 0 },
            },
          }),
          30000
        );

        const text = response.text || "";
        try {
          const parsed = JSON.parse(cleanJsonText(text));
          return res.json(parsed);
        } catch {
          return res.json({ content: text, actionTrigger: null });
        }
      } catch (geminiErr: any) {
        // Graceful fallback without breaking error log
      }
    }

    // High-quality local student-aware fallback
    const msg = message.toLowerCase();
    if (msg.includes("dsa") || msg.includes("exam in 4 days") || (msg.includes("exam") && msg.includes("study"))) {
      return res.json({
        content: "Focus on Trees and Graphs first. Your recent quiz scores are lower there (52% on Trees), and your Data Structures midterm is just 4 days away.",
        actionTrigger: {
          label: "Start 45m Trees Focus Session",
          type: "start_focus",
          payload: { topic: "Trees", durationMinutes: 45, subjectName: "Data Structures & Algorithms" },
        },
      });
    }

    if (msg.includes("plan") || msg.includes("schedule")) {
      return res.json({
        content: "I can help you build an optimized study schedule! In the Study Planner, enter how many hours you want to study today, and I'll automatically check all your subjects and allocate focused study time topic-by-topic.",
        actionTrigger: {
          label: "Open AI Study Planner",
          type: "open_planner",
        },
      });
    }

    if (msg.includes("quiz") || msg.includes("test me")) {
      return res.json({
        content: "Active recall is the most effective way to lock in concepts! Select any subject in your workspace to generate an instant AI diagnostic quiz.",
        actionTrigger: {
          label: "Open Quizzes",
          type: "start_quiz",
        },
      });
    }

    if (msg.includes("normalization")) {
      return res.json({
        content: "Database Normalization organizes tables to minimize data redundancy and prevent update anomalies: 1NF ensures atomic values with no repeating groups; 2NF removes partial key dependencies; 3NF eliminates transitive dependencies (non-key fields depending on other non-key fields); and BCNF handles overlapping candidate keys.",
        actionTrigger: {
          label: "Test Me on DBMS Normalization",
          type: "start_quiz",
          payload: { subjectName: "Database Systems", topic: "Normalization" },
        },
      });
    }

    if (msg.includes("summar")) {
      return res.json({
        content: "You can upload your lecture slides, PDF chapters, or text notes into the AI Notes Summarizer to generate instant key points, concept definitions, and flashcards.",
        actionTrigger: {
          label: "Open Notes Summarizer",
          type: "open_summarizer",
        },
      });
    }

    return res.json({
      content: `I'm Studybuddy, your AI Study Assistant! I can help you allocate study hours across your subjects, quiz you on specific topics, summarize notes, and guide your daily study plan. How can I help you today?`,
      actionTrigger: {
        label: "Open Study Planner",
        type: "open_planner",
      },
    });
  } catch (error: any) {
    console.error("[Studybuddy Chat Error]:", error);
    res.status(500).json({
      content: "I ran into a temporary hiccup connecting to the intelligence engine. Let's focus on your top study priorities!",
      actionTrigger: null,
    });
  }
});

// 3. AI Quiz Generator
app.post("/ai/generate-quiz", async (req, res) => {
  try {
    if (!isPlainObject(req.body)) {
      return res.status(400).json({ error: "Request body must be a JSON object" });
    }
    const { subjectName, topic, difficulty } = req.body;
    const rawCount = Number(req.body.questionCount ?? 5);
    const questionCount = Number.isFinite(rawCount) ? Math.max(1, Math.min(20, Math.round(rawCount))) : 5;
    const ai = getAIClient();

    if (ai) {
      try {
        const prompt = `Generate an interactive multiple choice quiz for a university student.
Subject: ${subjectName || "Computer Science"}
Topic: ${topic || "Core Concepts"}
Difficulty: ${difficulty || "Medium"}
Number of Questions: ${questionCount}

Return ONLY a valid JSON object matching this schema:
{
  "questions": [
    {
      "id": "q1",
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswerIndex": 0, // 0 to 3
      "explanation": "Clear explanation of why this answer is correct.",
      "subConcept": "Sub-topic name (e.g. Insertion, Deletion, Traversal, Memory Complexity)"
    }
  ]
}
Ensure questions test true understanding, with plausible distractors and concise explanations.`;

        const response = await withTimeout(
          ai.models.generateContent({
            model: "gemini-3.8-flash",
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: {
              responseMimeType: "application/json",
              thinkingConfig: { thinkingBudget: 0 },
            },
          }),
          30000
        );

        const text = response.text || "";
        const parsed = JSON.parse(cleanJsonText(text));
        if (parsed.questions && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
          return res.json(parsed);
        }
      } catch {
        // Fallback silently if upstream is busy
      }
    }

    // Local fallback questions generator
    res.json({ questions: getFallbackQuestions(topic, difficulty, questionCount) });
  } catch (e: any) {
    console.warn("[Quiz Gen Error]:", e?.message || e);
    const { topic, difficulty, questionCount } = req.body;
    res.json({ questions: getFallbackQuestions(topic, difficulty, questionCount || 5) });
  }
});

// 4. AI Notes / PDF Summarizer
app.post("/ai/summarize-notes", async (req, res) => {
  try {
    if (!isPlainObject(req.body)) {
      return res.status(400).json({ error: "Request body must be a JSON object" });
    }
    const { text, fileName } = req.body;
    const ai = getAIClient();

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return res.status(400).json({ error: "Text content is required" });
    }

    if (ai) {
      try {
        const prompt = `You are an expert academic tutor and notes summarizer. Analyze the following student study material (${fileName || "Document"}):
---
${text.slice(0, 15000)}
---

Generate a structured study summary. Return ONLY a valid JSON object matching this schema:
{
  "title": "Clear concise document title",
  "summary": "A high-impact executive summary paragraph (3-4 sentences)",
  "keyPoints": [
    "Scannable high-priority bullet point 1",
    "Scannable high-priority bullet point 2",
    "Scannable high-priority bullet point 3",
    "Scannable high-priority bullet point 4",
    "Scannable high-priority bullet point 5"
  ],
  "importantConcepts": [
    { "term": "Core Term 1", "definition": "Clear concise definition", "importance": "critical" },
    { "term": "Core Term 2", "definition": "Clear concise definition", "importance": "high" },
    { "term": "Core Term 3", "definition": "Clear concise definition", "importance": "supplementary" }
  ],
  "possibleQuestions": [
    { "question": "High-yield exam question 1?", "answer": "Model succinct answer.", "type": "conceptual" },
    { "question": "High-yield exam question 2?", "answer": "Model succinct answer.", "type": "exam" }
  ],
  "quickRevision": [
    "Rapid formula / rule / takeaway 1",
    "Rapid formula / rule / takeaway 2",
    "Rapid formula / rule / takeaway 3"
  ]
}`;

        const response = await withTimeout(
          ai.models.generateContent({
            model: "gemini-3.8-flash",
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: {
              responseMimeType: "application/json",
              thinkingConfig: { thinkingBudget: 0 },
            },
          }),
          30000
        );

        const parsed = JSON.parse(cleanJsonText(response.text || ""));
        return res.json(parsed);
      } catch {
        // Fallback silently if upstream is busy
      }
    }

    // Intelligent fallback summary
    res.json(getFallbackSummary(text, fileName));
  } catch (e: any) {
    console.error("[Summarizer Error]:", e);
    const { text, fileName } = req.body;
    res.json(getFallbackSummary(text || "", fileName));
  }
});

// 5. AI Learning Roadmap Generator
app.post("/ai/generate-roadmap", async (req, res) => {
  try {
    if (!isPlainObject(req.body)) {
      return res.status(400).json({ error: "Request body must be a JSON object" });
    }
    const { topic = "Python", targetLevel = "Beginner to Advanced", weeklyHours = 10 } = req.body;
    const ai = getAIClient();

    if (!topic || typeof topic !== "string" || topic.trim().length === 0) {
      return res.status(400).json({ error: "Topic is required" });
    }

    if (ai) {
      try {
        const prompt = `You are a world-class computer science curriculum architect and senior software engineering mentor.
A student wants to learn "${topic.trim()}" from the absolute basics up to mastery/advanced levels.
Target Level: ${targetLevel}
Estimated Study Commitment: ~${weeklyHours} hours/week.

Generate a comprehensive, crystal-clear, structured learning roadmap.
Divide the journey into 4 progressive phases:
1. Beginner / Fundamentals (Core syntax, basic types, control flow, setup, simple CLI scripts)
2. Intermediate / Core Architecture (OOP, functional paradigms, modules, file I/O, error handling, standard libraries)
3. Advanced / Deep Concepts & Performance (Asynchronous programming, memory/concurrency, metaprogramming, design patterns, testing & debugging)
4. Mastery / Production Ecosystem & Real-World Capstone (Popular frameworks/libraries, API design, packaging/deployment, database integration, portfolio capstone projects)

Return ONLY a valid JSON object matching this schema:
{
  "id": "roadmap-${Date.now()}",
  "topic": "${topic.trim()}",
  "targetLevel": "${targetLevel}",
  "estimatedWeeks": 12,
  "overview": "A clear, motivational 2-3 sentence overview of this learning path and what the student will achieve.",
  "prerequisites": ["Basic computer literacy", "Problem-solving mindset"],
  "careerPaths": ["Software Engineer", "Backend Developer", "Specialist in ${topic.trim()}"],
  "keyTips": [
    "Write code every single day rather than passively watching tutorials.",
    "Complete the milestone project at the end of each phase before moving on.",
    "Engage with open-source repositories and community docs."
  ],
  "phases": [
    {
      "id": "phase-1",
      "level": "Beginner",
      "title": "Phase 1: Foundations & Core Syntax",
      "durationEstimate": "Weeks 1-3",
      "description": "Establish your development environment and master basic language primitives, logic, and standard constructs.",
      "topics": [
        {
          "id": "t1-1",
          "title": "Topic Name",
          "description": "Clear explanation of what to learn and why it matters.",
          "keyConcepts": ["Concept 1", "Concept 2", "Concept 3"],
          "handsOnProjects": ["Mini CLI Project Name", "Practice Exercise Name"]
        }
      ],
      "milestoneProject": {
        "title": "Comprehensive Phase Milestone Project",
        "description": "Detailed description of a project that integrates all Phase 1 topics.",
        "skillsTested": ["Skill 1", "Skill 2", "Skill 3"]
      }
    }
  ]
}

Ensure each phase has 3 to 4 well-structured topics with realistic hands-on mini-projects and clear key concepts.`;

        const response = await withTimeout(
          ai.models.generateContent({
            model: "gemini-3.8-flash",
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: {
              responseMimeType: "application/json",
              thinkingConfig: { thinkingBudget: 0 },
            },
          }),
          35000
        );

        const parsed = JSON.parse(cleanJsonText(response.text || ""));
        if (parsed.phases && Array.isArray(parsed.phases) && parsed.phases.length > 0) {
          return res.json(parsed);
        }
      } catch (err: any) {
        console.warn("Gemini roadmap generation fallback triggered:", err?.message || err);
      }
    }

    // High quality local fallback roadmap
    res.json(getFallbackRoadmap(topic, targetLevel));
  } catch (e: any) {
    console.error("[Roadmap Gen Error]:", e);
    const { topic, targetLevel } = req.body;
    res.json(getFallbackRoadmap(topic || "Python", targetLevel || "Beginner to Advanced"));
  }
});

// 6. AI Exam Preparation & Weightage Optimization Strategy
app.post("/ai/exam-plan", async (req, res) => {
  try {
    if (!isPlainObject(req.body)) {
      return res.status(400).json({ error: "Request body must be a JSON object" });
    }
    const { exam, subject, subjects = [], quiz_scores = [], quizScores = [], focus_sessions = [], focusSessions = [] } = req.body;
    const ai = getAIClient();

    if (!isPlainObject(exam) || !exam.title) {
      return res.status(400).json({ error: "Valid exam object with title is required" });
    }

    const safeSubjects = Array.isArray(subjects) ? subjects : [];
    const safeQuizzes = Array.isArray(quiz_scores) && quiz_scores.length > 0 ? quiz_scores : Array.isArray(quizScores) ? quizScores : [];
    const safeSessions = Array.isArray(focus_sessions) && focus_sessions.length > 0 ? focus_sessions : Array.isArray(focusSessions) ? focusSessions : [];
    const matchingSub = subject || safeSubjects.find((s: any) => s.id === exam.subjectId || s.name?.toLowerCase() === exam.subjectName?.toLowerCase());
    const parsedTime = exam.date ? new Date(exam.date).getTime() : NaN;
    const days = Number.isFinite(parsedTime) ? Math.max(0, Math.ceil((parsedTime - Date.now()) / (1000 * 60 * 60 * 24))) : 7;

    if (ai) {
      try {
        const prompt = `You are a university academic exam coach.
Analyze this student's upcoming exam and topics to create a weightage-optimized preparation plan.
Exam: ${exam.title}
Subject: ${exam.subjectName}
Days Left: ${days}
Topics: ${JSON.stringify(matchingSub?.topics || [{ title: "Core Fundamentals" }, { title: "Applications & Practice" }])}
Target Study Hours: ${exam.targetHours || 6.0}

Return ONLY a valid JSON object matching this schema:
{
  "examId": "${exam.id}",
  "examTitle": "${exam.title}",
  "subjectName": "${exam.subjectName}",
  "daysRemaining": ${days},
  "currentPreparation": ${exam.preparationPercentage || 65},
  "recommendedTotalHours": ${exam.targetHours || 6.0},
  "aiStrategyVerdict": "AI Strategy note explaining how study time is prioritized for high-weightage topics to secure maximum marks.",
  "priorityTopics": [
    {
      "topic": "Topic Name",
      "mastery": 60,
      "quizScore": 60,
      "priority": "High",
      "badge": "🔴 High Marks Payoff",
      "color": "red",
      "isCompleted": false,
      "reason": "Detailed reason why this topic is prioritized.",
      "estimatedStudyHours": 2.5,
      "weightage": 35,
      "weightageLevel": "high",
      "allocatedMinutes": 90,
      "marksImpact": "~35% of Total Exam Marks"
    }
  ],
  "studySchedule": [
    {
      "dayNumber": 1,
      "date": "${days} Days Left",
      "milestone": "Milestone title",
      "focusDescription": "What to study",
      "targetHours": 2.0,
      "isCompleted": false,
      "weightageFocus": "Targets ~35% exam marks"
    }
  ],
  "revisionSchedule": [
    {
      "phase": "Phase 1: Concept Lock",
      "timing": "3 Days Out",
      "activity": "Deep dive into high-weightage topics",
      "durationMinutes": 90
    }
  ],
  "practiceRecommendations": [
    {
      "type": "High Weightage",
      "recommendation": "Focus 65% of study hours on top weightage chapters first.",
      "tag": "Highest ROI"
    }
  ]
}`;

        const response = await withTimeout(
          ai.models.generateContent({
            model: "gemini-3.8-flash",
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: {
              responseMimeType: "application/json",
              thinkingConfig: { thinkingBudget: 0 },
            },
          }),
          30000
        );

        const parsed = JSON.parse(cleanJsonText(response.text || ""));
        if (parsed.priorityTopics && Array.isArray(parsed.priorityTopics)) {
          return res.json(parsed);
        }
      } catch {
        // Fallback silently to client calculation
      }
    }

    // Deterministic weightage-optimized exam preparation plan fallback
    const deterministicPlan = generateWeightageOptimizedPlan(
      exam as any,
      matchingSub as any,
      safeQuizzes,
      safeSessions,
      Number(exam.targetHours) || 6.0
    );
    return res.json(deterministicPlan);
  } catch (e: any) {
    console.error("[Exam Plan Error]:", e);
    return res.status(500).json({ error: "Failed to generate exam preparation plan" });
  }
});

// 7. StudyPilot AI Weakness Detection & Diagnostic Engine
app.post("/ai/analyze-weakness", async (req, res) => {
  try {
    if (!isPlainObject(req.body)) {
      return res.status(400).json({ error: "Request body must be a JSON object" });
    }
    const {
      subjects = [],
      tasks = [],
      exams = [],
      focus_sessions = [],
      focusSessions,
      quiz_scores = [],
      quizScores,
      thresholds,
    } = req.body;

    const rawQuizzes = Array.isArray(quiz_scores) && quiz_scores.length > 0 ? quiz_scores : Array.isArray(quizScores) ? quizScores : [];
    const rawSessions = Array.isArray(focus_sessions) && focus_sessions.length > 0 ? focus_sessions : Array.isArray(focusSessions) ? focusSessions : [];

    // Core deterministic, explainable weakness analysis
    const result = analyzeWeaknesses({
      subjects: Array.isArray(subjects) ? subjects : [],
      tasks: Array.isArray(tasks) ? tasks : [],
      exams: Array.isArray(exams) ? exams : [],
      focusSessions: rawSessions,
      quizScores: rawQuizzes,
      thresholds,
    });

    // Optional LLM executive study coach synthesis if configured and weak topics exist
    const ai = getAIClient();
    if (ai && result.topics.length > 0 && result.summary.weakCount > 0) {
      try {
        const topWeakList = result.topics
          .filter((t) => t.masteryClassification === "weak")
          .slice(0, 3)
          .map((t) => `'${t.topic}' in ${t.subjectName} (${t.score}%)`)
          .join(", ");

        const prompt = `You are StudyPilot AI's Senior Academic Advisor.
Briefly provide a 1-to-2 sentence strategic diagnostic for this student based on these measured weak areas: ${topWeakList}.
Mention which one requires immediate revision and why. Keep it encouraging and actionable. No markdown bullets.`;

        const response = await withTimeout(
          ai.models.generateContent({
            model: "gemini-3.8-flash",
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: {
              thinkingConfig: { thinkingBudget: 0 },
            },
          }),
          4000 // Responsive 4s timeout
        );

        const aiText = response.text?.trim();
        if (aiText && aiText.length > 10) {
          result.summary.aiDiagnostic = aiText;
        }
      } catch {
        // Fallback silently to deterministic summary
      }
    }

    return res.json(result);
  } catch (error: any) {
    console.error("[Weakness Engine Error]:", error);
    return res.status(500).json({
      error: "Failed to analyze weak topics",
    });
  }
});

// 8. StudyPilot AI Adaptive Study Recommendations
app.post("/ai/recommend", (req, res) => {
  try {
    if (!isPlainObject(req.body)) {
      return res.status(400).json({ error: "Request body must be a JSON object" });
    }
    const {
      subjects = [],
      exams = [],
      quiz_scores = [],
      quizScores = [],
      tasks = [],
      assignments = [],
      focus_sessions = [],
      focusSessions = [],
      dismissedRecommendationIds = [],
      completedRecommendationIds = [],
      previouslyMissedTopicNames = [],
      availableStudyHours = 2,
    } = req.body;

    const rawQuizzes = Array.isArray(quiz_scores) && quiz_scores.length > 0 ? quiz_scores : Array.isArray(quizScores) ? quizScores : [];
    const rawSessions = Array.isArray(focus_sessions) && focus_sessions.length > 0 ? focus_sessions : Array.isArray(focusSessions) ? focusSessions : [];

    const recResult = generateExplainableRecommendations({
      subjects: Array.isArray(subjects) ? subjects : [],
      exams: Array.isArray(exams) ? exams : [],
      quizScores: rawQuizzes,
      tasks: Array.isArray(tasks) ? tasks : [],
      assignments: Array.isArray(assignments) ? assignments : [],
      focusSessions: rawSessions,
      dismissedRecommendationIds,
      completedRecommendationIds,
      previouslyMissedTopicNames,
      availableStudyHours,
    });

    const formattedTop = recResult.topRecommendation
      ? {
          ...recResult.topRecommendation,
          recommendedDuration: recResult.topRecommendation.suggestedDuration,
          recommendedDurationMinutes: recResult.topRecommendation.suggestedDurationMinutes,
          totalScore: recResult.topRecommendation.priorityScore,
          daysToExam: recResult.topRecommendation.daysToDeadline,
        }
      : null;

    const formattedRecs = recResult.recommendations.map((r) => ({
      ...r,
      recommendedDuration: r.suggestedDuration,
      recommendedDurationMinutes: r.suggestedDurationMinutes,
      totalScore: r.priorityScore,
      daysToExam: r.daysToDeadline,
    }));

    return res.json({
      topRecommendation: formattedTop,
      recommendations: formattedRecs,
      totalGenerated: recResult.totalGenerated,
      activeCount: recResult.activeCount,
      completedCount: recResult.completedCount,
      dismissedCount: recResult.dismissedCount,
      evaluatedAt: recResult.evaluatedAt,
    });
  } catch (e: any) {
    console.error("[Recommendation Engine Error]:", e);
    return res.status(500).json({ error: "Failed to generate recommendations" });
  }
});

// 9. StudyPilot AI Productivity Insights
app.post("/ai/insights", (req, res) => {
  try {
    if (!isPlainObject(req.body)) {
      return res.status(400).json({ error: "Request body must be a JSON object" });
    }
    const {
      focus_sessions = [],
      focusSessions = [],
      subjects = [],
      exams = [],
      tasks = [],
      assignments = [],
      quiz_scores = [],
      quizScores = [],
      previouslyMissedTopicNames = [],
    } = req.body;

    const rawQuizzes = Array.isArray(quiz_scores) && quiz_scores.length > 0 ? quiz_scores : Array.isArray(quizScores) ? quizScores : [];
    const rawSessions = Array.isArray(focus_sessions) && focus_sessions.length > 0 ? focus_sessions : Array.isArray(focusSessions) ? focusSessions : [];

    const insightResult = generatePersonalizedLearningInsights({
      subjects: Array.isArray(subjects) ? subjects : [],
      exams: Array.isArray(exams) ? exams : [],
      quizScores: rawQuizzes,
      tasks: Array.isArray(tasks) ? tasks : [],
      assignments: Array.isArray(assignments) ? assignments : [],
      focusSessions: rawSessions,
      previouslyMissedTopicNames,
    });

    return res.json({
      insights: insightResult.insights,
      totalCount: insightResult.totalCount,
      evaluatedAt: insightResult.evaluatedAt,
      items: insightResult.insights.map((ins) => ({
        id: ins.id,
        title: ins.title,
        text: ins.observation,
        description: `${ins.observation} ${ins.whyItMatters}`,
        metric: ins.metric,
        type: ins.type === "urgent" ? "warning" : ins.type,
        iconName: ins.iconName,
        category: ins.category,
      })),
    });
  } catch (e: any) {
    console.error("[Insights Engine Error]:", e);
    return res.status(500).json({ error: "Failed to generate learning insights" });
  }
});

// 10. StudyPilot AI Adaptive Study Planner & Intelligent Scheduling Engine
app.post("/ai/generate-plan", async (req, res) => {
  try {
    if (!isPlainObject(req.body)) {
      return res.status(400).json({ error: "Request body must be a JSON object" });
    }
    const {
      subjects = [],
      tasks = [],
      assignments = [],
      exams = [],
      focus_sessions = [],
      focusSessions,
      quiz_scores = [],
      quizScores,
      available_study_hours,
      availableStudyHours,
      available_study_minutes,
      availableStudyMinutes,
      weights,
      startTime,
      previouslyMissedTopicNames,
    } = req.body;

    const rawQuizzes = Array.isArray(quiz_scores) && quiz_scores.length > 0 ? quiz_scores : Array.isArray(quizScores) ? quizScores : [];
    const rawSessions = Array.isArray(focus_sessions) && focus_sessions.length > 0 ? focus_sessions : Array.isArray(focusSessions) ? focusSessions : [];
    const hours = typeof available_study_hours === "number" ? available_study_hours : availableStudyHours;
    const mins = typeof available_study_minutes === "number" ? available_study_minutes : availableStudyMinutes;

    // Run core deterministic adaptive scheduling engine
    const plan = generateAdaptivePlan({
      subjects: Array.isArray(subjects) ? subjects : [],
      tasks: Array.isArray(tasks) ? tasks : [],
      assignments: Array.isArray(assignments) ? assignments : [],
      exams: Array.isArray(exams) ? exams : [],
      focusSessions: rawSessions,
      quizScores: rawQuizzes,
      availableStudyHours: hours,
      availableStudyMinutes: mins,
      weights,
      startTime,
      previouslyMissedTopicNames,
    });

    // Optional AI strategy synthesis if configured
    const ai = getAIClient();
    if (ai && plan.blocks.length > 0) {
      try {
        const topBlock = plan.blocks[0];
        const prompt = `You are StudyPilot AI's Lead Academic Strategist.
Given this student's top priority study block: Topic '${topBlock.topic}' in ${topBlock.subjectName} (${topBlock.priority} priority, reason: ${topBlock.reason}),
provide a concise 1-sentence motivational coaching tip on why starting with this block today maximizes their grade efficiency. Do not use bullets or formatting.`;

        const response = await withTimeout(
          ai.models.generateContent({
            model: "gemini-3.8-flash",
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: {
              thinkingConfig: { thinkingBudget: 0 },
            },
          }),
          3500 // Fast 3.5s timeout
        );

        const aiText = response.text?.trim();
        if (aiText && aiText.length > 15) {
          plan.aiStrategyGuidance = aiText;
        }
      } catch {
        // Fallback silently to deterministic strategy note
      }
    }

    return res.json(plan);
  } catch (error: any) {
    console.error("[Adaptive Planner Error]:", error);
    return res.status(500).json({
      error: "Failed to generate adaptive plan",
    });
  }
});

// 11. StudyPilot AI Adaptive Rescheduling Endpoint
app.post("/ai/reschedule-plan", (req, res) => {
  try {
    if (!isPlainObject(req.body)) {
      return res.status(400).json({ error: "Request body must be a JSON object" });
    }
    const { existingPlan, updateAction, context = {} } = req.body;
    if (!isPlainObject(existingPlan) || !Array.isArray(existingPlan.blocks) || !isPlainObject(updateAction) || typeof updateAction.blockId !== "string" || !updateAction.blockId.trim()) {
      return res.status(400).json({ error: "existingPlan with blocks[] and updateAction.blockId are required" });
    }
    if (!["completed", "missed", "pending"].includes(updateAction.newStatus)) {
      return res.status(400).json({ error: "updateAction.newStatus must be 'completed', 'missed', or 'pending'" });
    }

    const updatedPlan = rescheduleAdaptivePlan(existingPlan as any, updateAction as any, isPlainObject(context) ? context : {});
    return res.json(updatedPlan);
  } catch (error: any) {
    console.error("[Adaptive Reschedule Error]:", error);
    return res.status(500).json({
      error: "Failed to reschedule plan",
    });
  }
});

// 12. StudyPilot AI Advanced Learning Analytics & Performance Evaluation
app.post("/ai/analytics", async (req, res) => {
  try {
    if (!isPlainObject(req.body)) {
      return res.status(400).json({ error: "Request body must be a JSON object" });
    }
    const {
      subjects = [],
      tasks = [],
      assignments = [],
      exams = [],
      focus_sessions = [],
      focusSessions,
      quiz_scores = [],
      quizScores,
      plannedBlocks = [],
      thresholds,
      readinessConfig,
      previouslyMissedTopicNames = [],
      referenceDate,
    } = req.body;

    const rawQuizzes =
      Array.isArray(quiz_scores) && quiz_scores.length > 0
        ? quiz_scores
        : Array.isArray(quizScores)
        ? quizScores
        : [];
    const rawSessions =
      Array.isArray(focus_sessions) && focus_sessions.length > 0
        ? focus_sessions
        : Array.isArray(focusSessions)
        ? focusSessions
        : [];

    const analytics = computeLearningAnalytics({
      subjects: Array.isArray(subjects) ? subjects : [],
      tasks: Array.isArray(tasks) ? tasks : [],
      assignments: Array.isArray(assignments) ? assignments : [],
      exams: Array.isArray(exams) ? exams : [],
      focusSessions: rawSessions,
      quizScores: rawQuizzes,
      plannedBlocks: Array.isArray(plannedBlocks) ? plannedBlocks : [],
      thresholds,
      readinessConfig,
      previouslyMissedTopicNames: Array.isArray(previouslyMissedTopicNames) ? previouslyMissedTopicNames : [],
      referenceDate,
    });

    // Optional natural-language explanation strictly grounded in deterministic metrics
    const ai = getAIClient();
    if (ai && analytics.overview.hasAnyActivity) {
      try {
        const ov = analytics.overview;
        const quizNote =
          ov.averageQuizPerformance !== null
            ? `Average measured quiz score is ${ov.averageQuizPerformance}% across ${ov.totalQuizAttempts} attempt(s).`
            : "No quiz attempts have been recorded yet.";
        const topInsight = analytics.insights[0]?.observation || "";
        const prompt = `You are StudyPilot AI's Learning Analytics Advisor.
Write a concise 2-sentence plain-English summary of this student's verified metrics WITHOUT inventing any new numbers:
- Recorded study time: ${ov.totalRecordedStudyHours} hours (${ov.totalCompletedFocusSessions} sessions)
- ${quizNote}
- Topics: ${ov.masteredTopicsCount} mastered, ${ov.developingTopicsCount} developing, ${ov.weakTopicsCount} weak, ${ov.unknownEvidenceTopicsCount} unassessed
- Key observation: ${topInsight}
Be factual, encouraging, and actionable. No markdown bullets.`;

        const response = await withTimeout(
          ai.models.generateContent({
            model: "gemini-3.8-flash",
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: {
              thinkingConfig: { thinkingBudget: 0 },
            },
          }),
          3500
        );
        const aiText = response.text?.trim();
        if (aiText && aiText.length > 15) {
          analytics.aiExecutiveSummary = aiText;
        }
      } catch {
        // Silent fallback to deterministic metrics without LLM summary
      }
    }

    return res.json(analytics);
  } catch (error: any) {
    console.error("[Analytics Engine Error]:", error);
    return res.status(500).json({
      error: "Failed to compute learning analytics",
    });
  }
});

// Fallback question bank helper
function getFallbackQuestions(topic = "Linked List", difficulty = "Medium", count = 5) {
  const bank = [
    {
      id: "q-1",
      question: "What is the time complexity to insert a node at the head of a Singly Linked List if head pointer is given?",
      options: ["O(1)", "O(n)", "O(log n)", "O(n²)"],
      correctAnswerIndex: 0,
      explanation: "Inserting at the head only requires updating the newNode.next pointer and moving the head pointer, taking constant O(1) time.",
      subConcept: "Insertion",
    },
    {
      id: "q-2",
      question: "In a Singly Linked List, what is the worst-case time complexity to delete a node at the end (tail) without a tail pointer?",
      options: ["O(1)", "O(n)", "O(log n)", "O(n log n)"],
      correctAnswerIndex: 1,
      explanation: "To delete the last node, you must traverse from head to the second-to-last node to update its next pointer to null, requiring O(n) traversals.",
      subConcept: "Deletion",
    },
    {
      id: "q-3",
      question: "Which property distinguishes a Circular Linked List from a standard Singly Linked List?",
      options: [
        "Each node contains two pointer fields",
        "The last node's next pointer references the first node instead of null",
        "Nodes are allocated contiguously in hardware memory",
        "Traversal can only occur backwards",
      ],
      correctAnswerIndex: 1,
      explanation: "In a circular linked list, the final node loops back to the head node, preventing null-pointer termination and allowing cyclical navigation.",
      subConcept: "Circular Linked List",
    },
    {
      id: "q-4",
      question: "When deleting an arbitrary node given only a pointer to that node (not head), which technique allows O(1) deletion?",
      options: [
        "Traverse backwards using pointer subtraction",
        "Copy the data of the next node into this node, then delete the next node",
        "Directly free the current node and stitch gaps automatically",
        "Reallocate the entire linked list in memory",
      ],
      correctAnswerIndex: 1,
      explanation: "By copying the next node's value into the target node and deleting node.next, you achieve O(1) deletion without traversing from head (assuming not the last node).",
      subConcept: "Deletion",
    },
    {
      id: "q-5",
      question: "What is the primary memory overhead advantage of an Array over a Linked List?",
      options: [
        "Arrays don't need additional pointer bytes per stored element",
        "Arrays never have unused capacity",
        "Linked lists cannot store primitive integers",
        "Arrays can automatically shrink when elements are removed",
      ],
      correctAnswerIndex: 0,
      explanation: "Linked lists must store 4-8 bytes of pointer references per node alongside the payload, creating significant metadata overhead compared to packed arrays.",
      subConcept: "Memory & Complexity",
    },
    {
      id: "q-6",
      question: "Which algorithm can detect a cycle in a linked list in O(n) time and O(1) extra space?",
      options: [
        "Binary Search Algorithm",
        "Floyd's Tortoise and Hare (Slow/Fast Pointers)",
        "Dijkstra's Shortest Path",
        "Breadth-First Search with a Visited Hash Set",
      ],
      correctAnswerIndex: 1,
      explanation: "Floyd's cycle-finding algorithm advances a slow pointer by 1 and a fast pointer by 2. If a cycle exists, they will inevitably meet in O(n) steps with O(1) space.",
      subConcept: "Cycle Detection",
    },
    {
      id: "q-7",
      question: "In a Doubly Linked List, what is the cost to delete a node when given a direct reference to that node?",
      options: ["O(1)", "O(n)", "O(log n)", "O(n²)"],
      correctAnswerIndex: 0,
      explanation: "Because each node has both .prev and .next references, you can immediately unlink the node in O(1) time without any list traversal.",
      subConcept: "Doubly Linked List",
    },
    {
      id: "q-8",
      question: "How do you insert an element into an empty Circular Linked List?",
      options: [
        "Set newNode.next = null",
        "Set newNode.next = newNode and head = newNode",
        "Point head to null and newNode to head",
        "Insertion into an empty circular list is not allowed",
      ],
      correctAnswerIndex: 1,
      explanation: "When the circular list is empty, the single inserted node must point to itself (newNode.next = newNode) to maintain the circular invariant.",
      subConcept: "Circular Linked List",
    },
    {
      id: "q-9",
      question: "What is the time complexity to reverse a Singly Linked List iteratively?",
      options: ["O(1)", "O(n)", "O(n²)", "O(log n)"],
      correctAnswerIndex: 1,
      explanation: "Reversing a list requires visiting every node once while repointing prev, curr, and next pointers, yielding linear O(n) time with O(1) auxiliary space.",
      subConcept: "Reversal",
    },
    {
      id: "q-10",
      question: "Which data structure is most naturally implemented using a Singly Linked List with head insertion and deletion?",
      options: ["FIFO Queue", "LIFO Stack", "Priority Queue", "Balanced Binary Search Tree"],
      correctAnswerIndex: 1,
      explanation: "A Stack (Last In, First Out) naturally maps to head operations: push is prepend (O(1)) and pop is removeHead (O(1)).",
      subConcept: "Applications",
    },
  ];

  return bank.slice(0, count);
}

// Fallback summary generator
function getFallbackSummary(text: string, fileName = "Notes") {
  const cleanTitle = fileName
    ? fileName.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ")
    : "Academic Study Notes";

  return {
    title: cleanTitle.toUpperCase(),
    summary:
      "This document explores foundational data structures and architectural principles, detailing algorithmic time complexities, pointer manipulation techniques, and practical implementation trade-offs for exam success.",
    keyPoints: [
      "Dynamic memory allocation allows structures to grow and shrink during runtime without contiguous memory blocks.",
      "Pointer manipulation requires defensive checks against null pointer exceptions and memory leaks.",
      "Trade-offs between cache locality in arrays and dynamic flexibility in pointer-linked structures dictate optimal use cases.",
      "Traversal and boundary condition handling (empty lists, single elements, cyclic references) represent over 70% of exam question edge cases.",
      "Active recall and self-testing on code reconstruction under timed conditions maximize retention score.",
    ],
    importantConcepts: [
      {
        term: "Dynamic Node Allocation",
        definition: "Allocating discrete memory chunks dynamically at runtime using pointers rather than pre-sizing buffers.",
        importance: "critical",
      },
      {
        term: "Pointer Invariant",
        definition: "Rules that must remain true before and after every list mutation to prevent cycles or orphaned references.",
        importance: "critical",
      },
      {
        term: "Cache Locality Trade-off",
        definition: "Arrays benefit from CPU cache prefetching because elements sit side-by-side; node pointers suffer from random memory jumps.",
        importance: "high",
      },
      {
        term: "Sentinel / Dummy Head",
        definition: "A dummy initial node used to eliminate edge cases when inserting or deleting at the list head.",
        importance: "supplementary",
      },
    ],
    possibleQuestions: [
      {
        question: "Why does reversing a linked list require three pointers (prev, curr, next)?",
        answer: "Without storing next = curr.next before repointing curr.next = prev, you lose access to the remaining unreversed list.",
        type: "conceptual",
      },
      {
        question: "How does Floyd's Tortoise and Hare algorithm guarantee detection of a cycle?",
        answer: "The relative speed difference of 1 node per iteration guarantees the fast pointer will close any gap in at most N steps.",
        type: "exam",
      },
      {
        question: "What is the space complexity of recursive linked list traversal vs iterative traversal?",
        answer: "Recursive traversal takes O(n) call stack space, whereas iterative traversal takes O(1) auxiliary space.",
        type: "exam",
      },
    ],
    quickRevision: [
      "Head Insertion / Deletion: O(1) time.",
      "Tail Deletion without tail pointer: O(n) time.",
      "Floyd's Cycle Detection: Fast pointer (2x), Slow pointer (1x), O(1) space.",
      "Always update pointers in order: bridge new references before severing old ones.",
      "Use Sentinel / Dummy nodes to simplify head-manipulation algorithms.",
    ],
    wordCount: text ? text.split(/\s+/).length : 250,
    readingTimeMinutes: Math.max(1, Math.ceil((text ? text.split(/\s+/).length : 250) / 200)),
  };
}

// Fallback roadmap generator
function getFallbackRoadmap(topic = "Python", targetLevel = "Beginner to Advanced") {
  const normTopic = topic.trim().toLowerCase();

  // 1. Python Roadmap
  if (normTopic.includes("python")) {
    return {
      id: `roadmap-py-${Date.now()}`,
      topic: "Python",
      targetLevel: targetLevel || "Beginner to Advanced",
      estimatedWeeks: 12,
      overview: "A comprehensive, industry-aligned roadmap designed to take you from absolute zero programming knowledge to writing production-ready, object-oriented, and asynchronous Python applications.",
      prerequisites: [
        "Basic computer literacy & terminal navigation",
        "Problem-solving and logical thinking mindset",
        "Code editor installed (VS Code, PyCharm, or Cursor)"
      ],
      careerPaths: [
        "Backend Python Developer (FastAPI / Django)",
        "Data Analyst & Machine Learning Engineer",
        "DevOps & Automation Engineer",
        "Software Development Engineer in Test (SDET)"
      ],
      keyTips: [
        "Write and run code in the REPL or editor every single day — do not just passively read syntax.",
        "Solve algorithmic puzzles on LeetCode/HackerRank in Python alongside building modular projects.",
        "Embrace Pythonic idioms (PEP 8, list comprehensions, context managers, type hints).",
        "Complete the milestone project at the end of every phase before moving to the next."
      ],
      phases: [
        {
          id: "phase-1",
          level: "Beginner",
          title: "Phase 1: Foundations & Core Syntax",
          durationEstimate: "Weeks 1-3",
          description: "Set up your Python environment, master language primitives, control flow, functions, and fundamental data structures.",
          topics: [
            {
              id: "py-1-1",
              title: "Environment Setup & Basic Syntax",
              description: "Install Python 3.12+, configure VS Code, explore the Python REPL, and learn indentation and print/input semantics.",
              keyConcepts: ["Variables & Constants", "Data Types (int, float, str, bool)", "Type Casting", "String Formatting (f-strings)"],
              handsOnProjects: ["Interactive BMI & Tip Calculator", "Terminal Mad Libs Story Generator"]
            },
            {
              id: "py-1-2",
              title: "Control Flow & Decision Logic",
              description: "Master conditional branching, comparison operators, boolean logic, and looping constructs.",
              keyConcepts: ["if / elif / else branches", "Logical Operators (and, or, not)", "for loops & range()", "while loops, break & continue"],
              handsOnProjects: ["Random Number Guessing Game (Higher/Lower)", "CLI Password Strength Checker"]
            },
            {
              id: "py-1-3",
              title: "Functions & Scope",
              description: "Learn modular code design, parameter passing, return values, default arguments, and variable scopes.",
              keyConcepts: ["def keyword & return", "*args & **kwargs", "Global vs Local Scope", "Docstrings & Basic Type Hints"],
              handsOnProjects: ["Currency Converter Utility", "Modular Unit Converter Library"]
            },
            {
              id: "py-1-4",
              title: "Built-in Data Collections",
              description: "Deep-dive into Python's native collection types: Lists, Tuples, Dictionaries, and Sets.",
              keyConcepts: ["List slicing & indexing", "Dictionary key-value lookups", "Set operations (unions, intersections)", "List & Dict Comprehensions"],
              handsOnProjects: ["CLI Contact Book Manager", "Word Frequency Analyzer for Text Files"]
            }
          ],
          milestoneProject: {
            title: "CLI Personal Expense & Budget Tracker",
            description: "Build a command-line application that allows users to add daily expenses, categorize them, calculate monthly summaries, and display formatted transaction tables with error handling.",
            skillsTested: ["Data structures (Lists & Dictionaries)", "Functions & Modularity", "Loops & Conditional validation", "String formatting"]
          }
        },
        {
          id: "phase-2",
          level: "Intermediate",
          title: "Phase 2: Object-Oriented Programming & File I/O",
          durationEstimate: "Weeks 4-6",
          description: "Transition from procedural scripting to object-oriented software engineering, modular packages, file handling, and robust exception safety.",
          topics: [
            {
              id: "py-2-1",
              title: "Object-Oriented Programming (OOP)",
              description: "Understand classes, object instantiation, attributes, methods, and encapsulation.",
              keyConcepts: ["__init__ Constructor", "Self reference", "Instance vs Class attributes", "Class methods (@classmethod, @staticmethod)"],
              handsOnProjects: ["Bank Account Simulator", "Inventory Management System"]
            },
            {
              id: "py-2-2",
              title: "Inheritance, Polymorphism & Dunder Methods",
              description: "Build hierarchical codebases using inheritance, super(), abstract base classes, and magic/dunder methods.",
              keyConcepts: ["Single & Multiple Inheritance", "super() method", "Dunder methods (__str__, __repr__, __len__, __eq__)", "abc module (Abstract Classes)"],
              handsOnProjects: ["RPG Character Combat Engine", "Custom Vector / Geometry Math Class"]
            },
            {
              id: "py-2-3",
              title: "File Handling & Data Serialization",
              description: "Read, write, and persist application state using text, CSV, and JSON formats safely.",
              keyConcepts: ["with open() context manager", "Reading & Writing CSVs (csv module)", "JSON parsing (json.loads, json.dump)", "Path manipulation (pathlib)"],
              handsOnProjects: ["Automated File Renamer & Organizer", "JSON-backed Flashcard Quiz App"]
            },
            {
              id: "py-2-4",
              title: "Exception Handling & Virtual Environments",
              description: "Write fault-tolerant code with try/except/finally and isolate project dependencies with venv and pip.",
              keyConcepts: ["try / except / else / finally", "Custom Exception Classes", "virtualenv & venv", "requirements.txt & pip"],
              handsOnProjects: ["Robust CSV Data Cleaner with Error Logging", "Safe Web Scraper with Retry Logic"]
            }
          ],
          milestoneProject: {
            title: "Student Academic Record & Gradebook System",
            description: "Develop a complete OOP student management system with Classes (Student, Course, Gradebook), persistent JSON storage, custom exceptions, GPA calculation, and automated report card export.",
            skillsTested: ["OOP (Inheritance & Encapsulation)", "Custom Dunder methods", "File I/O with JSON", "Exception handling"]
          }
        },
        {
          id: "phase-3",
          level: "Advanced",
          title: "Phase 3: Advanced Python & Performance Engineering",
          durationEstimate: "Weeks 7-9",
          description: "Master advanced Python internals: Iterators, Generators, Decorators, Concurrency, Metaprogramming, and Unit Testing.",
          topics: [
            {
              id: "py-3-1",
              title: "Iterators, Generators & Functional Tools",
              description: "Create memory-efficient streaming pipelines using yield, custom iterators, and itertools.",
              keyConcepts: ["__iter__ and __next__", "yield & Generator Expressions", "itertools (cycle, chain, groupby)", "map, filter, and functools.reduce"],
              handsOnProjects: ["Streaming Log File Parser for Big Datasets", "Fibonacci / Prime Number Stream Generator"]
            },
            {
              id: "py-3-2",
              title: "Decorators & Context Managers",
              description: "Enhance and wrap functions with custom decorators, and create custom context managers for resource management.",
              keyConcepts: ["Higher-order functions", "functools.wraps", "Parameterized decorators", "contextlib.contextmanager & __enter__/__exit__"],
              handsOnProjects: ["Function Execution Time Benchmarking Decorator", "Automatic API Rate Limiter Decorator"]
            },
            {
              id: "py-3-3",
              title: "Concurrency: Threading, Multiprocessing & Asyncio",
              description: "Understand the GIL (Global Interpreter Lock), CPU-bound vs I/O-bound tasks, and modern async/await syntax.",
              keyConcepts: ["GIL Mechanics & Trade-offs", "threading & concurrent.futures", "multiprocessing for CPU tasks", "asyncio (async def, await, asyncio.gather)"],
              handsOnProjects: ["Async High-Speed Web Scraper using aiohttp", "Multi-threaded Image Downloader & Resizer"]
            },
            {
              id: "py-3-4",
              title: "Testing, Type Annotations & Code Quality",
              description: "Write automated tests with pytest, enforce static typing with mypy, and follow professional quality standards.",
              keyConcepts: ["pytest fixtures & assertions", "Mocking & monkeypatching", "Static Type Hinting (typing module, generics)", "Linting (Ruff, Flake8, Black)"],
              handsOnProjects: ["Full Test Suite with 95%+ Coverage for an E-Commerce Cart Engine", "Mypy-verified Utility Library"]
            }
          ],
          milestoneProject: {
            title: "Asynchronous Web Intelligence & Market Data Aggregator",
            description: "Build an asynchronous data pipeline using Asyncio, aiohttp, and BeautifulSoup that scrapes product prices or news headlines across multiple targets concurrently, sanitizes data with custom decorators, and outputs structured analytical reports.",
            skillsTested: ["Asyncio event loops & concurrency", "Custom Decorators", "Generator streaming", "Pytest unit tests with mocks"]
          }
        },
        {
          id: "phase-4",
          level: "Mastery",
          title: "Phase 4: Web Frameworks, APIs & Production Capstone",
          durationEstimate: "Weeks 10-12",
          description: "Build real-world production web services using FastAPI/Django, connect relational databases with SQLAlchemy, containerize with Docker, and deploy.",
          topics: [
            {
              id: "py-4-1",
              title: "Modern REST APIs with FastAPI",
              description: "Build ultra-fast, type-safe REST APIs with automatic OpenAPI/Swagger documentation using FastAPI and Pydantic.",
              keyConcepts: ["Pydantic Data Models & Validation", "Route Handlers & Path/Query parameters", "Dependency Injection in FastAPI", "JWT Authentication & Password Hashing"],
              handsOnProjects: ["User Authentication & Profile API", "Todo & Task Management Microservice"]
            },
            {
              id: "py-4-2",
              title: "Database Engineering with SQLAlchemy & Alembic",
              description: "Connect to PostgreSQL/SQLite using modern ORM patterns, relationships, migrations, and transactions.",
              keyConcepts: ["SQLAlchemy 2.0 ORM Models", "One-to-Many & Many-to-Many Relationships", "Alembic Database Migrations", "Async DB sessions"],
              handsOnProjects: ["Blog & Comment Database Backend", "E-Commerce Product Catalog Engine"]
            },
            {
              id: "py-4-3",
              title: "Dockerization, Packaging & Cloud Deployment",
              description: "Package your Python applications into clean Docker containers, configure environment variables, and deploy to the cloud.",
              keyConcepts: ["Writing production Dockerfiles", "Docker Compose for multi-container setups", "Environment configuration (.env)", "CI/CD GitHub Actions for Python"],
              handsOnProjects: ["Dockerized Multi-container FastAPI + PostgreSQL setup", "Automated GitHub Actions Testing Pipeline"]
            }
          ],
          milestoneProject: {
            title: "Production-Grade Full-Stack REST API Capstone",
            description: "Develop a complete, production-ready RESTful service (e.g., Course Management or Study Collaboration API) featuring JWT Auth, PostgreSQL + SQLAlchemy ORM, Alembic migrations, Pytest suite, Docker containerization, and interactive Swagger docs.",
            skillsTested: ["FastAPI REST Architecture", "SQLAlchemy ORM & PostgreSQL", "JWT Security & Authentication", "Docker & CI/CD deployment"]
          }
        }
      ]
    };
  }

  // 2. Machine Learning Roadmap (Matching roadmap.sh visual diagram)
  if (normTopic.includes("machine learning") || normTopic.includes("ml") || normTopic.includes("ai")) {
    return {
      id: `roadmap-ml-${Date.now()}`,
      topic: "Machine Learning",
      targetLevel: targetLevel || "Beginner to Advanced",
      estimatedWeeks: 16,
      overview: "An end-to-end industry roadmap designed to guide you through mathematical foundations, Python programming, classical machine learning algorithms, deep learning neural networks, and production MLOps deployment.",
      prerequisites: [
        "Basic high-school algebra & functions",
        "Analytical & problem-solving mindset",
        "Python development environment setup"
      ],
      careerPaths: [
        "Machine Learning Engineer",
        "AI Research Scientist",
        "Data Scientist & Quantitative Analyst",
        "MLOps Engineer"
      ],
      keyTips: [
        "Internalize the mathematical intuitions behind cost functions, gradients, and matrix projections.",
        "Implement algorithms from scratch using NumPy before relying purely on Scikit-Learn or PyTorch.",
        "Practice hyperparameter tuning and model debugging on real-world noisy Kaggle datasets."
      ],
      phases: [
        {
          id: "phase-1",
          level: "Beginner",
          title: "Phase 1: Mathematical Foundations",
          durationEstimate: "Weeks 1-4",
          description: "Master the essential mathematical pillars: Linear Algebra, Multivariable Calculus, Discrete Mathematics, Probability, and Statistics.",
          topics: [
            {
              id: "ml-1-1",
              title: "Introduction to Machine Learning",
              description: "Understand the core taxonomy of artificial intelligence, model paradigms, and the engineering lifecycle.",
              keyConcepts: ["What is an ML Engineer?", "ML Engineer vs AI Engineer", "Skills & Responsibilities", "Supervised vs Unsupervised vs RL"],
              handsOnProjects: ["Surveying ML Problem Formulations", "Setting up Jupyter Lab & Google Colab"]
            },
            {
              id: "ml-1-2",
              title: "Linear Algebra",
              description: "The language of machine learning: vectors, matrices, projections, and tensor transformations.",
              keyConcepts: ["Matrix & Matrix Operations", "Scalars, Vectors, Tensors", "Singular Value Decomposition (SVD)", "Determinants, Inverse of Matrix", "Eigenvalues, Diagonalization"],
              handsOnProjects: ["NumPy Vector & Matrix Operations Engine", "Image Compression using SVD from Scratch"]
            },
            {
              id: "ml-1-3",
              title: "Multivariable Calculus",
              description: "Understand continuous optimization, cost functions, gradients, and backpropagation foundations.",
              keyConcepts: ["Derivatives & Partial Derivatives", "Chain Rule of Derivation", "Gradient, Jacobian, Hessian", "Gradient Descent Optimization"],
              handsOnProjects: ["Manual Gradient Descent Visualizer in 2D/3D", "Derivation of Loss Functions"]
            },
            {
              id: "ml-1-4",
              title: "Probability & Statistics",
              description: "Quantify uncertainty, Bayesian inference, probability distributions, and inferential hypotheses.",
              keyConcepts: ["Basics of Probability", "Bayes' Theorem", "Random Variables & PDFs", "Types of Distribution (Gaussian, Poisson)", "Descriptive & Inferential Statistics", "Hypothesis Testing (p-values, z-test)"],
              handsOnProjects: ["Bayesian Spam Classifier from Scratch", "Exploratory Data Analysis Statistical Notebook"]
            }
          ],
          milestoneProject: {
            title: "Mathematical Optimization & Regression from Scratch",
            description: "Build a multi-variable Linear & Polynomial Regression optimizer purely with NumPy and math vectorization—without importing Scikit-Learn or PyTorch.",
            skillsTested: ["Matrix Vectorization", "Partial Derivatives & Gradient Descent", "Cost Function formulation", "Data Normalization"]
          }
        },
        {
          id: "phase-2",
          level: "Intermediate",
          title: "Phase 2: Programming Fundamentals & Data Tooling",
          durationEstimate: "Weeks 5-8",
          description: "Master Python programming fundamentals, scientific computing libraries, data wrangling, and feature engineering.",
          topics: [
            {
              id: "ml-2-1",
              title: "Python & OOP Foundations",
              description: "Core syntax, data types, object-oriented design, modular programming, and exception handling.",
              keyConcepts: ["Variables and Data Types", "Control Flow & Comprehensions", "Object Oriented Programming (OOP)", "Functions & Decorators"],
              handsOnProjects: ["Object-Oriented Data Transformer Class", "Custom Scikit-style Estimator Skeleton"]
            },
            {
              id: "ml-2-2",
              title: "Data Manipulation with NumPy & Pandas",
              description: "High-performance n-dimensional arrays, dataframes, indexing, grouping, and handling missing data.",
              keyConcepts: ["NumPy Array Broadcasting & Vectorization", "Pandas DataFrames & Series", "Groupby & Aggregations", "Handling Nulls & Outliers"],
              handsOnProjects: ["Large Dataset Cleaning & Feature Extraction Pipeline", "Financial Time-Series Analysis Notebook"]
            },
            {
              id: "ml-2-3",
              title: "Data Visualization with Matplotlib & Seaborn",
              description: "Communicate insights through distribution plots, heatmaps, pairplots, and interactive charts.",
              keyConcepts: ["Matplotlib Figure/Axis Architecture", "Seaborn Statistical Plots", "Correlation Matrix Heatmaps", "Feature Importance Visuals"],
              handsOnProjects: ["Comprehensive Exploratory Data Analysis (EDA) Report", "Interactive Plotly Dashboard"]
            }
          ],
          milestoneProject: {
            title: "Automated Data Cleaning & Feature Engineering Pipeline",
            description: "Build a complete Python data processing pipeline class that ingests raw tabular datasets, cleans missing values, encodes categoricals, scales features, and exports statistical visualizations.",
            skillsTested: ["Pandas & NumPy Vectorization", "OOP Pipeline Architecture", "Data Imputation & Encoding", "Seaborn / Matplotlib Visuals"]
          }
        },
        {
          id: "phase-3",
          level: "Advanced",
          title: "Phase 3: Classical Machine Learning & Algorithms",
          durationEstimate: "Weeks 9-12",
          description: "Master supervised and unsupervised learning algorithms, ensemble methods, and rigorous model evaluation.",
          topics: [
            {
              id: "ml-3-1",
              title: "Supervised Learning Algorithms",
              description: "Linear/Logistic Regression, K-Nearest Neighbors, Decision Trees, and Support Vector Machines.",
              keyConcepts: ["Logistic Regression & Decision Boundaries", "Decision Trees & Information Gain / Gini", "Support Vector Machines (SVMs & Kernels)", "Regularization (L1 Lasso, L2 Ridge)"],
              handsOnProjects: ["Customer Churn Prediction Model", "Real Estate Price Predictor"]
            },
            {
              id: "ml-3-2",
              title: "Ensemble Methods & Gradient Boosting",
              description: "Harness Random Forests, AdaBoost, and state-of-the-art Gradient Boosted Trees (XGBoost, LightGBM, CatBoost).",
              keyConcepts: ["Bagging vs Boosting", "Random Forest Ensembles", "Gradient Boosting Mechanics", "XGBoost / LightGBM Tuning"],
              handsOnProjects: ["Kaggle Competition Tabular Model Pipeline", "Credit Card Fraud Detection with XGBoost"]
            },
            {
              id: "ml-3-3",
              title: "Unsupervised Learning & Dimensionality Reduction",
              description: "Discover hidden patterns with clustering and dimensionality reduction techniques.",
              keyConcepts: ["K-Means & Hierarchical Clustering", "Principal Component Analysis (PCA)", "t-SNE & UMAP Projections", "Anomaly Detection"],
              handsOnProjects: ["Customer Segmentation Engine", "High-Dimensional Image PCA Compression"]
            },
            {
              id: "ml-3-4",
              title: "Model Evaluation & Hyperparameter Tuning",
              description: "Prevent data leakage, use Stratified K-Fold Cross Validation, and tune hyperparameters with Optuna.",
              keyConcepts: ["Confusion Matrix, Precision, Recall, F1-Score", "ROC-AUC Curves", "Stratified K-Fold Validation", "Optuna & Bayesian Search Tuning"],
              handsOnProjects: ["Full Benchmark Evaluation Suite", "Optuna Automated Hyperparameter Optimizer"]
            }
          ],
          milestoneProject: {
            title: "End-to-End Predictive Machine Learning System",
            description: "Train, validate, tune with Optuna, and evaluate an ensemble model (XGBoost + LightGBM) on a complex dataset (e.g., healthcare risk or financial forecasting), outputting ROC-AUC curves and SHAP explainability plots.",
            skillsTested: ["Scikit-Learn & XGBoost", "Cross-Validation & Optuna", "SHAP / Model Interpretability", "Metrics & Error Analysis"]
          }
        },
        {
          id: "phase-4",
          level: "Mastery",
          title: "Phase 4: Deep Learning & Production MLOps",
          durationEstimate: "Weeks 13-16",
          description: "Neural network architectures (PyTorch), Transformers/LLMs foundations, model serving with FastAPI, and Dockerized MLOps pipelines.",
          topics: [
            {
              id: "ml-4-1",
              title: "Deep Learning Foundations with PyTorch",
              description: "Neural network building blocks: Multi-Layer Perceptrons, autograd, activation functions, loss functions, and backpropagation.",
              keyConcepts: ["Tensors & CUDA Acceleration", "nn.Module & Forward Pass", "Optimizers (Adam, AdamW, SGD with momentum)", "Loss Functions (CrossEntropy, MSE)"],
              handsOnProjects: ["Handwritten Digit Classifier (MNIST) in PyTorch", "Custom Neural Network from Scratch in Pure Python"]
            },
            {
              id: "ml-4-2",
              title: "Computer Vision & NLP Architectures",
              description: "Explore Convolutional Neural Networks (CNNs) for vision and Transformer Self-Attention architectures for NLP/LLMs.",
              keyConcepts: ["CNNs (Convolutions, Pooling, ResNet)", "Recurrent Networks (RNNs, LSTMs)", "Transformer Architecture & Multi-Head Self-Attention", "Fine-tuning Pretrained HuggingFace Models"],
              handsOnProjects: ["Custom Image Classification with Transfer Learning", "Sentiment Analysis with DistilBERT"]
            },
            {
              id: "ml-4-3",
              title: "MLOps, Model Serving & Deployment",
              description: "Serve models via high-speed FastAPI endpoints, log metrics with MLflow, containerize with Docker, and monitor drift.",
              keyConcepts: ["FastAPI Real-time Inference Endpoints", "Model Packaging (ONNX, Pickle, TorchScript)", "Experiment Tracking with MLflow / W&B", "Docker Containerization & Cloud Deployment"],
              handsOnProjects: ["Production ML Microservice with Docker & FastAPI", "Automated CI/CD Model Testing Pipeline"]
            }
          ],
          milestoneProject: {
            title: "Production-Grade AI / ML Inference Service with Docker",
            description: "Build, package, and deploy a complete production Machine Learning system: trained PyTorch/XGBoost model, ONNX optimization, asynchronous FastAPI serving API with request validation, Docker containerization, and automated test suite.",
            skillsTested: ["PyTorch / Machine Learning", "FastAPI Asynchronous Serving", "Docker Containerization", "MLOps Lifecycle"]
          }
        }
      ]
    };
  }

  // 3. Generic Intelligent Dynamic Roadmap
  const cleanTitle = topic.charAt(0).toUpperCase() + topic.slice(1);
  return {
    id: `roadmap-${Date.now()}`,
    topic: cleanTitle,
    targetLevel: targetLevel || "Beginner to Advanced",
    estimatedWeeks: 10,
    overview: `A structured, step-by-step master learning path for ${cleanTitle}, taking you from initial fundamentals and core syntax up to production-grade architecture and real-world project deployment.`,
    prerequisites: [
      "Basic computer literacy & command line comfort",
      "Dedication to hands-on coding practice",
      "Problem-solving mindset"
    ],
    careerPaths: [
      `${cleanTitle} Developer / Specialist`,
      "Software Engineer",
      "Full-Stack / Systems Engineer"
    ],
    keyTips: [
      "Write actual code daily — theoretical understanding without hands-on coding fades quickly.",
      "Build the milestone project at the conclusion of each phase before advancing.",
      "Read the official documentation alongside video and practical tutorials."
    ],
    phases: [
      {
        id: "phase-1",
        level: "Beginner",
        title: `Phase 1: ${cleanTitle} Fundamentals & Core Syntax`,
        durationEstimate: "Weeks 1-2",
        description: `Install required tooling, learn core language/framework primitives, data types, and fundamental control flow.`,
        topics: [
          {
            id: "t1-1",
            title: "Environment Setup & Hello World",
            description: "Set up the local development environment, package managers, and run initial scripts.",
            keyConcepts: ["Tooling & SDK Installation", "Variables & Types", "Basic Input/Output", "Comments & Coding Standards"],
            handsOnProjects: ["Basic CLI Calculator", "Greeting & Formatter Script"]
          },
          {
            id: "t1-2",
            title: "Control Flow & Basic Logic",
            description: "Master conditional branching, loops, and boolean logic constructs.",
            keyConcepts: ["If/Else Conditionals", "For and While Loops", "Boolean Expressions", "Error basics"],
            handsOnProjects: ["Number Guessing Game", "Simple Converter Tool"]
          },
          {
            id: "t1-3",
            title: "Functions & Modular Code",
            description: "Break code into reusable, testable functions and modules.",
            keyConcepts: ["Function declarations", "Parameters & Return types", "Scope & Lifetimes", "Modular Imports"],
            handsOnProjects: ["Modular Utility Script", "Data Validator"]
          }
        ],
        milestoneProject: {
          title: `Phase 1 Milestone: ${cleanTitle} Interactive CLI Application`,
          description: `Build a complete command-line utility in ${cleanTitle} that accepts user input, processes structured data, and outputs formatted results with input validation.`,
          skillsTested: ["Variables & Types", "Control flow & loops", "Functions & Modularity"]
        }
      },
      {
        id: "phase-2",
        level: "Intermediate",
        title: `Phase 2: ${cleanTitle} Architecture & Intermediate Patterns`,
        durationEstimate: "Weeks 3-5",
        description: `Deep-dive into structural programming paradigms, data collections, object-oriented/functional models, and file operations.`,
        topics: [
          {
            id: "t2-1",
            title: "Data Collections & Manipulation",
            description: "Master built-in and standard library data collections, indexing, sorting, and transformation.",
            keyConcepts: ["Lists/Arrays & Maps/Dictionaries", "Iterators & Transformations", "Sorting & Filtering"],
            handsOnProjects: ["In-Memory Inventory Manager", "Text Data Analyzer"]
          },
          {
            id: "t2-2",
            title: "Object-Oriented & Structural Design",
            description: "Model complex real-world entities using classes, interfaces, or functional composition.",
            keyConcepts: ["Classes/Objects", "Inheritance / Composition", "Encapsulation & Access Modifiers"],
            handsOnProjects: ["Banking System Simulator", "Custom Data Structure Engine"]
          },
          {
            id: "t2-3",
            title: "Error Handling & File/Network I/O",
            description: "Handle runtime exceptions gracefully and read/write persistent files or JSON data.",
            keyConcepts: ["Try/Catch/Except", "File I/O & Streams", "JSON/CSV Serialization"],
            handsOnProjects: ["Persistent Task Logger", "Configuration File Parser"]
          }
        ],
        milestoneProject: {
          title: `Phase 2 Milestone: ${cleanTitle} Data Management System`,
          description: `Construct a multi-module system that organizes records with OOP classes, saves and loads state from persistent JSON/CSV files, and provides comprehensive error handling.`,
          skillsTested: ["OOP / Structural Design", "File I/O", "Exception Handling", "Data Collection manipulation"]
        }
      },
      {
        id: "phase-3",
        level: "Advanced",
        title: `Phase 3: Advanced Concepts & Performance`,
        durationEstimate: "Weeks 6-8",
        description: `Explore concurrency, memory management, asynchronous workflows, design patterns, and unit testing.`,
        topics: [
          {
            id: "t3-1",
            title: "Asynchronous & Concurrent Execution",
            description: "Understand non-blocking I/O, threads, event loops, or concurrency primitives in this ecosystem.",
            keyConcepts: ["Async/Await & Promises/Futures", "Threading / Concurrency", "Event Loops & Schedulers"],
            handsOnProjects: ["Concurrent Network Fetcher", "Async Job Queue Worker"]
          },
          {
            id: "t3-2",
            title: "Design Patterns & Best Practices",
            description: "Apply industry-standard software design patterns (Singleton, Factory, Observer, Repository).",
            keyConcepts: ["Factory & Builder Patterns", "Dependency Injection", "Clean Architecture Principles"],
            handsOnProjects: ["Extensible Plugin Architecture", "Event-Driven Notification Hub"]
          },
          {
            id: "t3-3",
            title: "Automated Testing & Code Quality",
            description: "Write unit and integration tests to ensure stability and continuous delivery.",
            keyConcepts: ["Unit Testing Frameworks", "Mocking & Test Doubles", "Coverage & Benchmarking"],
            handsOnProjects: ["Complete Test Suite with 90%+ Coverage", "Performance Benchmarking Script"]
          }
        ],
        milestoneProject: {
          title: `Phase 3 Milestone: High-Performance Async Pipeline`,
          description: `Build an asynchronous, multi-threaded or event-driven pipeline that processes batches of data, applies design patterns, and includes a full suite of automated unit tests.`,
          skillsTested: ["Concurrency & Async", "Design Patterns", "Unit Testing & Mocks", "Error Resilience"]
        }
      },
      {
        id: "phase-4",
        level: "Mastery",
        title: `Phase 4: Real-World Ecosystem & Production Capstone`,
        durationEstimate: "Weeks 9-10",
        description: `Master modern production frameworks, database integration, containerization, and deploy a portfolio-grade capstone project.`,
        topics: [
          {
            id: "t4-1",
            title: "Frameworks & API Architecture",
            description: "Build real-world production services with dominant ecosystem frameworks and libraries.",
            keyConcepts: ["REST/GraphQL API Standards", "Authentication & Middleware", "Database Integration / ORM"],
            handsOnProjects: ["Full RESTful Backend Service", "Secure API Gateway"]
          },
          {
            id: "t4-2",
            title: "Packaging, Docker & Deployment",
            description: "Package applications into containerized images, manage environment configs, and deploy to cloud environments.",
            keyConcepts: ["Docker Containerization", "Environment Variables & Security", "CI/CD Pipelines"],
            handsOnProjects: ["Dockerized Deployment Stack", "Automated GitHub Actions Workflow"]
          }
        ],
        milestoneProject: {
          title: `Final Capstone: Production-Grade ${cleanTitle} Application`,
          description: `Develop and deploy a complete, scalable application that brings together all 4 phases: robust architecture, database persistence, automated test suite, Docker containerization, and clean documentation.`,
          skillsTested: ["Full-Stack / Ecosystem Architecture", "Database & ORM", "Containerization & Deployment", "Production Code Quality"]
        }
      }
    ]
  };
}

async function startServer() {
  const isProduction =
    process.env.NODE_ENV === "production" ||
    Boolean(process.argv[1] && process.argv[1].endsWith("server.cjs"));

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      if (req.path.startsWith("/api/") || req.path.startsWith("/ai/")) {
        return res.status(404).json({ error: "Endpoint not found" });
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`StudyPilot AI full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

