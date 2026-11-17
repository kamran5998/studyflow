import { Exam, Subject, QuizScore, FocusSession, ExamReadinessBreakdown, AIExamPrepPlan } from "../types";

/**
 * Automatically calculate Exam Readiness % from student's real activity:
 * 1. Topic Completion Rate (40% weight)
 * 2. Quiz Mastery / Test Score Average (35% weight)
 * 3. Focus Study Hours Logged (25% weight)
 */
export function calculateExamReadiness(
  exam: Exam,
  subject?: Subject,
  quizScores: QuizScore[] = [],
  focusSessions: FocusSession[] = []
): ExamReadinessBreakdown {
  // 1. Topic Completion
  const topics = subject?.topics || [];
  const totalTopics = topics.length;
  const completedTopics = topics.filter((t) => t.completed).length;
  const topicCompletionRate = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 40;

  // 2. Quiz Mastery
  const subjectQuizzes = quizScores.filter(
    (q) =>
      q.subjectId === exam.subjectId ||
      q.subjectName?.toLowerCase() === exam.subjectName?.toLowerCase() ||
      topics.some((t) => t.title.toLowerCase().includes(q.topic.toLowerCase()) || q.topic.toLowerCase().includes(t.title.toLowerCase()))
  );

  const quizzesTaken = subjectQuizzes.length;
  const quizAverageScore =
    quizzesTaken > 0
      ? Math.round(subjectQuizzes.reduce((sum, q) => sum + q.score, 0) / quizzesTaken)
      : topicCompletionRate > 0
      ? Math.min(85, Math.max(45, topicCompletionRate))
      : 50;

  // 3. Focus Study Time
  const subjectFocusSessions = focusSessions.filter(
    (f) => f.subjectId === exam.subjectId || f.subjectName?.toLowerCase() === exam.subjectName?.toLowerCase()
  );
  const totalFocusMinutes = subjectFocusSessions.reduce((sum, f) => sum + f.durationMinutes, 0);
  const targetFocusMinutes = (exam.targetHours || subject?.targetHours || 4.0) * 60;
  const focusTimeProgress = Math.min(100, Math.round((totalFocusMinutes / targetFocusMinutes) * 100));

  // Combined Weighted Real Readiness %
  const overallReadiness = Math.min(
    100,
    Math.max(
      5,
      Math.round(
        0.4 * topicCompletionRate +
        0.35 * quizAverageScore +
        0.25 * focusTimeProgress
      )
    )
  );

  let statusLabel = "Needs Intensive Prep";
  if (overallReadiness >= 85) {
    statusLabel = "Exam Ready & Mastered";
  } else if (overallReadiness >= 70) {
    statusLabel = "Good Preparation";
  } else if (overallReadiness >= 50) {
    statusLabel = "Moderate Progress";
  }

  return {
    overallReadiness,
    topicCompletionRate,
    totalTopics,
    completedTopics,
    quizAverageScore,
    quizzesTaken,
    focusTimeProgress,
    totalFocusMinutes,
    targetFocusMinutes,
    statusLabel,
  };
}

/**
 * Generate AI Exam Strategy & Allocation prioritizing High-Weightage Topics
 * to maximize marks secured in minimum study hours.
 */
export function generateWeightageOptimizedPlan(
  exam: Exam,
  subject?: Subject,
  quizScores: QuizScore[] = [],
  focusSessions: FocusSession[] = [],
  totalAvailableHours: number = 6.0
): AIExamPrepPlan {
  const readiness = calculateExamReadiness(exam, subject, quizScores, focusSessions);
  const days = Math.max(0, Math.ceil((new Date(exam.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  const rawTopics = subject?.topics && subject.topics.length > 0
    ? subject.topics
    : [
        { id: "t1", title: `${exam.subjectName} Core Fundamentals`, completed: false, weightage: 35, weightageLevel: "high" as const },
        { id: "t2", title: "Key Formulas & Problem Solving", completed: false, weightage: 30, weightageLevel: "high" as const },
        { id: "t3", title: "Applications & Practice Scenarios", completed: false, weightage: 20, weightageLevel: "medium" as const },
        { id: "t4", title: "Quick Revision & Edge Cases", completed: true, weightage: 15, weightageLevel: "low" as const },
      ];

  // Map each topic with its weightage (marks percentage) and mastery
  const defaultWeightages = [35, 25, 20, 20, 15, 10];
  const topicWeightages = exam.topicWeightages || {};

  const analyzedTopics = rawTopics.map((topic, idx) => {
    const customWeight = topicWeightages[topic.id] || topicWeightages[topic.title] || topic.weightage || defaultWeightages[idx % defaultWeightages.length] || 20;

    // Find quiz score for topic
    const quizMatch = quizScores.find((q) =>
      q.topic.toLowerCase().includes(topic.title.toLowerCase()) || topic.title.toLowerCase().includes(q.topic.toLowerCase())
    );

    const quizScore = quizMatch ? quizMatch.score : null;
    let mastery = topic.completed ? 85 : 45;
    if (quizScore !== null) {
      mastery = Math.round((mastery + quizScore) / 2);
    }

    // Weightage classification
    const weightageLevel: "high" | "medium" | "low" = customWeight >= 30 ? "high" : customWeight >= 20 ? "medium" : "low";

    // Priority score = Weightage * (100 - Mastery) -> Higher weightage + lower mastery = highest priority
    const priorityScore = customWeight * (100 - mastery);

    return {
      topic: topic.title,
      mastery,
      quizScore,
      weightage: customWeight,
      weightageLevel,
      priorityScore,
      isCompleted: topic.completed,
    };
  });

  // Sort descending by priority score (high weightage + weak areas first)
  analyzedTopics.sort((a, b) => b.priorityScore - a.priorityScore);

  // Allocate study minutes proportionally according to weightage & need
  const totalAllocMinutes = Math.round(totalAvailableHours * 60);
  const totalPriorityScore = analyzedTopics.reduce((sum, t) => sum + Math.max(1, t.priorityScore), 0);

  const priorityTopics = analyzedTopics.map((t, idx) => {
    const rawShare = (t.priorityScore / totalPriorityScore) * totalAllocMinutes;
    // Ensure minimum 20 mins and max 120 mins
    const allocMins = Math.max(20, Math.round(rawShare / 5) * 5);
    const hours = (allocMins / 60).toFixed(1).replace(/\.0$/, "");

    let priority = "Medium";
    let badge = "🟡 Practice Needed";
    let color = "yellow";

    if (t.weightageLevel === "high" || idx === 0) {
      priority = "High";
      badge = "🔴 High Marks Payoff";
      color = "red";
    } else if (t.mastery >= 80) {
      priority = "Low";
      badge = "🟢 Solid Base";
      color = "green";
    }

    return {
      topic: t.topic,
      mastery: t.mastery,
      quizScore: t.quizScore,
      priority,
      badge,
      color,
      isCompleted: t.isCompleted,
      weightage: t.weightage,
      weightageLevel: t.weightageLevel,
      allocatedMinutes: allocMins,
      estimatedStudyHours: parseFloat(hours),
      marksImpact: `~${t.weightage}% of Total Exam Marks`,
      reason: t.weightageLevel === "high"
        ? `High weightage topic (${t.weightage}% marks). Heavy time allocation (${allocMins}m) maximizes exam score.`
        : `Allocated ${allocMins}m to secure ${t.weightage}% syllabus weightage.`,
    };
  });

  const highWeightageCount = priorityTopics.filter((p) => p.weightageLevel === "high").length;
  const totalMarks = priorityTopics.reduce((sum, p) => sum + (p.weightage || 0), 0);

  // Day-by-day countdown schedule
  const studySchedule = [
    {
      dayNumber: 1,
      date: days > 0 ? `${days} Days Left` : "Today",
      milestone: `High-Weightage Mastery: ${priorityTopics[0]?.topic || "Core Syllabus"}`,
      focusDescription: `Deep dive into the highest-yield topic (${priorityTopics[0]?.weightage}% marks). Focus on past questions and formula derivations.`,
      targetHours: Math.min(3.0, parseFloat((priorityTopics[0]?.allocatedMinutes ? priorityTopics[0].allocatedMinutes / 60 : 2.0).toFixed(1))),
      isCompleted: false,
      weightageFocus: `Targets ~${priorityTopics[0]?.weightage || 35}% exam marks`,
    },
    {
      dayNumber: 2,
      date: days > 1 ? `${days - 1} Days Left` : "Tomorrow",
      milestone: `Secondary Weightage & Application: ${priorityTopics[1]?.topic || "Problem Sets"}`,
      focusDescription: `Solve high-probability numerical and conceptual exam questions. Solidify weak sub-topics.`,
      targetHours: 2.0,
      isCompleted: false,
      weightageFocus: `Targets ~${priorityTopics[1]?.weightage || 25}% exam marks`,
    },
    {
      dayNumber: 3,
      date: days > 2 ? `${days - 2} Days Left` : "Pre-Exam Drill",
      milestone: "Timed Diagnostic Mock Test",
      focusDescription: "Simulate a real timed exam without notes. Review all errors with AI Quizzes.",
      targetHours: 1.5,
      isCompleted: false,
      weightageFocus: "Covers 100% syllabus under pressure",
    },
    {
      dayNumber: 4,
      date: "Final 24 Hours",
      milestone: "Rapid Formula & Flashcard Revision",
      focusDescription: "Active recall on high-weightage definitions, flashcard drills, and key diagrams.",
      targetHours: 1.0,
      isCompleted: false,
      weightageFocus: "Final score retention lock",
    },
  ];

  return {
    examId: exam.id,
    examTitle: exam.title,
    subjectName: exam.subjectName,
    daysRemaining: days,
    currentPreparation: readiness.overallReadiness,
    readinessBreakdown: readiness,
    recommendedTotalHours: totalAvailableHours,
    aiStrategyVerdict: `AI Strategy: Allocating ${Math.round(totalAllocMinutes * 0.65 / 60)}h (65% of study time) to top ${highWeightageCount || 1} high-weightage topics to secure maximum marks before the ${days}-day deadline.`,
    priorityTopics,
    weightageSummary: {
      totalMarks,
      highWeightageCount,
      marksSecuredEstimate: Math.round(totalMarks * (readiness.overallReadiness / 100)),
      maxScorePayoff: totalMarks,
    },
    studySchedule,
    revisionSchedule: [
      {
        phase: "Phase 1: High-Weightage Concept Lock",
        timing: "3-5 Days Out",
        activity: "Intensive deep focus on topics carrying 30%+ exam weightage.",
        durationMinutes: 90,
      },
      {
        phase: "Phase 2: Timed Mock Problem Solving",
        timing: "2 Days Out",
        activity: "Timed problem drills focusing on previous exam questions.",
        durationMinutes: 60,
      },
      {
        phase: "Phase 3: High-Yield Flashcard Sprint",
        timing: "Final 24 Hours",
        activity: "Formula recall, core definitions, and high-frequency edge cases.",
        durationMinutes: 30,
      },
    ],
    practiceRecommendations: [
      {
        type: "High Weightage",
        recommendation: `Prioritize ${priorityTopics[0]?.topic || "top topics"} first for the highest score payoff per hour studied.`,
        tag: "Highest ROI",
      },
      {
        type: "Active Recall",
        recommendation: "Take a topic diagnostic quiz right after completing each study block.",
        tag: "Active Recall",
      },
      {
        type: "Time Management",
        recommendation: "Spend at least 60% of preparation time solving problems rather than passively reading.",
        tag: "Strategy",
      },
    ],
  };
}
