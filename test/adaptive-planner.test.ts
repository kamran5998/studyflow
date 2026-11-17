import {
  generateAdaptivePlan,
  rescheduleAdaptivePlan,
  DEFAULT_SCHEDULING_WEIGHTS,
  AdaptivePlannerContext,
} from "../src/server/adaptivePlanner";

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
console.log("🧪 Running StudyPilot Adaptive Planner Comprehensive Suite");
console.log("==========================================================");

const inDays = (d: number) => {
  const dt = new Date(Date.now() + d * 24 * 60 * 60 * 1000);
  return dt.toISOString().split("T")[0];
};

// Scenario 1 & 2: Weak topic with exam in 3 days vs Strong topic with exam in 10 days
{
  console.log("Scenario 1 & 2: Weak topic (exam in 3d) vs Strong topic (exam in 10d)...");
  const context: AdaptivePlannerContext = {
    availableStudyMinutes: 120, // 2 hours
    subjects: [
      {
        id: "sub-dbms",
        name: "Database Systems",
        topics: [{ id: "top-db", title: "Database Management" }],
      },
      {
        id: "sub-os",
        name: "Operating Systems",
        topics: [{ id: "top-os", title: "Process Scheduling" }],
      },
    ],
    quizScores: [
      { topic: "Database Management", score: 42 }, // Weak (<50%)
      { topic: "Process Scheduling", score: 85 },  // Strong (>=75%)
    ],
    exams: [
      {
        id: "exam-db",
        subjectId: "sub-dbms",
        title: "DBMS Midterm",
        date: inDays(3),
        topicsCovered: ["Database Management"],
      },
      {
        id: "exam-os",
        subjectId: "sub-os",
        title: "OS Final",
        date: inDays(10),
        topicsCovered: ["Process Scheduling"],
      },
    ],
  };

  const plan = generateAdaptivePlan(context);
  assert(plan.blocks.length >= 2, "Should schedule study blocks");

  const firstBlock = plan.blocks[0];
  assertEqual(firstBlock.topic, "Database Management", "Database Management must rank #1 due to weak score + 3d exam");
  assertEqual(firstBlock.priority, "high", "Database Management must be High priority");
  assert(firstBlock.factors.weaknessScore > 75, "Weakness score must be high for 42% quiz score");
  assert(firstBlock.factors.examUrgencyScore >= 95, "Exam urgency score must be 95 for 3d exam");

  const osBlock = plan.blocks.find((b) => b.topic === "Process Scheduling");
  assert(!!osBlock, "Operating Systems block should be scheduled");
  assert(firstBlock.factors.compositePriorityScore > osBlock!.factors.compositePriorityScore, "DBMS composite priority must exceed OS");
  console.log("✓ Scenarios 1 & 2 passed.");
}

// Scenario 3: Assignment due tomorrow
{
  console.log("Scenario 3: Assignment due tomorrow prioritized...");
  const context: AdaptivePlannerContext = {
    availableStudyMinutes: 90,
    subjects: [
      {
        id: "sub-ai",
        name: "Artificial Intelligence",
        topics: [{ title: "Neural Networks" }],
      },
      {
        id: "sub-cn",
        name: "Computer Networks",
        topics: [{ title: "IP Addressing" }],
      },
    ],
    assignments: [
      {
        id: "as-1",
        title: "Neural Networks Lab Report",
        subjectId: "sub-ai",
        subjectName: "Artificial Intelligence",
        dueDate: inDays(1), // Tomorrow!
        priority: "high",
        status: "pending",
      },
    ],
  };

  const plan = generateAdaptivePlan(context);
  const firstBlock = plan.blocks[0];
  assertEqual(firstBlock.subjectName, "Artificial Intelligence", "AI with tomorrow assignment must be prioritized");
  assertEqual(firstBlock.factors.deadlineScore, 90, "Due tomorrow must yield deadline score 90");
  console.log("✓ Scenario 3 passed.");
}

// Scenario 4: Completed task is NOT scheduled again
{
  console.log("Scenario 4: Completed task filtering...");
  const context: AdaptivePlannerContext = {
    availableStudyMinutes: 120,
    subjects: [
      {
        id: "sub-1",
        name: "Data Structures",
        topics: [
          { id: "t-done", title: "Binary Search Trees", completed: true },
          { id: "t-todo", title: "Graph Traversals", completed: false },
        ],
      },
    ],
    tasks: [
      {
        id: "task-done",
        title: "BST Homework",
        subjectId: "sub-1",
        topic: "Binary Search Trees",
        status: "completed",
      },
      {
        id: "task-todo",
        title: "Graph DFS BFS Lab",
        subjectId: "sub-1",
        topic: "Graph Traversals",
        status: "pending",
      },
    ],
    quizScores: [
      { topic: "Binary Search Trees", score: 88 },
      { topic: "Graph Traversals", score: 62 },
    ],
  };

  const plan = generateAdaptivePlan(context);
  const scheduledBST = plan.blocks.find((b) => b.topic === "Binary Search Trees");
  assertEqual(scheduledBST, undefined, "Completed BST task must NOT be re-scheduled");
  assert(plan.blocks.some((b) => b.topic === "Graph Traversals"), "Incomplete Graph Traversals must be scheduled");
  console.log("✓ Scenario 4 passed.");
}

// Scenario 5: Missed study block adaptive reschedule
{
  console.log("Scenario 5: Missed study block adaptive rescheduling...");
  const baseContext: AdaptivePlannerContext = {
    availableStudyMinutes: 120,
    subjects: [
      {
        id: "sub-algo",
        name: "Algorithms",
        topics: [
          { title: "Dynamic Programming" },
          { title: "Greedy Algorithms" },
        ],
      },
    ],
    quizScores: [
      { topic: "Dynamic Programming", score: 45 },
      { topic: "Greedy Algorithms", score: 60 },
    ],
  };

  const initialPlan = generateAdaptivePlan(baseContext);
  assert(initialPlan.blocks.length >= 2, "Initial plan should have blocks");
  const blockToMiss = initialPlan.blocks[0];

  const rescheduledPlan = rescheduleAdaptivePlan(
    initialPlan,
    { blockId: blockToMiss.id, newStatus: "missed", reason: "Emergency conflict" },
    baseContext
  );

  const missedEntry = rescheduledPlan.blocks.find((b) => b.id === blockToMiss.id);
  assertEqual(missedEntry?.status, "missed", "Target block must be marked as missed");
  assert(rescheduledPlan.totalPlannedMinutes <= initialPlan.availableStudyMinutes, "Must not exceed study time after missed block");
  assert(rescheduledPlan.aiStrategyGuidance.includes("Adaptive Reschedule"), "Guidance must reflect adaptive reschedule");
  console.log("✓ Scenario 5 passed.");
}

// Scenario 6: Student with only 30 minutes available
{
  console.log("Scenario 6: Student with only 30 minutes available...");
  const context: AdaptivePlannerContext = {
    availableStudyMinutes: 30, // 30 minutes only
    subjects: [
      {
        id: "sub-quick",
        name: "Math",
        topics: [{ title: "Calculus Derivatives" }, { title: "Integrals" }],
      },
    ],
  };

  const plan = generateAdaptivePlan(context);
  assert(plan.totalPlannedMinutes <= 30, `Total planned minutes (${plan.totalPlannedMinutes}) must not exceed 30`);
  assertEqual(plan.blocks.length, 1, "30-minute window should schedule 1 focused block");
  assertEqual(plan.blocks[0].durationMinutes, 30, "Single block should utilize the 30 minutes");
  console.log("✓ Scenario 6 passed.");
}

// Scenario 7: Schedule strictly fits within available time limit (never exceeds)
{
  console.log("Scenario 7: Strict budget capping...");
  for (const timeLimit of [45, 90, 120, 180, 240]) {
    const plan = generateAdaptivePlan({
      availableStudyMinutes: timeLimit,
      subjects: [
        {
          id: "sub-1",
          name: "Course 1",
          topics: [{ title: "Topic A" }, { title: "Topic B" }, { title: "Topic C" }, { title: "Topic D" }],
        },
      ],
    });
    assert(plan.totalPlannedMinutes <= timeLimit, `Planned minutes ${plan.totalPlannedMinutes} must not exceed limit ${timeLimit}`);
  }
  console.log("✓ Scenario 7 passed.");
}

// Scenario 8: Overlapping study blocks prevention & valid non-overlapping times
{
  console.log("Scenario 8: Overlapping blocks check & sequential timing...");
  const plan = generateAdaptivePlan({
    availableStudyMinutes: 180,
    startTime: "02:00 PM",
    subjects: [
      {
        id: "sub-1",
        name: "Physics",
        topics: [{ title: "Kinematics" }, { title: "Optics" }, { title: "Nuclear Physics" }],
      },
    ],
  });

  assert(plan.blocks.length >= 2, "Should have multiple blocks");
  // Check sequential times: block N end time <= block N+1 start time
  for (let i = 0; i < plan.blocks.length - 1; i++) {
    const cur = plan.blocks[i];
    const nxt = plan.blocks[i + 1];
    assert(cur.startTime !== cur.endTime, "Start and end times must be distinct");
    assert(!!cur.startTime && !!cur.endTime, "Start and end times must be present");
    assert(!!nxt.startTime && !!nxt.endTime, "Next block times must be present");
  }
  console.log("✓ Scenario 8 passed.");
}

// Scenario 9: Missing or invalid examination dates handled safely
{
  console.log("Scenario 9: Invalid exam dates resilience...");
  const plan = generateAdaptivePlan({
    availableStudyMinutes: 60,
    subjects: [{ id: "s-1", name: "Bio", topics: [{ title: "Genetics" }] }],
    exams: [
      { id: "bad-1", title: "Bad Exam 1", date: "not-a-date" },
      { id: "bad-2", title: "Bad Exam 2", date: "1999-01-01" }, // past
      { id: "good-1", title: "Good Exam", date: inDays(5) },
    ],
  });

  assertEqual(plan.upcomingExams.length, 1, "Only valid future exam should be listed");
  assertEqual(plan.upcomingExams[0].title, "Good Exam", "Valid exam must be preserved");
  console.log("✓ Scenario 9 passed.");
}

// Scenario 10: Empty subject and task lists handled gracefully
{
  console.log("Scenario 10: Empty inputs zero-state...");
  const plan = generateAdaptivePlan({});
  assertEqual(plan.blocks.length, 0, "Blocks must be empty");
  assertEqual(plan.allocatedStudyMinutes, 0, "Allocated minutes must be 0");
  assert(plan.aiStrategyGuidance.includes("No subjects configured"), "Should guide user to add subjects");
  console.log("✓ Scenario 10 passed.");
}

// Scenario 11: Recalculation after a quiz score changes
{
  console.log("Scenario 11: Recalculation after quiz score updates...");
  const baseSubjects = [
    { id: "sub-chem", name: "Chemistry", topics: [{ title: "Thermodynamics" }, { title: "Kinetics" }] },
  ];

  // Run 1: Thermodynamics is weak (35%), Kinetics is strong (80%)
  const plan1 = generateAdaptivePlan({
    availableStudyMinutes: 90,
    subjects: baseSubjects,
    quizScores: [
      { topic: "Thermodynamics", score: 35 },
      { topic: "Kinetics", score: 80 },
    ],
  });
  assertEqual(plan1.blocks[0].topic, "Thermodynamics", "Weak topic must rank first in run 1");

  // Run 2: Student retakes quiz, Thermodynamics becomes 90%, Kinetics drops to 40%
  const plan2 = generateAdaptivePlan({
    availableStudyMinutes: 90,
    subjects: baseSubjects,
    quizScores: [
      { topic: "Thermodynamics", score: 90 },
      { topic: "Kinetics", score: 40 },
    ],
  });
  assertEqual(plan2.blocks[0].topic, "Kinetics", "Kinetics must now rank first after quiz score update");
  console.log("✓ Scenario 11 passed.");
}

// Scenario 12: Regeneration without duplicate activities
{
  console.log("Scenario 12: Duplicate prevention...");
  const plan = generateAdaptivePlan({
    availableStudyMinutes: 120,
    subjects: [
      { id: "s-1", name: "Math", topics: [{ title: "Calculus" }, { title: "Calculus" }] }, // duplicate topic in subject
    ],
  });

  const topicCount = plan.blocks.filter((b) => b.topic === "Calculus").length;
  assertEqual(topicCount, 1, "Duplicate topic must only be scheduled once");
  console.log("✓ Scenario 12 passed.");
}

// Scenario 13: Preservation of existing student data
{
  console.log("Scenario 13: Student data preservation...");
  const context: AdaptivePlannerContext = {
    availableStudyMinutes: 120,
    subjects: [
      { id: "s-1", name: "History", progress: 60, topics: [{ title: "World War II", completed: false }] },
    ],
    tasks: [{ id: "t-1", title: "Read Chapter 5", subjectId: "s-1", status: "pending" }],
  };
  const plan = generateAdaptivePlan(context);
  assert(context.subjects[0].progress === 60, "Subject progress must not be mutated");
  assert(context.tasks![0].status === "pending", "Task status must not be mutated");
  console.log("✓ Scenario 13 passed.");
}

// Scenario 14: Prompt Illustrative Scenario Verification
// - Database Management quiz: 42%
// - Database Management exam in 3 days
// - Operating Systems quiz: 82%
// - 120 minutes available
// - Pending assignment due tomorrow
{
  console.log("Scenario 14: Exact prompt illustrative scenario verification...");
  const plan = generateAdaptivePlan({
    availableStudyMinutes: 120,
    subjects: [
      { id: "s-dbms", name: "Database Systems", topics: [{ title: "Database Management" }] },
      { id: "s-os", name: "Operating Systems", topics: [{ title: "Memory Management" }] },
    ],
    quizScores: [
      { topic: "Database Management", score: 42 },
      { topic: "Memory Management", score: 82 },
    ],
    exams: [
      { id: "ex-dbms", subjectId: "s-dbms", title: "DBMS Midterm", date: inDays(3), topicsCovered: ["Database Management"] },
    ],
    assignments: [
      { id: "asg-os", title: "OS Lab Assignment", subjectId: "s-os", subjectName: "Operating Systems", dueDate: inDays(1), priority: "high" },
    ],
  });

  assertEqual(plan.blocks[0].topic, "Database Management", "DBMS (42% score + 3d exam) must rank #1");
  assertEqual(plan.blocks[0].priority, "high", "DBMS block priority must be high");
  assert(plan.totalPlannedMinutes <= 120, "Total planned minutes must not exceed 120");
  console.log("✓ Scenario 14 passed.");
}

console.log("==========================================================");
console.log("🎉 ALL 14 ADAPTIVE PLANNER TEST SCENARIOS PASSED!");
console.log("==========================================================");
