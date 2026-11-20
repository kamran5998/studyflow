/**
 * StudyPilot 2.0 — Explainable AI Recommendation Engine & Learning Insights
 * 
 * Deterministic, testable, and evidence-grounded recommendation and insight generator.
 * Strictly adheres to student learning data, quiz scores, exam dates, and task history.
 */

import {
  analyzeWeaknesses,
  RawSubjectInput,
  RawQuizScoreInput,
  RawExamInput,
  RawTaskInput,
  RawFocusSessionInput,
  MasteryThresholds,
} from "./weaknessDetector";

import {
  RawAssignmentInput,
  SchedulingWeights,
  DEFAULT_SCHEDULING_WEIGHTS,
} from "./adaptivePlanner";

export interface ExplainableRecommendation {
  id: string;
  title: string;
  subjectId: string;
  subjectName: string;
  topic: string;
  category:
    | "weak_topic"
    | "approaching_exam"
    | "urgent_assignment"
    | "missed_session"
    | "needs_diagnostic"
    | "spaced_revision";
  priority: "high" | "medium" | "low";
  priorityScore: number; // 0 - 100
  recommendedAction: string;
  reason: string;
  evidence: string;
  suggestedDuration: string;
  suggestedDurationMinutes: number;
  daysToDeadline?: number | null;
  deadlineType?: "exam" | "assignment" | "task";
  deadlineTitle?: string;
  actionType: "start_focus" | "take_quiz" | "open_planner" | "view_tasks" | "view_exams";
  isCompleted?: boolean;
  isDismissed?: boolean;
  factors: {
    topicWeaknessScore: number;
    weaknessScore: number;
    examUrgencyScore: number;
    deadlineUrgencyScore: number;
    taskImportanceScore: number;
    compositePriorityScore: number;
  };
}

export interface PersonalizedLearningInsight {
  id: string;
  title: string;
  observation: string; // What the system observed
  evidence: string;    // Data supporting the observation
  whyItMatters: string; // Why it matters
  action: string;      // Actionable next step
  type: "urgent" | "warning" | "positive" | "neutral";
  category: "mastery" | "exam" | "deadline" | "consistency" | "diagnostic";
  iconName: "AlertCircle" | "TrendingUp" | "Clock" | "Flame" | "HelpCircle" | "Award";
  metric?: string;
}

export interface RecommendationEngineContext {
  subjects?: RawSubjectInput[];
  tasks?: RawTaskInput[];
  assignments?: RawAssignmentInput[];
  exams?: RawExamInput[];
  focusSessions?: RawFocusSessionInput[];
  quizScores?: RawQuizScoreInput[];
  availableStudyHours?: number;
  weights?: Partial<SchedulingWeights>;
  dismissedRecommendationIds?: string[];
  completedRecommendationIds?: string[];
  previouslyMissedTopicNames?: string[];
}

export interface RecommendationsResponse {
  topRecommendation: ExplainableRecommendation | null;
  recommendations: ExplainableRecommendation[];
  totalGenerated: number;
  activeCount: number;
  completedCount: number;
  dismissedCount: number;
  evaluatedAt: string;
  isFallback?: boolean;
}

export interface LearningInsightsResponse {
  insights: PersonalizedLearningInsight[];
  totalCount: number;
  evaluatedAt: string;
  isFallback?: boolean;
}

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
 * Generates explainable, prioritized recommendations from student learning data
 */
export function generateExplainableRecommendations(
  context: RecommendationEngineContext
): RecommendationsResponse {
  const subjects = Array.isArray(context.subjects) ? context.subjects : [];
  const tasks = Array.isArray(context.tasks) ? context.tasks : [];
  const assignments = Array.isArray(context.assignments) ? context.assignments : [];
  const exams = Array.isArray(context.exams) ? context.exams : [];
  const focusSessions = Array.isArray(context.focusSessions) ? context.focusSessions : [];
  const quizScores = Array.isArray(context.quizScores) ? context.quizScores : [];
  const dismissedSet = new Set(context.dismissedRecommendationIds || []);
  const completedSet = new Set(context.completedRecommendationIds || []);
  const missedSet = new Set((context.previouslyMissedTopicNames || []).map((t) => t.toLowerCase().trim()));

  // 1. Zero state when no subjects configured
  if (subjects.length === 0) {
    const emptyRec: ExplainableRecommendation = {
      id: "rec-init-subjects",
      title: "Initialize Your Course Subjects",
      subjectId: "",
      subjectName: "Workspace",
      topic: "Course Setup",
      category: "needs_diagnostic",
      priority: "medium",
      priorityScore: 50,
      recommendedAction: "Add your active academic subjects and syllabus topics.",
      reason: "No subjects configured in StudyPilot workspace yet.",
      evidence: "0 subjects found in student workspace.",
      suggestedDuration: "15 min",
      suggestedDurationMinutes: 15,
      actionType: "open_planner",
      factors: {
        topicWeaknessScore: 50,
        weaknessScore: 50,
        examUrgencyScore: 0,
        deadlineUrgencyScore: 0,
        taskImportanceScore: 50,
        compositePriorityScore: 50,
      },
    };

    return {
      topRecommendation: emptyRec,
      recommendations: [emptyRec],
      totalGenerated: 1,
      activeCount: 1,
      completedCount: 0,
      dismissedCount: 0,
      evaluatedAt: new Date().toISOString(),
      isFallback: false,
    };
  }

  // 2. Run Day 1 Weakness Detection Engine to get accurate topic mastery
  const weaknessResult = analyzeWeaknesses({
    subjects,
    tasks,
    exams,
    focusSessions,
    quizScores,
  });

  // Map exam urgency per subject & topic
  interface NearestExamInfo {
    daysUntil: number;
    title: string;
    subjectId: string;
  }
  const examMap = new Map<string, NearestExamInfo>();
  for (const ex of exams) {
    if (!ex || !ex.date) continue;
    const days = getDaysUntil(ex.date);
    if (days === null || days < 0) continue;

    const info: NearestExamInfo = { daysUntil: days, title: ex.title || "Exam", subjectId: ex.subjectId || "" };
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

  // Map assignments and task deadlines
  const deadlineMap = new Map<string, { daysUntil: number; title: string; priority: string; isAssignment: boolean; id: string }>();
  for (const a of assignments) {
    if (!a || a.status === "completed" || !a.dueDate) continue;
    const days = getDaysUntil(a.dueDate);
    if (days === null) continue;
    const item = { daysUntil: days, title: a.title, priority: a.priority || "medium", isAssignment: true, id: a.id };
    if (a.subjectId) {
      const cur = deadlineMap.get(a.subjectId);
      if (!cur || days < cur.daysUntil) deadlineMap.set(a.subjectId, item);
    }
  }

  // Track completed tasks so they are not recommended again
  const completedTaskTopics = new Set<string>();
  for (const t of tasks) {
    if (!t) continue;
    const norm = (t.topic || t.title || "").toLowerCase().trim();
    if (t.status === "completed") {
      completedTaskTopics.add(norm);
    }
  }

  const generatedRecs: ExplainableRecommendation[] = [];
  const seenKeys = new Set<string>();

  // 3. Process Weakness Items & Candidate Topics
  for (const item of weaknessResult.topics) {
    const normTopic = item.topic.toLowerCase().trim();
    const recId = `rec-${item.subjectId}-${normTopic.replace(/\s+/g, "-")}`;

    if (seenKeys.has(recId)) continue;
    seenKeys.add(recId);

    // Rule: Don't recommend tasks that are already completed unless topic is weak
    if (item.isCompleted && completedTaskTopics.has(normTopic) && item.masteryClassification !== "weak") {
      continue;
    }

    const nearestExam = examMap.get(normTopic) || examMap.get(item.subjectId);
    const nearestDeadline = deadlineMap.get(normTopic) || deadlineMap.get(item.subjectId);
    const isMissed = missedSet.has(normTopic);

    // Factor 1: Topic Weakness (0-100)
    let weaknessScore = 30;
    if (item.masteryClassification === "weak") {
      weaknessScore = Math.min(100, Math.max(80, 100 - (item.quizScore ?? 35)));
    } else if (item.masteryClassification === "developing") {
      weaknessScore = Math.min(75, Math.max(50, 75 - (item.quizScore ?? 60) + 40));
    } else if (item.masteryClassification === "unknown") {
      weaknessScore = 65;
    } else {
      weaknessScore = 20;
    }

    // Factor 2: Exam Urgency (0-100)
    let examUrgencyScore = 0;
    if (nearestExam) {
      const d = nearestExam.daysUntil;
      if (d <= 1) examUrgencyScore = 100;
      else if (d <= 3) examUrgencyScore = 95;
      else if (d <= 7) examUrgencyScore = 80;
      else if (d <= 14) examUrgencyScore = 55;
      else if (d <= 30) examUrgencyScore = 30;
      else examUrgencyScore = 15;
    }

    // Factor 3: Deadline Urgency (0-100)
    let deadlineUrgencyScore = 10;
    if (nearestDeadline) {
      const d = nearestDeadline.daysUntil;
      if (d < 0) deadlineUrgencyScore = 100; // Overdue
      else if (d === 0) deadlineUrgencyScore = 95;
      else if (d === 1) deadlineUrgencyScore = 90;
      else if (d <= 3) deadlineUrgencyScore = 75;
      else if (d <= 7) deadlineUrgencyScore = 50;
      else deadlineUrgencyScore = 25;
    }

    // Factor 4: Task Importance & Missed Session Signal (0-100)
    let taskImportanceScore = 40;
    if (isMissed) taskImportanceScore = 95;
    else if (nearestExam && nearestExam.daysUntil <= 3) taskImportanceScore = 90;
    else if (nearestExam && nearestExam.daysUntil <= 7) taskImportanceScore = 75;
    else if (nearestDeadline?.priority === "high") taskImportanceScore = 80;
    else if (nearestDeadline?.priority === "low") taskImportanceScore = 25;

    // Composite Priority Score Formula (35% Weakness, 30% Exam, 20% Deadline, 15% Importance)
    const compositePriorityScore = Math.round(
      weaknessScore * 0.35 +
      examUrgencyScore * 0.30 +
      deadlineUrgencyScore * 0.20 +
      taskImportanceScore * 0.15
    );

    const isUrgentWeakCombo = examUrgencyScore >= 80 && weaknessScore >= 65;
    const isUrgentDeadline = deadlineUrgencyScore >= 90;
    const priority: "high" | "medium" | "low" =
      compositePriorityScore >= 60 || isUrgentWeakCombo || isUrgentDeadline ? "high" : compositePriorityScore >= 38 ? "medium" : "low";

    // Formulate Category, Title, Action, Evidence, Reason
    let category: ExplainableRecommendation["category"] = "weak_topic";
    let title = `Review ${item.topic}`;
    let recommendedAction = item.recommendedAction || `Practice core concepts in ${item.topic}`;
    let actionType: ExplainableRecommendation["actionType"] = "start_focus";
    let suggestedDuration = "45 min";
    let suggestedDurationMinutes = 45;

    if (isMissed) {
      category = "missed_session";
      title = `Reschedule Missed Session: ${item.topic}`;
      recommendedAction = `Recover unfinished study block for ${item.topic} into available focus time.`;
      actionType = "open_planner";
      suggestedDuration = "35 min";
      suggestedDurationMinutes = 35;
    } else if (nearestExam && nearestExam.daysUntil <= 7 && item.masteryClassification === "weak") {
      category = "approaching_exam";
      title = `Exam Alert: Reinforce ${item.topic} for ${nearestExam.title}`;
      recommendedAction = `Complete high-yield summary review and take a practice re-test before ${nearestExam.title}.`;
      actionType = "take_quiz";
      suggestedDuration = "45 min";
      suggestedDurationMinutes = 45;
    } else if (nearestDeadline && nearestDeadline.daysUntil <= 2 && nearestDeadline.isAssignment) {
      category = "urgent_assignment";
      title = `Submit Urgent Assignment: ${nearestDeadline.title}`;
      recommendedAction = `Complete final answers for ${nearestDeadline.title} before deadline (${nearestDeadline.daysUntil === 0 ? "today" : "tomorrow"}).`;
      actionType = "view_tasks";
      suggestedDuration = "60 min";
      suggestedDurationMinutes = 60;
    } else if (item.masteryClassification === "weak") {
      category = "weak_topic";
      title = `Strengthen Weak Topic: ${item.topic}`;
      recommendedAction = `Review fundamental notes for ${item.topic} and solve 3-5 foundational problems.`;
      actionType = "start_focus";
      suggestedDuration = "40 min";
      suggestedDurationMinutes = 40;
    } else if (item.masteryClassification === "unknown") {
      category = "needs_diagnostic";
      title = `Take Diagnostic Quiz: ${item.topic}`;
      recommendedAction = `Complete a short 5-question quiz to establish measured mastery baseline.`;
      actionType = "take_quiz";
      suggestedDuration = "15 min";
      suggestedDurationMinutes = 15;
    } else {
      category = "spaced_revision";
      title = `Spaced Retention Review: ${item.topic}`;
      recommendedAction = `Quick 15-minute active recall flashcard check to prevent forgetting.`;
      actionType = "start_focus";
      suggestedDuration = "20 min";
      suggestedDurationMinutes = 20;
    }

    // Reason formulation
    const reasonParts: string[] = [];
    if (item.masteryClassification === "weak") {
      reasonParts.push(`Measured quiz score is ${item.quizScore ?? 42}% (below 50% passing threshold)`);
    } else if (item.masteryClassification === "unknown") {
      reasonParts.push("No quiz attempts recorded yet; baseline diagnostic needed");
    }
    if (nearestExam && nearestExam.daysUntil <= 7) {
      reasonParts.push(`'${nearestExam.title}' is ${nearestExam.daysUntil} day(s) away`);
    }
    if (nearestDeadline && nearestDeadline.daysUntil <= 2) {
      reasonParts.push(`'${nearestDeadline.title}' is due ${nearestDeadline.daysUntil === 0 ? "today" : "tomorrow"}`);
    }
    if (isMissed) {
      reasonParts.push("Carried forward from unfinished/missed study session");
    }

    const reason = reasonParts.length > 0
      ? reasonParts.join(" • ")
      : `Scheduled syllabus progression for ${item.subjectName}.`;

    const evidence = item.evidenceSource === "measured_quiz"
      ? `Quiz attempt score: ${item.quizScore}% (${item.attemptCount} attempt(s))`
      : "Insufficient quiz data (awaiting baseline evaluation)";

    generatedRecs.push({
      id: recId,
      title,
      subjectId: item.subjectId,
      subjectName: item.subjectName,
      topic: item.topic,
      category,
      priority,
      priorityScore: compositePriorityScore,
      recommendedAction,
      reason,
      evidence,
      suggestedDuration,
      suggestedDurationMinutes,
      daysToDeadline: nearestExam?.daysUntil ?? nearestDeadline?.daysUntil ?? null,
      deadlineType: nearestExam ? "exam" : nearestDeadline ? "assignment" : undefined,
      deadlineTitle: nearestExam?.title ?? nearestDeadline?.title,
      actionType,
      isCompleted: completedSet.has(recId),
      isDismissed: dismissedSet.has(recId),
      factors: {
        topicWeaknessScore: weaknessScore,
        weaknessScore: weaknessScore,
        examUrgencyScore,
        deadlineUrgencyScore,
        taskImportanceScore,
        compositePriorityScore,
      },
    });
  }

  // 4. Sort recommendations deterministically by Composite Priority Score
  generatedRecs.sort((a, b) => b.priorityScore - a.priorityScore);

  // Active vs completed/dismissed counts
  const activeRecs = generatedRecs.filter((r) => !r.isCompleted && !r.isDismissed);
  const topRec = activeRecs.length > 0 ? activeRecs[0] : generatedRecs[0] || null;

  return {
    topRecommendation: topRec,
    recommendations: generatedRecs,
    totalGenerated: generatedRecs.length,
    activeCount: activeRecs.length,
    completedCount: generatedRecs.filter((r) => r.isCompleted).length,
    dismissedCount: generatedRecs.filter((r) => r.isDismissed).length,
    evaluatedAt: new Date().toISOString(),
    isFallback: false,
  };
}

/**
 * Generates evidence-based Personalized Learning Insights
 * Strictly derived from actual observed patterns:
 * - Persistent weak topics
 * - Real quiz score improvement deltas
 * - Approaching exams with weak topics
 * - Approaching assignment deadlines
 * - Missed sessions
 * - Missing quiz diagnostic data
 */
export function generatePersonalizedInsights(
  context: RecommendationEngineContext
): LearningInsightsResponse {
  const subjects = Array.isArray(context.subjects) ? context.subjects : [];
  const focusSessions = Array.isArray(context.focusSessions) ? context.focusSessions : [];
  const quizScores = Array.isArray(context.quizScores) ? context.quizScores : [];
  const exams = Array.isArray(context.exams) ? context.exams : [];
  const assignments = Array.isArray(context.assignments) ? context.assignments : [];
  const missedTopics = context.previouslyMissedTopicNames || [];

  const insights: PersonalizedLearningInsight[] = [];

  // 0. Zero state when no subjects exist
  if (subjects.length === 0) {
    return {
      insights: [
        {
          id: "ins-welcome",
          title: "Setup Study Curriculum",
          observation: "No subjects or topics have been added to your StudyPilot workspace yet.",
          evidence: "0 active subjects configured.",
          whyItMatters: "Personalized recommendations require your course syllabus and exam dates.",
          action: "Click '+ Add Subject' to add your university courses and upcoming exams.",
          type: "neutral",
          category: "diagnostic",
          iconName: "HelpCircle",
          metric: "0 Courses",
        },
      ],
      totalCount: 1,
      evaluatedAt: new Date().toISOString(),
      isFallback: false,
    };
  }

  // 1. Pattern: Measured Quiz Mastery Improvement
  // Group quizzes by topic to detect legitimate measured score deltas
  const topicQuizzes = new Map<string, Array<{ score: number; date?: string }>>();
  for (const q of quizScores) {
    if (!q || !q.topic) continue;
    const norm = q.topic.toLowerCase().trim();
    if (!topicQuizzes.has(norm)) topicQuizzes.set(norm, []);
    topicQuizzes.get(norm)!.push({ score: Number(q.score) || 0, date: q.date });
  }

  let foundImprovement = false;
  for (const [normTopic, attempts] of topicQuizzes.entries()) {
    if (attempts.length >= 2) {
      const firstScore = attempts[0].score;
      const latestScore = attempts[attempts.length - 1].score;
      const delta = latestScore - firstScore;

      if (delta >= 10) {
        foundImprovement = true;
        const matchingSubject = subjects.find((s) => (s.topics || []).some((t) => t.title.toLowerCase().trim() === normTopic));
        const subjName = matchingSubject?.name || "Subject";
        const displayTopic = (matchingSubject?.topics || []).find((t) => t.title.toLowerCase().trim() === normTopic)?.title || normTopic;

        insights.push({
          id: `ins-improvement-${normTopic}`,
          title: "Measured Mastery Improvement",
          observation: `Your score in '${displayTopic}' increased from ${firstScore}% to ${latestScore}%.`,
          evidence: `+${delta}% score improvement across ${attempts.length} attempts in ${subjName}.`,
          whyItMatters: "Validates that your recent study sessions and problem-solving methods are converting into higher retention.",
          action: "Maintain this topic with periodic spaced-repetition flashcards rather than heavy re-reading.",
          type: "positive",
          category: "mastery",
          iconName: "TrendingUp",
          metric: `+${delta}%`,
        });
        break; // Show 1 strongest improvement insight
      }
    }
  }

  // 2. Pattern: Persistent Topic Weakness (<50% quiz score)
  const weakTopicsWithQuizzes = Array.from(topicQuizzes.entries())
    .map(([topicNorm, attempts]) => {
      const latest = attempts[attempts.length - 1].score;
      return { topicNorm, latest, attemptCount: attempts.length };
    })
    .filter((t) => t.latest < 50);

  if (weakTopicsWithQuizzes.length > 0) {
    const primaryWeak = weakTopicsWithQuizzes[0];
    const matchingSubject = subjects.find((s) => (s.topics || []).some((t) => t.title.toLowerCase().trim() === primaryWeak.topicNorm));
    const subjName = matchingSubject?.name || "Course";
    const displayTopic = (matchingSubject?.topics || []).find((t) => t.title.toLowerCase().trim() === primaryWeak.topicNorm)?.title || primaryWeak.topicNorm;

    insights.push({
      id: `ins-persistent-weakness-${primaryWeak.topicNorm}`,
      title: "Persistent Topic Weakness",
      observation: `'${displayTopic}' scored ${primaryWeak.latest}% on your latest quiz attempt (below 50% passing threshold).`,
      evidence: `${primaryWeak.latest}% measured quiz result across ${primaryWeak.attemptCount} attempt(s) in ${subjName}.`,
      whyItMatters: "Unaddressed weak fundamentals represent high risk in midterm and final examinations.",
      action: `Dedicate a 35-minute focused problem-solving session to ${displayTopic} and take a re-test.`,
      type: "urgent",
      category: "mastery",
      iconName: "AlertCircle",
      metric: `${primaryWeak.latest}%`,
    });
  }

  // 3. Pattern: Approaching Exam with Weak Topics
  for (const ex of exams) {
    if (!ex || !ex.date) continue;
    const days = getDaysUntil(ex.date);
    if (days !== null && days >= 0 && days <= 7) {
      insights.push({
        id: `ins-exam-urgency-${ex.id}`,
        title: "Approaching Examination Deadline",
        observation: `'${ex.title}' is scheduled in ${days} day(s).`,
        evidence: `Exam date: ${ex.date}. Readiness index: ${ex.preparationPercentage ?? 50}%.`,
        whyItMatters: "Exam readiness requires front-loading high-weightage topics before final review.",
        action: `Review priority topics for ${ex.title} in the StudyPilot Exam Preparation center.`,
        type: "urgent",
        category: "exam",
        iconName: "Flame",
        metric: `${days}d Left`,
      });
      break;
    }
  }

  // 4. Pattern: Approaching Assignment Deadlines
  const urgentAssignments = assignments.filter((a) => {
    if (!a || a.status === "completed" || !a.dueDate) return false;
    const days = getDaysUntil(a.dueDate);
    return days !== null && days >= 0 && days <= 2;
  });

  if (urgentAssignments.length > 0) {
    const leadAssignment = urgentAssignments[0];
    const days = getDaysUntil(leadAssignment.dueDate) ?? 0;
    insights.push({
      id: `ins-assignment-urgent-${leadAssignment.id}`,
      title: "Urgent Assignment Due Date",
      observation: `'${leadAssignment.title}' is due ${days === 0 ? "today" : "tomorrow"} (${leadAssignment.dueDate}).`,
      evidence: `Pending assignment in ${leadAssignment.subjectName}.`,
      whyItMatters: "Submitting coursework on time protects internal assessment grades.",
      action: `Prioritize completing ${leadAssignment.title} before routine topic revision.`,
      type: "warning",
      category: "deadline",
      iconName: "Clock",
      metric: `${days === 0 ? "Due Today" : "Due Tomorrow"}`,
    });
  }

  // 5. Pattern: Missed Study Session Pattern
  if (missedTopics.length > 0) {
    insights.push({
      id: "ins-missed-session",
      title: "Unfinished Study Session",
      observation: `You have unfinished study material carried over from a missed session on '${missedTopics[0]}'.`,
      evidence: `Marked as missed in your daily adaptive planner.`,
      whyItMatters: "Accumulating missed sessions causes study debt right before exam deadlines.",
      action: "Use the Adaptive Reschedule feature to re-slot this topic into today's schedule.",
      type: "warning",
      category: "consistency",
      iconName: "Clock",
      metric: "Reschedule",
    });
  }

  // 6. Pattern: Diagnostic Data Gap
  const totalTopics = subjects.reduce((sum, s) => sum + (s.topics?.length || 0), 0);
  const unquizzedCount = subjects.reduce((sum, s) => {
    return sum + (s.topics || []).filter((t) => !topicQuizzes.has(t.title.toLowerCase().trim())).length;
  }, 0);

  if (unquizzedCount > 0 && quizScores.length === 0) {
    insights.push({
      id: "ins-diagnostic-gap",
      title: "Awaiting Diagnostic Quiz Baseline",
      observation: `${unquizzedCount} syllabus topic(s) have no quiz evaluation data recorded.`,
      evidence: "0 quiz scores logged in StudyPilot.",
      whyItMatters: "StudyPilot requires quiz evidence to accurately classify weak vs strong topics.",
      action: "Take a short 5-question diagnostic quiz in the Quizzes tab to calibrate your recommendations.",
      type: "neutral",
      category: "diagnostic",
      iconName: "HelpCircle",
      metric: `${unquizzedCount} Topics`,
    });
  }

  // 7. Pattern: Study Session Consistency
  if (focusSessions.length >= 3) {
    const totalMinutes = focusSessions.reduce((acc, s) => acc + (Number(s.durationMinutes) || 0), 0);
    insights.push({
      id: "ins-focus-consistency",
      title: "Focus Consistency",
      observation: `You have logged ${focusSessions.length} focus sessions totaling ${Math.round(totalMinutes / 60)} hours of study.`,
      evidence: `${focusSessions.length} recorded sessions in your focus history.`,
      whyItMatters: "Consistent daily study blocks significantly outperform irregular cramming.",
      action: "Keep maintaining your daily study habit with scheduled Pomodoro blocks.",
      type: "positive",
      category: "consistency",
      iconName: "Award",
      metric: `${Math.round(totalMinutes / 60)}h Total`,
    });
  }

  return {
    insights,
    totalCount: insights.length,
    evaluatedAt: new Date().toISOString(),
    isFallback: false,
  };
}

export const generatePersonalizedLearningInsights = generatePersonalizedInsights;
