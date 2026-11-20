/**
 * StudyPilot 2.0 — Adaptive AI Study Planner & Intelligent Scheduling Engine
 * 
 * Deterministic, testable, explainable scheduling algorithm.
 * Generates personalized daily study plans factoring in:
 * - Day 1 topic weakness & quiz mastery
 * - Upcoming exam proximity
 * - Assignment & task deadlines
 * - Missed & completed study sessions
 * - Student's available study time limit (strictly non-overlapping, with breaks)
 */

import {
  analyzeWeaknesses,
  RawSubjectInput,
  RawQuizScoreInput,
  RawExamInput,
  RawTaskInput,
  RawFocusSessionInput,
} from "./weaknessDetector";

export type StudyBlockStatus = "pending" | "completed" | "missed";

export interface SchedulingWeights {
  topicWeaknessWeight: number; // default: 0.35 (35%)
  examUrgencyWeight: number;    // default: 0.30 (30%)
  deadlineUrgencyWeight: number; // default: 0.20 (20%)
  taskImportanceWeight: number;  // default: 0.15 (15%)
}

export const DEFAULT_SCHEDULING_WEIGHTS: SchedulingWeights = {
  topicWeaknessWeight: 0.35,
  examUrgencyWeight: 0.30,
  deadlineUrgencyWeight: 0.20,
  taskImportanceWeight: 0.15,
};

export interface SchedulingFactorBreakdown {
  weaknessScore: number;     // 0-100
  examUrgencyScore: number;  // 0-100
  deadlineScore: number;     // 0-100
  taskImportanceScore: number; // 0-100
  compositePriorityScore: number; // 0-100
}

export interface ScheduledStudyBlock {
  id: string;
  order: number;
  subjectId: string;
  subjectName: string;
  topic: string;
  durationMinutes: number;
  priority: "high" | "medium" | "low";
  type: string;
  objective: string;
  reason: string;
  canStartNow: boolean;
  recommendedActivity: string;
  startTime: string;
  endTime: string;
  breakAfterMinutes: number;
  status: StudyBlockStatus;
  evidenceSource: string;
  factors: SchedulingFactorBreakdown;
  completedAt?: string;
  missedAt?: string;
  isRescheduled?: boolean;
}

export interface RawAssignmentInput {
  id: string;
  title: string;
  subjectId: string;
  subjectName: string;
  dueDate: string; // YYYY-MM-DD
  priority?: "low" | "medium" | "high";
  status?: "pending" | "in_progress" | "completed";
}

export interface AdaptivePlannerContext {
  subjects?: RawSubjectInput[];
  tasks?: RawTaskInput[];
  assignments?: RawAssignmentInput[];
  exams?: RawExamInput[];
  focusSessions?: RawFocusSessionInput[];
  quizScores?: RawQuizScoreInput[];
  availableStudyHours?: number; // e.g. 2.0 or 3.0
  availableStudyMinutes?: number; // alternative e.g. 120
  weights?: Partial<SchedulingWeights>;
  startTime?: string; // e.g. "02:00 PM" or "14:00"
  previouslyMissedTopicNames?: string[];
  currentPlanBlocks?: ScheduledStudyBlock[];
}

export interface AdaptivePlanResult {
  availableStudyHours: number;
  availableStudyMinutes: number;
  allocatedStudyMinutes: number;
  breakMinutesTotal: number;
  totalPlannedMinutes: number;
  blocks: ScheduledStudyBlock[];
  weightsUsed: SchedulingWeights;
  upcomingExams: Array<{
    id: string;
    title: string;
    subjectId: string;
    subjectName: string;
    daysLeft: number;
    prep: number;
  }>;
  fiveDayForecast: Array<{
    day: string;
    date: string;
    targetHours: number;
    primaryFocus: string;
    status: string;
  }>;
  aiStrategyGuidance: string;
  generatedAt: string;
  isFallback?: boolean;
}

/**
 * Normalizes date to days difference from today.
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
 * Formats minutes from a base time into standard 12-hour AM/PM format
 */
function formatTime(totalMinutesFromMidnight: number): string {
  const norm = ((totalMinutesFromMidnight % 1440) + 1440) % 1440;
  const hours24 = Math.floor(norm / 60);
  const minutes = norm % 60;
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const minStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
  return `${hours12}:${minStr} ${period}`;
}

/**
 * Parses a string time like "02:00 PM" or "14:00" into minutes from midnight
 */
function parseStartTimeToMinutes(timeStr?: string): number {
  if (!timeStr) return 14 * 60; // Default 02:00 PM (840 mins)

  const clean = timeStr.trim().toUpperCase();
  const match12 = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (match12) {
    let h = parseInt(match12[1], 10);
    const m = parseInt(match12[2], 10);
    const p = match12[3];
    if (p === "PM" && h < 12) h += 12;
    if (p === "AM" && h === 12) h = 0;
    return h * 60 + m;
  }

  const match24 = clean.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const h = parseInt(match24[1], 10);
    const m = parseInt(match24[2], 10);
    return Math.min(1439, Math.max(0, h * 60 + m));
  }

  return 14 * 60; // 02:00 PM fallback
}

/**
 * Normalizes user-specified weights so they sum to 1.0
 */
function normalizeWeights(raw?: Partial<SchedulingWeights>): SchedulingWeights {
  const w = {
    topicWeaknessWeight: typeof raw?.topicWeaknessWeight === "number" ? Math.max(0, raw.topicWeaknessWeight) : DEFAULT_SCHEDULING_WEIGHTS.topicWeaknessWeight,
    examUrgencyWeight: typeof raw?.examUrgencyWeight === "number" ? Math.max(0, raw.examUrgencyWeight) : DEFAULT_SCHEDULING_WEIGHTS.examUrgencyWeight,
    deadlineUrgencyWeight: typeof raw?.deadlineUrgencyWeight === "number" ? Math.max(0, raw.deadlineUrgencyWeight) : DEFAULT_SCHEDULING_WEIGHTS.deadlineUrgencyWeight,
    taskImportanceWeight: typeof raw?.taskImportanceWeight === "number" ? Math.max(0, raw.taskImportanceWeight) : DEFAULT_SCHEDULING_WEIGHTS.taskImportanceWeight,
  };
  const sum = w.topicWeaknessWeight + w.examUrgencyWeight + w.deadlineUrgencyWeight + w.taskImportanceWeight;
  if (sum <= 0) return DEFAULT_SCHEDULING_WEIGHTS;
  return {
    topicWeaknessWeight: Number((w.topicWeaknessWeight / sum).toFixed(4)),
    examUrgencyWeight: Number((w.examUrgencyWeight / sum).toFixed(4)),
    deadlineUrgencyWeight: Number((w.deadlineUrgencyWeight / sum).toFixed(4)),
    taskImportanceWeight: Number((w.taskImportanceWeight / sum).toFixed(4)),
  };
}

interface CandidateActivity {
  candidateKey: string; // unique key e.g. "sub-1:::topic-name"
  subjectId: string;
  subjectName: string;
  topic: string;
  activityType: string;
  recommendedActivity: string;
  objective: string;
  factors: SchedulingFactorBreakdown;
  priority: "high" | "medium" | "low";
  evidenceSource: string;
  explanation: string;
  suggestedDuration: number;
}

/**
 * Core Adaptive Scheduling Algorithm
 */
export function generateAdaptivePlan(context: AdaptivePlannerContext): AdaptivePlanResult {
  const subjects = Array.isArray(context.subjects) ? context.subjects : [];
  const tasks = Array.isArray(context.tasks) ? context.tasks : [];
  const assignments = Array.isArray(context.assignments) ? context.assignments : [];
  const exams = Array.isArray(context.exams) ? context.exams : [];
  const focusSessions = Array.isArray(context.focusSessions) ? context.focusSessions : [];
  const quizScores = Array.isArray(context.quizScores) ? context.quizScores : [];
  const missedTopics = new Set((context.previouslyMissedTopicNames || []).map((t) => t.toLowerCase().trim()));

  // Available study time resolution (strictly positive)
  let totalAvailableMinutes = 180; // default 3.0 hours
  if (typeof context.availableStudyMinutes === "number" && context.availableStudyMinutes > 0) {
    totalAvailableMinutes = Math.round(context.availableStudyMinutes);
  } else if (typeof context.availableStudyHours === "number" && context.availableStudyHours > 0) {
    totalAvailableMinutes = Math.round(context.availableStudyHours * 60);
  }
  totalAvailableMinutes = Math.max(15, Math.min(960, totalAvailableMinutes)); // Clamp 15 min to 16 hours
  const totalAvailableHours = Number((totalAvailableMinutes / 60).toFixed(1));

  const weights = normalizeWeights(context.weights);

  // If no subjects exist, return structured clean empty plan with actionable guidance
  if (subjects.length === 0) {
    return {
      availableStudyHours: totalAvailableHours,
      availableStudyMinutes: totalAvailableMinutes,
      allocatedStudyMinutes: 0,
      breakMinutesTotal: 0,
      totalPlannedMinutes: 0,
      blocks: [],
      weightsUsed: weights,
      upcomingExams: [],
      fiveDayForecast: [],
      aiStrategyGuidance: "No subjects configured in workspace yet. Add your courses and topics in the Subjects tab to generate your adaptive study schedule.",
      generatedAt: new Date().toISOString(),
      isFallback: false,
    };
  }

  // 1. Leverage Day 1 Weakness Detection Engine for topic-level mastery
  const weaknessResult = analyzeWeaknesses({
    subjects,
    tasks,
    exams,
    focusSessions,
    quizScores,
  });

  const weaknessMap = new Map<string, typeof weaknessResult.topics[0]>();
  for (const t of weaknessResult.topics) {
    weaknessMap.set(`${t.subjectId}:::${t.topic.toLowerCase().trim()}`, t);
    weaknessMap.set(t.topic.toLowerCase().trim(), t);
  }

  // Pre-calculate nearest exam per subject and topic
  interface ExamInfo {
    title: string;
    daysUntil: number;
    subjectId: string;
  }
  const examMap = new Map<string, ExamInfo>();
  const upcomingExamsList: Array<{ id: string; title: string; subjectId: string; subjectName: string; daysLeft: number; prep: number }> = [];

  for (const ex of exams) {
    if (!ex || !ex.date) continue;
    const days = getDaysUntil(ex.date);
    if (days === null || days < 0) continue; // Skip invalid or past exams

    const info: ExamInfo = {
      title: ex.title || "Exam",
      daysUntil: days,
      subjectId: ex.subjectId || "",
    };

    upcomingExamsList.push({
      id: ex.id,
      title: ex.title,
      subjectId: ex.subjectId || "",
      subjectName: ex.subjectName || "Subject",
      daysLeft: days,
      prep: ex.preparationPercentage || 50,
    });

    if (ex.subjectId) {
      const cur = examMap.get(ex.subjectId);
      if (!cur || days < cur.daysUntil) examMap.set(ex.subjectId, info);
    }
    if (Array.isArray(ex.topicsCovered)) {
      for (const t of ex.topicsCovered) {
        const norm = t.toLowerCase().trim();
        const cur = examMap.get(norm);
        if (!cur || days < cur.daysUntil) examMap.set(norm, info);
      }
    }
  }

  upcomingExamsList.sort((a, b) => a.daysLeft - b.daysLeft);

  // Pre-calculate assignments and task deadlines per subject / topic
  // Map key: normTopic or subjectId -> earliest days until deadline
  const deadlineMap = new Map<string, { daysUntil: number; title: string; priority: string; isAssignment: boolean }>();

  // Process Assignments
  for (const a of assignments) {
    if (!a || a.status === "completed" || !a.dueDate) continue;
    const days = getDaysUntil(a.dueDate);
    if (days === null) continue;

    const item = {
      daysUntil: days,
      title: a.title,
      priority: a.priority || "medium",
      isAssignment: true,
    };

    if (a.subjectId) {
      const cur = deadlineMap.get(a.subjectId);
      if (!cur || days < cur.daysUntil) deadlineMap.set(a.subjectId, item);
    }
  }

  // Process Tasks (Completed tasks MUST NOT be scheduled again)
  const completedTaskTopics = new Set<string>();
  for (const t of tasks) {
    if (!t) continue;
    const norm = (t.topic || t.title || "").toLowerCase().trim();
    if (t.status === "completed") {
      completedTaskTopics.add(norm);
      continue;
    }

    if (t.date) {
      const days = getDaysUntil(t.date);
      if (days !== null) {
        const item = {
          daysUntil: days,
          title: t.title,
          priority: t.priority || "medium",
          isAssignment: false,
        };
        if (norm) {
          const cur = deadlineMap.get(norm);
          if (!cur || days < cur.daysUntil) deadlineMap.set(norm, item);
        }
        if (t.subjectId) {
          const cur = deadlineMap.get(t.subjectId);
          if (!cur || days < cur.daysUntil) deadlineMap.set(t.subjectId, item);
        }
      }
    }
  }

  // 2. Build Candidate Activities from actual subjects & syllabus topics
  const candidates: CandidateActivity[] = [];
  const seenCandidateKeys = new Set<string>();

  for (const subject of subjects) {
    if (!subject) continue;
    const topics = Array.isArray(subject.topics) && subject.topics.length > 0
      ? subject.topics
      : [{ id: `${subject.id}-core`, title: `${subject.name} Core Fundamentals`, completed: false }];

    for (const topic of topics) {
      if (!topic || !topic.title) continue;
      const topicTitle = topic.title.trim();
      const normTopic = topicTitle.toLowerCase().trim();
      const candidateKey = `${subject.id}:::${normTopic}`;

      if (seenCandidateKeys.has(candidateKey)) continue;
      seenCandidateKeys.add(candidateKey);

      // Rule: If task explicitly completed and topic is already marked completed, don't re-schedule unless weak
      const isWeaknessItem = weaknessMap.get(candidateKey) || weaknessMap.get(normTopic);
      const isWeak = isWeaknessItem?.masteryClassification === "weak";
      if (topic.completed && completedTaskTopics.has(normTopic) && !isWeak) {
        continue; // Skip fully mastered, completed activity
      }

      // Calculate Factor 1: Topic Weakness Score (0 - 100)
      let weaknessScore = 30; // baseline
      let evidenceSource = "No quiz taken yet";
      let recActivity = "Concept Review & Problem Solving";
      let activityType = "Deep Focus";

      if (isWeaknessItem) {
        if (isWeaknessItem.masteryClassification === "weak") {
          const qScore = isWeaknessItem.quizScore ?? 35;
          weaknessScore = Math.min(100, Math.max(80, 100 - qScore));
          evidenceSource = `Day 1 Weakness Engine: ${qScore}% measured quiz (<${isWeaknessItem.label}>)`;
          recActivity = "Concept Foundation & Diagnostic Re-test";
          activityType = "Active Recall & Re-test";
        } else if (isWeaknessItem.masteryClassification === "developing") {
          const qScore = isWeaknessItem.quizScore ?? 60;
          weaknessScore = Math.min(75, Math.max(50, 75 - qScore + 40));
          evidenceSource = `Day 1 Weakness Engine: ${qScore}% measured quiz (Developing)`;
          recActivity = "Targeted Problem Practice";
          activityType = "Problem Solving";
        } else if (isWeaknessItem.masteryClassification === "unknown") {
          weaknessScore = 65; // Needs diagnostic baseline quiz
          evidenceSource = "Day 1 Weakness Engine: Awaiting baseline quiz";
          recActivity = "Diagnostic Practice Quiz";
          activityType = "Quiz Assessment";
        } else {
          // Strong
          weaknessScore = 20;
          evidenceSource = `Day 1 Weakness Engine: ${isWeaknessItem.quizScore}% (Strong mastery)`;
          recActivity = "Spaced Recall Flashcards";
          activityType = "Spaced Retention";
        }
      }

      // Calculate Factor 2: Exam Urgency Score (0 - 100)
      let examUrgencyScore = 0;
      const nearestExam = examMap.get(normTopic) || examMap.get(subject.id);
      if (nearestExam) {
        const days = nearestExam.daysUntil;
        if (days <= 1) examUrgencyScore = 100;
        else if (days <= 3) examUrgencyScore = 95;
        else if (days <= 7) examUrgencyScore = 80;
        else if (days <= 14) examUrgencyScore = 55;
        else if (days <= 30) examUrgencyScore = 30;
        else examUrgencyScore = 15;
      }

      // Calculate Factor 3: Deadline / Assignment Urgency Score (0 - 100)
      let deadlineScore = 10;
      const nearestDeadline = deadlineMap.get(normTopic) || deadlineMap.get(subject.id);
      if (nearestDeadline) {
        const days = nearestDeadline.daysUntil;
        if (days < 0) deadlineScore = 100; // Overdue!
        else if (days === 0) deadlineScore = 95; // Due today
        else if (days === 1) deadlineScore = 90; // Due tomorrow
        else if (days <= 3) deadlineScore = 75;
        else if (days <= 7) deadlineScore = 50;
        else deadlineScore = 25;
      }

      // Calculate Factor 4: Task Importance & Missed Session Recency (0 - 100)
      let taskImportanceScore = 40; // baseline
      if (missedTopics.has(normTopic)) {
        taskImportanceScore = 95; // Unfinished work boost
      } else if (nearestExam && nearestExam.daysUntil <= 3) {
        taskImportanceScore = 90; // Critical exam approaching within 3 days
      } else if (nearestExam && nearestExam.daysUntil <= 7) {
        taskImportanceScore = 75; // Approaching exam within 7 days
      } else if (topic.weightageLevel === "high" || (topic.weightage && topic.weightage >= 25)) {
        taskImportanceScore = 85;
      } else if (nearestDeadline?.priority === "high") {
        taskImportanceScore = 80;
      } else if (nearestDeadline?.priority === "low") {
        taskImportanceScore = 25;
      }

      // Composite Priority Formula (Normalized)
      const compositePriorityScore = Math.round(
        weaknessScore * weights.topicWeaknessWeight +
        examUrgencyScore * weights.examUrgencyWeight +
        deadlineScore * weights.deadlineUrgencyWeight +
        taskImportanceScore * weights.taskImportanceWeight
      );

      // Priority tier: High priority if composite >= 60 or (urgent exam and weak/developing topic)
      const isUrgentWeakCombo = examUrgencyScore >= 80 && weaknessScore >= 65;
      const priority: "high" | "medium" | "low" =
        (compositePriorityScore >= 60 || isUrgentWeakCombo)
          ? "high"
          : compositePriorityScore >= 38
          ? "medium"
          : "low";

      // Formulate Transparent Explanation
      const reasons: string[] = [];
      if (isWeaknessItem?.masteryClassification === "weak") {
        reasons.push(`Weak topic mastery (${isWeaknessItem.quizScore ?? 42}% quiz)`);
      }
      if (nearestExam && nearestExam.daysUntil <= 7) {
        reasons.push(`'${nearestExam.title}' in ${nearestExam.daysUntil}d`);
      }
      if (nearestDeadline && nearestDeadline.daysUntil <= 2) {
        reasons.push(`${nearestDeadline.isAssignment ? "Assignment" : "Task"} due ${nearestDeadline.daysUntil === 0 ? "today" : "tomorrow"}`);
      }
      if (missedTopics.has(normTopic)) {
        reasons.push("Carried forward from missed session");
      }

      const explanation = reasons.length > 0
        ? reasons.join(" • ")
        : `Routine structured syllabus coverage for ${subject.name}`;

      const objective = `Focus on ${topicTitle} (${subject.name}) with targeted ${recActivity.toLowerCase()}.`;

      candidates.push({
        candidateKey,
        subjectId: subject.id,
        subjectName: subject.name,
        topic: topicTitle,
        activityType,
        recommendedActivity: recActivity,
        objective,
        factors: {
          weaknessScore,
          examUrgencyScore,
          deadlineScore,
          taskImportanceScore,
          compositePriorityScore,
        },
        priority,
        evidenceSource,
        explanation,
        suggestedDuration: 45,
      });
    }
  }

  // 3. Sort Candidates deterministically by Composite Priority Score
  candidates.sort((a, b) => {
    if (b.factors.compositePriorityScore !== a.factors.compositePriorityScore) {
      return b.factors.compositePriorityScore - a.factors.compositePriorityScore;
    }
    // Tie breaker 1: Weakness score
    if (b.factors.weaknessScore !== a.factors.weaknessScore) {
      return b.factors.weaknessScore - a.factors.weaknessScore;
    }
    // Tie breaker 2: Exam urgency
    return b.factors.examUrgencyScore - a.factors.examUrgencyScore;
  });

  // 4. Time Budgeting & Non-Overlapping Scheduling
  // Determine block size & rest break sizing based on available study time
  const blocks: ScheduledStudyBlock[] = [];
  let remainingBudget = totalAvailableMinutes;
  let currentClockMinutes = parseStartTimeToMinutes(context.startTime);
  let blockIndex = 1;

  // Decide ideal block duration
  let defaultBlockDuration = 45;
  let breakDuration = 10;

  if (totalAvailableMinutes <= 35) {
    // Short session e.g. 30m: 1 block of 25m or full time
    defaultBlockDuration = Math.max(15, totalAvailableMinutes);
    breakDuration = 0;
  } else if (totalAvailableMinutes <= 60) {
    defaultBlockDuration = 25;
    breakDuration = 5;
  } else if (totalAvailableMinutes <= 120) {
    defaultBlockDuration = 35;
    breakDuration = 5;
  } else {
    defaultBlockDuration = 45;
    breakDuration = 10;
  }

  let totalAllocatedStudyMinutes = 0;
  let totalBreakMinutes = 0;

  for (const candidate of candidates) {
    if (remainingBudget < 15) break; // Cannot schedule a block smaller than 15 mins

    // Determine duration for this block
    // If remaining budget is less than defaultBlockDuration, take all remaining budget
    let duration = Math.min(defaultBlockDuration, remainingBudget);

    // If only one candidate or last possible block with small remainder, absorb remainder
    if (remainingBudget - duration < 15) {
      duration = remainingBudget;
    }

    const startStr = formatTime(currentClockMinutes);
    const endClock = currentClockMinutes + duration;
    const endStr = formatTime(endClock);

    // Break after block (only if remaining time allows another block after break)
    let appliedBreak = 0;
    if (remainingBudget - duration >= 15 + breakDuration) {
      appliedBreak = breakDuration;
    }

    blocks.push({
      id: `block-${candidate.subjectId}-${blockIndex}`,
      order: blockIndex,
      subjectId: candidate.subjectId,
      subjectName: candidate.subjectName,
      topic: candidate.topic,
      durationMinutes: duration,
      priority: candidate.priority,
      type: candidate.activityType,
      objective: candidate.objective,
      reason: candidate.explanation,
      canStartNow: blockIndex === 1,
      recommendedActivity: candidate.recommendedActivity,
      startTime: startStr,
      endTime: endStr,
      breakAfterMinutes: appliedBreak,
      status: "pending",
      evidenceSource: candidate.evidenceSource,
      factors: candidate.factors,
      isRescheduled: missedTopics.has(candidate.topic.toLowerCase().trim()),
    });

    totalAllocatedStudyMinutes += duration;
    totalBreakMinutes += appliedBreak;
    remainingBudget -= duration + appliedBreak;
    currentClockMinutes = endClock + appliedBreak;
    blockIndex++;
  }

  // Compose 5-Day Forecast
  const daysOfWeek = ["Today", "Tomorrow", "Day 3", "Day 4", "Day 5"];
  const fiveDayForecast = daysOfWeek.map((day, idx) => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + idx);
    const dateStr = targetDate.toISOString().split("T")[0];

    const leadTopic = candidates[idx % Math.max(1, candidates.length)]?.topic || "Core Syllabus Review";
    const leadSubject = candidates[idx % Math.max(1, candidates.length)]?.subjectName || "Active Courses";

    return {
      day,
      date: dateStr,
      targetHours: totalAvailableHours,
      primaryFocus: `${leadSubject}: ${leadTopic}`,
      status: idx === 0 ? "Active Plan" : "Projected",
    };
  });

  // Compose Strategic Guidance
  let aiStrategyGuidance = "";
  const topCandidate = candidates[0];
  if (topCandidate) {
    if (topCandidate.factors.examUrgencyScore >= 80) {
      aiStrategyGuidance = `Exam Readiness Sprint: Focus is front-loaded on '${topCandidate.topic}' in ${topCandidate.subjectName} due to approaching exam deadlines and topic weightage.`;
    } else if (topCandidate.factors.weaknessScore >= 80) {
      aiStrategyGuidance = `Weakness Remediation: Starting with '${topCandidate.topic}' (${topCandidate.factors.weaknessScore}% weakness index) to protect exam marks before moving to review.`;
    } else {
      aiStrategyGuidance = `Balanced Allocation: Distributing ${totalAvailableHours} hours across ${blocks.length} structured focus blocks with non-overlapping rest breaks.`;
    }
  } else {
    aiStrategyGuidance = "Syllabus topics are in balance. Follow scheduled sequence with periodic recall.";
  }

  return {
    availableStudyHours: totalAvailableHours,
    availableStudyMinutes: totalAvailableMinutes,
    allocatedStudyMinutes: totalAllocatedStudyMinutes,
    breakMinutesTotal: totalBreakMinutes,
    totalPlannedMinutes: totalAllocatedStudyMinutes + totalBreakMinutes,
    blocks,
    weightsUsed: weights,
    upcomingExams: upcomingExamsList.slice(0, 4),
    fiveDayForecast,
    aiStrategyGuidance,
    generatedAt: new Date().toISOString(),
    isFallback: false,
  };
}

/**
 * Adaptive Rescheduling Function
 * Handles:
 * - Block completed -> mark done, adjust remaining schedule
 * - Block missed -> mark missed, re-fit unfinished work into remaining available time
 * - Quiz scores or exam dates changed -> re-evaluate priorities
 */
export function rescheduleAdaptivePlan(
  existingPlan: AdaptivePlanResult,
  updateAction: {
    blockId: string;
    newStatus: "completed" | "missed" | "pending";
    reason?: string;
  },
  context: AdaptivePlannerContext
): AdaptivePlanResult {
  const updatedBlocks = existingPlan.blocks.map((b) => {
    if (b.id === updateAction.blockId) {
      return {
        ...b,
        status: updateAction.newStatus,
        completedAt: updateAction.newStatus === "completed" ? new Date().toISOString() : undefined,
        missedAt: updateAction.newStatus === "missed" ? new Date().toISOString() : undefined,
      };
    }
    return b;
  });

  // If a block was missed, add its topic to previouslyMissedTopicNames so it gets prioritized
  const missedTopics = new Set(context.previouslyMissedTopicNames || []);
  const missedBlock = updatedBlocks.find((b) => b.id === updateAction.blockId && updateAction.newStatus === "missed");
  if (missedBlock) {
    missedTopics.add(missedBlock.topic);
  }

  // Calculate remaining available time for pending blocks
  const completedOrMissedMinutes = updatedBlocks
    .filter((b) => b.status === "completed")
    .reduce((sum, b) => sum + b.durationMinutes + b.breakAfterMinutes, 0);

  const remainingMinutes = Math.max(15, existingPlan.availableStudyMinutes - completedOrMissedMinutes);

  // Regenerate plan with carried forward missed topics and updated remaining minutes
  const freshPlan = generateAdaptivePlan({
    ...context,
    availableStudyMinutes: remainingMinutes,
    previouslyMissedTopicNames: Array.from(missedTopics),
  });

  // Merge: retain completed and missed block records, and append newly scheduled pending blocks (excluding only already-completed topics)
  const finishedBlocks = updatedBlocks.filter((b) => b.status === "completed" || b.status === "missed");
  const completedTopicKeys = new Set(
    updatedBlocks
      .filter((b) => b.status === "completed")
      .map((b) => b.topic.toLowerCase().trim())
  );
  const newPendingBlocks = freshPlan.blocks
    .filter((b) => !completedTopicKeys.has(b.topic.toLowerCase().trim()))
    .map((b, idx) => ({
      ...b,
      id: finishedBlocks.some((fb) => fb.id === b.id) ? `${b.id}-r${idx + 1}` : b.id,
      order: finishedBlocks.length + idx + 1,
      canStartNow: idx === 0,
    }));

  const allBlocks = [...finishedBlocks, ...newPendingBlocks];
  const totalAllocated = allBlocks.reduce((sum, b) => sum + (b.status !== "missed" ? b.durationMinutes : 0), 0);
  const totalBreaks = allBlocks.reduce((sum, b) => sum + (b.status !== "missed" ? b.breakAfterMinutes : 0), 0);

  return {
    ...freshPlan,
    availableStudyHours: existingPlan.availableStudyHours,
    availableStudyMinutes: existingPlan.availableStudyMinutes,
    allocatedStudyMinutes: totalAllocated,
    breakMinutesTotal: totalBreaks,
    totalPlannedMinutes: totalAllocated + totalBreaks,
    blocks: allBlocks,
    aiStrategyGuidance: updateAction.newStatus === "missed"
      ? `Adaptive Reschedule: Unfinished work from '${missedBlock?.topic || "missed session"}' has been dynamically rescheduled within your remaining study time.`
      : freshPlan.aiStrategyGuidance,
  };
}
