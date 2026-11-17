import {
  generateExplainableRecommendations,
  generatePersonalizedInsights,
  RecommendationEngineContext,
} from "../src/server/recommendationEngine";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[TEST FAILED]: ${message}`);
  }
}

function assertEqual(actual: any, expected: any, message: string) {
  if (actual !== expected) {
    throw new Error(`[TEST FAILED]: ${message} (Expected: ${expected}, Got: ${actual})`);
  }
}

console.log("==========================================================");
console.log("🧪 Running StudyPilot Recommendation Engine Test Suite");
console.log("==========================================================");

const inDays = (d: number) => {
  const dt = new Date(Date.now() + d * 24 * 60 * 60 * 1000);
  return dt.toISOString().split("T")[0];
};

// Scenario 1: Weak topic with an upcoming examination
{
  console.log("Scenario 1: Weak topic with upcoming exam...");
  const context: RecommendationEngineContext = {
    subjects: [
      {
        id: "sub-dbms",
        name: "Database Systems",
        topics: [{ id: "top-1", title: "Database Management" }],
      },
    ],
    quizScores: [{ topic: "Database Management", score: 42 }],
    exams: [
      {
        id: "ex-1",
        subjectId: "sub-dbms",
        title: "DBMS Midterm",
        date: inDays(3),
        topicsCovered: ["Database Management"],
      },
    ],
  };

  const res = generateExplainableRecommendations(context);
  assert(res.recommendations.length > 0, "Should generate recommendations");
  const top = res.topRecommendation!;
  assertEqual(top.topic, "Database Management", "Topic must be Database Management");
  assertEqual(top.priority, "high", "Priority must be high for weak topic + approaching exam");
  assertEqual(top.category, "approaching_exam", "Category must be approaching_exam");
  assert(top.reason.includes("42%"), "Reason must reference measured 42% score");
  assert(top.reason.includes("Midterm"), "Reason must reference DBMS Midterm");
  console.log("✓ Scenario 1 passed.");
}

// Scenario 2: Strong topic with no urgent deadline
{
  console.log("Scenario 2: Strong topic with no urgent deadline...");
  const context: RecommendationEngineContext = {
    subjects: [
      {
        id: "sub-os",
        name: "Operating Systems",
        topics: [{ id: "top-os", title: "Process Scheduling" }],
      },
    ],
    quizScores: [{ topic: "Process Scheduling", score: 92 }], // Strong (>=75%)
  };

  const res = generateExplainableRecommendations(context);
  const rec = res.recommendations[0];
  assertEqual(rec.priority, "low", "Strong topic with no deadlines must have low priority");
  assertEqual(rec.category, "spaced_revision", "Category must be spaced_revision");
  assert(rec.factors.weaknessScore <= 20, "Weakness score must be low for 92% mastery");
  console.log("✓ Scenario 2 passed.");
}

// Scenario 3: Overdue or due-tomorrow assignment
{
  console.log("Scenario 3: Overdue and urgent assignment handling...");
  const context: RecommendationEngineContext = {
    subjects: [
      {
        id: "sub-ai",
        name: "Artificial Intelligence",
        topics: [{ title: "Machine Learning" }],
      },
    ],
    assignments: [
      {
        id: "asg-1",
        title: "ML Project Phase 1",
        subjectId: "sub-ai",
        subjectName: "Artificial Intelligence",
        dueDate: inDays(1), // Due tomorrow
        priority: "high",
        status: "pending",
      },
    ],
  };

  const res = generateExplainableRecommendations(context);
  const top = res.topRecommendation!;
  assertEqual(top.category, "urgent_assignment", "Should classify as urgent_assignment");
  assertEqual(top.priority, "high", "Tomorrow assignment must be high priority");
  assert(top.factors.deadlineUrgencyScore >= 90, "Deadline urgency score must be >= 90");
  console.log("✓ Scenario 3 passed.");
}

// Scenario 4: Topic with no quiz history
{
  console.log("Scenario 4: Topic with no quiz history...");
  const context: RecommendationEngineContext = {
    subjects: [
      {
        id: "sub-math",
        name: "Discrete Mathematics",
        topics: [{ title: "Graph Theory" }],
      },
    ],
    quizScores: [], // No quiz history!
  };

  const res = generateExplainableRecommendations(context);
  const rec = res.recommendations[0];
  assertEqual(rec.category, "needs_diagnostic", "Category must be needs_diagnostic");
  assertEqual(rec.actionType, "take_quiz", "Action type must be take_quiz");
  assert(rec.evidence.includes("Insufficient quiz data"), "Evidence must indicate insufficient data");
  assert(!rec.reason.includes("Weak topic mastery"), "Must NOT label as weak without quiz data");
  console.log("✓ Scenario 4 passed.");
}

// Scenario 5: Topic whose performance has improved
{
  console.log("Scenario 5: Measured performance improvement detection...");
  const context: RecommendationEngineContext = {
    subjects: [
      {
        id: "sub-dsa",
        name: "Data Structures",
        topics: [{ title: "Binary Search Trees" }],
      },
    ],
    quizScores: [
      { topic: "Binary Search Trees", score: 45, date: "2026-10-10" },
      { topic: "Binary Search Trees", score: 85, date: "2026-10-20" }, // +40% improvement!
    ],
  };

  const insRes = generatePersonalizedInsights(context);
  const improvementInsight = insRes.insights.find((i) => i.id.startsWith("ins-improvement"));
  assert(!!improvementInsight, "Must detect measured mastery improvement insight");
  assertEqual(improvementInsight!.type, "positive", "Type must be positive");
  assertEqual(improvementInsight!.category, "mastery", "Category must be mastery");
  assert(improvementInsight!.observation.includes("45% to 85%"), "Observation must cite exact scores");
  assert(improvementInsight!.evidence.includes("+40%"), "Evidence must cite +40% gain");
  console.log("✓ Scenario 5 passed.");
}

// Scenario 6: Missing or invalid examination dates
{
  console.log("Scenario 6: Missing or invalid exam dates resilience...");
  const context: RecommendationEngineContext = {
    subjects: [{ id: "s-1", name: "Physics", topics: [{ title: "Optics" }] }],
    exams: [
      { id: "bad-1", title: "Invalid Date Exam", date: "invalid-date-string" },
      { id: "bad-2", title: "Past Exam", date: "2020-01-01" },
    ],
  };

  const res = generateExplainableRecommendations(context);
  assert(res.recommendations.length > 0, "Should generate recommendation safely");
  assertEqual(res.recommendations[0].daysToDeadline, null, "Invalid dates should yield null deadline");
  console.log("✓ Scenario 6 passed.");
}

// Scenario 7: Completed task not recommended again
{
  console.log("Scenario 7: Completed task filtering...");
  const context: RecommendationEngineContext = {
    subjects: [
      {
        id: "sub-1",
        name: "Networks",
        topics: [
          { id: "top-done", title: "TCP IP Protocol", completed: true },
          { id: "top-pending", title: "DNS Routing", completed: false },
        ],
      },
    ],
    tasks: [
      {
        id: "t-done",
        title: "TCP IP Protocol Lab",
        subjectId: "sub-1",
        topic: "TCP IP Protocol",
        status: "completed",
      },
    ],
    quizScores: [
      { topic: "TCP IP Protocol", score: 85 },
      { topic: "DNS Routing", score: 55 },
    ],
  };

  const res = generateExplainableRecommendations(context);
  const tcpRec = res.recommendations.find((r) => r.topic === "TCP IP Protocol");
  assertEqual(tcpRec, undefined, "Completed task/topic must NOT be recommended");
  assert(res.recommendations.some((r) => r.topic === "DNS Routing"), "Pending DNS Routing must be recommended");
  console.log("✓ Scenario 7 passed.");
}

// Scenario 8: Missed study session creates actionable recommendation
{
  console.log("Scenario 8: Missed study session recommendation...");
  const context: RecommendationEngineContext = {
    subjects: [
      {
        id: "sub-algo",
        name: "Algorithms",
        topics: [{ title: "Dynamic Programming" }],
      },
    ],
    previouslyMissedTopicNames: ["Dynamic Programming"],
  };

  const res = generateExplainableRecommendations(context);
  const rec = res.recommendations[0];
  assertEqual(rec.category, "missed_session", "Category must be missed_session");
  assert(rec.title.includes("Reschedule Missed Session"), "Title must mention Reschedule Missed Session");
  assertEqual(rec.factors.taskImportanceScore, 95, "Missed session must boost importance score to 95");
  console.log("✓ Scenario 8 passed.");
}

// Scenario 9: Empty student data returns clean zero state
{
  console.log("Scenario 9: Empty student data zero-state...");
  const res = generateExplainableRecommendations({});
  assertEqual(res.totalGenerated, 1, "Should return 1 onboarding setup recommendation");
  assertEqual(res.recommendations[0].topic, "Course Setup", "Topic should be Course Setup");
  const insRes = generatePersonalizedInsights({});
  assertEqual(insRes.totalCount, 1, "Should return 1 onboarding setup insight");
  assertEqual(insRes.insights[0].title, "Setup Study Curriculum", "Title should be Setup Study Curriculum");
  console.log("✓ Scenario 9 passed.");
}

// Scenario 10: Duplicate recommendation prevention
{
  console.log("Scenario 10: Duplicate recommendation prevention...");
  const context: RecommendationEngineContext = {
    subjects: [
      {
        id: "s-1",
        name: "Compilers",
        topics: [
          { title: "Lexical Analysis" },
          { title: "Lexical Analysis" }, // duplicate topic in syllabus
        ],
      },
    ],
  };

  const res = generateExplainableRecommendations(context);
  const lexCount = res.recommendations.filter((r) => r.topic === "Lexical Analysis").length;
  assertEqual(lexCount, 1, "Duplicate topic must yield exactly 1 recommendation");
  console.log("✓ Scenario 10 passed.");
}

// Scenario 11: Completing a recommendation
{
  console.log("Scenario 11: Completing a recommendation...");
  const baseContext: RecommendationEngineContext = {
    subjects: [{ id: "s-1", name: "Security", topics: [{ title: "Cryptography" }] }],
  };
  const res1 = generateExplainableRecommendations(baseContext);
  const targetId = res1.recommendations[0].id;

  const res2 = generateExplainableRecommendations({
    ...baseContext,
    completedRecommendationIds: [targetId],
  });

  const completedRec = res2.recommendations.find((r) => r.id === targetId);
  assertEqual(completedRec?.isCompleted, true, "Target recommendation must be marked completed");
  assertEqual(res2.completedCount, 1, "Completed count must be 1");
  assertEqual(res2.activeCount, 0, "Active count must be 0");
  console.log("✓ Scenario 11 passed.");
}

// Scenario 12: Dismissing a recommendation
{
  console.log("Scenario 12: Dismissing a recommendation...");
  const baseContext: RecommendationEngineContext = {
    subjects: [{ id: "s-1", name: "Security", topics: [{ title: "Cryptography" }] }],
  };
  const res1 = generateExplainableRecommendations(baseContext);
  const targetId = res1.recommendations[0].id;

  const res2 = generateExplainableRecommendations({
    ...baseContext,
    dismissedRecommendationIds: [targetId],
  });

  const dismissedRec = res2.recommendations.find((r) => r.id === targetId);
  assertEqual(dismissedRec?.isDismissed, true, "Target recommendation must be marked dismissed");
  assertEqual(res2.dismissedCount, 1, "Dismissed count must be 1");
  assertEqual(res2.activeCount, 0, "Active count must be 0");
  console.log("✓ Scenario 12 passed.");
}

// Scenario 13: Refreshing recommendations after a new quiz result
{
  console.log("Scenario 13: Refreshing after new quiz result...");
  const baseSubjects = [
    { id: "sub-1", name: "Physics", topics: [{ title: "Quantum Physics" }, { title: "Thermodynamics" }] },
  ];

  // State 1: Quantum Physics is weak (35%), Thermodynamics is 75%
  const res1 = generateExplainableRecommendations({
    subjects: baseSubjects,
    quizScores: [
      { topic: "Quantum Physics", score: 35 },
      { topic: "Thermodynamics", score: 75 },
    ],
  });
  assertEqual(res1.topRecommendation?.topic, "Quantum Physics", "Quantum Physics must lead in state 1");

  // State 2: Student retakes quiz, Quantum Physics rises to 95%, Thermodynamics drops to 30%
  const res2 = generateExplainableRecommendations({
    subjects: baseSubjects,
    quizScores: [
      { topic: "Quantum Physics", score: 95 },
      { topic: "Thermodynamics", score: 30 },
    ],
  });
  assertEqual(res2.topRecommendation?.topic, "Thermodynamics", "Thermodynamics must now lead in state 2");
  console.log("✓ Scenario 13 passed.");
}

// Scenario 14: Deterministic scoring and priority verification
{
  console.log("Scenario 14: Deterministic scoring test...");
  const context: RecommendationEngineContext = {
    subjects: [
      { id: "s-1", name: "Math", topics: [{ title: "Linear Algebra" }] },
    ],
    quizScores: [{ topic: "Linear Algebra", score: 50 }],
  };

  const runA = generateExplainableRecommendations(context);
  const runB = generateExplainableRecommendations(context);
  assertEqual(runA.topRecommendation?.priorityScore, runB.topRecommendation?.priorityScore, "Scores must be deterministic");
  assertEqual(runA.topRecommendation?.reason, runB.topRecommendation?.reason, "Reasons must be deterministic");
  console.log("✓ Scenario 14 passed.");
}

// Scenario 15: Personalized insights coverage for persistent weakness
{
  console.log("Scenario 15: Persistent weakness insight verification...");
  const context: RecommendationEngineContext = {
    subjects: [
      { id: "s-dbms", name: "DBMS", topics: [{ title: "Normalization" }] },
    ],
    quizScores: [
      { topic: "Normalization", score: 40, date: "2026-10-15" },
      { topic: "Normalization", score: 45, date: "2026-10-20" },
    ],
  };

  const insRes = generatePersonalizedInsights(context);
  const weakInsight = insRes.insights.find((i) => i.id.startsWith("ins-persistent-weakness"));
  assert(!!weakInsight, "Must generate persistent weakness insight");
  assertEqual(weakInsight!.type, "urgent", "Persistent weakness must be urgent");
  assert(weakInsight!.observation.includes("Normalization"), "Must observe Normalization");
  assert(weakInsight!.action.includes("re-test"), "Action must recommend focused session and re-test");
  console.log("✓ Scenario 15 passed.");
}

console.log("==========================================================");
console.log("🎉 ALL 15 RECOMMENDATION ENGINE TEST SCENARIOS PASSED!");
console.log("==========================================================");
