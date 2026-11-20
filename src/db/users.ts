import { eq } from "drizzle-orm";
import { db } from "./index.ts";
import { studentAccounts } from "./schema.ts";

export interface UserProfileUpdate {
  name?: string;
  email?: string;
  institution?: string;
  major?: string;
  semester?: string;
  studentId?: string;
  avatarUrl?: string;
  dailyGoalHours?: number;
  focusScore?: number;
  streakDays?: number;
}

export async function getOrCreateUser(
  uid: string,
  email: string,
  name?: string,
  avatarUrl?: string
) {
  try {
    const safeEmail = email || `${uid}@user.studypilot.app`;
    const safeName = (name || "").trim() || safeEmail.split("@")[0] || "Student";

    const result = await db
      .insert(studentAccounts)
      .values({
        uid,
        email: safeEmail,
        name: safeName,
        avatarUrl: avatarUrl || "",
      })
      .onConflictDoUpdate({
        target: studentAccounts.uid,
        set: {
          email: safeEmail,
          updatedAt: new Date(),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error("Database query failed (getOrCreateUser):", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}

export async function updateUserProfile(uid: string, updates: UserProfileUpdate) {
  try {
    const patch: Record<string, any> = {
      updatedAt: new Date(),
    };
    if (typeof updates.name === "string" && updates.name.trim()) {
      patch.name = updates.name.trim();
    }
    if (typeof updates.email === "string" && updates.email.trim()) {
      patch.email = updates.email.trim();
    }
    if (typeof updates.institution === "string") {
      patch.institution = updates.institution;
    }
    if (typeof updates.major === "string") {
      patch.major = updates.major;
    }
    if (typeof updates.semester === "string") {
      patch.semester = updates.semester;
    }
    if (typeof updates.studentId === "string") {
      patch.studentId = updates.studentId;
    }
    if (typeof updates.avatarUrl === "string") {
      patch.avatarUrl = updates.avatarUrl;
    }
    if (typeof updates.dailyGoalHours === "number" && Number.isFinite(updates.dailyGoalHours)) {
      patch.dailyGoalHours = updates.dailyGoalHours;
    }
    if (typeof updates.focusScore === "number" && Number.isFinite(updates.focusScore)) {
      patch.focusScore = updates.focusScore;
    }
    if (typeof updates.streakDays === "number" && Number.isFinite(updates.streakDays)) {
      patch.streakDays = updates.streakDays;
    }

    const updated = await db
      .update(studentAccounts)
      .set(patch)
      .where(eq(studentAccounts.uid, uid))
      .returning();

    return updated[0] || null;
  } catch (error) {
    console.error("Database query failed (updateUserProfile):", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}
