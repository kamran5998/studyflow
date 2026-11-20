import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import {
  Subject,
  Task,
  Assignment,
  Exam,
  FocusSession,
  StudentProfile,
  AppNotification,
  StudyFlowSettings,
  TaskStatus,
  AssignmentStatus,
  QuizScore,
  AIStudyBlock,
  AIStudyPlan,
} from "../types";
import {
  initialSubjects,
  initialTasks,
  initialExams,
  initialAssignments,
  initialFocusSessions,
  initialProfile,
  initialNotifications,
  initialSettings,
  initialQuizScores,
} from "../lib/initialData";
import { generateId } from "../lib/utils";
import { useAuth } from "./AuthContext";

export type PageId =
  | "dashboard"
  | "subjects"
  | "planner"
  | "assignments"
  | "exams"
  | "roadmap"
  | "focus"
  | "analytics"
  | "quizzes"
  | "summarizer"
  | "profile"
  | "settings";

export interface ToastMessage {
  id: string;
  type: "success" | "info" | "error";
  message: string;
}

interface StudyFlowContextType {
  activePage: PageId;
  setActivePage: (page: PageId) => void;
  quizPreset: { subjectId?: string; topic?: string } | null;
  setQuizPreset: (preset: { subjectId?: string; topic?: string } | null) => void;
  subjects: Subject[];
  tasks: Task[];
  assignments: Assignment[];
  exams: Exam[];
  focusSessions: FocusSession[];
  quizScores: QuizScore[];
  plannedBlocks: Array<AIStudyBlock & { scheduledDate?: string }>;
  syncPlannedBlocks: (blocks: AIStudyBlock[], scheduledDate?: string) => void;
  activeStudyPlan: AIStudyPlan | null;
  setActiveStudyPlan: (plan: AIStudyPlan | null) => void;
  completedRecommendationIds: string[];
  dismissedRecommendationIds: string[];
  markRecommendationCompleted: (id: string) => void;
  dismissRecommendation: (id: string) => void;
  resetRecommendationPreferences: () => void;
  profile: StudentProfile;
  notifications: AppNotification[];
  settings: StudyFlowSettings;
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
  toggleTheme: () => void;
  toast: ToastMessage | null;
  setToast: React.Dispatch<React.SetStateAction<ToastMessage | null>>;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  showToast: (message: string, type?: "success" | "info" | "error") => void;

  // Subjects CRUD
  addSubject: (subject: Omit<Subject, "id" | "createdAt">) => void;
  updateSubject: (id: string, updates: Partial<Subject>) => void;
  deleteSubject: (id: string) => void;
  toggleTopicCompletion: (subjectId: string, topicId: string) => void;

  // Tasks CRUD
  addTask: (task: Omit<Task, "id">) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTaskStatus: (id: string) => void;

  // Assignments CRUD
  addAssignment: (assignment: Omit<Assignment, "id">) => void;
  updateAssignment: (id: string, updates: Partial<Assignment>) => void;
  deleteAssignment: (id: string) => void;
  toggleAssignmentStatus: (id: string) => void;

  // Exams CRUD
  addExam: (exam: Omit<Exam, "id">) => void;
  updateExam: (id: string, updates: Partial<Exam>) => void;
  deleteExam: (id: string) => void;

  // Focus Sessions
  addFocusSession: (session: Omit<FocusSession, "id">) => void;

  // Quiz Scores
  addQuizScore: (score: Omit<QuizScore, "id">) => void;
  updateQuizScore: (id: string, updates: Partial<QuizScore>) => void;
  deleteQuizScore: (id: string) => void;

  // Profile & Settings
  updateProfile: (updates: Partial<StudentProfile>) => void;
  updateSettings: (updates: Partial<StudyFlowSettings>) => void;

  // Notifications
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  unreadNotificationCount: number;

  // Data reset & export/import
  resetToDefaults: () => void;
  exportDataJSON: () => string;
  importDataJSON: (jsonStr: string) => boolean;
}

const StudyFlowContext = createContext<StudyFlowContextType | undefined>(undefined);

const VALID_PAGES: PageId[] = [
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
];

function sanitizePage(raw: unknown): PageId {
  if (raw === "profile") return "settings";
  if (typeof raw === "string" && VALID_PAGES.includes(raw as PageId)) {
    return raw as PageId;
  }
  return "dashboard";
}

export const StudyFlowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isAuthReady, getIdToken } = useAuth();
  const activeUserKey = currentUser?.id || "guest";

  const [activePage, setActivePage] = useState<PageId>("dashboard");
  const handleSetActivePage = (page: PageId) => {
    setActivePage(page === "profile" ? "settings" : page);
  };

  const [quizPreset, setQuizPreset] = useState<{ subjectId?: string; topic?: string } | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const [subjects, setSubjects] = useState<Subject[]>(initialSubjects);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments);
  const [exams, setExams] = useState<Exam[]>(initialExams);
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>(initialFocusSessions);
  const [quizScores, setQuizScores] = useState<QuizScore[]>(initialQuizScores);
  const [plannedBlocks, setPlannedBlocks] = useState<Array<AIStudyBlock & { scheduledDate?: string }>>([]);
  const [activeStudyPlan, setActiveStudyPlan] = useState<AIStudyPlan | null>(null);
  const [completedRecommendationIds, setCompletedRecommendationIds] = useState<string[]>([]);
  const [dismissedRecommendationIds, setDismissedRecommendationIds] = useState<string[]>([]);
  const [profile, setProfile] = useState<StudentProfile>(initialProfile);
  const [notifications, setNotifications] = useState<AppNotification[]>(initialNotifications);
  const [settings, setSettings] = useState<StudyFlowSettings>(() => {
    const prefersDark =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    return { ...initialSettings, theme: prefersDark ? "dark" : initialSettings.theme };
  });

  // Tracks which user's workspace is hydrated so state from an old user never overwrites a newly switched user
  const hydratedForUserKeyRef = useRef<string | null>(null);
  const lastSavedPayloadRef = useRef<string>("");

  // Hydrate full workspace state from Express backend (/api/workspace)
  useEffect(() => {
    if (!isAuthReady) return;
    let cancelled = false;
    hydratedForUserKeyRef.current = null;

    if (!currentUser) {
      const snapshot = JSON.stringify({
        activePage: "dashboard",
        subjects: initialSubjects,
        tasks: initialTasks,
        assignments: initialAssignments,
        exams: initialExams,
        focusSessions: initialFocusSessions,
        quizScores: initialQuizScores,
        plannedBlocks: [],
        activeStudyPlan: null,
        completedRecommendationIds: [],
        dismissedRecommendationIds: [],
        profile: initialProfile,
        notifications: initialNotifications,
        settings: initialSettings,
      });
      lastSavedPayloadRef.current = snapshot;
      hydratedForUserKeyRef.current = "guest";
      setActivePage("dashboard");
      setSubjects(initialSubjects);
      setTasks(initialTasks);
      setAssignments(initialAssignments);
      setExams(initialExams);
      setFocusSessions(initialFocusSessions);
      setQuizScores(initialQuizScores);
      setPlannedBlocks([]);
      setActiveStudyPlan(null);
      setCompletedRecommendationIds([]);
      setDismissedRecommendationIds([]);
      setNotifications(initialNotifications);
      setProfile(initialProfile);
      return;
    }

    (async () => {
      try {
        const token = await getIdToken();
        if (!token) {
          hydratedForUserKeyRef.current = activeUserKey;
          return;
        }
        const res = await fetch("/api/workspace", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const ws = data?.workspace;
        if (cancelled || !ws) return;

        const nextPage = sanitizePage(ws.activePage);
        const nextSubjects = Array.isArray(ws.subjects) ? ws.subjects : initialSubjects;
        const nextTasks = Array.isArray(ws.tasks) ? ws.tasks : initialTasks;
        const nextAssignments = Array.isArray(ws.assignments) ? ws.assignments : initialAssignments;
        const nextExams = Array.isArray(ws.exams) ? ws.exams : initialExams;
        const nextSessions = Array.isArray(ws.focusSessions) ? ws.focusSessions : initialFocusSessions;
        const nextQuizzes = Array.isArray(ws.quizScores) ? ws.quizScores : initialQuizScores;
        const nextPlanned = Array.isArray(ws.plannedBlocks) ? ws.plannedBlocks : [];
        const nextPlan = ws.activeStudyPlan || null;
        const nextCompletedRecs = Array.isArray(ws.completedRecommendationIds) ? ws.completedRecommendationIds : [];
        const nextDismissedRecs = Array.isArray(ws.dismissedRecommendationIds) ? ws.dismissedRecommendationIds : [];
        const nextNotifs = Array.isArray(ws.notifications) ? ws.notifications : initialNotifications;
        const nextSettings: StudyFlowSettings = {
          ...initialSettings,
          ...(ws.settings || {}),
        };
        const baseProfile: StudentProfile = {
          ...initialProfile,
          ...(ws.profile || {}),
        };
        const syncedProfile: StudentProfile = currentUser
          ? {
              ...baseProfile,
              name: currentUser.name || baseProfile.name,
              email: currentUser.email || baseProfile.email,
              institution: currentUser.institution || baseProfile.institution,
              major: currentUser.major || baseProfile.major,
              semester: currentUser.semester || baseProfile.semester,
              studentId: currentUser.studentId || baseProfile.studentId,
              dailyGoalHours: currentUser.dailyGoalHours ?? baseProfile.dailyGoalHours,
              focusScore: currentUser.focusScore ?? baseProfile.focusScore,
              streakDays: currentUser.streakDays ?? baseProfile.streakDays,
            }
          : baseProfile;

        const snapshot = JSON.stringify({
          activePage: nextPage,
          subjects: nextSubjects,
          tasks: nextTasks,
          assignments: nextAssignments,
          exams: nextExams,
          focusSessions: nextSessions,
          quizScores: nextQuizzes,
          plannedBlocks: nextPlanned,
          activeStudyPlan: nextPlan,
          completedRecommendationIds: nextCompletedRecs,
          dismissedRecommendationIds: nextDismissedRecs,
          profile: syncedProfile,
          notifications: nextNotifs,
          settings: nextSettings,
        });

        lastSavedPayloadRef.current = snapshot;
        hydratedForUserKeyRef.current = activeUserKey;

        setActivePage(nextPage);
        setSubjects(nextSubjects);
        setTasks(nextTasks);
        setAssignments(nextAssignments);
        setExams(nextExams);
        setFocusSessions(nextSessions);
        setQuizScores(nextQuizzes);
        setPlannedBlocks(nextPlanned);
        setActiveStudyPlan(nextPlan);
        setCompletedRecommendationIds(nextCompletedRecs);
        setDismissedRecommendationIds(nextDismissedRecs);
        setNotifications(nextNotifs);
        setSettings(nextSettings);
        setProfile(syncedProfile);
      } catch (err) {
        console.error("[StudyPilot] Failed to hydrate workspace from server:", err);
        hydratedForUserKeyRef.current = activeUserKey;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthReady, activeUserKey, currentUser, getIdToken]);

  // Synchronize profile details when active authenticated user fields update
  useEffect(() => {
    if (currentUser && hydratedForUserKeyRef.current === activeUserKey) {
      setProfile((prev) => ({
        ...prev,
        name: currentUser.name,
        email: currentUser.email,
        institution: currentUser.institution,
        major: currentUser.major,
        semester: currentUser.semester,
        studentId: currentUser.studentId,
        dailyGoalHours: currentUser.dailyGoalHours,
        focusScore: currentUser.focusScore,
        streakDays: currentUser.streakDays,
      }));
    }
  }, [currentUser, activeUserKey]);

  // Persist workspace mutations back to Express server database (/api/workspace)
  useEffect(() => {
    if (!isAuthReady || !currentUser || hydratedForUserKeyRef.current !== activeUserKey) return;

    const payloadObj = {
      activePage,
      subjects,
      tasks,
      assignments,
      exams,
      focusSessions,
      quizScores,
      plannedBlocks,
      activeStudyPlan,
      completedRecommendationIds,
      dismissedRecommendationIds,
      profile,
      notifications,
      settings,
    };
    const serialized = JSON.stringify(payloadObj);
    if (serialized === lastSavedPayloadRef.current) return;

    const timer = setTimeout(async () => {
      try {
        const token = await getIdToken();
        if (!token) return;
        const res = await fetch("/api/workspace", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: serialized,
        });
        if (res.ok) {
          lastSavedPayloadRef.current = serialized;
        }
      } catch (err) {
        console.error("[StudyPilot] Failed to sync workspace to server:", err);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [
    isAuthReady,
    currentUser,
    activeUserKey,
    getIdToken,
    activePage,
    subjects,
    tasks,
    assignments,
    exams,
    focusSessions,
    quizScores,
    plannedBlocks,
    activeStudyPlan,
    completedRecommendationIds,
    dismissedRecommendationIds,
    profile,
    notifications,
    settings,
  ]);

  const theme = settings.theme || "light";

  const setTheme = (newTheme: "light" | "dark") => {
    setSettings((prev) => ({ ...prev, theme: newTheme }));
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  // Sync dark class on root html document
  useEffect(() => {
    const isDark = theme === "dark";
    if (typeof document !== "undefined") {
      if (isDark) {
        document.documentElement.classList.add("dark");
        document.documentElement.setAttribute("data-theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        document.documentElement.setAttribute("data-theme", "light");
      }
    }
  }, [theme]);

  // Toast Helper
  const showToast = (message: string, type: "success" | "info" | "error" = "success") => {
    const id = generateId();
    setToast({ id, message, type });
    setTimeout(() => {
      setToast((curr) => (curr?.id === id ? null : curr));
    }, 3000);
  };

  // SUBJECTS CRUD
  const addSubject = (subData: Omit<Subject, "id" | "createdAt">) => {
    const newSubject: Subject = {
      ...subData,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    setSubjects((prev) => [newSubject, ...prev]);
    showToast(`Added subject "${newSubject.name}"`);
  };

  const updateSubject = (id: string, updates: Partial<Subject>) => {
    setSubjects((prev) =>
      prev.map((sub) => (sub.id === id ? { ...sub, ...updates } : sub))
    );
    showToast("Subject updated");
  };

  const deleteSubject = (id: string) => {
    const target = subjects.find((s) => s.id === id);
    setSubjects((prev) => prev.filter((s) => s.id !== id));
    showToast(`Deleted subject "${target?.name || ""}"`, "info");
  };

  const toggleTopicCompletion = (subjectId: string, topicId: string) => {
    setSubjects((prev) =>
      prev.map((sub) => {
        if (sub.id !== subjectId) return sub;
        const updatedTopics = sub.topics.map((t) =>
          t.id === topicId ? { ...t, completed: !t.completed } : t
        );
        const completedCount = updatedTopics.filter((t) => t.completed).length;
        const newProgress =
          updatedTopics.length > 0
            ? Math.round((completedCount / updatedTopics.length) * 100)
            : 0;
        return {
          ...sub,
          topics: updatedTopics,
          progress: newProgress,
        };
      })
    );
  };

  // TASKS CRUD
  const addTask = (taskData: Omit<Task, "id">) => {
    const newTask: Task = {
      ...taskData,
      id: generateId(),
    };
    setTasks((prev) => [newTask, ...prev]);
    showToast(`Task "${newTask.title}" scheduled`);
  };

  const updateTask = (id: string, updates: Partial<Task>) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
    showToast("Task updated");
  };

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    showToast("Task removed", "info");
  };

  const toggleTaskStatus = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const nextStatus: TaskStatus =
          t.status === "completed"
            ? "pending"
            : t.status === "pending"
            ? "in_progress"
            : "completed";

        return {
          ...t,
          status: nextStatus,
          completedAt: nextStatus === "completed" ? new Date().toISOString() : undefined,
        };
      })
    );
  };

  // ASSIGNMENTS CRUD
  const addAssignment = (assignData: Omit<Assignment, "id">) => {
    const newAssignment: Assignment = {
      ...assignData,
      id: generateId(),
    };
    setAssignments((prev) => [newAssignment, ...prev]);
    showToast(`Added assignment "${newAssignment.title}"`);
  };

  const updateAssignment = (id: string, updates: Partial<Assignment>) => {
    setAssignments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
    );
    showToast("Assignment updated");
  };

  const deleteAssignment = (id: string) => {
    setAssignments((prev) => prev.filter((a) => a.id !== id));
    showToast("Assignment removed", "info");
  };

  const toggleAssignmentStatus = (id: string) => {
    setAssignments((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        const nextStatus: AssignmentStatus =
          a.status === "completed" ? "pending" : "completed";
        return {
          ...a,
          status: nextStatus,
        };
      })
    );
  };

  // EXAMS CRUD
  const addExam = (examData: Omit<Exam, "id">) => {
    const newExam: Exam = {
      ...examData,
      id: generateId(),
    };
    setExams((prev) => [newExam, ...prev]);
    showToast(`Added exam for ${newExam.subjectName}`);
  };

  const updateExam = (id: string, updates: Partial<Exam>) => {
    setExams((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...updates } : e))
    );
    showToast("Exam updated");
  };

  const deleteExam = (id: string) => {
    setExams((prev) => prev.filter((e) => e.id !== id));
    showToast("Exam removed", "info");
  };

  // FOCUS SESSIONS
  const addFocusSession = (sessionData: Omit<FocusSession, "id">) => {
    const newSession: FocusSession = {
      ...sessionData,
      id: generateId(),
    };
    setFocusSessions((prev) => [newSession, ...prev]);

    setSubjects((prev) =>
      prev.map((sub) =>
        sub.id === sessionData.subjectId
          ? {
              ...sub,
              totalStudyMinutes: (sub.totalStudyMinutes || 0) + sessionData.durationMinutes,
            }
          : sub
      )
    );

    setProfile((prev) => ({
      ...prev,
      focusScore: Math.min(
        99,
        Math.max(
          70,
          Math.round((prev.focusScore * 4 + (sessionData.rating || 5) * 20) / 5)
        )
      ),
    }));

    showToast(`Saved ${sessionData.durationMinutes}m focus session!`);
  };

  // PLANNED STUDY BLOCKS SYNC
  const syncPlannedBlocks = (blocks: AIStudyBlock[], scheduledDate?: string) => {
    const dateKey = scheduledDate || new Date().toISOString().slice(0, 10);
    setPlannedBlocks((prev) => {
      const otherDays = prev.filter((b) => (b.scheduledDate || dateKey) !== dateKey);
      const updatedToday = blocks.map((b) => ({
        ...b,
        scheduledDate: dateKey,
      }));
      return [...otherDays, ...updatedToday];
    });
  };

  // RECOMMENDATIONS PERSISTENCE
  const markRecommendationCompleted = (id: string) => {
    if (!id) return;
    setCompletedRecommendationIds((prev) => Array.from(new Set([...prev, id])));
    showToast("Recommendation marked completed!");
  };

  const dismissRecommendation = (id: string) => {
    if (!id) return;
    setDismissedRecommendationIds((prev) => Array.from(new Set([...prev, id])));
    showToast("Recommendation dismissed", "info");
  };

  const resetRecommendationPreferences = () => {
    setCompletedRecommendationIds([]);
    setDismissedRecommendationIds([]);
    showToast("Recommendation history cleared", "info");
  };

  // QUIZ SCORES CRUD
  const addQuizScore = (scoreData: Omit<QuizScore, "id">) => {
    const clampedScore = Math.max(0, Math.min(100, Number(scoreData.score) || 0));
    const newScore: QuizScore = {
      ...scoreData,
      score: clampedScore,
      date: scoreData.date || new Date().toISOString().slice(0, 10),
      id: generateId(),
    };
    setQuizScores((prev) => [...prev, newScore]);
    showToast(`Saved quiz score for ${newScore.topic}: ${newScore.score}%`);
  };

  const updateQuizScore = (id: string, updates: Partial<QuizScore>) => {
    setQuizScores((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
    showToast("Quiz record updated");
  };

  const deleteQuizScore = (id: string) => {
    setQuizScores((prev) => prev.filter((s) => s.id !== id));
    showToast("Quiz record removed", "info");
  };

  // PROFILE & SETTINGS
  const updateProfile = (updates: Partial<StudentProfile>) => {
    setProfile((prev) => ({ ...prev, ...updates }));
    showToast("Profile details updated");
  };

  const updateSettings = (updates: Partial<StudyFlowSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
    showToast("Preferences saved");
  };

  // NOTIFICATIONS
  const markNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    showToast("All notifications marked as read");
  };

  const unreadNotificationCount = notifications.filter((n) => !n.read).length;

  // DATA BACKUP & RESTORE
  const resetToDefaults = async () => {
    setSubjects(initialSubjects);
    setTasks(initialTasks);
    setAssignments(initialAssignments);
    setExams(initialExams);
    setFocusSessions(initialFocusSessions);
    setQuizScores(initialQuizScores);
    setPlannedBlocks([]);
    setActiveStudyPlan(null);
    setCompletedRecommendationIds([]);
    setDismissedRecommendationIds([]);
    setProfile(initialProfile);
    setNotifications(initialNotifications);
    setSettings(initialSettings);

    try {
      const token = await getIdToken();
      if (!token) {
        showToast("Workspace reset locally", "info");
        return;
      }
      const res = await fetch("/api/workspace/reset", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.workspace) {
          lastSavedPayloadRef.current = JSON.stringify({
            activePage: sanitizePage(data.workspace.activePage),
            subjects: data.workspace.subjects || [],
            tasks: data.workspace.tasks || [],
            assignments: data.workspace.assignments || [],
            exams: data.workspace.exams || [],
            focusSessions: data.workspace.focusSessions || [],
            quizScores: data.workspace.quizScores || [],
            plannedBlocks: data.workspace.plannedBlocks || [],
            activeStudyPlan: data.workspace.activeStudyPlan || null,
            completedRecommendationIds: data.workspace.completedRecommendationIds || [],
            dismissedRecommendationIds: data.workspace.dismissedRecommendationIds || [],
            profile: data.workspace.profile || initialProfile,
            notifications: data.workspace.notifications || [],
            settings: data.workspace.settings || initialSettings,
          });
        }
      }
    } catch (err) {
      console.error("[StudyPilot] Failed to reset workspace on server:", err);
    }

    showToast("Reset to sample student data", "info");
  };

  const exportDataJSON = () => {
    const data = {
      subjects,
      tasks,
      assignments,
      exams,
      focusSessions,
      quizScores,
      plannedBlocks,
      activeStudyPlan,
      completedRecommendationIds,
      dismissedRecommendationIds,
      profile,
      settings,
      exportedAt: new Date().toISOString(),
    };
    return JSON.stringify(data, null, 2);
  };

  const importDataJSON = (jsonStr: string): boolean => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.subjects && Array.isArray(parsed.subjects)) setSubjects(parsed.subjects);
      if (parsed.tasks && Array.isArray(parsed.tasks)) setTasks(parsed.tasks);
      if (parsed.assignments && Array.isArray(parsed.assignments)) setAssignments(parsed.assignments);
      if (parsed.exams && Array.isArray(parsed.exams)) setExams(parsed.exams);
      if (parsed.focusSessions && Array.isArray(parsed.focusSessions)) setFocusSessions(parsed.focusSessions);
      if (parsed.quizScores && Array.isArray(parsed.quizScores)) setQuizScores(parsed.quizScores);
      if (parsed.plannedBlocks && Array.isArray(parsed.plannedBlocks)) setPlannedBlocks(parsed.plannedBlocks);
      if ("activeStudyPlan" in parsed) setActiveStudyPlan(parsed.activeStudyPlan || null);
      if (parsed.completedRecommendationIds && Array.isArray(parsed.completedRecommendationIds)) {
        setCompletedRecommendationIds(parsed.completedRecommendationIds);
      }
      if (parsed.dismissedRecommendationIds && Array.isArray(parsed.dismissedRecommendationIds)) {
        setDismissedRecommendationIds(parsed.dismissedRecommendationIds);
      }
      if (parsed.profile) setProfile(parsed.profile);
      if (parsed.settings) setSettings(parsed.settings);
      showToast("Data imported successfully!");
      return true;
    } catch {
      showToast("Invalid JSON file provided", "error");
      return false;
    }
  };

  return (
    <StudyFlowContext.Provider
      value={{
        activePage,
        setActivePage: handleSetActivePage,
        quizPreset,
        setQuizPreset,
        subjects,
        tasks,
        assignments,
        exams,
        focusSessions,
        quizScores,
        plannedBlocks,
        syncPlannedBlocks,
        activeStudyPlan,
        setActiveStudyPlan,
        completedRecommendationIds,
        dismissedRecommendationIds,
        markRecommendationCompleted,
        dismissRecommendation,
        resetRecommendationPreferences,
        profile,
        notifications,
        settings,
        theme,
        setTheme,
        toggleTheme,
        toast,
        setToast,
        isSearchOpen,
        setIsSearchOpen,
        showToast,
        addSubject,
        updateSubject,
        deleteSubject,
        toggleTopicCompletion,
        addTask,
        updateTask,
        deleteTask,
        toggleTaskStatus,
        addAssignment,
        updateAssignment,
        deleteAssignment,
        toggleAssignmentStatus,
        addExam,
        updateExam,
        deleteExam,
        addFocusSession,
        addQuizScore,
        updateQuizScore,
        deleteQuizScore,
        updateProfile,
        updateSettings,
        markNotificationRead,
        markAllNotificationsRead,
        unreadNotificationCount,
        resetToDefaults,
        exportDataJSON,
        importDataJSON,
      }}
    >
      {children}
    </StudyFlowContext.Provider>
  );
};

export const useStudyFlow = () => {
  const context = useContext(StudyFlowContext);
  if (!context) {
    throw new Error("useStudyFlow must be used within a StudyFlowProvider");
  }
  return context;
};
