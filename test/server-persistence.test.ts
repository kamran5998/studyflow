import fs from "fs/promises";
import os from "os";
import path from "path";
import { StudyPilotDatabase } from "../src/server/db";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`[PERSISTENCE TEST FAILED]: ${msg}`);
}

async function run() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "studypilot-db-"));
  const dbPath = path.join(tmpDir, "studypilot-db.json");

  try {
    console.log("=================================================================");
    console.log("🧪 Running StudyPilot Server Persistence & Auth Database Tests");
    console.log("=================================================================");

    // 1. Initial boot & auto-session
    const db1 = new StudyPilotDatabase(dbPath);
    const initialAuth = await db1.getAuthState(undefined, false);
    assert(initialAuth.isAuthenticated && Boolean(initialAuth.currentUser), "Initial visit creates default user session");
    assert(Boolean(initialAuth.createdToken), "Initial session issues token");
    assert(!("passwordHash" in (initialAuth.currentUser as any)), "Public user object must not expose passwordHash");

    // 2. Register new student & verify scrypt password hashing + per-user workspace isolation
    const reg = await db1.register({
      name: "Test Student",
      email: "student.test@example.edu",
      password: "strongpassword123",
    });
    assert(reg.success && Boolean(reg.token) && Boolean(reg.account), "Register creates new account and token");
    const newUserId = reg.account!.id;

    // Raw file must not store plaintext password
    const rawJson = await fs.readFile(dbPath, "utf-8");
    assert(!rawJson.includes("strongpassword123"), "Persisted DB must never contain plaintext passwords");
    assert(rawJson.includes("scrypt:"), "Persisted DB must store scrypt salted password hashes");

    // 3. Save workspace & roadmaps for newly registered user
    await db1.saveWorkspace(newUserId, {
      activePage: "analytics",
      subjects: [{ id: "sub-1", name: "Operating Systems", progress: 40, topics: [] }],
      quizScores: [{ id: "q-1", subjectId: "sub-1", subjectName: "Operating Systems", topic: "Deadlocks", score: 62, date: "2026-11-14" }],
      settings: {
        theme: "dark",
        defaultFocusDuration: 50,
        shortBreakDuration: 5,
        longBreakDuration: 15,
        soundEnabled: true,
        soundType: "ambient",
        examReminderDays: 5,
        dailyBriefingEnabled: true,
      },
    });
    await db1.saveRoadmaps(newUserId, {
      savedRoadmaps: [{ id: "rm-1", topic: "Rust", targetLevel: "Beginner to Advanced", phases: [] }],
      completedTopicIds: { "t1-1": true },
    });

    // 4. Reload fresh StudyPilotDatabase instance from disk (simulates full server restart)
    const db2 = new StudyPilotDatabase(dbPath);
    const resolvedId = await db2.resolveUserId(reg.token);
    assert(resolvedId === newUserId, "Session token resolves across server restart");

    const ws = await db2.getWorkspace(resolvedId);
    assert(ws.activePage === "analytics", "Active page persisted on disk");
    assert(ws.subjects.length === 1 && ws.subjects[0].name === "Operating Systems", "Subjects persisted on disk");
    assert(ws.quizScores.length === 1 && ws.quizScores[0].score === 62, "Quiz scores persisted on disk");
    assert(ws.settings.theme === "dark", "Theme setting persisted on disk");

    const rm = await db2.getRoadmaps(resolvedId);
    assert(rm.savedRoadmaps.length === 1 && rm.savedRoadmaps[0].topic === "Rust", "Roadmaps persisted on disk");
    assert(rm.completedTopicIds["t1-1"] === true, "Roadmap topic completion persisted on disk");

    // Confirm primary user workspace remained isolated
    const primaryWs = await db2.getWorkspace(initialAuth.currentUser!.id);
    assert(primaryWs.subjects.length === 0, "Workspaces must be isolated per user");

    // 5. Auth login failure, changePassword, logout, resetWorkspace
    const badLogin = await db2.login("student.test@example.edu", "wrongpass");
    assert(!badLogin.success, "Wrong password must be rejected");

    const chg = await db2.changePassword(newUserId, "strongpassword123", "newpassword456");
    assert(chg.success, "changePassword succeeds with valid current password");
    const goodNewLogin = await db2.login("student.test@example.edu", "newpassword456");
    assert(goodNewLogin.success && Boolean(goodNewLogin.token), "New password authenticates cleanly");

    await db2.logout(goodNewLogin.token);
    const guestId = await db2.resolveUserId(goodNewLogin.token);
    assert(guestId === "guest", "Logged-out token must resolve to guest");

    await db2.resetWorkspace(newUserId);
    const afterReset = await db2.getWorkspace(newUserId);
    assert(afterReset.subjects.length === 0 && afterReset.quizScores.length === 0, "resetWorkspace clears study records");

    console.log("✓ All 5 Server Persistence & Auth Database assertions passed!");
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
