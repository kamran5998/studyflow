import {
  analyzeWeaknesses,
  DEFAULT_THRESHOLDS,
  WeaknessEngineContext,
} from "../src/server/weaknessDetector";

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

console.log("=================================================");
console.log("🧪 Running StudyPilot Weakness Engine Test Suite");
console.log("=================================================");

// Test 1: Empty inputs gracefully handled
{
  console.log("Test 1: Empty input returns clean zero-state result...");
  const res = analyzeWeaknesses({});
  assertEqual(res.topics.length, 0, "Topics length should be 0");
  assertEqual(res.summary.totalAnalyzed, 0, "Total analyzed should be 0");
  assertEqual(res.summary.weakCount, 0, "Weak count should be 0");
  assert(res.summary.aiDiagnostic.includes("No subjects"), "AI diagnostic should guide user to add subjects");
  console.log("✓ Test 1 passed.");
}

// Test 2: Standard Prompt Illustrative Example
// Input: Topic: "Database Management", Measured quiz score: 42%, Exam: 3 days away.
{
  console.log("Test 2: Illustrative Example (Topic: Database Management, score: 42%, exam in 3 days)...");
  const in3Days = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const context: WeaknessEngineContext = {
    subjects: [
      {
        id: "sub-dbms",
        name: "Database Systems",
        topics: [{ id: "top-1", title: "Database Management", completed: false }],
      },
    ],
    quizScores: [
      {
        subjectId: "sub-dbms",
        topic: "Database Management",
        score: 42,
        date: "2026-10-20",
      },
    ],
    exams: [
      {
        id: "exam-dbms",
        subjectId: "sub-dbms",
        title: "DBMS Midterm",
        date: in3Days,
        topicsCovered: ["Database Management"],
      },
    ],
  };

  const res = analyzeWeaknesses(context);
  assertEqual(res.topics.length, 1, "Should analyze 1 topic");
  const topic = res.topics[0];

  assertEqual(topic.masteryClassification, "weak", "Should be classified as Weak (<50%)");
  assertEqual(topic.evidenceSource, "measured_quiz", "Evidence source must be measured_quiz");
  assertEqual(topic.confidence, "medium", "Single attempt should have medium confidence");
  assertEqual(topic.quizScore, 42, "Measured quiz score must be 42%");
  assertEqual(topic.revisionPriority, "high", "Exam in 3 days must trigger high revision priority");
  assertEqual(topic.isExamUrgent, true, "isExamUrgent must be true (<7 days)");
  assert(topic.explanation.includes("42%"), "Explanation must reference measured 42% score");
  assert(topic.explanation.includes("50%"), "Explanation must reference 50% threshold");
  assert(topic.explanation.includes("3 day"), "Explanation must reference exam proximity");
  console.log("✓ Test 2 passed.");
}

// Test 3: Rule — Never fabricate scores; topics without quizzes must be 'unknown'
{
  console.log("Test 3: Zero-fabrication check (Topics without quizzes)...");
  const context: WeaknessEngineContext = {
    subjects: [
      {
        id: "sub-algo",
        name: "Algorithms",
        topics: [
          { id: "top-sort", title: "Merge Sort", completed: true },
          { id: "top-dp", title: "Dynamic Programming", completed: false },
        ],
      },
    ],
    quizScores: [], // No quizzes taken!
  };

  const res = analyzeWeaknesses(context);
  assertEqual(res.topics.length, 2, "Should return both topics");

  for (const t of res.topics) {
    assertEqual(t.masteryClassification, "unknown", "Unquizzed topic must be unknown");
    assertEqual(t.quizScore, null, "Measured quiz score must be null, never fabricated");
    assertEqual(t.evidenceSource, "insufficient_data", "Evidence source must be insufficient_data");
    assertEqual(t.confidence, "insufficient_data", "Confidence must be insufficient_data");
    assertEqual(t.label, "Needs Quiz", "Label must be Needs Quiz");
    assert(t.explanation.includes("No quiz attempts recorded"), "Must explain quiz is needed");
  }
  assertEqual(res.summary.unknownCount, 2, "Unknown count should be 2");
  assertEqual(res.summary.weakCount, 0, "Must NOT classify unquizzed topics as weak");
  console.log("✓ Test 3 passed.");
}

// Test 4: Threshold Boundaries (<50% Weak, 50-74% Developing, >=75% Strong)
{
  console.log("Test 4: Threshold boundaries (<50, 50-74, >=75)...");
  const context: WeaknessEngineContext = {
    subjects: [
      {
        id: "sub-1",
        name: "Math",
        topics: [
          { title: "Linear Algebra" },
          { title: "Calculus" },
          { title: "Probability" },
          { title: "Discrete Math" },
        ],
      },
    ],
    quizScores: [
      { topic: "Linear Algebra", score: 49 }, // Weak (< 50)
      { topic: "Calculus", score: 50 },       // Developing (50 - 74)
      { topic: "Probability", score: 74 },    // Developing (50 - 74)
      { topic: "Discrete Math", score: 75 },  // Strong (>= 75)
    ],
  };

  const res = analyzeWeaknesses(context);
  const byTopic = new Map(res.topics.map((t) => [t.topic, t]));

  assertEqual(byTopic.get("Linear Algebra")?.masteryClassification, "weak", "Score 49 should be weak");
  assertEqual(byTopic.get("Calculus")?.masteryClassification, "developing", "Score 50 should be developing");
  assertEqual(byTopic.get("Probability")?.masteryClassification, "developing", "Score 74 should be developing");
  assertEqual(byTopic.get("Discrete Math")?.masteryClassification, "strong", "Score 75 should be strong");
  console.log("✓ Test 4 passed.");
}

// Test 5: Multiple Quiz Attempts Handling
// 65% weight on latest, 35% on average
{
  console.log("Test 5: Multiple quiz attempts weighting...");
  const context: WeaknessEngineContext = {
    subjects: [
      {
        id: "sub-cs",
        name: "Computer Science",
        topics: [{ title: "Operating Systems" }],
      },
    ],
    quizScores: [
      { topic: "Operating Systems", score: 40, date: "2026-10-10" },
      { topic: "Operating Systems", score: 60, date: "2026-10-15" },
      { topic: "Operating Systems", score: 80, date: "2026-10-20" }, // Latest attempt
    ],
  };

  // Scores: [40, 60, 80]
  // Latest: 80
  // Average: (40 + 60 + 80) / 3 = 60
  // Weighted: Math.round(80 * 0.65 + 60 * 0.35) = Math.round(52 + 21) = 73 -> Developing!
  const res = analyzeWeaknesses(context);
  const topic = res.topics[0];
  assertEqual(topic.attemptCount, 3, "Attempt count should be 3");
  assertEqual(topic.confidence, "high", "Multiple attempts should have high confidence");
  assertEqual(topic.latestQuizScore, 80, "Latest score should be 80");
  assertEqual(topic.highestQuizScore, 80, "Highest score should be 80");
  assertEqual(topic.quizScore, 73, "Weighted score should be 73");
  assertEqual(topic.masteryClassification, "developing", "Score 73 should be developing");
  console.log("✓ Test 5 passed.");
}

// Test 6: Custom Configurable Thresholds
{
  console.log("Test 6: Custom configurable thresholds (weakMax: 60, strongMin: 85)...");
  const context: WeaknessEngineContext = {
    thresholds: { weakMax: 60, strongMin: 85 },
    subjects: [
      {
        id: "sub-p",
        name: "Physics",
        topics: [
          { title: "Thermodynamics" },
          { title: "Electromagnetism" },
          { title: "Optics" },
        ],
      },
    ],
    quizScores: [
      { topic: "Thermodynamics", score: 55 },   // < 60 -> Weak under custom threshold
      { topic: "Electromagnetism", score: 70 }, // 60-84 -> Developing under custom threshold
      { topic: "Optics", score: 85 },           // >= 85 -> Strong under custom threshold
    ],
  };

  const res = analyzeWeaknesses(context);
  const byTopic = new Map(res.topics.map((t) => [t.topic, t]));
  assertEqual(byTopic.get("Thermodynamics")?.masteryClassification, "weak", "55 should be weak under custom 60 max");
  assertEqual(byTopic.get("Electromagnetism")?.masteryClassification, "developing", "70 should be developing under custom bounds");
  assertEqual(byTopic.get("Optics")?.masteryClassification, "strong", "85 should be strong under custom 85 min");
  console.log("✓ Test 6 passed.");
}

// Test 7: Score clamping and invalid value sanitization
{
  console.log("Test 7: Score sanitization and clamping (-15 -> 0, 150 -> 100)...");
  const context: WeaknessEngineContext = {
    subjects: [
      {
        id: "sub-chem",
        name: "Chemistry",
        topics: [
          { title: "Organic" },
          { title: "Inorganic" },
        ],
      },
    ],
    quizScores: [
      { topic: "Organic", score: -15 }, // Should clamp to 0
      { topic: "Inorganic", score: 150 }, // Should clamp to 100
    ],
  };

  const res = analyzeWeaknesses(context);
  const byTopic = new Map(res.topics.map((t) => [t.topic, t]));
  assertEqual(byTopic.get("Organic")?.quizScore, 0, "Negative score must clamp to 0");
  assertEqual(byTopic.get("Organic")?.masteryClassification, "weak", "0 must be classified as weak");
  assertEqual(byTopic.get("Inorganic")?.quizScore, 100, "Out-of-bound score must clamp to 100");
  assertEqual(byTopic.get("Inorganic")?.masteryClassification, "strong", "100 must be classified as strong");
  console.log("✓ Test 7 passed.");
}

console.log("=================================================");
console.log("🎉 ALL WEAKNESS ENGINE TESTS PASSED SUCCESSFULLY!");
console.log("=================================================");
