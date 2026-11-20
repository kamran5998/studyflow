import { relations } from "drizzle-orm";
import {
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// Sequence-free primary tables keyed directly by Firebase Auth UID
export const studentAccounts = pgTable("student_accounts", {
  uid: text("uid").primaryKey(),
  email: text("email").notNull(),
  name: text("name").notNull().default("Student"),
  institution: text("institution").notNull().default(""),
  major: text("major").notNull().default(""),
  semester: text("semester").notNull().default(""),
  studentId: text("student_id").notNull().default(""),
  avatarUrl: text("avatar_url").notNull().default(""),
  dailyGoalHours: doublePrecision("daily_goal_hours").notNull().default(4),
  focusScore: integer("focus_score").notNull().default(0),
  streakDays: integer("streak_days").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const studentWorkspaces = pgTable("student_workspaces", {
  userUid: text("user_uid")
    .primaryKey()
    .references(() => studentAccounts.uid, { onDelete: "cascade" }),
  activePage: text("active_page").notNull().default("dashboard"),
  subjects: jsonb("subjects").$type<any[]>().notNull().default([]),
  tasks: jsonb("tasks").$type<any[]>().notNull().default([]),
  assignments: jsonb("assignments").$type<any[]>().notNull().default([]),
  exams: jsonb("exams").$type<any[]>().notNull().default([]),
  focusSessions: jsonb("focus_sessions").$type<any[]>().notNull().default([]),
  quizScores: jsonb("quiz_scores").$type<any[]>().notNull().default([]),
  plannedBlocks: jsonb("planned_blocks").$type<any[]>().notNull().default([]),
  activeStudyPlan: jsonb("active_study_plan").$type<any | null>().default(null),
  completedRecommendationIds: jsonb("completed_recommendation_ids")
    .$type<string[]>()
    .notNull()
    .default([]),
  dismissedRecommendationIds: jsonb("dismissed_recommendation_ids")
    .$type<string[]>()
    .notNull()
    .default([]),
  profile: jsonb("profile").$type<Record<string, any>>().notNull().default({}),
  notifications: jsonb("notifications").$type<any[]>().notNull().default([]),
  settings: jsonb("settings").$type<Record<string, any>>().notNull().default({}),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const studentRoadmaps = pgTable("student_roadmaps", {
  userUid: text("user_uid")
    .primaryKey()
    .references(() => studentAccounts.uid, { onDelete: "cascade" }),
  savedRoadmaps: jsonb("saved_roadmaps").$type<any[]>().notNull().default([]),
  completedTopicIds: jsonb("completed_topic_ids")
    .$type<Record<string, boolean>>()
    .notNull()
    .default({}),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const studentAccountsRelations = relations(studentAccounts, ({ one }) => ({
  workspace: one(studentWorkspaces, {
    fields: [studentAccounts.uid],
    references: [studentWorkspaces.userUid],
  }),
  roadmap: one(studentRoadmaps, {
    fields: [studentAccounts.uid],
    references: [studentRoadmaps.userUid],
  }),
}));

export const studentWorkspacesRelations = relations(studentWorkspaces, ({ one }) => ({
  account: one(studentAccounts, {
    fields: [studentWorkspaces.userUid],
    references: [studentAccounts.uid],
  }),
}));

export const studentRoadmapsRelations = relations(studentRoadmaps, ({ one }) => ({
  account: one(studentAccounts, {
    fields: [studentRoadmaps.userUid],
    references: [studentAccounts.uid],
  }),
}));

// Legacy initial tables retained in schema to keep non-interactive Drizzle migrations clean
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  uid: text("uid").notNull().unique(),
  email: text("email").notNull(),
  name: text("name").notNull().default("Student"),
  institution: text("institution").notNull().default(""),
  major: text("major").notNull().default(""),
  semester: text("semester").notNull().default(""),
  studentId: text("student_id").notNull().default(""),
  avatarUrl: text("avatar_url").notNull().default(""),
  dailyGoalHours: doublePrecision("daily_goal_hours").notNull().default(4),
  focusScore: integer("focus_score").notNull().default(0),
  streakDays: integer("streak_days").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const workspaces = pgTable("workspaces", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  activePage: text("active_page").notNull().default("dashboard"),
  subjects: jsonb("subjects").$type<any[]>().notNull().default([]),
  tasks: jsonb("tasks").$type<any[]>().notNull().default([]),
  assignments: jsonb("assignments").$type<any[]>().notNull().default([]),
  exams: jsonb("exams").$type<any[]>().notNull().default([]),
  focusSessions: jsonb("focus_sessions").$type<any[]>().notNull().default([]),
  quizScores: jsonb("quiz_scores").$type<any[]>().notNull().default([]),
  plannedBlocks: jsonb("planned_blocks").$type<any[]>().notNull().default([]),
  activeStudyPlan: jsonb("active_study_plan").$type<any | null>().default(null),
  completedRecommendationIds: jsonb("completed_recommendation_ids")
    .$type<string[]>()
    .notNull()
    .default([]),
  dismissedRecommendationIds: jsonb("dismissed_recommendation_ids")
    .$type<string[]>()
    .notNull()
    .default([]),
  profile: jsonb("profile").$type<Record<string, any>>().notNull().default({}),
  notifications: jsonb("notifications").$type<any[]>().notNull().default([]),
  settings: jsonb("settings").$type<Record<string, any>>().notNull().default({}),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const roadmaps = pgTable("roadmaps", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  savedRoadmaps: jsonb("saved_roadmaps").$type<any[]>().notNull().default([]),
  completedTopicIds: jsonb("completed_topic_ids")
    .$type<Record<string, boolean>>()
    .notNull()
    .default({}),
  updatedAt: timestamp("updated_at").defaultNow(),
});
