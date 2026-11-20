import { analyzeWeaknesses } from "../src/server/weaknessDetector";
import { generateAdaptivePlan, rescheduleAdaptivePlan } from "../src/server/adaptivePlanner";
import {
  generateExplainableRecommendations,
  generatePersonalizedLearningInsights,
} from "../src/server/recommendationEngine";
import { computeLearningAnalytics } from "../src/server/analyticsEngine";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[E2E TEST FAILED]: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`[E2E TEST FAILED]: ${message} (Expected: ${expected}, Got: ${actual})`);
  }
}

function parseTimeToMinutes(timeStr?: string): number {
  if (!timeStr) return -1;
  const m = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return -1;
  let hh = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  const period = m[3].toUpperCase();
  if (period === "PM" && hh !== 12) hh += 12;
  if (period === "AM" && hh === 12) hh = 0;
  return hh * 60 + mm;
}

function offsetDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

console.log("=================================================================");
console.log("🧪 Running StudyPilot Day 5 End-to-End Student Workflow Test Suite");
console.log("=================================================================");

// E2E Stage 1: Subject + Topics + Exam + Assignment + Task Creation -> Weakness Boundaries
{
  console.log("Stage 1: Weakness boundary classification & insufficient-data truth check...");
  const res = analyzeWeaknesses({
    subjects: [
      {
        id: "sub-dsa",
        name: "Data Structures & Algorithms",
        topics: [
          { id: "t-trees", title: "Trees", completed: false },
          { id: "t-graphs", title: "Graphs", completed: false },
          { id: "t-dp", title: "Dynamic Programming", completed: false },
          { id: "t-arrays", title: "Arrays", completed: true },
        ],
      },
    ],
    quizScores: [
      { subjectId: "sub-dsa", subjectName: "Data Structures & Algorithms", topic: "Trees", score: 45, date: offsetDays(-3) },
      { subjectId: "sub-dsa", subjectName: "Data Structures & Algorithms", topic: "Graphs", score: 50, date: offsetDays(-2) },
      { subjectId: "sub-dsa", subjectName: "Data Structures & Algorithms", topic: "Dynamic Programming", score: 75, date: offsetDays(-1) },
    ],
    exams: [
      { id: "ex-1", subjectId: "sub-dsa", subjectName: "Data Structures & Algorithms", title: "DSA Midterm", date: offsetDays(4) },
    ],
  });

  const trees = res.topics.find((t) => t.topic === "Trees")!;
  const graphs = res.topics.find((t) => t.topic === "Graphs")!;
  const dp = res.topics.find((t) => t.topic === "Dynamic Programming")!;
  const arrays = res.topics.find((t) => t.topic === "Arrays")!;

  assertEqual(trees.masteryClassification, "weak", "Score 45 must be weak (<50)");
  assertEqual(graphs.masteryClassification, "developing", "Score 50 boundary must be developing (50..74)");
  assertEqual(dp.masteryClassification, "strong", "Score 75 boundary must be strong (>=75)");
  assertEqual(arrays.masteryClassification, "unknown", "Unquizzed topic Arrays must be unknown (insufficient data)");
  assertEqual(arrays.quizScore ?? null, null, "Unquizzed topic must keep quizScore null");
  console.log("✓ Stage 1 passed.");
}

// E2E Stage 2: Adaptive Planner non-overlap, time budget, completed-task exclusion, and missed-block reschedule
{
  console.log("Stage 2: Adaptive plan generation, non-overlap, budget & reschedule...");
  const ctx = {
    availableStudyHours: 2.5,
    startTime: "02:00 PM",
    subjects: [
      {
        id: "sub-dsa",
        name: "Data Structures & Algorithms",
        topics: [
          { id: "t-trees", title: "Trees", completed: false },
          { id: "t-graphs", title: "Graphs", completed: false },
          { id: "t-arrays", title: "Arrays", completed: true },
        ],
      },
    ],
    tasks: [
      { id: "task-done", title: "Review Arrays", subjectId: "sub-dsa", subjectName: "Data Structures & Algorithms", topic: "Arrays", date: offsetDays(0), priority: "low" as const, status: "completed" as const, estimatedMinutes: 30 },
      { id: "task-todo", title: "Solve 5 Tree Problems", subjectId: "sub-dsa", subjectName: "Data Structures & Algorithms", topic: "Trees", date: offsetDays(0), priority: "high" as const, status: "pending" as const, estimatedMinutes: 45 },
    ],
    assignments: [
      { id: "asg-1", title: "Graph Lab", subjectId: "sub-dsa", subjectName: "Data Structures & Algorithms", dueDate: offsetDays(2), priority: "high" as const, status: "pending" as const },
    ],
    exams: [
      { id: "ex-1", subjectId: "sub-dsa", subjectName: "Data Structures & Algorithms", title: "DSA Midterm", date: offsetDays(4) },
    ],
    quizScores: [
      { subjectId: "sub-dsa", subjectName: "Data Structures & Algorithms", topic: "Trees", score: 45, date: offsetDays(-3) },
    ],
  };

  const plan = generateAdaptivePlan(ctx);
  assert(plan.blocks.length >= 2, "Should generate multiple study blocks");
  assert(plan.totalPlannedMinutes <= 150, `Total planned minutes (${plan.totalPlannedMinutes}) must fit 150m budget`);
  assert(!plan.blocks.some((b) => b.topic === "Review Arrays"), "Completed task must not be scheduled");

  // Non-overlapping schedule timestamps verification
  for (let i = 1; i < plan.blocks.length; i++) {
    const prevEnd = parseTimeToMinutes(plan.blocks[i - 1].endTime);
    const currStart = parseTimeToMinutes(plan.blocks[i].startTime);
    assert(currStart >= prevEnd && prevEnd > 0 && currStart > 0, `Block ${i} (${plan.blocks[i].startTime}) overlaps previous end (${plan.blocks[i - 1].endTime})`);
  }

  // Mark block 0 missed and verify adaptive rescheduling places missed topic back into pending blocks
  const missedBlock = plan.blocks[0];
  const rescheduled = rescheduleAdaptivePlan(
    plan as any,
    { blockId: missedBlock.id, newStatus: "missed", reason: "Missed afternoon slot" },
    ctx
  );
  assert(rescheduled.blocks.some((b) => b.id === missedBlock.id && b.status === "missed"), "Original block must be marked missed");
  assert(
    rescheduled.blocks.some((b) => b.topic === missedBlock.topic && b.status === "pending" && b.isRescheduled),
    "Missed topic must be adaptively rescheduled as a pending block"
  );
  console.log("✓ Stage 2 passed.");
}

// E2E Stage 3: Explainable Recommendations & Analytics Mathematical Verification (45% -> 72% = +27 pts)
{
  console.log("Stage 3: End-to-End Recommendation -> Focus Session -> Improved Quiz -> Analytics Math...");
  const baseSubjects = [
    {
      id: "sub-dsa",
      name: "Data Structures & Algorithms",
      topics: [
        { id: "t-trees", title: "Trees", completed: false },
        { id: "t-graphs", title: "Graphs", completed: false },
      ],
    },
  ];
  const exams = [
    { id: "ex-1", subjectId: "sub-dsa", subjectName: "Data Structures & Algorithms", title: "DSA Midterm", date: offsetDays(4) },
  ];
  const quizScores = [
    { subjectId: "sub-dsa", subjectName: "Data Structures & Algorithms", topic: "Trees", score: 45, date: "2026-11-01" },
    { subjectId: "sub-dsa", subjectName: "Data Structures & Algorithms", topic: "Trees", score: 72, date: "2026-11-13" },
  ];
  const focusSessions = [
    { id: "fs-1", subjectId: "sub-dsa", subjectName: "Data Structures & Algorithms", topic: "Trees", durationMinutes: 50, timestamp: "2026-11-13T15:00:00Z" },
  ];

  // Recommendations check + Complete/Dismiss persistence simulation
  const recRes = generateExplainableRecommendations({
    subjects: baseSubjects,
    exams,
    quizScores,
    focusSessions,
  });
  assert(recRes.recommendations.length > 0 && Boolean(recRes.topRecommendation), "Should generate explainable recommendations");
  assert(Boolean(recRes.topRecommendation!.reason && recRes.topRecommendation!.evidence), "Recommendation must include reason & evidence");

  const topId = recRes.topRecommendation!.id;
  const filteredRecRes = generateExplainableRecommendations({
    subjects: baseSubjects,
    exams,
    quizScores,
    focusSessions,
    completedRecommendationIds: [topId],
  });
  const completedItem = filteredRecRes.recommendations.find((r) => r.id === topId);
  assertEqual(completedItem?.isCompleted, true, "Completed recommendation ID must be marked isCompleted");
  assert(filteredRecRes.topRecommendation?.id !== topId, "Top active recommendation must rotate away from completed item");
  assertEqual(filteredRecRes.completedCount, 1, "Completed recommendation count should equal 1");
  assertEqual(filteredRecRes.activeCount, recRes.activeCount - 1, "Active recommendation count should decrement by 1");

  // Insights check
  const insightsRes = generatePersonalizedLearningInsights({
    subjects: baseSubjects,
    exams,
    quizScores,
    focusSessions,
  });
  assert(insightsRes.insights.length > 0, "Personalized insights must be non-empty");

  // Analytics check: 45% -> 72% = +27 percentage points
  const analytics = computeLearningAnalytics({
    referenceDate: "2026-11-14",
    subjects: baseSubjects,
    exams,
    quizScores,
    focusSessions,
    plannedBlocks: [
      { id: "pb-1", topic: "Trees", durationMinutes: 50, status: "completed", scheduledDate: "2026-11-13" },
      { id: "pb-2", topic: "Graphs", durationMinutes: 45, status: "pending", scheduledDate: "2026-11-14" },
    ],
  });

  const treesComp = analytics.learningImprovement.topicComparisons.find((c) => c.topic === "Trees")!;
  assertEqual(treesComp.absoluteImprovementPoints, 27, "45% -> 72% improvement must be +27 percentage points");
  assertEqual(treesComp.relativePercentageChange, 60, "45% -> 72% relative change must be +60%");
  assertEqual(analytics.overview.totalRecordedStudyMinutes, 50, "Recorded study minutes must equal 50");
  assertEqual(analytics.studyConsistency.completedPlannedSessionsCount, 1, "1 planned session completed");
  assertEqual(analytics.studyConsistency.plannedCompletionPercentage, 50, "1 of 2 planned blocks = 50%");
  assert(analytics.examReadiness.length === 1 && analytics.examReadiness[0].hasSufficientData, "DSA exam readiness must be evaluated");
  console.log("✓ Stage 3 passed.");
}

console.log("=================================================================");
console.log("🎉 ALL DAY 5 E2E STUDENT WORKFLOW SCENARIOS PASSED!");
console.log("=================================================================");
