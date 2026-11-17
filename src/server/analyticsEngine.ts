/**
 * StudyPilot 2.0 — Advanced Learning Analytics & Student Performance Evaluation Engine
 *
 * Deterministic, testable, zero-fabrication analytics engine.
 * Reuses Day 1 Weakness Detection Engine and Day 3 Recommendation/Insights Engine.
 * Calculates metrics strictly from actual student activity and historical records.
 */

import {
  analyzeWeaknesses,
  RawSubjectInput,
  RawTaskInput,
  RawExamInput,
  RawFocusSessionInput,
  RawQuizScoreInput,
  MasteryThresholds,
  DEFAULT_THRESHOLDS,
  MasteryClassification,
} from "./weaknessDetector";
import {
  generatePersonalizedInsights,
  PersonalizedLearningInsight,
} from "./recommendationEngine";
import {
  RawAssignmentInput,
  ScheduledStudyBlock,
} from "./adaptivePlanner";

export interface ExamReadinessConfig {
  assessedTopicMasteryWeight: number; // default: 0.50
  syllabusCompletionWeight: number;   // default: 0.35
  focusConsistencyWeight: number;     // default: 0.15
  weakTopicPenaltyPerTopic: number;   // default: 5 points per weak topic (capped at 25)
}

export const DEFAULT_EXAM_READINESS_CONFIG: ExamReadinessConfig = {
  assessedTopicMasteryWeight: 0.50,
  syllabusCompletionWeight: 0.35,
  focusConsistencyWeight: 0.15,
  weakTopicPenaltyPerTopic: 5,
};

export interface AnalyticsEngineContext {
  subjects?: RawSubjectInput[];
  tasks?: RawTaskInput[];
  assignments?: RawAssignmentInput[];
  exams?: RawExamInput[];
  focusSessions?: RawFocusSessionInput[];
  quizScores?: RawQuizScoreInput[];
  plannedBlocks?: Array<Partial<ScheduledStudyBlock> & { scheduledDate?: string }>;
  thresholds?: Partial<MasteryThresholds>;
  readinessConfig?: Partial<ExamReadinessConfig>;
  previouslyMissedTopicNames?: string[];
  referenceDate?: string; // Optional YYYY-MM-DD override for deterministic testing
}

function normalizeKey(str?: string): string {
  return (str || "").toLowerCase().trim();
}

function clampScore(val: unknown): number | null {
  if (val === null || val === undefined || val === "") return null;
  const num = Number(val);
  if (isNaN(num) || !isFinite(num)) return null;
  return Math.max(0, Math.min(100, Math.round(num)));
}

function parseDateStr(dateStr?: string): string | null {
  if (!dateStr || typeof dateStr !== "string") return null;
  const slice = dateStr.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(slice)) {
    const parsed = new Date(dateStr);
    if (isNaN(parsed.getTime())) return null;
    return parsed.toISOString().slice(0, 10);
  }
  const d = new Date(slice + "T00:00:00Z");
  if (isNaN(d.getTime())) return null;
  return slice;
}

function getDaysBetween(fromYYYYMMDD: string, toYYYYMMDD: string): number {
  const from = new Date(fromYYYYMMDD + "T00:00:00Z");
  const to = new Date(toYYYYMMDD + "T00:00:00Z");
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function classifyScore(score: number, thresholds: MasteryThresholds): MasteryClassification {
  if (score < thresholds.weakMax) return "weak";
  if (score < thresholds.strongMin) return "developing";
  return "strong";
}

function getShortDayLabel(yyyyMmDd: string): string {
  try {
    const d = new Date(yyyyMmDd + "T00:00:00Z");
    const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return names[d.getUTCDay()] || yyyyMmDd.slice(5);
  } catch {
    return yyyyMmDd.slice(5);
  }
}

function addDays(yyyyMmDd: string, delta: number): string {
  const d = new Date(yyyyMmDd + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export function computeLearningAnalytics(context: AnalyticsEngineContext) {
  const subjects = Array.isArray(context.subjects) ? context.subjects.filter(Boolean) : [];
  const tasks = Array.isArray(context.tasks) ? context.tasks.filter(Boolean) : [];
  const assignments = Array.isArray(context.assignments) ? context.assignments.filter(Boolean) : [];
  const exams = Array.isArray(context.exams) ? context.exams.filter(Boolean) : [];
  const focusSessions = Array.isArray(context.focusSessions) ? context.focusSessions.filter(Boolean) : [];
  const rawQuizScores = Array.isArray(context.quizScores) ? context.quizScores.filter(Boolean) : [];
  const plannedBlocks = Array.isArray(context.plannedBlocks) ? context.plannedBlocks.filter(Boolean) : [];

  const todayStr = parseDateStr(context.referenceDate) || new Date().toISOString().slice(0, 10);

  const thresholds: MasteryThresholds = {
    weakMax:
      typeof context.thresholds?.weakMax === "number"
        ? Math.max(0, Math.min(100, context.thresholds.weakMax))
        : DEFAULT_THRESHOLDS.weakMax,
    strongMin:
      typeof context.thresholds?.strongMin === "number"
        ? Math.max(0, Math.min(100, context.thresholds.strongMin))
        : DEFAULT_THRESHOLDS.strongMin,
  };

  // Normalize Readiness Weights so custom configs always sum cleanly to 1.0 across positive weights
  const rawW = {
    assessedTopicMasteryWeight: Math.max(0, context.readinessConfig?.assessedTopicMasteryWeight ?? DEFAULT_EXAM_READINESS_CONFIG.assessedTopicMasteryWeight),
    syllabusCompletionWeight: Math.max(0, context.readinessConfig?.syllabusCompletionWeight ?? DEFAULT_EXAM_READINESS_CONFIG.syllabusCompletionWeight),
    focusConsistencyWeight: Math.max(0, context.readinessConfig?.focusConsistencyWeight ?? DEFAULT_EXAM_READINESS_CONFIG.focusConsistencyWeight),
    weakTopicPenaltyPerTopic: Math.max(0, context.readinessConfig?.weakTopicPenaltyPerTopic ?? DEFAULT_EXAM_READINESS_CONFIG.weakTopicPenaltyPerTopic),
  };
  const weightSum = rawW.assessedTopicMasteryWeight + rawW.syllabusCompletionWeight + rawW.focusConsistencyWeight;
  const readinessConfigUsed: ExamReadinessConfig =
    weightSum > 0
      ? {
          assessedTopicMasteryWeight: Number((rawW.assessedTopicMasteryWeight / weightSum).toFixed(4)),
          syllabusCompletionWeight: Number((rawW.syllabusCompletionWeight / weightSum).toFixed(4)),
          focusConsistencyWeight: Number((rawW.focusConsistencyWeight / weightSum).toFixed(4)),
          weakTopicPenaltyPerTopic: rawW.weakTopicPenaltyPerTopic,
        }
      : { ...DEFAULT_EXAM_READINESS_CONFIG };

  // 1. Reuse Day 1 Weakness Detection Engine
  const weaknessResult = analyzeWeaknesses({
    subjects,
    tasks,
    exams,
    focusSessions,
    quizScores: rawQuizScores,
    thresholds,
  });

  // 2. Sanitize and sort valid chronological quiz records
  interface ValidQuizRecord {
    id: string;
    subjectId: string;
    subjectName: string;
    topic: string;
    score: number;
    date: string;
    originalIndex: number;
  }

  const subjectNameById = new Map<string, string>();
  subjects.forEach((s) => {
    if (s.id && s.name) {
      subjectNameById.set(s.id, s.name);
    }
  });

  const validQuizzes: ValidQuizRecord[] = [];
  rawQuizScores.forEach((q, idx) => {
    const score = clampScore(q.score);
    if (score === null || !q.topic || !q.topic.trim()) return;
    const parsedDate = parseDateStr(q.date) || todayStr;
    validQuizzes.push({
      id: q.id || `quiz-${idx}`,
      subjectId: q.subjectId || "",
      subjectName: q.subjectName || subjectNameById.get(q.subjectId || "") || "General",
      topic: q.topic.trim(),
      score,
      date: parsedDate,
      originalIndex: idx,
    });
  });

  // Sort chronologically by date ascending, preserving original sequence for same-date items
  validQuizzes.sort((a, b) => {
    const cmp = a.date.localeCompare(b.date);
    if (cmp !== 0) return cmp;
    return a.originalIndex - b.originalIndex;
  });

  const quizTrends = validQuizzes.map((q, idx) => ({
    id: q.id,
    date: q.date,
    timestampLabel: q.date,
    subjectId: q.subjectId,
    subjectName: q.subjectName,
    topic: q.topic,
    score: q.score,
    attemptIndex: idx + 1,
  }));

  // 3. Section A: Learning Overview Metrics (strictly from real recorded activity)
  const totalRecordedStudyMinutes = focusSessions.reduce(
    (sum, s) => sum + Math.max(0, Number(s.durationMinutes) || 0),
    0
  );
  const totalRecordedStudyHours = Number((totalRecordedStudyMinutes / 60).toFixed(2));
  const totalCompletedFocusSessions = focusSessions.length;

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : null;

  const totalQuizAttempts = validQuizzes.length;
  const averageQuizPerformance =
    totalQuizAttempts > 0
      ? Math.round(validQuizzes.reduce((sum, q) => sum + q.score, 0) / totalQuizAttempts)
      : null;

  const hasAnyActivity =
    subjects.length > 0 ||
    totalCompletedFocusSessions > 0 ||
    totalTasks > 0 ||
    totalQuizAttempts > 0 ||
    plannedBlocks.length > 0 ||
    exams.length > 0;

  const overview = {
    totalRecordedStudyMinutes,
    totalRecordedStudyHours,
    totalCompletedFocusSessions,
    totalTasks,
    completedTasks,
    taskCompletionRate,
    totalQuizAttempts,
    averageQuizPerformance,
    totalTopicsTracked: weaknessResult.summary.totalAnalyzed,
    masteredTopicsCount: weaknessResult.summary.strongCount,
    developingTopicsCount: weaknessResult.summary.developingCount,
    weakTopicsCount: weaknessResult.summary.weakCount,
    unknownEvidenceTopicsCount: weaknessResult.summary.unknownCount,
    hasAnyActivity,
  };

  // 4. Section B: Subject-Wise Performance Analysis
  // Strictly separate measured quiz average from syllabus completion
  const subjectPerformance = subjects.map((subj) => {
    const subjId = subj.id;
    const subjName = subj.name || "Untitled Subject";
    const normSubjName = normalizeKey(subjName);
    const subjTopics = Array.isArray(subj.topics) ? subj.topics : [];
    const totalTopics = subjTopics.length;
    const completedTopicsCount = subjTopics.filter((t) => Boolean(t.completed)).length;
    const syllabusProgressPercent =
      totalTopics > 0 ? Math.round((completedTopicsCount / totalTopics) * 100) : subj.progress ?? 0;

    // Topic mastery distribution from Day 1 Weakness Engine for this subject
    const subjWeakItems = weaknessResult.topics.filter(
      (item) => item.subjectId === subjId || normalizeKey(item.subjectName) === normSubjName
    );

    const masteryDistribution = {
      strong: subjWeakItems.filter((i) => i.masteryClassification === "strong").length,
      developing: subjWeakItems.filter((i) => i.masteryClassification === "developing").length,
      weak: subjWeakItems.filter((i) => i.masteryClassification === "weak").length,
      unknown: subjWeakItems.filter((i) => i.masteryClassification === "unknown").length,
    };

    const assessedTopicsCount = subjWeakItems.filter((i) => i.evidenceSource === "measured_quiz").length;

    // Measured quiz scores belonging to this subject
    const topicSet = new Set(subjTopics.map((t) => normalizeKey(t.title)));
    const subjQuizzes = validQuizzes.filter(
      (q) =>
        (q.subjectId && q.subjectId === subjId) ||
        normalizeKey(q.subjectName) === normSubjName ||
        topicSet.has(normalizeKey(q.topic))
    );

    const averageMeasuredQuizScore =
      subjQuizzes.length > 0
        ? Math.round(subjQuizzes.reduce((sum, q) => sum + q.score, 0) / subjQuizzes.length)
        : null;

    // Tasks + Assignments activities for this subject
    const subjTasks = tasks.filter(
      (t) => t.subjectId === subjId || normalizeKey(t.subjectName) === normSubjName
    );
    const subjAssignments = assignments.filter(
      (a) => a.subjectId === subjId || normalizeKey(a.subjectName) === normSubjName
    );

    const completedActivitiesCount =
      subjTasks.filter((t) => t.status === "completed").length +
      subjAssignments.filter((a) => a.status === "completed").length;

    const pendingActivitiesCount =
      subjTasks.filter((t) => t.status !== "completed").length +
      subjAssignments.filter((a) => a.status !== "completed").length;

    // Actual recorded study minutes from focusSessions (strictly real sessions)
    const subjSessions = focusSessions.filter(
      (s) => s.subjectId === subjId || normalizeKey(s.subjectName) === normSubjName
    );
    const recordedStudyMinutes = subjSessions.reduce(
      (sum, s) => sum + Math.max(0, Number(s.durationMinutes) || 0),
      0
    );

    return {
      subjectId: subjId,
      subjectName: subjName,
      subjectCode: (subj as any).code,
      color: (subj as any).color || "indigo",
      totalTopics,
      assessedTopicsCount,
      completedTopicsCount,
      syllabusProgressPercent,
      averageMeasuredQuizScore,
      quizAttemptsCount: subjQuizzes.length,
      masteryDistribution,
      completedActivitiesCount,
      pendingActivitiesCount,
      recordedStudyMinutes,
      recordedStudyHours: Number((recordedStudyMinutes / 60).toFixed(2)),
    };
  });

  // 5. Section E: Study Consistency Analytics
  // Strictly separate planned study blocks from actual recorded focusSessions!
  const plannedSessionsCount = plannedBlocks.length;
  const completedPlannedSessionsCount = plannedBlocks.filter((b) => b.status === "completed").length;
  const missedPlannedSessionsCount = plannedBlocks.filter((b) => b.status === "missed").length;
  const pendingPlannedSessionsCount = plannedBlocks.filter(
    (b) => b.status !== "completed" && b.status !== "missed"
  ).length;
  const plannedCompletionPercentage =
    plannedSessionsCount > 0
      ? Math.round((completedPlannedSessionsCount / plannedSessionsCount) * 100)
      : null;

  const totalPlannedDurationMinutes = plannedBlocks.reduce(
    (sum, b) => sum + Math.max(0, Number(b.durationMinutes) || 0),
    0
  );

  // Build 7-day daily activity window [today - 6 .. today]
  const last7Dates: string[] = [];
  for (let offset = -6; offset <= 0; offset++) {
    last7Dates.push(addDays(todayStr, offset));
  }

  const dailyMap = new Map<
    string,
    {
      actualRecordedMinutes: number;
      plannedMinutes: number;
      completedSessionsCount: number;
      missedSessionsCount: number;
    }
  >();
  for (const d of last7Dates) {
    dailyMap.set(d, {
      actualRecordedMinutes: 0,
      plannedMinutes: 0,
      completedSessionsCount: 0,
      missedSessionsCount: 0,
    });
  }

  let recent7DaysMinutes = 0;
  let previous7DaysMinutes = 0;

  for (const s of focusSessions) {
    const mins = Math.max(0, Number(s.durationMinutes) || 0);
    const sDate = parseDateStr(s.timestamp || (s as any).date);
    if (!sDate) continue;
    const daysDiff = getDaysBetween(sDate, todayStr);
    if (daysDiff >= 0 && daysDiff <= 6) {
      recent7DaysMinutes += mins;
      const bucket = dailyMap.get(sDate);
      if (bucket) {
        bucket.actualRecordedMinutes += mins;
      }
    } else if (daysDiff >= 7 && daysDiff <= 13) {
      previous7DaysMinutes += mins;
    }
  }

  for (const b of plannedBlocks) {
    const bDate =
      parseDateStr(b.scheduledDate) ||
      parseDateStr(b.completedAt) ||
      parseDateStr(b.missedAt) ||
      todayStr;
    const bucket = dailyMap.get(bDate);
    if (bucket) {
      bucket.plannedMinutes += Math.max(0, Number(b.durationMinutes) || 0);
      if (b.status === "completed") bucket.completedSessionsCount += 1;
      if (b.status === "missed") bucket.missedSessionsCount += 1;
    }
  }

  const dailyActivity = last7Dates.map((d) => {
    const entry = dailyMap.get(d)!;
    return {
      date: d,
      dayLabel: getShortDayLabel(d),
      actualRecordedMinutes: entry.actualRecordedMinutes,
      actualRecordedHours: Number((entry.actualRecordedMinutes / 60).toFixed(2)),
      plannedMinutes: entry.plannedMinutes,
      plannedHours: Number((entry.plannedMinutes / 60).toFixed(2)),
      completedSessionsCount: entry.completedSessionsCount,
      missedSessionsCount: entry.missedSessionsCount,
    };
  });

  const hasPreviousConsistencyData = previous7DaysMinutes > 0;
  const consistencyDeltaMinutes = hasPreviousConsistencyData
    ? recent7DaysMinutes - previous7DaysMinutes
    : null;

  const consistencyChangeSummary = {
    hasComparablePeriods: hasPreviousConsistencyData,
    recent7DaysMinutes,
    previous7DaysMinutes,
    deltaMinutes: consistencyDeltaMinutes,
    message: hasPreviousConsistencyData
      ? consistencyDeltaMinutes! >= 0
        ? `Recorded study time increased by ${consistencyDeltaMinutes} minutes over the previous 7-day period.`
        : `Recorded study time decreased by ${Math.abs(consistencyDeltaMinutes!)} minutes compared to the previous 7-day period.`
      : recent7DaysMinutes > 0
      ? `${recent7DaysMinutes} minutes recorded in the last 7 days; no prior 7-day baseline exists yet for comparison.`
      : "No recorded study sessions in the past 14 days to evaluate consistency trends.",
  };

  const studyConsistency = {
    plannedSessionsCount,
    completedPlannedSessionsCount,
    missedPlannedSessionsCount,
    pendingPlannedSessionsCount,
    plannedCompletionPercentage,
    totalPlannedDurationMinutes,
    actualRecordedSessionsCount: totalCompletedFocusSessions,
    totalActualRecordedMinutes: totalRecordedStudyMinutes,
    totalActualRecordedHours: totalRecordedStudyHours,
    dailyActivity,
    consistencyChangeSummary,
  };

  // 6. Section F: Explainable Exam Readiness Indicator
  const readinessDisclaimer =
    "Estimated readiness score based on available StudyPilot records — does not predict actual examination marks or guarantee passing probability.";

  const examReadiness = exams
    .map((exam) => {
      const parsedExamDate = parseDateStr(exam.date);
      const daysRemaining = parsedExamDate ? getDaysBetween(todayStr, parsedExamDate) : null;

      const matchedSubject = subjects.find(
        (s) => s.id === exam.subjectId || normalizeKey(s.name) === normalizeKey(exam.subjectName)
      );
      const subjPerf = subjectPerformance.find(
        (sp) => sp.subjectId === exam.subjectId || normalizeKey(sp.subjectName) === normalizeKey(exam.subjectName)
      );

      const subjWeakTopics = weaknessResult.topics.filter(
        (t) => t.subjectId === exam.subjectId || normalizeKey(t.subjectName) === normalizeKey(exam.subjectName)
      );

      const totalTopicsCount = matchedSubject?.topics?.length ?? subjWeakTopics.length;
      const completedTopicsCount = matchedSubject?.topics?.filter((t) => Boolean(t.completed)).length ?? 0;
      const remainingTopicsCount = Math.max(0, totalTopicsCount - completedTopicsCount);

      const assessedTopicsCount = subjWeakTopics.filter((t) => t.evidenceSource === "measured_quiz").length;
      const weakTopics = subjWeakTopics.filter((t) => t.masteryClassification === "weak");
      const unassessedTopics = subjWeakTopics.filter((t) => t.evidenceSource === "insufficient_data");

      const averageMeasuredQuizScore = subjPerf?.averageMeasuredQuizScore ?? null;
      const recordedStudyMinutes = subjPerf?.recordedStudyMinutes ?? 0;

      // Determine whether sufficient evidence exists to compute an estimated readiness score
      const hasSufficientData =
        assessedTopicsCount > 0 || (totalTopicsCount > 0 && (completedTopicsCount > 0 || recordedStudyMinutes > 0));

      let estimatedReadinessScore: number | null = null;
      let readinessStatus: "High Readiness" | "Moderate Readiness" | "Needs Attention" | "Insufficient Data" =
        "Insufficient Data";
      const supportingEvidence: string[] = [];

      if (hasSufficientData) {
        const syllabusCompletionPct =
          totalTopicsCount > 0 ? (completedTopicsCount / totalTopicsCount) * 100 : 0;
        const targetFocusMins = Math.max(60, ((exam as any).targetHours || matchedSubject?.targetHours || 4) * 60);
        const focusPct = Math.min(100, (recordedStudyMinutes / targetFocusMins) * 100);

        let rawWeighted = 0;
        if (averageMeasuredQuizScore !== null && totalTopicsCount > 0) {
          rawWeighted =
            averageMeasuredQuizScore * readinessConfigUsed.assessedTopicMasteryWeight +
            syllabusCompletionPct * readinessConfigUsed.syllabusCompletionWeight +
            focusPct * readinessConfigUsed.focusConsistencyWeight;
        } else if (averageMeasuredQuizScore !== null) {
          // Quiz data exists, no syllabus topics configured
          const norm = readinessConfigUsed.assessedTopicMasteryWeight + readinessConfigUsed.focusConsistencyWeight || 1;
          rawWeighted =
            (averageMeasuredQuizScore * readinessConfigUsed.assessedTopicMasteryWeight +
              focusPct * readinessConfigUsed.focusConsistencyWeight) /
            norm;
        } else {
          // Syllabus / focus data exists, no measured quiz scores yet
          const norm = readinessConfigUsed.syllabusCompletionWeight + readinessConfigUsed.focusConsistencyWeight || 1;
          rawWeighted =
            (syllabusCompletionPct * readinessConfigUsed.syllabusCompletionWeight +
              focusPct * readinessConfigUsed.focusConsistencyWeight) /
            norm;
        }

        const weakPenalty = Math.min(25, weakTopics.length * readinessConfigUsed.weakTopicPenaltyPerTopic);
        estimatedReadinessScore = Math.max(0, Math.min(100, Math.round(rawWeighted - weakPenalty)));

        if (estimatedReadinessScore >= 75 && weakTopics.length === 0) {
          readinessStatus = "High Readiness";
        } else if (estimatedReadinessScore >= 50) {
          readinessStatus = "Moderate Readiness";
        } else {
          readinessStatus = "Needs Attention";
        }

        if (averageMeasuredQuizScore !== null) {
          supportingEvidence.push(
            `Measured quiz average: ${averageMeasuredQuizScore}% across ${assessedTopicsCount} assessed topic(s)`
          );
        } else {
          supportingEvidence.push("No measured quiz scores recorded yet for this subject");
        }
        if (totalTopicsCount > 0) {
          supportingEvidence.push(
            `Syllabus completion: ${completedTopicsCount}/${totalTopicsCount} topics completed (${remainingTopicsCount} remaining)`
          );
        }
        supportingEvidence.push(
          `Recorded focus study time: ${recordedStudyMinutes} mins logged`
        );
        if (weakTopics.length > 0) {
          supportingEvidence.push(
            `Weak topic penalty applied: -${weakPenalty} pts for ${weakTopics.length} weak topic(s)`
          );
        }
        if (daysRemaining !== null) {
          supportingEvidence.push(
            daysRemaining >= 0
              ? `Time remaining: ${daysRemaining} day(s) until exam date (${exam.date})`
              : `Exam date (${exam.date}) passed ${Math.abs(daysRemaining)} day(s) ago`
          );
        }
      } else {
        supportingEvidence.push("No quiz attempts, completed topics, or focus study sessions recorded for this exam subject yet.");
      }

      let suggestedNextAction = "Continue spaced revision across assessed topics.";
      if (!hasSufficientData) {
        suggestedNextAction = `Add syllabus topics for ${exam.subjectName} and take a baseline diagnostic quiz to evaluate readiness.`;
      } else if (weakTopics.length > 0) {
        suggestedNextAction = `Prioritize revising '${weakTopics[0].topic}' (${weakTopics[0].score}%) and take a practice quiz.`;
      } else if (unassessedTopics.length > 0) {
        suggestedNextAction = `Complete a diagnostic quiz on unassessed topic '${unassessedTopics[0].topic}'.`;
      } else if (remainingTopicsCount > 0) {
        suggestedNextAction = `Complete the remaining ${remainingTopicsCount} syllabus topic(s) before ${exam.date}.`;
      }

      return {
        examId: exam.id,
        examTitle: exam.title || `${exam.subjectName} Exam`,
        subjectId: exam.subjectId,
        subjectName: exam.subjectName || matchedSubject?.name || "Subject",
        examDate: exam.date,
        daysRemaining,
        estimatedReadinessScore,
        readinessStatus,
        hasSufficientData,
        assessedTopicsCount,
        totalTopicsCount,
        completedTopicsCount,
        remainingTopicsCount,
        weakTopicCount: weakTopics.length,
        weakTopicNames: weakTopics.map((w) => w.topic),
        unassessedTopicNames: unassessedTopics.map((u) => u.topic),
        averageMeasuredQuizScore,
        recordedStudyMinutes,
        supportingEvidence,
        suggestedNextAction,
        disclaimer: readinessDisclaimer,
      };
    })
    .sort((a, b) => {
      if (a.daysRemaining === null && b.daysRemaining === null) return 0;
      if (a.daysRemaining === null) return 1;
      if (b.daysRemaining === null) return -1;
      return a.daysRemaining - b.daysRemaining;
    });

  // 7. Section 4: Learning Improvement Evaluation
  // Group valid chronological quizzes by `${subjectId}:::${normTopic}` or `${normTopic}`
  const topicAttemptGroups = new Map<
    string,
    {
      topic: string;
      subjectId: string;
      subjectName: string;
      attempts: ValidQuizRecord[];
    }
  >();

  for (const q of validQuizzes) {
    const key = `${normalizeKey(q.subjectId || q.subjectName)}:::${normalizeKey(q.topic)}`;
    if (!topicAttemptGroups.has(key)) {
      topicAttemptGroups.set(key, {
        topic: q.topic,
        subjectId: q.subjectId,
        subjectName: q.subjectName,
        attempts: [],
      });
    }
    topicAttemptGroups.get(key)!.attempts.push(q);
  }

  const topicComparisons = Array.from(topicAttemptGroups.values()).map((group) => {
    const attempts = group.attempts;
    const first = attempts[0];
    const latest = attempts[attempts.length - 1];
    const attemptCount = attempts.length;
    const earlierMasteryTier = classifyScore(first.score, thresholds);
    const latestMasteryTier = classifyScore(latest.score, thresholds);

    if (attemptCount < 2) {
      return {
        topic: group.topic,
        subjectId: group.subjectId,
        subjectName: group.subjectName,
        attemptCount,
        hasComparableHistory: false,
        firstScore: first.score,
        firstDate: first.date,
        latestScore: latest.score,
        latestDate: latest.date,
        absoluteImprovementPoints: null,
        relativePercentageChange: null,
        earlierMasteryTier,
        latestMasteryTier,
        trendDirection: "insufficient_history" as const,
        explanation: `Only 1 attempt recorded (${first.score}% on ${first.date}). At least 2 attempts are needed to establish a trend.`,
      };
    }

    const absoluteImprovementPoints = latest.score - first.score;
    const relativePercentageChange =
      first.score > 0
        ? Number((((latest.score - first.score) / first.score) * 100).toFixed(1))
        : null;

    const trendDirection: "improved" | "declined" | "unchanged" =
      absoluteImprovementPoints > 0
        ? "improved"
        : absoluteImprovementPoints < 0
        ? "declined"
        : "unchanged";

    const ptsSign = absoluteImprovementPoints > 0 ? "+" : "";
    const relText =
      relativePercentageChange !== null
        ? ` (${relativePercentageChange > 0 ? "+" : ""}${relativePercentageChange}% relative change)`
        : "";
    const tierShift =
      earlierMasteryTier !== latestMasteryTier
        ? ` Mastery shifted from ${earlierMasteryTier} to ${latestMasteryTier}.`
        : "";

    return {
      topic: group.topic,
      subjectId: group.subjectId,
      subjectName: group.subjectName,
      attemptCount,
      hasComparableHistory: true,
      firstScore: first.score,
      firstDate: first.date,
      latestScore: latest.score,
      latestDate: latest.date,
      absoluteImprovementPoints,
      relativePercentageChange,
      earlierMasteryTier,
      latestMasteryTier,
      trendDirection,
      explanation: `First attempt ${first.score}% (${first.date}) vs latest ${latest.score}% (${latest.date}): ${ptsSign}${absoluteImprovementPoints} percentage points${relText}.${tierShift}`,
    };
  });

  // Sort comparable improved/declined topics first
  topicComparisons.sort((a, b) => {
    if (a.hasComparableHistory !== b.hasComparableHistory) {
      return a.hasComparableHistory ? -1 : 1;
    }
    return Math.abs(b.absoluteImprovementPoints ?? 0) - Math.abs(a.absoluteImprovementPoints ?? 0);
  });

  // Earlier vs Later Assessment Period Comparison (chronological split when >= 2 quizzes exist)
  let periodComparison = {
    hasComparablePeriods: false,
    earlierPeriodLabel: "Earlier Assessments",
    laterPeriodLabel: "Recent Assessments",
    earlierPeriodAvg: null as number | null,
    laterPeriodAvg: null as number | null,
    earlierCount: 0,
    laterCount: 0,
    absoluteChangePoints: null as number | null,
    relativePercentageChange: null as number | null,
    explanation: "At least 2 recorded quiz attempts are required to compare earlier vs later assessment periods.",
  };

  if (validQuizzes.length >= 2) {
    const mid = Math.floor(validQuizzes.length / 2);
    const earlierSlice = validQuizzes.slice(0, mid);
    const laterSlice = validQuizzes.slice(mid);
    const earlierAvg = Number(
      (earlierSlice.reduce((s, q) => s + q.score, 0) / earlierSlice.length).toFixed(1)
    );
    const laterAvg = Number(
      (laterSlice.reduce((s, q) => s + q.score, 0) / laterSlice.length).toFixed(1)
    );
    const deltaPts = Number((laterAvg - earlierAvg).toFixed(1));
    const relChange =
      earlierAvg > 0 ? Number((((laterAvg - earlierAvg) / earlierAvg) * 100).toFixed(1)) : null;

    periodComparison = {
      hasComparablePeriods: true,
      earlierPeriodLabel: `${earlierSlice[0].date} to ${earlierSlice[earlierSlice.length - 1].date}`,
      laterPeriodLabel: `${laterSlice[0].date} to ${laterSlice[laterSlice.length - 1].date}`,
      earlierPeriodAvg: earlierAvg,
      laterPeriodAvg: laterAvg,
      earlierCount: earlierSlice.length,
      laterCount: laterSlice.length,
      absoluteChangePoints: deltaPts,
      relativePercentageChange: relChange,
      explanation: `Earlier period avg (${earlierAvg}% across ${earlierSlice.length} quiz(zes)) vs later period avg (${laterAvg}% across ${laterSlice.length} quiz(zes)): ${deltaPts > 0 ? "+" : ""}${deltaPts} percentage points.`,
    };
  }

  const improvedTopicsCount = topicComparisons.filter((c) => c.trendDirection === "improved").length;
  const declinedTopicsCount = topicComparisons.filter((c) => c.trendDirection === "declined").length;
  const singleAttemptTopicsCount = topicComparisons.filter((c) => !c.hasComparableHistory).length;

  // 8. Section 5: Integrated Day 3 + Day 4 Personalized Learning Insights
  const day3Insights = generatePersonalizedInsights({
    subjects,
    tasks,
    assignments,
    exams,
    focusSessions,
    quizScores: validQuizzes,
    previouslyMissedTopicNames: context.previouslyMissedTopicNames,
  });

  const mergedInsights: PersonalizedLearningInsight[] = [...day3Insights.insights];
  const seenInsightIds = new Set(mergedInsights.map((i) => i.id));

  // Additional Day 4 Analytics-specific insights:
  // a) Subject with multiple weak topics
  for (const sp of subjectPerformance) {
    if (sp.masteryDistribution.weak >= 2) {
      const id = `ins-multi-weak-${sp.subjectId}`;
      if (!seenInsightIds.has(id)) {
        seenInsightIds.add(id);
        mergedInsights.unshift({
          id,
          title: "Multiple Weak Topics in Subject",
          observation: `${sp.subjectName} currently has ${sp.masteryDistribution.weak} weak topics scoring below ${thresholds.weakMax}%.`,
          evidence: `${sp.masteryDistribution.weak} weak out of ${sp.assessedTopicsCount} assessed topics in ${sp.subjectName}.`,
          whyItMatters: "Concentrated weaknesses across multiple topics indicate foundational gaps within the same course.",
          action: `Schedule dedicated back-to-back revision blocks for ${sp.subjectName} in your Adaptive Planner.`,
          type: "urgent",
          category: "mastery",
          iconName: "AlertCircle",
          metric: `${sp.masteryDistribution.weak} Weak`,
        });
      }
    }
  }

  // b) Missed planned study sessions threshold alert
  if (missedPlannedSessionsCount >= 2 && !seenInsightIds.has("ins-missed-multiple")) {
    seenInsightIds.add("ins-missed-multiple");
    mergedInsights.push({
      id: "ins-missed-multiple",
      title: "Missed Planned Study Sessions",
      observation: `${missedPlannedSessionsCount} planned study session(s) were marked as missed (${plannedCompletionPercentage}% completion rate).`,
      evidence: `${completedPlannedSessionsCount} completed, ${missedPlannedSessionsCount} missed out of ${plannedSessionsCount} planned blocks.`,
      whyItMatters: "Repeatedly missing scheduled blocks lowers consistency and leaves weak topics unaddressed before deadlines.",
      action: "Reduce your daily available study hours in the Adaptive Planner to a realistic target and reschedule missed blocks.",
      type: "warning",
      category: "consistency",
      iconName: "Clock",
      metric: `${missedPlannedSessionsCount} Missed`,
    });
  }

  // c) Upcoming exam needing additional preparation
  const urgentLowReadinessExam = examReadiness.find(
    (e) =>
      e.daysRemaining !== null &&
      e.daysRemaining >= 0 &&
      e.daysRemaining <= 10 &&
      e.hasSufficientData &&
      e.estimatedReadinessScore !== null &&
      e.estimatedReadinessScore < 65
  );
  if (urgentLowReadinessExam && !seenInsightIds.has(`ins-exam-prep-${urgentLowReadinessExam.examId}`)) {
    seenInsightIds.add(`ins-exam-prep-${urgentLowReadinessExam.examId}`);
    mergedInsights.unshift({
      id: `ins-exam-prep-${urgentLowReadinessExam.examId}`,
      title: "Exam Preparation Gap Detected",
      observation: `'${urgentLowReadinessExam.examTitle}' is in ${urgentLowReadinessExam.daysRemaining} day(s) with an estimated readiness score of ${urgentLowReadinessExam.estimatedReadinessScore}%.`,
      evidence: urgentLowReadinessExam.supportingEvidence.slice(0, 2).join(" · "),
      whyItMatters: "Low syllabus completion or unaddressed weak topics close to an exam significantly increases last-minute workload.",
      action: urgentLowReadinessExam.suggestedNextAction,
      type: "urgent",
      category: "exam",
      iconName: "Flame",
      metric: `${urgentLowReadinessExam.estimatedReadinessScore}% Ready`,
    });
  }

  return {
    overview,
    subjectPerformance,
    topicMasteryHeatmap: weaknessResult.topics,
    quizTrends,
    studyConsistency,
    examReadiness,
    readinessConfigUsed,
    learningImprovement: {
      topicComparisons,
      periodComparison,
      improvedTopicsCount,
      declinedTopicsCount,
      singleAttemptTopicsCount,
    },
    insights: mergedInsights,
    aiExecutiveSummary: null as string | null,
    evaluatedAt: new Date().toISOString(),
    isFallback: false,
  };
}
