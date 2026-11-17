import {
  Subject,
  Task,
  Assignment,
  Exam,
  FocusSession,
  StudentProfile,
  AppNotification,
  StudyFlowSettings,
  QuizScore,
} from "../types";

const todayStr = new Date().toISOString().split("T")[0];

export const initialSubjects: Subject[] = [];

export const initialTasks: Task[] = [];

export const initialExams: Exam[] = [];

export const initialAssignments: Assignment[] = [];

export const initialFocusSessions: FocusSession[] = [];

export const initialProfile: StudentProfile = {
  name: "Student",
  email: "",
  avatarUrl: "",
  institution: "",
  major: "",
  semester: "",
  studentId: "",
  dailyGoalHours: 4,
  streakDays: 0,
  lastActiveDate: todayStr,
  focusScore: 0,
};

export const initialWeeklyStudyData = [
  { day: "Mon", hours: 0, label: "0h 00m" },
  { day: "Tue", hours: 0, label: "0h 00m" },
  { day: "Wed", hours: 0, label: "0h 00m" },
  { day: "Thu", hours: 0, label: "0h 00m" },
  { day: "Fri", hours: 0, label: "0h 00m" },
  { day: "Sat", hours: 0, label: "0h 00m" },
  { day: "Sun", hours: 0, label: "0h 00m" },
];

export const initialNotifications: AppNotification[] = [];

export const initialSettings: StudyFlowSettings = {
  theme: "light",
  defaultFocusDuration: 45,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  soundEnabled: true,
  soundType: "ambient",
  examReminderDays: 5,
  dailyBriefingEnabled: true,
};

export const initialQuizScores: QuizScore[] = [];
