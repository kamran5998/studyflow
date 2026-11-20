import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export type UserRole = "student" | "researcher" | "educator";

export interface StoredUserAccount {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  institution: string;
  major: string;
  semester: string;
  studentId: string;
  avatarUrl?: string;
  avatarColor: string;
  role: UserRole;
  createdAt: string;
  lastLoginAt: string;
  twoFactorEnabled: boolean;
  dailyGoalHours: number;
  focusScore: number;
  streakDays: number;
}

export type PublicUserAccount = Omit<StoredUserAccount, "passwordHash">;

export interface StoredSession {
  id: string;
  token: string;
  userId: string;
  device: string;
  browser: string;
  location: string;
  lastActive: string;
  ip: string;
  createdAt: string;
}

export interface WorkspaceState {
  activePage: string;
  subjects: any[];
  tasks: any[];
  assignments: any[];
  exams: any[];
  focusSessions: any[];
  quizScores: any[];
  plannedBlocks: any[];
  activeStudyPlan: any | null;
  completedRecommendationIds: string[];
  dismissedRecommendationIds: string[];
  profile: {
    name: string;
    email: string;
    avatarUrl?: string;
    institution: string;
    major: string;
    semester: string;
    studentId: string;
    dailyGoalHours: number;
    streakDays: number;
    lastActiveDate: string;
    focusScore: number;
  };
  notifications: any[];
  settings: {
    theme: "light" | "dark";
    defaultFocusDuration: number;
    shortBreakDuration: number;
    longBreakDuration: number;
    soundEnabled: boolean;
    soundType: "ambient" | "rain" | "bell" | "none";
    examReminderDays: number;
    dailyBriefingEnabled: boolean;
  };
  updatedAt: string;
}

export interface RoadmapStoreState {
  savedRoadmaps: any[];
  completedTopicIds: Record<string, boolean>;
  updatedAt: string;
}

interface DatabaseSchema {
  version: number;
  accounts: StoredUserAccount[];
  sessions: StoredSession[];
  workspaces: Record<string, WorkspaceState>;
  roadmaps: Record<string, RoadmapStoreState>;
}

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

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || typeof storedHash !== "string") return false;
  if (storedHash.startsWith("scrypt:")) {
    const parts = storedHash.split(":");
    if (parts.length !== 3) return false;
    const [, salt, hex] = parts;
    const expected = Buffer.from(hex, "hex");
    const actual = crypto.scryptSync(password, salt, 64);
    if (expected.length !== actual.length) return false;
    return crypto.timingSafeEqual(expected, actual);
  }
  return password === storedHash;
}

export function sanitizeAccount(account: StoredUserAccount): PublicUserAccount {
  const { passwordHash: _passwordHash, ...safe } = account;
  return safe;
}

export function createDefaultWorkspace(account?: StoredUserAccount | null): WorkspaceState {
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
      name: account?.name || "Student",
      email: account?.email || "",
      avatarUrl: account?.avatarUrl || "",
      institution: account?.institution || "",
      major: account?.major || "",
      semester: account?.semester || "",
      studentId: account?.studentId || "",
      dailyGoalHours: account?.dailyGoalHours ?? 4,
      streakDays: account?.streakDays ?? 0,
      lastActiveDate: todayStr,
      focusScore: account?.focusScore ?? 0,
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
    updatedAt: new Date().toISOString(),
  };
}

function createInitialDb(): DatabaseSchema {
  const defaultAccount: StoredUserAccount = {
    id: "usr_kamran_01",
    name: "Kamran Bagwan",
    email: "bagwankamran278@gmail.com",
    passwordHash: hashPassword("password123"),
    institution: "National Institute of Technology",
    major: "Computer Science & Engineering",
    semester: "6th Semester",
    studentId: "CSE-2024-8842",
    avatarColor: "bg-indigo-600",
    role: "student",
    createdAt: "2026-01-15T09:00:00Z",
    lastLoginAt: new Date().toISOString(),
    twoFactorEnabled: false,
    dailyGoalHours: 4.5,
    focusScore: 92,
    streakDays: 7,
  };

  return {
    version: 1,
    accounts: [defaultAccount],
    sessions: [],
    workspaces: {
      [defaultAccount.id]: createDefaultWorkspace(defaultAccount),
      guest: createDefaultWorkspace(null),
    },
    roadmaps: {},
  };
}

export class StudyPilotDatabase {
  private filePath: string;
  private db: DatabaseSchema | null = null;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(filePath?: string) {
    this.filePath =
      filePath ||
      process.env.STUDYPILOT_DB_PATH ||
      path.join(process.cwd(), "data", "studypilot-db.json");
  }

  private async ensureLoaded(): Promise<DatabaseSchema> {
    if (this.db) return this.db;
    try {
      const raw = await fs.readFile(this.filePath, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && Array.isArray(parsed.accounts)) {
        this.db = {
          version: parsed.version || 1,
          accounts: parsed.accounts,
          sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
          workspaces: parsed.workspaces && typeof parsed.workspaces === "object" ? parsed.workspaces : {},
          roadmaps: parsed.roadmaps && typeof parsed.roadmaps === "object" ? parsed.roadmaps : {},
        };
        if (this.db.accounts.length === 0) {
          const initial = createInitialDb();
          this.db.accounts = initial.accounts;
        }
        return this.db;
      }
    } catch {
      // File missing or corrupted -> initialize cleanly
    }
    this.db = createInitialDb();
    await this.persist();
    return this.db;
  }

  private persist(): Promise<void> {
    const snapshot = JSON.stringify(this.db, null, 2);
    const dir = path.dirname(this.filePath);
    const tmpPath = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;

    this.writeQueue = this.writeQueue.then(async () => {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(tmpPath, snapshot, "utf-8");
      await fs.rename(tmpPath, this.filePath);
    });
    return this.writeQueue;
  }

  public async getAuthState(sessionToken?: string, isExplicitlySignedOut = false) {
    const db = await this.ensureLoaded();
    let activeSession = sessionToken
      ? db.sessions.find((s) => s.token === sessionToken)
      : undefined;

    let createdToken: string | undefined;

    // On initial visit (when not explicitly signed out), bind a session to the default student account
    if (!activeSession && !isExplicitlySignedOut && db.accounts.length > 0) {
      const defaultAcc = db.accounts[0];
      activeSession = {
        id: `sess_${crypto.randomUUID()}`,
        token: crypto.randomBytes(32).toString("hex"),
        userId: defaultAcc.id,
        device: "Workstation Browser",
        browser: "Web Session",
        location: "StudyPilot Workspace",
        lastActive: "Just now",
        ip: "127.0.0.1",
        createdAt: new Date().toISOString(),
      };
      db.sessions.unshift(activeSession);
      createdToken = activeSession.token;
      await this.persist();
    }

    const currentAccount = activeSession
      ? db.accounts.find((a) => a.id === activeSession!.userId) || null
      : null;

    const userSessions = currentAccount
      ? db.sessions
          .filter((s) => s.userId === currentAccount.id)
          .map(({ token: sessToken, createdAt: _c, ...pub }) => ({
            ...pub,
            isCurrent: sessToken === (activeSession?.token || sessionToken),
          }))
      : [];

    return {
      currentUser: currentAccount ? sanitizeAccount(currentAccount) : null,
      isAuthenticated: currentAccount !== null,
      accounts: db.accounts.map(sanitizeAccount),
      activeSessions: userSessions,
      createdToken,
    };
  }

  public async resolveUserId(sessionToken?: string): Promise<string> {
    const db = await this.ensureLoaded();
    if (sessionToken) {
      const sess = db.sessions.find((s) => s.token === sessionToken);
      if (sess && db.accounts.some((a) => a.id === sess.userId)) {
        return sess.userId;
      }
    }
    return "guest";
  }

  public async login(
    email: string,
    password: string,
    meta: { device?: string; browser?: string; ip?: string } = {}
  ): Promise<{ success: boolean; error?: string; token?: string; account?: PublicUserAccount }> {
    const db = await this.ensureLoaded();
    const trimmedEmail = email.trim().toLowerCase();
    const account = db.accounts.find((a) => a.email.toLowerCase() === trimmedEmail);
    if (!account) {
      return {
        success: false,
        error: "No account found with this email address. Please sign up or check your credentials.",
      };
    }
    if (!verifyPassword(password, account.passwordHash)) {
      return {
        success: false,
        error: "Invalid password. Please check your credentials and try again.",
      };
    }

    account.lastLoginAt = new Date().toISOString();
    // Migrate legacy plaintext hash if ever present
    if (!account.passwordHash.startsWith("scrypt:")) {
      account.passwordHash = hashPassword(password);
    }

    const token = crypto.randomBytes(32).toString("hex");
    db.sessions.unshift({
      id: `sess_${crypto.randomUUID()}`,
      token,
      userId: account.id,
      device: meta.device || "Workstation Browser",
      browser: meta.browser || "Web Browser",
      location: "StudyPilot Workspace",
      lastActive: "Just now",
      ip: meta.ip || "127.0.0.1",
      createdAt: new Date().toISOString(),
    });
    if (db.sessions.length > 50) {
      db.sessions = db.sessions.slice(0, 50);
    }

    await this.persist();
    return { success: true, token, account: sanitizeAccount(account) };
  }

  public async loginPrimaryDemo(
    meta: { device?: string; browser?: string; ip?: string } = {}
  ): Promise<{ success: boolean; error?: string; token?: string; account?: PublicUserAccount }> {
    const db = await this.ensureLoaded();
    const account = db.accounts[0];
    if (!account) {
      return { success: false, error: "No student account registered." };
    }
    account.lastLoginAt = new Date().toISOString();
    const token = crypto.randomBytes(32).toString("hex");
    db.sessions.unshift({
      id: `sess_${crypto.randomUUID()}`,
      token,
      userId: account.id,
      device: meta.device || "Workstation Browser",
      browser: meta.browser || "Google Session",
      location: "StudyPilot Workspace",
      lastActive: "Just now",
      ip: meta.ip || "127.0.0.1",
      createdAt: new Date().toISOString(),
    });
    await this.persist();
    return { success: true, token, account: sanitizeAccount(account) };
  }

  public async register(data: {
    name: string;
    email: string;
    password: string;
    institution?: string;
    major?: string;
    semester?: string;
    avatarColor?: string;
    role?: UserRole;
  }): Promise<{ success: boolean; error?: string; token?: string; account?: PublicUserAccount }> {
    const db = await this.ensureLoaded();
    const trimmedEmail = (data.email || "").trim().toLowerCase();
    const trimmedName = (data.name || "").trim();

    if (!trimmedName) {
      return { success: false, error: "Full Name is required." };
    }
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      return { success: false, error: "Please enter a valid email address." };
    }
    if (!data.password || data.password.length < 6) {
      return { success: false, error: "Password must be at least 6 characters long." };
    }
    if (db.accounts.some((a) => a.email.toLowerCase() === trimmedEmail)) {
      return {
        success: false,
        error: "An account with this email already exists. Please sign in.",
      };
    }

    const colors = [
      "bg-indigo-600",
      "bg-violet-600",
      "bg-emerald-600",
      "bg-sky-600",
      "bg-rose-600",
      "bg-amber-600",
      "bg-teal-600",
    ];
    const assignedColor = data.avatarColor || colors[Math.floor(Math.random() * colors.length)];

    const newAccount: StoredUserAccount = {
      id: `usr_${Date.now()}`,
      name: trimmedName,
      email: trimmedEmail,
      passwordHash: hashPassword(data.password),
      institution: data.institution?.trim() || "University Student",
      major: data.major?.trim() || "Computer Science",
      semester: data.semester?.trim() || "Semester 1",
      studentId: `STU-${Math.floor(1000 + Math.random() * 9000)}`,
      avatarColor: assignedColor,
      role: data.role || "student",
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      twoFactorEnabled: false,
      dailyGoalHours: 4.0,
      focusScore: 85,
      streakDays: 1,
    };

    db.accounts.unshift(newAccount);
    db.workspaces[newAccount.id] = createDefaultWorkspace(newAccount);

    const token = crypto.randomBytes(32).toString("hex");
    db.sessions.unshift({
      id: `sess_${crypto.randomUUID()}`,
      token,
      userId: newAccount.id,
      device: "Workstation Browser",
      browser: "Web Session",
      location: "StudyPilot Workspace",
      lastActive: "Just now",
      ip: "127.0.0.1",
      createdAt: new Date().toISOString(),
    });

    await this.persist();
    return { success: true, token, account: sanitizeAccount(newAccount) };
  }

  public async logout(sessionToken?: string) {
    const db = await this.ensureLoaded();
    if (sessionToken) {
      db.sessions = db.sessions.filter((s) => s.token !== sessionToken);
      await this.persist();
    }
    return { success: true };
  }

  public async switchAccount(userId: string): Promise<{ success: boolean; token?: string; account?: PublicUserAccount; error?: string }> {
    const db = await this.ensureLoaded();
    const target = db.accounts.find((a) => a.id === userId);
    if (!target) {
      return { success: false, error: "Account not found" };
    }
    target.lastLoginAt = new Date().toISOString();
    const token = crypto.randomBytes(32).toString("hex");
    db.sessions.unshift({
      id: `sess_${crypto.randomUUID()}`,
      token,
      userId: target.id,
      device: "Workstation Browser",
      browser: "Web Session",
      location: "StudyPilot Workspace",
      lastActive: "Just now",
      ip: "127.0.0.1",
      createdAt: new Date().toISOString(),
    });
    await this.persist();
    return { success: true, token, account: sanitizeAccount(target) };
  }

  public async updateAccount(userId: string, updates: Partial<PublicUserAccount>) {
    const db = await this.ensureLoaded();
    const account = db.accounts.find((a) => a.id === userId);
    if (!account) return { success: false, error: "Account not found" };

    const allowedFields: Array<keyof PublicUserAccount> = [
      "name",
      "email",
      "institution",
      "major",
      "semester",
      "studentId",
      "avatarUrl",
      "avatarColor",
      "role",
      "twoFactorEnabled",
      "dailyGoalHours",
      "focusScore",
      "streakDays",
    ];
    for (const key of allowedFields) {
      if (key in updates && updates[key] !== undefined) {
        (account as any)[key] = updates[key];
      }
    }
    await this.persist();
    return { success: true, account: sanitizeAccount(account) };
  }

  public async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const db = await this.ensureLoaded();
    const account = db.accounts.find((a) => a.id === userId);
    if (!account) {
      return { success: false, error: "You must be signed in to change password." };
    }
    if (!verifyPassword(oldPassword, account.passwordHash)) {
      return { success: false, error: "Incorrect current password." };
    }
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: "New password must be at least 6 characters." };
    }
    account.passwordHash = hashPassword(newPassword);
    await this.persist();
    return { success: true };
  }

  public async resetPassword(email: string) {
    const db = await this.ensureLoaded();
    const trimmed = (email || "").trim().toLowerCase();
    const account = db.accounts.find((a) => a.email.toLowerCase() === trimmed);
    if (!account) {
      return { success: false, message: "No account found with this email." };
    }
    const tempPass = "study" + Math.floor(1000 + Math.random() * 9000);
    account.passwordHash = hashPassword(tempPass);
    await this.persist();
    return {
      success: true,
      message: `Password reset complete. Your temporary password is: ${tempPass}`,
      tempPass,
    };
  }

  public async revokeSession(userId: string, sessionId: string) {
    const db = await this.ensureLoaded();
    db.sessions = db.sessions.filter((s) => !(s.userId === userId && s.id === sessionId));
    await this.persist();
    return { success: true };
  }

  public async getWorkspace(userKey: string): Promise<WorkspaceState> {
    const db = await this.ensureLoaded();
    if (!db.workspaces[userKey]) {
      const account = db.accounts.find((a) => a.id === userKey) || null;
      db.workspaces[userKey] = createDefaultWorkspace(account);
      await this.persist();
    }
    const ws = db.workspaces[userKey];
    const page = VALID_PAGES.has(ws.activePage) ? ws.activePage : "dashboard";
    return { ...ws, activePage: page };
  }

  public async saveWorkspace(userKey: string, updates: Partial<WorkspaceState>): Promise<WorkspaceState> {
    const db = await this.ensureLoaded();
    const existing = await this.getWorkspace(userKey);
    const nextPage =
      typeof updates.activePage === "string" && VALID_PAGES.has(updates.activePage)
        ? updates.activePage
        : existing.activePage;

    const merged: WorkspaceState = {
      activePage: nextPage,
      subjects: Array.isArray(updates.subjects) ? updates.subjects : existing.subjects,
      tasks: Array.isArray(updates.tasks) ? updates.tasks : existing.tasks,
      assignments: Array.isArray(updates.assignments) ? updates.assignments : existing.assignments,
      exams: Array.isArray(updates.exams) ? updates.exams : existing.exams,
      focusSessions: Array.isArray(updates.focusSessions) ? updates.focusSessions : existing.focusSessions,
      quizScores: Array.isArray(updates.quizScores) ? updates.quizScores : existing.quizScores,
      plannedBlocks: Array.isArray(updates.plannedBlocks) ? updates.plannedBlocks : existing.plannedBlocks,
      activeStudyPlan: "activeStudyPlan" in updates ? updates.activeStudyPlan ?? null : existing.activeStudyPlan,
      completedRecommendationIds: Array.isArray(updates.completedRecommendationIds)
        ? updates.completedRecommendationIds
        : existing.completedRecommendationIds,
      dismissedRecommendationIds: Array.isArray(updates.dismissedRecommendationIds)
        ? updates.dismissedRecommendationIds
        : existing.dismissedRecommendationIds,
      profile:
        updates.profile && typeof updates.profile === "object"
          ? { ...existing.profile, ...updates.profile }
          : existing.profile,
      notifications: Array.isArray(updates.notifications) ? updates.notifications : existing.notifications,
      settings:
        updates.settings && typeof updates.settings === "object"
          ? { ...existing.settings, ...updates.settings }
          : existing.settings,
      updatedAt: new Date().toISOString(),
    };

    db.workspaces[userKey] = merged;
    await this.persist();
    return merged;
  }

  public async resetWorkspace(userKey: string): Promise<WorkspaceState> {
    const db = await this.ensureLoaded();
    const account = db.accounts.find((a) => a.id === userKey) || null;
    const fresh = createDefaultWorkspace(account);
    db.workspaces[userKey] = fresh;
    await this.persist();
    return fresh;
  }

  public async getRoadmaps(userKey: string): Promise<RoadmapStoreState> {
    const db = await this.ensureLoaded();
    if (!db.roadmaps[userKey]) {
      db.roadmaps[userKey] = {
        savedRoadmaps: [],
        completedTopicIds: {},
        updatedAt: new Date().toISOString(),
      };
      await this.persist();
    }
    return db.roadmaps[userKey];
  }

  public async saveRoadmaps(
    userKey: string,
    payload: { savedRoadmaps?: any[]; completedTopicIds?: Record<string, boolean> }
  ): Promise<RoadmapStoreState> {
    const db = await this.ensureLoaded();
    const existing = await this.getRoadmaps(userKey);
    const updated: RoadmapStoreState = {
      savedRoadmaps: Array.isArray(payload.savedRoadmaps) ? payload.savedRoadmaps : existing.savedRoadmaps,
      completedTopicIds:
        payload.completedTopicIds && typeof payload.completedTopicIds === "object"
          ? payload.completedTopicIds
          : existing.completedTopicIds,
      updatedAt: new Date().toISOString(),
    };
    db.roadmaps[userKey] = updated;
    await this.persist();
    return updated;
  }
}

export const dbStore = new StudyPilotDatabase();
