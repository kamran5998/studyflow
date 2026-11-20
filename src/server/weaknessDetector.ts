/**
 * StudyPilot AI Weakness Detection Engine
 * 
 * Deterministic, testable, and explainable topic-level mastery & weakness diagnostic.
 * Strictly adheres to student learning data without fabricating scores or activity.
 */

export type MasteryClassification = "weak" | "developing" | "strong" | "unknown";
export type EvidenceSource = "measured_quiz" | "insufficient_data";
export type DiagnosticConfidence = "high" | "medium" | "insufficient_data";
export type RevisionPriority = "high" | "medium" | "low";

export interface MasteryThresholds {
  weakMax: number;   // Score strictly below this is 'weak' (default: 50)
  strongMin: number; // Score at or above this is 'strong' (default: 75)
}

export const DEFAULT_THRESHOLDS: MasteryThresholds = {
  weakMax: 50,
  strongMin: 75,
};

export interface RawTopicInput {
  id?: string;
  title: string;
  completed?: boolean;
  weightage?: number;
  weightageLevel?: "high" | "medium" | "low";
}

export interface RawSubjectInput {
  id: string;
  name: string;
  topics?: RawTopicInput[];
  progress?: number;
  targetHours?: number;
}

export interface RawQuizScoreInput {
  id?: string;
  subjectId?: string;
  subjectName?: string;
  topic: string;
  score: number;
  date?: string;
  totalQuestions?: number;
}

export interface RawExamInput {
  id: string;
  subjectId?: string;
  subjectName?: string;
  title: string;
  date: string; // YYYY-MM-DD
  topicsCovered?: string[];
  preparationPercentage?: number;
}

export interface RawTaskInput {
  id: string;
  title: string;
  subjectId?: string;
  subjectName?: string;
  topic?: string;
  status: "pending" | "in_progress" | "completed";
  date?: string;
  priority?: "low" | "medium" | "high";
}

export interface RawFocusSessionInput {
  id: string;
  subjectId?: string;
  subjectName?: string;
  topic?: string;
  durationMinutes: number;
  timestamp?: string;
}

export interface AnalyzedWeakTopic {
  id: string;
  topic: string;
  subjectId: string;
  subjectName: string;
  score: number; // 0-100 measured score or 0 if unknown
  quizScore: number | null; // Measured score, null if no quiz taken
  status: "needs_attention" | "moderate" | "mastered" | "unknown";
  masteryClassification: MasteryClassification;
  evidenceSource: EvidenceSource;
  confidence: DiagnosticConfidence;
  explanation: string;
  recommendedAction: string;
  revisionPriority: RevisionPriority;
  attemptCount: number;
  highestQuizScore: number | null;
  latestQuizScore: number | null;
  daysToExam: number | null;
  examTitle: string | null;
  label: string;
  color: "red" | "yellow" | "green" | "slate";
  symbol: string;
  isExamUrgent: boolean;
  minutesStudied: number;
  isCompleted: boolean;
  reason: string;
  suggestedAction: string;
}

export interface WeaknessAnalysisResult {
  topics: AnalyzedWeakTopic[];
  summary: {
    totalAnalyzed: number;
    weakCount: number;
    developingCount: number;
    strongCount: number;
    unknownCount: number;
    needsAttentionCount: number;
    moderateCount: number;
    masteredCount: number;
    aiDiagnostic: string;
    thresholdsUsed: MasteryThresholds;
    evaluatedAt: string;
    isFallback?: boolean;
  };
}

export interface WeaknessEngineContext {
  subjects?: RawSubjectInput[];
  tasks?: RawTaskInput[];
  exams?: RawExamInput[];
  focusSessions?: RawFocusSessionInput[];
  quizScores?: RawQuizScoreInput[];
  thresholds?: Partial<MasteryThresholds>;
}

/**
 * Normalizes string keys for tolerant matching (e.g. "Binary Search" vs "binary search")
 */
function normalizeKey(str: string): string {
  return (str || "").toLowerCase().trim();
}

/**
 * Parses YYYY-MM-DD or ISO strings into integer days difference from today.
 * Returns null if invalid date.
 */
function getDaysUntil(dateStr?: string): number | null {
  if (!dateStr) return null;
  try {
    const target = new Date(dateStr.slice(0, 10) + "T00:00:00Z");
    if (isNaN(target.getTime())) return null;
    const now = new Date();
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const diffMs = target.getTime() - today.getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

/**
 * Core deterministic weakness and mastery classification algorithm
 */
export function analyzeWeaknesses(context: WeaknessEngineContext): WeaknessAnalysisResult {
  const subjects = Array.isArray(context.subjects) ? context.subjects : [];
  const tasks = Array.isArray(context.tasks) ? context.tasks : [];
  const exams = Array.isArray(context.exams) ? context.exams : [];
  const focusSessions = Array.isArray(context.focusSessions) ? context.focusSessions : [];
  const quizScores = Array.isArray(context.quizScores) ? context.quizScores : [];

  const thresholds: MasteryThresholds = {
    weakMax: typeof context.thresholds?.weakMax === "number" ? Math.max(0, Math.min(100, context.thresholds.weakMax)) : DEFAULT_THRESHOLDS.weakMax,
    strongMin: typeof context.thresholds?.strongMin === "number" ? Math.max(0, Math.min(100, context.thresholds.strongMin)) : DEFAULT_THRESHOLDS.strongMin,
  };

  // Group and validate quiz attempts per topic/subject
  // Key format: `${subjectId}:::${normTopic}` and `${normTopic}`
  interface TopicQuizHistory {
    attempts: Array<{ score: number; date?: string }>;
  }
  const quizMap = new Map<string, TopicQuizHistory>();

  for (const q of quizScores) {
    if (!q || !q.topic) continue;
    const normTopic = normalizeKey(q.topic);
    if (!normTopic) continue;

    // Validate and clamp score strictly between 0 and 100
    let rawScore = Number(q.score);
    if (isNaN(rawScore)) continue;
    const clampedScore = Math.max(0, Math.min(100, Math.round(rawScore)));

    const keys: string[] = [normTopic];
    if (q.subjectId) {
      keys.push(`${q.subjectId}:::${normTopic}`);
    }

    for (const key of keys) {
      if (!quizMap.has(key)) {
        quizMap.set(key, { attempts: [] });
      }
      quizMap.get(key)!.attempts.push({
        score: clampedScore,
        date: q.date,
      });
    }
  }

  // Calculate focus minutes studied per topic
  const minutesMap = new Map<string, number>();
  for (const s of focusSessions) {
    if (!s || !s.topic) continue;
    const norm = normalizeKey(s.topic);
    const mins = Math.max(0, Number(s.durationMinutes) || 0);
    minutesMap.set(norm, (minutesMap.get(norm) || 0) + mins);
  }

  // Pre-calculate nearest exam per subject or topic
  // Map key: normTopic or subjectId
  interface ExamProximity {
    examTitle: string;
    daysUntil: number;
  }
  const examMap = new Map<string, ExamProximity>();

  for (const exam of exams) {
    if (!exam || !exam.date) continue;
    const days = getDaysUntil(exam.date);
    if (days === null || days < 0) continue; // Skip past exams

    const item: ExamProximity = {
      examTitle: exam.title || "Exam",
      daysUntil: days,
    };

    if (exam.subjectId) {
      const cur = examMap.get(exam.subjectId);
      if (!cur || days < cur.daysUntil) {
        examMap.set(exam.subjectId, item);
      }
    }
    if (Array.isArray(exam.topicsCovered)) {
      for (const t of exam.topicsCovered) {
        const norm = normalizeKey(t);
        const cur = examMap.get(norm);
        if (!cur || days < cur.daysUntil) {
          examMap.set(norm, item);
        }
      }
    }
  }

  // Count pending/overdue tasks per topic
  const pendingTasksMap = new Map<string, number>();
  for (const task of tasks) {
    if (!task || !task.topic || task.status === "completed") continue;
    const norm = normalizeKey(task.topic);
    pendingTasksMap.set(norm, (pendingTasksMap.get(norm) || 0) + 1);
  }

  // Process all subjects and topics
  const analyzedTopics: AnalyzedWeakTopic[] = [];

  for (const subj of subjects) {
    if (!subj) continue;
    const subjId = subj.id || `subj-${Math.random().toString(36).slice(2, 8)}`;
    const subjName = subj.name || "Untitled Subject";
    const topics = Array.isArray(subj.topics) ? subj.topics : [];

    for (let idx = 0; idx < topics.length; idx++) {
      const topicObj = topics[idx];
      if (!topicObj || !topicObj.title) continue;

      const topicTitle = topicObj.title.trim();
      const normTopic = normalizeKey(topicTitle);
      const isCompleted = Boolean(topicObj.completed);
      const topicId = topicObj.id || `topic-${subjId}-${idx}`;

      // Check quiz history (match by subjectId:::topic or topic)
      const specificQuiz = quizMap.get(`${subjId}:::${normTopic}`);
      const generalQuiz = quizMap.get(normTopic);
      const quizHistory = specificQuiz || generalQuiz;

      let measuredQuizScore: number | null = null;
      let highestQuizScore: number | null = null;
      let latestQuizScore: number | null = null;
      let attemptCount = 0;
      let evidenceSource: EvidenceSource = "insufficient_data";
      let confidence: DiagnosticConfidence = "insufficient_data";
      let mastery: MasteryClassification = "unknown";

      if (quizHistory && quizHistory.attempts.length > 0) {
        attemptCount = quizHistory.attempts.length;
        evidenceSource = "measured_quiz";
        confidence = attemptCount >= 2 ? "high" : "medium";

        // Multi-attempt calculation:
        // 65% weight on latest attempt, 35% on average of all attempts
        const scores = quizHistory.attempts.map((a) => a.score);
        highestQuizScore = Math.max(...scores);
        latestQuizScore = scores[scores.length - 1];

        const avgScore = scores.reduce((sum, val) => sum + val, 0) / scores.length;
        if (attemptCount === 1) {
          measuredQuizScore = latestQuizScore;
        } else {
          measuredQuizScore = Math.round(latestQuizScore * 0.65 + avgScore * 0.35);
        }

        // Apply configurable thresholds
        if (measuredQuizScore < thresholds.weakMax) {
          mastery = "weak";
        } else if (measuredQuizScore < thresholds.strongMin) {
          mastery = "developing";
        } else {
          mastery = "strong";
        }
      } else {
        // Explicit Rule: If no quiz exists, show Unknown / Needs Quiz and clearly indicate that a quiz is needed.
        // Never fabricate scores and do NOT classify as weak solely because data is missing!
        measuredQuizScore = null;
        mastery = "unknown";
        evidenceSource = "insufficient_data";
        confidence = "insufficient_data";
      }

      // Proximity to nearest exam
      const examProximity = examMap.get(normTopic) || examMap.get(subjId) || null;
      const daysToExam = examProximity ? examProximity.daysUntil : null;
      const examTitle = examProximity ? examProximity.examTitle : null;
      const isExamUrgent = daysToExam !== null && daysToExam <= 7;

      // Pending tasks
      const pendingTaskCount = pendingTasksMap.get(normTopic) || 0;

      // Determine Revision Priority
      let revisionPriority: RevisionPriority = "low";
      if (daysToExam !== null && daysToExam <= 7) {
        // Urgent exam within 7 days
        revisionPriority = mastery === "strong" ? "medium" : "high";
      } else if (daysToExam !== null && daysToExam <= 14) {
        revisionPriority = mastery === "weak" ? "high" : mastery === "developing" ? "medium" : "low";
      } else if (pendingTaskCount > 0 && mastery === "weak") {
        revisionPriority = "high";
      } else if (mastery === "weak") {
        revisionPriority = "medium";
      } else if (mastery === "unknown") {
        revisionPriority = isExamUrgent ? "high" : "medium";
      } else {
        revisionPriority = "low";
      }

      // Generate explainable, transparent explanation based on actual evidence
      let explanation = "";
      let recommendedAction = "";
      let status: "needs_attention" | "moderate" | "mastered" | "unknown" = "unknown";
      let label = "";
      let color: "red" | "yellow" | "green" | "slate" = "slate";
      let symbol = "⚪";

      if (mastery === "weak") {
        status = "needs_attention";
        label = "Weak";
        color = "red";
        symbol = "🔴";
        const attemptNote = attemptCount > 1 ? ` across ${attemptCount} quiz attempts (latest: ${latestQuizScore}%)` : "";
        explanation = `Measured quiz score of ${measuredQuizScore}%${attemptNote} is below the ${thresholds.weakMax}% passing benchmark.`;
        if (daysToExam !== null && daysToExam <= 7) {
          explanation += ` Urgent: '${examTitle}' is only ${daysToExam} day(s) away.`;
          recommendedAction = `Immediate revision needed: Review core summary notes for ${topicTitle} and take a re-test within 24 hours.`;
        } else {
          recommendedAction = `Review fundamental concepts of ${topicTitle} and practice 3-5 foundation problems.`;
        }
      } else if (mastery === "developing") {
        status = "moderate";
        label = "Developing";
        color = "yellow";
        symbol = "🟡";
        const attemptNote = attemptCount > 1 ? ` (latest: ${latestQuizScore}%, avg: ${measuredQuizScore}%)` : "";
        explanation = `Measured quiz score of ${measuredQuizScore}%${attemptNote} indicates developing grasp between ${thresholds.weakMax}%–${thresholds.strongMin}%.`;
        if (daysToExam !== null && daysToExam <= 7) {
          explanation += ` Upcoming exam '${examTitle}' in ${daysToExam} days.`;
          recommendedAction = `Target missed sub-topics in ${topicTitle} to push score above ${thresholds.strongMin}% before the exam.`;
        } else {
          recommendedAction = `Solve intermediate practice questions in ${topicTitle} to reach strong mastery.`;
        }
      } else if (mastery === "strong") {
        status = "mastered";
        label = "Strong";
        color = "green";
        symbol = "🟢";
        explanation = `Measured quiz score of ${measuredQuizScore}% meets strong mastery criteria (≥${thresholds.strongMin}%).`;
        if (daysToExam !== null && daysToExam <= 7) {
          recommendedAction = `Exam ready: Maintain retention with a quick 5-minute flashcard review.`;
        } else {
          recommendedAction = `Maintain mastery with periodic spaced repetition.`;
        }
      } else {
        // Unknown / Insufficient Data
        status = "unknown";
        label = "Needs Quiz";
        color = "slate";
        symbol = "⚪";
        explanation = `No quiz attempts recorded for ${topicTitle} yet. Baseline mastery cannot be measured without quiz evidence.`;
        if (daysToExam !== null && daysToExam <= 7) {
          explanation += ` Exam '${examTitle}' is ${daysToExam} days away. Complete a diagnostic quiz immediately.`;
          recommendedAction = `Take an instant AI practice quiz on ${topicTitle} to diagnose your preparation level.`;
        } else {
          recommendedAction = `Complete a 5-question practice quiz on ${topicTitle} to measure your baseline mastery.`;
        }
      }

      const minutesStudied = minutesMap.get(normTopic) || 0;

      analyzedTopics.push({
        id: topicId,
        topic: topicTitle,
        subjectId: subjId,
        subjectName: subjName,
        score: measuredQuizScore ?? 0,
        quizScore: measuredQuizScore,
        status,
        masteryClassification: mastery,
        evidenceSource,
        confidence,
        explanation,
        recommendedAction,
        revisionPriority,
        attemptCount,
        highestQuizScore,
        latestQuizScore,
        daysToExam,
        examTitle,
        label,
        color,
        symbol,
        isExamUrgent,
        minutesStudied,
        isCompleted,
        reason: explanation,
        suggestedAction: recommendedAction,
      });
    }
  }

  // Sort order:
  // 1. Weak topics first (sorted by exam urgency then lowest score)
  // 2. Developing topics
  // 3. Unknown topics needing quiz
  // 4. Strong topics
  const priorityRank: Record<string, number> = {
    weak: 0,
    developing: 1,
    unknown: 2,
    strong: 3,
  };

  analyzedTopics.sort((a, b) => {
    const rankDiff = priorityRank[a.masteryClassification] - priorityRank[b.masteryClassification];
    if (rankDiff !== 0) return rankDiff;

    // Within same rank, prioritize urgent exams
    if (a.isExamUrgent && !b.isExamUrgent) return -1;
    if (!a.isExamUrgent && b.isExamUrgent) return 1;

    // Lower measured score comes first
    return a.score - b.score;
  });

  const weakCount = analyzedTopics.filter((t) => t.masteryClassification === "weak").length;
  const developingCount = analyzedTopics.filter((t) => t.masteryClassification === "developing").length;
  const strongCount = analyzedTopics.filter((t) => t.masteryClassification === "strong").length;
  const unknownCount = analyzedTopics.filter((t) => t.masteryClassification === "unknown").length;

  // Compose deterministic executive diagnostic summary
  let aiDiagnostic = "";
  if (analyzedTopics.length === 0) {
    aiDiagnostic = "No subjects or topics have been configured yet. Add your subjects to activate the StudyPilot AI Weakness Detection Engine.";
  } else if (weakCount > 0) {
    const topWeak = analyzedTopics.filter((t) => t.masteryClassification === "weak");
    const urgentWeak = topWeak.find((t) => t.isExamUrgent);
    if (urgentWeak) {
      aiDiagnostic = `Critical Priority: '${urgentWeak.topic}' in ${urgentWeak.subjectName} scored ${urgentWeak.score}% with an exam only ${urgentWeak.daysToExam} days away. Immediate revision is required.`;
    } else {
      aiDiagnostic = `${weakCount} topic(s) currently score below the ${thresholds.weakMax}% passing benchmark (lead: ${topWeak[0].topic} at ${topWeak[0].score}%). Focus study time here first.`;
    }
  } else if (unknownCount > 0 && developingCount === 0 && strongCount === 0) {
    aiDiagnostic = `${unknownCount} topic(s) are awaiting initial quiz diagnostics. Record quiz scores to map your knowledge strengths and weaknesses.`;
  } else if (developingCount > 0) {
    aiDiagnostic = `${developingCount} topic(s) are in the Developing tier (${thresholds.weakMax}%–${thresholds.strongMin}%). Targeted practice can quickly push these into Strong mastery.`;
  } else {
    aiDiagnostic = `All evaluated topics meet the Strong mastery threshold (≥${thresholds.strongMin}%). Continue spaced review to retain high exam readiness.`;
  }

  return {
    topics: analyzedTopics,
    summary: {
      totalAnalyzed: analyzedTopics.length,
      weakCount,
      developingCount,
      strongCount,
      unknownCount,
      needsAttentionCount: weakCount,
      moderateCount: developingCount,
      masteredCount: strongCount,
      aiDiagnostic,
      thresholdsUsed: thresholds,
      evaluatedAt: new Date().toISOString(),
      isFallback: false,
    },
  };
}
