export type Priority = 'low' | 'medium' | 'high';
export type TaskStatus = 'pending' | 'in_progress' | 'completed';
export type AssignmentStatus = 'pending' | 'in_progress' | 'completed';

export interface SubjectTopic {
  id: string;
  title: string;
  completed: boolean;
  weightage?: number; // e.g. 25 marks / percentage
  weightageLevel?: 'high' | 'medium' | 'low';
}

export interface Subject {
  id: string;
  name: string;
  code?: string;
  color: string; // hex or tailwind badge color
  iconName: string; // Lucide icon identifier
  progress: number; // 0 to 100
  topics: SubjectTopic[];
  targetHours?: number;
  totalStudyMinutes?: number;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  subjectId: string;
  subjectName: string;
  topic?: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
  priority: Priority;
  status: TaskStatus;
  estimatedMinutes?: number;
  completedAt?: string;
}

export interface Assignment {
  id: string;
  title: string;
  subjectId: string;
  subjectName: string;
  dueDate: string; // YYYY-MM-DD
  priority: Priority;
  status: AssignmentStatus;
  description?: string;
  points?: number;
}

export interface Exam {
  id: string;
  subjectId: string;
  subjectName: string;
  title: string; // e.g. "Midterm Exam", "Final Exam"
  date: string; // YYYY-MM-DD
  time?: string; // e.g. "10:00 AM"
  room?: string;
  preparationPercentage: number; // 0 to 100 (auto-calculated from topics + quizzes + focus time)
  targetHours?: number;
  topicsCovered?: string[];
  topicWeightages?: Record<string, number>; // topic title/id -> marks weightage
  notes?: string;
}

export interface ExamReadinessBreakdown {
  overallReadiness: number;
  topicCompletionRate: number;
  totalTopics: number;
  completedTopics: number;
  quizAverageScore: number;
  quizzesTaken: number;
  focusTimeProgress: number;
  totalFocusMinutes: number;
  targetFocusMinutes: number;
  statusLabel: string;
}

export interface FocusSession {
  id: string;
  subjectId: string;
  subjectName: string;
  topic?: string;
  durationMinutes: number;
  rating?: number; // 1 to 5
  timestamp: string; // ISO string
  notes?: string;
}

export interface StudentProfile {
  name: string;
  email: string;
  avatarUrl?: string;
  institution: string;
  major: string;
  semester: string;
  studentId: string;
  dailyGoalHours: number;
  streakDays: number;
  lastActiveDate: string;
  focusScore: number;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'exam' | 'assignment' | 'streak' | 'general';
  linkPage?: string;
}

export interface StudyFlowSettings {
  theme?: 'light' | 'dark';
  defaultFocusDuration: number; // minutes
  shortBreakDuration: number;
  longBreakDuration: number;
  soundEnabled: boolean;
  soundType: 'none' | 'whitenoise' | 'rain' | 'ambient';
  examReminderDays: number;
  dailyBriefingEnabled: boolean;
}

export interface QuizScore {
  id: string;
  subjectId: string;
  subjectName: string;
  topic: string;
  score: number; // 0 to 100
  totalQuestions?: number;
  date: string; // YYYY-MM-DD
}

export type MasteryClassification = 'weak' | 'developing' | 'strong' | 'unknown';
export type EvidenceSource = 'measured_quiz' | 'insufficient_data';
export type DiagnosticConfidence = 'high' | 'medium' | 'insufficient_data';
export type RevisionPriority = 'high' | 'medium' | 'low';

export interface MasteryThresholds {
  weakMax: number;   // default 50: < 50 is weak
  strongMin: number; // default 75: >= 75 is strong
}

export interface WeakTopicItem {
  id: string;
  topic: string;
  subjectId: string;
  subjectName: string;
  score: number;
  quizScore?: number | null;
  status: 'needs_attention' | 'moderate' | 'mastered' | 'unknown';
  masteryClassification?: MasteryClassification;
  evidenceSource?: EvidenceSource;
  confidence?: DiagnosticConfidence;
  explanation?: string;
  recommendedAction?: string;
  revisionPriority?: RevisionPriority;
  attemptCount?: number;
  highestQuizScore?: number | null;
  latestQuizScore?: number | null;
  daysToExam?: number | null;
  examTitle?: string | null;
  label: string;
  color: 'red' | 'yellow' | 'green' | 'slate';
  symbol: string;
  isExamUrgent: boolean;
  minutesStudied: number;
  isCompleted: boolean;
  reason: string;
  suggestedAction: string;
}

export interface WeaknessAnalysisResponse {
  topics: WeakTopicItem[];
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

export interface ExplainableRecommendation {
  id: string;
  title: string;
  subjectId: string;
  subjectName: string;
  topic: string;
  category:
    | 'weak_topic'
    | 'approaching_exam'
    | 'urgent_assignment'
    | 'missed_session'
    | 'needs_diagnostic'
    | 'spaced_revision';
  priority: 'high' | 'medium' | 'low';
  priorityScore: number; // 0 - 100
  recommendedAction: string;
  reason: string;
  evidence: string;
  suggestedDuration: string;
  suggestedDurationMinutes: number;
  daysToDeadline?: number | null;
  deadlineType?: 'exam' | 'assignment' | 'task';
  deadlineTitle?: string;
  actionType: 'start_focus' | 'take_quiz' | 'open_planner' | 'view_tasks' | 'view_exams';
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
  observation: string;
  evidence: string;
  whyItMatters: string;
  action: string;
  type: 'urgent' | 'warning' | 'positive' | 'neutral';
  category: 'mastery' | 'exam' | 'deadline' | 'consistency' | 'diagnostic';
  iconName: 'AlertCircle' | 'TrendingUp' | 'Clock' | 'Flame' | 'HelpCircle' | 'Award';
  metric?: string;
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

export interface AIRecommendation {
  title: string;
  reason: string;
  recommendedDuration: string;
  recommendedDurationMinutes: number;
  recommendedAction: string;
  subjectId: string;
  subjectName: string;
  topic: string;
  totalScore: number;
  daysToExam?: number | null;
}

export type StudyBlockStatus = 'pending' | 'completed' | 'missed';

export interface SchedulingWeights {
  topicWeaknessWeight: number; // default 0.35
  examUrgencyWeight: number;    // default 0.30
  deadlineUrgencyWeight: number; // default 0.20
  taskImportanceWeight: number;  // default 0.15
}

export interface SchedulingFactorBreakdown {
  weaknessScore: number;     // 0-100
  examUrgencyScore: number;  // 0-100
  deadlineScore: number;     // 0-100
  taskImportanceScore: number; // 0-100
  compositePriorityScore: number; // 0-100
}

export interface AIStudyBlock {
  id: string;
  order: number;
  subjectId: string;
  subjectName: string;
  topic: string;
  durationMinutes: number;
  priority: 'high' | 'medium' | 'low';
  type: string;
  objective: string;
  reason: string;
  canStartNow: boolean;
  recommendedActivity?: string;
  startTime?: string;
  endTime?: string;
  breakAfterMinutes?: number;
  status?: StudyBlockStatus;
  evidenceSource?: string;
  factors?: SchedulingFactorBreakdown;
  completedAt?: string;
  missedAt?: string;
  isRescheduled?: boolean;
}

export interface AIStudyPlan {
  availableStudyHours: number;
  availableStudyMinutes?: number;
  allocatedStudyMinutes?: number;
  breakMinutesTotal?: number;
  totalPlannedMinutes: number;
  primaryRecommendation?: AIRecommendation | null;
  blocks: AIStudyBlock[];
  weightsUsed?: SchedulingWeights;
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
  aiStrategyGuidance: string | null;
  generatedAt?: string;
  isFallback?: boolean;
}

export interface AIExamPrepPlan {
  examId: string;
  examTitle: string;
  subjectName: string;
  daysRemaining: number;
  currentPreparation: number;
  readinessBreakdown?: ExamReadinessBreakdown;
  recommendedTotalHours: number;
  aiStrategyVerdict: string | null;
  priorityTopics: Array<{
    topic: string;
    mastery: number;
    quizScore?: number | null;
    priority: string;
    badge: string;
    color: string;
    isCompleted: boolean;
    reason: string;
    estimatedStudyHours: number;
    weightage?: number; // e.g. 35 marks / 35%
    weightageLevel?: 'high' | 'medium' | 'low';
    allocatedMinutes?: number;
    marksImpact?: string;
  }>;
  weightageSummary?: {
    totalMarks: number;
    highWeightageCount: number;
    marksSecuredEstimate: number;
    maxScorePayoff: number;
  };
  studySchedule: Array<{
    dayNumber: number;
    date: string;
    milestone: string;
    focusDescription: string;
    targetHours: number;
    isCompleted: boolean;
    weightageFocus?: string;
  }>;
  revisionSchedule: Array<{
    phase: string;
    timing: string;
    activity: string;
    durationMinutes: number;
  }>;
  practiceRecommendations: Array<{
    type: string;
    recommendation: string;
    tag: string;
  }>;
}

export interface AIProductivityInsight {
  id: string;
  text: string;
  category: 'timing' | 'progress' | 'habit' | 'streak';
  type: 'positive' | 'warning' | 'neutral';
  iconName: string;
}

// Kamran AI Chat Types
export interface ChatMessageAction {
  label: string;
  type: 'open_planner' | 'start_quiz' | 'open_exam' | 'start_focus' | 'open_summarizer' | 'open_roadmap';
  payload?: any;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  actionTrigger?: ChatMessageAction;
}

// AI Quiz Generator Types
export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  subConcept: string;
}

export interface QuizGenerationRequest {
  subjectId: string;
  subjectName: string;
  topic: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  questionCount: number;
}

export interface QuizResult {
  totalQuestions: number;
  correctCount: number;
  scorePercentage: number;
  strongConcepts: string[];
  weakConcepts: string[];
  recommendedAction: {
    topic: string;
    durationMinutes: number;
    description: string;
  };
  answers: {
    questionId: string;
    selectedOption: number;
    isCorrect: boolean;
  }[];
}

// AI Notes Summarizer Types
export interface ImportantConcept {
  term: string;
  definition: string;
  importance: 'critical' | 'high' | 'supplementary';
}

export interface StudyQuestion {
  question: string;
  answer: string;
  type: 'conceptual' | 'exam' | 'definition';
}

export interface NotesSummaryResult {
  title: string;
  summary: string;
  keyPoints: string[];
  importantConcepts: ImportantConcept[];
  possibleQuestions: StudyQuestion[];
  quickRevision: string[];
  wordCount?: number;
  readingTimeMinutes?: number;
}

// AI Learning Roadmap Types
export interface RoadmapTopicItem {
  id: string;
  title: string;
  description: string;
  keyConcepts: string[];
  handsOnProjects?: string[];
  completed?: boolean;
}

export interface RoadmapMilestone {
  title: string;
  description: string;
  skillsTested: string[];
}

export interface RoadmapPhase {
  id: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced' | 'Mastery';
  title: string;
  durationEstimate: string;
  description: string;
  topics: RoadmapTopicItem[];
  milestoneProject: RoadmapMilestone;
}

export interface LearningRoadmap {
  id: string;
  topic: string;
  targetLevel: string;
  estimatedWeeks: number;
  overview: string;
  prerequisites: string[];
  careerPaths: string[];
  phases: RoadmapPhase[];
  keyTips: string[];
  createdAt: string;
  progressPercentage?: number;
}

// Day 4: Learning Analytics & Student Performance Evaluation Types
export interface ExamReadinessConfig {
  assessedTopicMasteryWeight: number; // default 0.50
  syllabusCompletionWeight: number;   // default 0.35
  focusConsistencyWeight: number;     // default 0.15
  weakTopicPenaltyPerTopic: number;   // default 5 points deducted per weak topic (capped)
}

export interface LearningOverviewMetrics {
  totalRecordedStudyMinutes: number;
  totalRecordedStudyHours: number;
  totalCompletedFocusSessions: number;
  totalTasks: number;
  completedTasks: number;
  taskCompletionRate: number | null; // null if 0 tasks
  totalQuizAttempts: number;
  averageQuizPerformance: number | null; // null if 0 valid quizzes
  totalTopicsTracked: number;
  masteredTopicsCount: number;
  developingTopicsCount: number;
  weakTopicsCount: number;
  unknownEvidenceTopicsCount: number;
  hasAnyActivity: boolean;
}

export interface SubjectPerformanceItem {
  subjectId: string;
  subjectName: string;
  subjectCode?: string;
  color: string;
  totalTopics: number;
  assessedTopicsCount: number;
  completedTopicsCount: number;
  syllabusProgressPercent: number;
  averageMeasuredQuizScore: number | null; // Strictly from measured quizzes, never estimated
  quizAttemptsCount: number;
  masteryDistribution: {
    strong: number;
    developing: number;
    weak: number;
    unknown: number;
  };
  completedActivitiesCount: number;
  pendingActivitiesCount: number;
  recordedStudyMinutes: number;
  recordedStudyHours: number;
}

export interface QuizTrendPoint {
  id: string;
  date: string;
  timestampLabel: string;
  subjectId: string;
  subjectName: string;
  topic: string;
  score: number;
  attemptIndex: number;
}

export interface DailyStudyActivityPoint {
  date: string;
  dayLabel: string;
  actualRecordedMinutes: number;
  actualRecordedHours: number;
  plannedMinutes: number;
  plannedHours: number;
  completedSessionsCount: number;
  missedSessionsCount: number;
}

export interface StudyConsistencyMetrics {
  plannedSessionsCount: number;
  completedPlannedSessionsCount: number;
  missedPlannedSessionsCount: number;
  pendingPlannedSessionsCount: number;
  plannedCompletionPercentage: number | null; // null if 0 planned sessions
  totalPlannedDurationMinutes: number;
  actualRecordedSessionsCount: number;
  totalActualRecordedMinutes: number;
  totalActualRecordedHours: number;
  dailyActivity: DailyStudyActivityPoint[];
  consistencyChangeSummary: {
    hasComparablePeriods: boolean;
    recent7DaysMinutes: number;
    previous7DaysMinutes: number;
    deltaMinutes: number | null;
    message: string;
  };
}

export interface ExamReadinessEvaluation {
  examId: string;
  examTitle: string;
  subjectId: string;
  subjectName: string;
  examDate: string;
  daysRemaining: number | null;
  estimatedReadinessScore: number | null; // null when insufficient evidence
  readinessStatus: 'High Readiness' | 'Moderate Readiness' | 'Needs Attention' | 'Insufficient Data';
  hasSufficientData: boolean;
  assessedTopicsCount: number;
  totalTopicsCount: number;
  completedTopicsCount: number;
  remainingTopicsCount: number;
  weakTopicCount: number;
  weakTopicNames: string[];
  unassessedTopicNames: string[];
  averageMeasuredQuizScore: number | null;
  recordedStudyMinutes: number;
  supportingEvidence: string[];
  suggestedNextAction: string;
  disclaimer: string;
}

export interface TopicImprovementComparison {
  topic: string;
  subjectId: string;
  subjectName: string;
  attemptCount: number;
  hasComparableHistory: boolean;
  firstScore: number;
  firstDate: string;
  latestScore: number;
  latestDate: string;
  absoluteImprovementPoints: number | null; // percentage points (latest - first)
  relativePercentageChange: number | null;  // ((latest - first)/first)*100 when first > 0
  earlierMasteryTier: MasteryClassification;
  latestMasteryTier: MasteryClassification;
  trendDirection: 'improved' | 'declined' | 'unchanged' | 'insufficient_history';
  explanation: string;
}

export interface PeriodComparisonSummary {
  hasComparablePeriods: boolean;
  earlierPeriodLabel: string;
  laterPeriodLabel: string;
  earlierPeriodAvg: number | null;
  laterPeriodAvg: number | null;
  earlierCount: number;
  laterCount: number;
  absoluteChangePoints: number | null;
  relativePercentageChange: number | null;
  explanation: string;
}

export interface LearningAnalyticsResponse {
  overview: LearningOverviewMetrics;
  subjectPerformance: SubjectPerformanceItem[];
  topicMasteryHeatmap: WeakTopicItem[];
  quizTrends: QuizTrendPoint[];
  studyConsistency: StudyConsistencyMetrics;
  examReadiness: ExamReadinessEvaluation[];
  readinessConfigUsed: ExamReadinessConfig;
  learningImprovement: {
    topicComparisons: TopicImprovementComparison[];
    periodComparison: PeriodComparisonSummary;
    improvedTopicsCount: number;
    declinedTopicsCount: number;
    singleAttemptTopicsCount: number;
  };
  insights: PersonalizedLearningInsight[];
  aiExecutiveSummary: string | null;
  evaluatedAt: string;
  isFallback?: boolean;
}


