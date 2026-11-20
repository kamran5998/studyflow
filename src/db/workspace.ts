import { eq } from "drizzle-orm";
import { db } from "./index.ts";
import {
  studentRoadmaps as roadmaps,
  studentWorkspaces as workspaces,
} from "./schema.ts";
import { getOrCreateUser } from "./users.ts";

const VALID_PAGES = new Set([
  "dashboard",
  "subjects",
  "planner",
  "assignments",
  "exams",
  "roadmap",
  "focus",
  "analytics",
  "quizzes",
  "summarizer",
  "settings",
]);

function sanitizePage(raw: unknown): string {
  if (raw === "profile") return "settings";
  return typeof raw === "string" && VALID_PAGES.has(raw) ? raw : "dashboard";
}

export function buildDefaultWorkspacePayload(user: {
  name: string;
  email: string;
  avatarUrl: string;
  institution: string;
  major: string;
  semester: string;
  studentId: string;
  dailyGoalHours: number;
  streakDays: number;
  focusScore: number;
}) {
  const todayStr = new Date().toISOString().split("T")[0];
  return {
    activePage: "dashboard",
    subjects: [],
    tasks: [],
    assignments: [],
    exams: [],
    focusSessions: [],
    quizScores: [],
    plannedBlocks: [],
    activeStudyPlan: null,
    completedRecommendationIds: [],
    dismissedRecommendationIds: [],
    profile: {
      name: user.name || "Student",
      email: user.email || "",
      avatarUrl: user.avatarUrl || "",
      institution: user.institution || "",
      major: user.major || "",
      semester: user.semester || "",
      studentId: user.studentId || "",
      dailyGoalHours: user.dailyGoalHours ?? 4,
      streakDays: user.streakDays ?? 0,
      lastActiveDate: todayStr,
      focusScore: user.focusScore ?? 0,
    },
    notifications: [],
    settings: {
      theme: "light",
      defaultFocusDuration: 45,
      shortBreakDuration: 5,
      longBreakDuration: 15,
      soundEnabled: true,
      soundType: "ambient",
      examReminderDays: 5,
      dailyBriefingEnabled: true,
    },
  };
}

export async function getUserWorkspace(
  uid: string,
  email: string,
  name?: string,
  avatarUrl?: string
) {
  try {
    const user = await getOrCreateUser(uid, email, name, avatarUrl);

    const rows = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.userUid, user.uid))
      .limit(1);

    if (rows[0]) {
      const ws = rows[0];
      return {
        activePage: sanitizePage(ws.activePage),
        subjects: Array.isArray(ws.subjects) ? ws.subjects : [],
        tasks: Array.isArray(ws.tasks) ? ws.tasks : [],
        assignments: Array.isArray(ws.assignments) ? ws.assignments : [],
        exams: Array.isArray(ws.exams) ? ws.exams : [],
        focusSessions: Array.isArray(ws.focusSessions) ? ws.focusSessions : [],
        quizScores: Array.isArray(ws.quizScores) ? ws.quizScores : [],
        plannedBlocks: Array.isArray(ws.plannedBlocks) ? ws.plannedBlocks : [],
        activeStudyPlan: ws.activeStudyPlan ?? null,
        completedRecommendationIds: Array.isArray(ws.completedRecommendationIds)
          ? ws.completedRecommendationIds
          : [],
        dismissedRecommendationIds: Array.isArray(ws.dismissedRecommendationIds)
          ? ws.dismissedRecommendationIds
          : [],
        profile: ws.profile && typeof ws.profile === "object" ? ws.profile : {},
        notifications: Array.isArray(ws.notifications) ? ws.notifications : [],
        settings: ws.settings && typeof ws.settings === "object" ? ws.settings : {},
        updatedAt: ws.updatedAt ? ws.updatedAt.toISOString() : new Date().toISOString(),
      };
    }

    const defaults = buildDefaultWorkspacePayload(user);
    await db
      .insert(workspaces)
      .values({
        userUid: user.uid,
        ...defaults,
      })
      .onConflictDoNothing({ target: workspaces.userUid });

    const createdRows = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.userUid, user.uid))
      .limit(1);

    const created = createdRows[0];
    return {
      ...defaults,
      updatedAt: created?.updatedAt
        ? created.updatedAt.toISOString()
        : new Date().toISOString(),
    };
  } catch (error) {
    console.error("Database query failed (getUserWorkspace):", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}

export async function saveUserWorkspace(
  uid: string,
  email: string,
  payload: Record<string, any>,
  name?: string,
  avatarUrl?: string
) {
  try {
    const user = await getOrCreateUser(uid, email, name, avatarUrl);
    const current = await getUserWorkspace(uid, email, name, avatarUrl);

    const next = {
      activePage:
        "activePage" in payload ? sanitizePage(payload.activePage) : current.activePage,
      subjects: Array.isArray(payload.subjects) ? payload.subjects : current.subjects,
      tasks: Array.isArray(payload.tasks) ? payload.tasks : current.tasks,
      assignments: Array.isArray(payload.assignments)
        ? payload.assignments
        : current.assignments,
      exams: Array.isArray(payload.exams) ? payload.exams : current.exams,
      focusSessions: Array.isArray(payload.focusSessions)
        ? payload.focusSessions
        : current.focusSessions,
      quizScores: Array.isArray(payload.quizScores)
        ? payload.quizScores
        : current.quizScores,
      plannedBlocks: Array.isArray(payload.plannedBlocks)
        ? payload.plannedBlocks
        : current.plannedBlocks,
      activeStudyPlan:
        "activeStudyPlan" in payload ? payload.activeStudyPlan : current.activeStudyPlan,
      completedRecommendationIds: Array.isArray(payload.completedRecommendationIds)
        ? payload.completedRecommendationIds
        : current.completedRecommendationIds,
      dismissedRecommendationIds: Array.isArray(payload.dismissedRecommendationIds)
        ? payload.dismissedRecommendationIds
        : current.dismissedRecommendationIds,
      profile:
        payload.profile && typeof payload.profile === "object"
          ? { ...current.profile, ...payload.profile }
          : current.profile,
      notifications: Array.isArray(payload.notifications)
        ? payload.notifications
        : current.notifications,
      settings:
        payload.settings && typeof payload.settings === "object"
          ? { ...current.settings, ...payload.settings }
          : current.settings,
      updatedAt: new Date(),
    };

    const saved = await db
      .insert(workspaces)
      .values({
        userUid: user.uid,
        ...next,
      })
      .onConflictDoUpdate({
        target: workspaces.userUid,
        set: next,
      })
      .returning();

    const row = saved[0];
    return {
      activePage: row.activePage,
      subjects: row.subjects,
      tasks: row.tasks,
      assignments: row.assignments,
      exams: row.exams,
      focusSessions: row.focusSessions,
      quizScores: row.quizScores,
      plannedBlocks: row.plannedBlocks,
      activeStudyPlan: row.activeStudyPlan,
      completedRecommendationIds: row.completedRecommendationIds,
      dismissedRecommendationIds: row.dismissedRecommendationIds,
      profile: row.profile,
      notifications: row.notifications,
      settings: row.settings,
      updatedAt: row.updatedAt ? row.updatedAt.toISOString() : new Date().toISOString(),
    };
  } catch (error) {
    console.error("Database query failed (saveUserWorkspace):", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}

export async function resetUserWorkspace(
  uid: string,
  email: string,
  name?: string,
  avatarUrl?: string
) {
  try {
    const user = await getOrCreateUser(uid, email, name, avatarUrl);
    const defaults = buildDefaultWorkspacePayload(user);
    const resetData = { ...defaults, updatedAt: new Date() };

    const saved = await db
      .insert(workspaces)
      .values({
        userUid: user.uid,
        ...resetData,
      })
      .onConflictDoUpdate({
        target: workspaces.userUid,
        set: resetData,
      })
      .returning();

    return {
      ...defaults,
      updatedAt: saved[0]?.updatedAt
        ? saved[0].updatedAt.toISOString()
        : new Date().toISOString(),
    };
  } catch (error) {
    console.error("Database query failed (resetUserWorkspace):", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}

export async function getUserRoadmaps(
  uid: string,
  email: string,
  name?: string,
  avatarUrl?: string
) {
  try {
    const user = await getOrCreateUser(uid, email, name, avatarUrl);

    const rows = await db
      .select()
      .from(roadmaps)
      .where(eq(roadmaps.userUid, user.uid))
      .limit(1);

    if (rows[0]) {
      return {
        savedRoadmaps: Array.isArray(rows[0].savedRoadmaps)
          ? rows[0].savedRoadmaps
          : [],
        completedTopicIds:
          rows[0].completedTopicIds && typeof rows[0].completedTopicIds === "object"
            ? rows[0].completedTopicIds
            : {},
        updatedAt: rows[0].updatedAt
          ? rows[0].updatedAt.toISOString()
          : new Date().toISOString(),
      };
    }

    await db
      .insert(roadmaps)
      .values({
        userUid: user.uid,
        savedRoadmaps: [],
        completedTopicIds: {},
      })
      .onConflictDoNothing({ target: roadmaps.userUid });

    return {
      savedRoadmaps: [],
      completedTopicIds: {},
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Database query failed (getUserRoadmaps):", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}

export async function saveUserRoadmaps(
  uid: string,
  email: string,
  payload: Record<string, any>,
  name?: string,
  avatarUrl?: string
) {
  try {
    const user = await getOrCreateUser(uid, email, name, avatarUrl);
    const current = await getUserRoadmaps(uid, email, name, avatarUrl);

    const next = {
      savedRoadmaps: Array.isArray(payload.savedRoadmaps)
        ? payload.savedRoadmaps
        : current.savedRoadmaps,
      completedTopicIds:
        payload.completedTopicIds && typeof payload.completedTopicIds === "object"
          ? payload.completedTopicIds
          : current.completedTopicIds,
      updatedAt: new Date(),
    };

    const saved = await db
      .insert(roadmaps)
      .values({
        userUid: user.uid,
        ...next,
      })
      .onConflictDoUpdate({
        target: roadmaps.userUid,
        set: next,
      })
      .returning();

    return {
      savedRoadmaps: saved[0].savedRoadmaps,
      completedTopicIds: saved[0].completedTopicIds,
      updatedAt: saved[0].updatedAt
        ? saved[0].updatedAt.toISOString()
        : new Date().toISOString(),
    };
  } catch (error) {
    console.error("Database query failed (saveUserRoadmaps):", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}
