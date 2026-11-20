import {
  computeLearningAnalytics,
  DEFAULT_EXAM_READINESS_CONFIG,
  AnalyticsEngineContext,
} from "../src/server/analyticsEngine";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[TEST FAILED]: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`[TEST FAILED]: ${message} (Expected: ${expected}, Got: ${actual})`);
  }
}

console.log("==========================================================");
console.log("🧪 Running StudyPilot Day 4 Learning Analytics Test Suite");
console.log("==========================================================");

// Scenario 1: Empty dataset returns clean zero-state with nulls (no misleading zeros)
{
  console.log("Scenario 1: Empty dataset zero-fabrication & null states...");
  const res = computeLearningAnalytics({ referenceDate: "2026-11-14" });
  assertEqual(res.overview.totalRecordedStudyMinutes, 0, "Recorded minutes must be 0");
  assertEqual(res.overview.totalCompletedFocusSessions, 0, "Focus sessions must be 0");
  assertEqual(res.overview.averageQuizPerformance, null, "Avg quiz performance must be null when 0 quizzes");
  assertEqual(res.overview.taskCompletionRate, null, "Task completion rate must be null when 0 tasks");
  assertEqual(res.studyConsistency.plannedCompletionPercentage, null, "Planned completion must be null when 0 blocks");
  assertEqual(res.quizTrends.length, 0, "Quiz trends must be empty");
  assertEqual(res.overview.hasAnyActivity, false, "hasAnyActivity must be false");
  console.log("✓ Scenario 1 passed.");
}

// Scenario 2: Subject-wise separation of syllabus completion vs measured quiz average
{
  console.log("Scenario 2: Subject-wise separation of syllabus vs measured quizzes...");
  const ctx: AnalyticsEngineContext = {
    referenceDate: "2026-11-14",
    subjects: [
      {
        id: "sub-1",
        name: "Operating Systems",
        topics: [
          { id: "t1", title: "Threads", completed: true },
          { id: "t2", title: "Deadlocks", completed: true },
        ],
      },
    ],
    quizScores: [], // No quizzes at all
  };

  const res = computeLearningAnalytics(ctx);
  assertEqual(res.subjectPerformance.length, 1, "Should have 1 subject");
  assertEqual(res.subjectPerformance[0].syllabusProgressPercent, 100, "Syllabus completion is 100%");
  assertEqual(res.subjectPerformance[0].averageMeasuredQuizScore, null, "Measured quiz score MUST remain null (never mixed with syllabus!)");
  assertEqual(res.subjectPerformance[0].assessedTopicsCount, 0, "Assessed topics must be 0");
  console.log("✓ Scenario 2 passed.");
}

// Scenario 3: Learning Improvement Evaluation (Percentage Points vs Relative Percentage Change)
{
  console.log("Scenario 3: Percentage points vs relative % change (45% -> 72% = +27 pts, +60% rel)...");
  const ctx: AnalyticsEngineContext = {
    referenceDate: "2026-11-14",
    subjects: [
      {
        id: "sub-db",
        name: "Database Management",
        topics: [
          { id: "t-db", title: "Database Management", completed: false },
          { id: "t-single", title: "Indexing", completed: false },
        ],
      },
    ],
    quizScores: [
      { id: "q1", subjectId: "sub-db", subjectName: "Database Management", topic: "Database Management", score: 45, date: "2026-11-01" },
      { id: "q2", subjectId: "sub-db", subjectName: "Database Management", topic: "Database Management", score: 72, date: "2026-11-12" },
      { id: "q3", subjectId: "sub-db", subjectName: "Database Management", topic: "Indexing", score: 65, date: "2026-11-10" },
    ],
  };

  const res = computeLearningAnalytics(ctx);
  const dbComp = res.learningImprovement.topicComparisons.find((c) => c.topic === "Database Management");
  assert(Boolean(dbComp), "Must find Database Management comparison");
  assertEqual(dbComp!.hasComparableHistory, true, "Must have comparable history");
  assertEqual(dbComp!.firstScore, 45, "First score must be 45");
  assertEqual(dbComp!.latestScore, 72, "Latest score must be 72");
  assertEqual(dbComp!.absoluteImprovementPoints, 27, "Absolute improvement must be 27 percentage points");
  assertEqual(dbComp!.relativePercentageChange, 60, "Relative percentage change must be 60.0%");
  assertEqual(dbComp!.earlierMasteryTier, "weak", "Earlier tier must be weak");
  assertEqual(dbComp!.latestMasteryTier, "developing", "Latest tier must be developing");

  const singleComp = res.learningImprovement.topicComparisons.find((c) => c.topic === "Indexing");
  assert(Boolean(singleComp), "Must find single-attempt topic comparison");
  assertEqual(singleComp!.hasComparableHistory, false, "Single attempt must report hasComparableHistory=false");
  assertEqual(singleComp!.absoluteImprovementPoints, null, "Single attempt must not invent improvement points");

  // Chronological quiz trends verification (only 3 real points, sorted by date)
  assertEqual(res.quizTrends.length, 3, "Quiz trends must contain strictly 3 real attempts");
  assertEqual(res.quizTrends[0].date, "2026-11-01", "Earliest quiz must be first");
  assertEqual(res.quizTrends[2].date, "2026-11-12", "Latest quiz must be last");
  console.log("✓ Scenario 3 passed.");
}

// Scenario 4: Zero baseline safety for relative percentage change (0% -> 50%)
{
  console.log("Scenario 4: Division-by-zero safety when first quiz score is 0%...");
  const res = computeLearningAnalytics({
    referenceDate: "2026-11-14",
    subjects: [{ id: "s1", name: "Math", topics: [{ id: "m1", title: "Calculus" }] }],
    quizScores: [
      { subjectId: "s1", subjectName: "Math", topic: "Calculus", score: 0, date: "2026-11-01" },
      { subjectId: "s1", subjectName: "Math", topic: "Calculus", score: 50, date: "2026-11-05" },
    ],
  });
  const calc = res.learningImprovement.topicComparisons[0];
  assertEqual(calc.absoluteImprovementPoints, 50, "Absolute points should be +50");
  assertEqual(calc.relativePercentageChange, null, "Relative % change must be null when baseline is 0");
  console.log("✓ Scenario 4 passed.");
}

// Scenario 5: Study Consistency strictly separates Planned vs Actual Recorded Focus Time
{
  console.log("Scenario 5: Study Consistency planned vs actual recorded separation...");
  const res = computeLearningAnalytics({
    referenceDate: "2026-11-14",
    plannedBlocks: [
      { id: "b1", topic: "Trees", durationMinutes: 60, status: "completed", scheduledDate: "2026-11-14" },
      { id: "b2", topic: "Graphs", durationMinutes: 45, status: "missed", scheduledDate: "2026-11-14" },
      { id: "b3", topic: "DP", durationMinutes: 30, status: "pending", scheduledDate: "2026-11-14" },
    ],
    focusSessions: [
      { id: "f1", subjectId: "s1", subjectName: "DSA", topic: "Trees", durationMinutes: 40, timestamp: "2026-11-14T10:00:00Z" },
      { id: "f2", subjectId: "s1", subjectName: "DSA", topic: "Trees", durationMinutes: 25, timestamp: "2026-11-05T10:00:00Z" }, // previous 7d window
    ],
  });

  assertEqual(res.studyConsistency.plannedSessionsCount, 3, "3 planned sessions");
  assertEqual(res.studyConsistency.completedPlannedSessionsCount, 1, "1 completed planned session");
  assertEqual(res.studyConsistency.missedPlannedSessionsCount, 1, "1 missed planned session");
  assertEqual(res.studyConsistency.pendingPlannedSessionsCount, 1, "1 pending planned session");
  assertEqual(res.studyConsistency.plannedCompletionPercentage, 33, "33% planned completion");
  assertEqual(res.studyConsistency.totalPlannedDurationMinutes, 135, "135 planned mins");
  assertEqual(res.studyConsistency.totalActualRecordedMinutes, 65, "Actual recorded time must be strictly 65 mins (never 60+65!)");
  assertEqual(res.studyConsistency.consistencyChangeSummary.hasComparablePeriods, true, "Both 7d windows have data");
  assertEqual(res.studyConsistency.consistencyChangeSummary.recent7DaysMinutes, 40, "Recent 7d actual = 40m");
  assertEqual(res.studyConsistency.consistencyChangeSummary.previous7DaysMinutes, 25, "Previous 7d actual = 25m");
  assertEqual(res.studyConsistency.consistencyChangeSummary.deltaMinutes, 15, "Delta = +15m");
  console.log("✓ Scenario 5 passed.");
}

// Scenario 6: Exam Readiness Indicator (Insufficient Data vs Calculated + Disclaimer + Custom Config)
{
  console.log("Scenario 6: Exam Readiness Indicator & insufficient-data handling...");
  const res = computeLearningAnalytics({
    referenceDate: "2026-11-14",
    subjects: [
      {
        id: "sub-empty",
        name: "Physics",
        topics: [],
      },
      {
        id: "sub-cs",
        name: "Algorithms",
        topics: [
          { id: "a1", title: "Sorting", completed: true },
          { id: "a2", title: "Dynamic Programming", completed: false },
        ],
      },
    ],
    exams: [
      { id: "ex-empty", subjectId: "sub-empty", subjectName: "Physics", title: "Physics Quiz", date: "2026-11-20" },
      { id: "ex-cs", subjectId: "sub-cs", subjectName: "Algorithms", title: "Algo Midterm", date: "2026-11-18" },
    ],
    quizScores: [
      { subjectId: "sub-cs", subjectName: "Algorithms", topic: "Sorting", score: 85, date: "2026-11-10" },
      { subjectId: "sub-cs", subjectName: "Algorithms", topic: "Dynamic Programming", score: 35, date: "2026-11-12" },
    ],
    focusSessions: [
      { id: "fs1", subjectId: "sub-cs", subjectName: "Algorithms", topic: "Dynamic Programming", durationMinutes: 120, timestamp: "2026-11-13T10:00:00Z" },
    ],
  });

  const emptyExam = res.examReadiness.find((e) => e.examId === "ex-empty")!;
  assertEqual(emptyExam.hasSufficientData, false, "Empty exam subject must report insufficient data");
  assertEqual(emptyExam.estimatedReadinessScore, null, "Insufficient data exam score must be null");
  assertEqual(emptyExam.readinessStatus, "Insufficient Data", "Status must be Insufficient Data");

  const csExam = res.examReadiness.find((e) => e.examId === "ex-cs")!;
  assertEqual(csExam.hasSufficientData, true, "Algo exam has sufficient data");
  assert(csExam.estimatedReadinessScore !== null && csExam.estimatedReadinessScore > 0, "Algo exam has numeric estimated score");
  assertEqual(csExam.daysRemaining, 4, "4 days remaining until 2026-11-18");
  assert(csExam.weakTopicNames.includes("Dynamic Programming"), "Must surface weak topic Dynamic Programming");
  assert(csExam.disclaimer.includes("does not predict actual examination marks"), "Must include non-predictive disclaimer");
  assertEqual(res.readinessConfigUsed.assessedTopicMasteryWeight, DEFAULT_EXAM_READINESS_CONFIG.assessedTopicMasteryWeight, "Uses default readiness config");
  console.log("✓ Scenario 6 passed.");
}

// Scenario 7: Analytics Insights Integration (Multiple weak topics + missed sessions)
{
  console.log("Scenario 7: Integrated Day 3 + Day 4 AI Learning Insights...");
  const res = computeLearningAnalytics({
    referenceDate: "2026-11-14",
    subjects: [
      {
        id: "sub-net",
        name: "Computer Networks",
        topics: [
          { id: "n1", title: "TCP Congestion", completed: false },
          { id: "n2", title: "Routing Protocols", completed: false },
        ],
      },
    ],
    quizScores: [
      { subjectId: "sub-net", subjectName: "Computer Networks", topic: "TCP Congestion", score: 40, date: "2026-11-11" },
      { subjectId: "sub-net", subjectName: "Computer Networks", topic: "Routing Protocols", score: 38, date: "2026-11-12" },
    ],
    plannedBlocks: [
      { id: "p1", topic: "TCP Congestion", durationMinutes: 45, status: "missed", scheduledDate: "2026-11-14" },
      { id: "p2", topic: "Routing Protocols", durationMinutes: 45, status: "missed", scheduledDate: "2026-11-14" },
    ],
  });

  const hasMultiWeakInsight = res.insights.some((i) => i.id === "ins-multi-weak-sub-net");
  const hasMissedMultipleInsight = res.insights.some((i) => i.id === "ins-missed-multiple");
  assert(hasMultiWeakInsight, "Should generate multi-weak-topic insight for Computer Networks");
  assert(hasMissedMultipleInsight, "Should generate missed planned sessions insight");
  console.log("✓ Scenario 7 passed.");
}

console.log("==========================================================");
console.log("🎉 ALL 7 DAY 4 ANALYTICS ENGINE TEST SCENARIOS PASSED!");
console.log("==========================================================");
