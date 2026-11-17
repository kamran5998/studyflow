import React, { useState, useEffect, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from "recharts";
import { useStudyFlow } from "../../context/StudyFlowContext";
import { aiService } from "../../services/aiService";
import {
  LearningAnalyticsResponse,
  ExamReadinessConfig,
  WeakTopicItem,
} from "../../types";
import { formatMinutes } from "../../lib/utils";
import {
  PerformanceReportModal,
  downloadPerformanceCSV,
  downloadPerformanceJSON,
} from "./PerformanceReportModal";
import {
  CARD_SURFACE,
  INPUT_SURFACE,
  PageHeader,
  PrimaryButton,
  RECESSED_SURFACE,
  SecondaryButton,
  Tabs,
} from "../common/ui";
import {
  Clock,
  CheckCircle2,
  BookOpen,
  FileQuestion,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  AlertTriangle,
  HelpCircle,
  Flame,
  Award,
  RefreshCw,
  FileSpreadsheet,
  FileJson,
  Printer,
  Sliders,
  Play,
  ArrowUpRight,
  Minus,
  Calendar,
  ShieldCheck,
} from "lucide-react";

const DEFAULT_READINESS_WEIGHTS: ExamReadinessConfig = {
  assessedTopicMasteryWeight: 0.50,
  syllabusCompletionWeight: 0.35,
  focusConsistencyWeight: 0.15,
  weakTopicPenaltyPerTopic: 5,
};

export const AnalyticsView: React.FC = () => {
  const {
    subjects,
    tasks,
    assignments,
    exams,
    focusSessions,
    quizScores,
    plannedBlocks,
    profile,
    theme,
    setActivePage,
    setQuizPreset,
    showToast,
  } = useStudyFlow();

  const [analytics, setAnalytics] = useState<LearningAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [heatmapSubjectFilter, setHeatmapSubjectFilter] = useState<string>("all");
  const [heatmapClassFilter, setHeatmapClassFilter] = useState<
    "all" | "weak" | "developing" | "strong" | "unknown"
  >("all");

  const [trendSubjectFilter, setTrendSubjectFilter] = useState<string>("all");
  const [trendTopicFilter, setTrendTopicFilter] = useState<string>("all");

  const [readinessConfig, setReadinessConfig] = useState<ExamReadinessConfig>(
    DEFAULT_READINESS_WEIGHTS
  );
  const [showReadinessConfig, setShowReadinessConfig] = useState<boolean>(false);

  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);

  const fetchAnalytics = async (customConfig?: ExamReadinessConfig) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const result = await aiService.getAnalytics(
        {
          subjects,
          tasks,
          assignments,
          exams,
          focusSessions,
          quizScores,
          plannedBlocks,
          profile,
        },
        { readinessConfig: customConfig || readinessConfig }
      );
      setAnalytics(result);
    } catch (e: any) {
      console.error("Failed to load learning analytics:", e);
      setErrorMsg(e?.message || "Unable to compute analytics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [subjects, tasks, assignments, exams, focusSessions, quizScores, plannedBlocks]);

  const filteredHeatmapTopics = useMemo(() => {
    if (!analytics) return [];
    return analytics.topicMasteryHeatmap.filter((item) => {
      if (heatmapSubjectFilter !== "all" && item.subjectId !== heatmapSubjectFilter) {
        return false;
      }
      if (heatmapClassFilter !== "all" && item.masteryClassification !== heatmapClassFilter) {
        return false;
      }
      return true;
    });
  }, [analytics, heatmapSubjectFilter, heatmapClassFilter]);

  const trendTopicOptions = useMemo(() => {
    if (!analytics) return [];
    const filteredBySubj =
      trendSubjectFilter === "all"
        ? analytics.quizTrends
        : analytics.quizTrends.filter((q) => q.subjectId === trendSubjectFilter);
    return Array.from(new Set(filteredBySubj.map((q) => q.topic)));
  }, [analytics, trendSubjectFilter]);

  const filteredQuizTrends = useMemo(() => {
    if (!analytics) return [];
    return analytics.quizTrends
      .filter((q) => {
        if (trendSubjectFilter !== "all" && q.subjectId !== trendSubjectFilter) return false;
        if (trendTopicFilter !== "all" && q.topic !== trendTopicFilter) return false;
        return true;
      })
      .map((q, idx) => ({
        ...q,
        attemptLabel: `#${idx + 1} (${q.date.slice(5)})`,
      }));
  }, [analytics, trendSubjectFilter, trendTopicFilter]);

  const subjectChartData = useMemo(() => {
    if (!analytics) return [];
    return analytics.subjectPerformance.map((sp) => ({
      name: sp.subjectName.length > 16 ? sp.subjectName.slice(0, 15) + "…" : sp.subjectName,
      fullName: sp.subjectName,
      measuredQuizAvg: sp.averageMeasuredQuizScore,
      syllabusCompletion: sp.syllabusProgressPercent,
    }));
  }, [analytics]);

  const handleLaunchTopicQuiz = (item: WeakTopicItem) => {
    setQuizPreset({ subjectId: item.subjectId, topic: item.topic });
    setActivePage("quizzes");
    showToast(`Launching diagnostic quiz for ${item.topic}`);
  };

  const handleStartTopicFocus = (item: WeakTopicItem) => {
    setActivePage("focus");
    showToast(`Open Focus Timer for ${item.topic} (${item.subjectName})`);
  };

  const handleApplyReadinessWeights = () => {
    fetchAnalytics(readinessConfig);
    setShowReadinessConfig(false);
    showToast("Exam readiness calculation weights updated");
  };

  const handleResetReadinessWeights = () => {
    setReadinessConfig(DEFAULT_READINESS_WEIGHTS);
    fetchAnalytics(DEFAULT_READINESS_WEIGHTS);
    setShowReadinessConfig(false);
    showToast("Exam readiness weights reset to defaults (50 / 35 / 15)");
  };

  const getMasteryVisuals = (classification?: string) => {
    switch (classification) {
      case "weak":
        return {
          label: "Weak (<50%)",
          textClass: "text-[#A83838] dark:text-[#F28B8B]",
          surfaceClass: "bg-[#FDF6F5] dark:bg-[#2B1D1D] border-[#EFD6D4] dark:border-[#523030]",
          icon: <AlertCircle className="w-3.5 h-3.5 text-[#A83838] dark:text-[#F28B8B] shrink-0" />,
        };
      case "developing":
        return {
          label: "Developing (50–74%)",
          textClass: "text-[#B46914] dark:text-[#F0B35E]",
          surfaceClass: "bg-[#FCF7EE] dark:bg-[#2C2417] border-[#EAD9BF] dark:border-[#534125]",
          icon: <AlertTriangle className="w-3.5 h-3.5 text-[#D58A2A] dark:text-[#E0983B] shrink-0" />,
        };
      case "strong":
        return {
          label: "Strong (≥75%)",
          textClass: "text-[#3B7A57] dark:text-[#7AD19E]",
          surfaceClass: "bg-[#F5FAF7] dark:bg-[#1B2920] border-[#D3E5DA] dark:border-[#2E4B39]",
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-[#3B7A57] dark:text-[#68B088] shrink-0" />,
        };
      case "unknown":
      default:
        return {
          label: "No Quiz Evidence",
          textClass: "text-[#78736A] dark:text-[#A6A096]",
          surfaceClass: "bg-[#FBF9F5] dark:bg-[#1B1A17] border-[#E9E5DE] dark:border-[#32302B]",
          icon: <HelpCircle className="w-3.5 h-3.5 text-[#8E887E] dark:text-[#9A948A] shrink-0" />,
        };
    }
  };

  const getInsightIcon = (iconName: string) => {
    switch (iconName) {
      case "AlertCircle":
        return <AlertCircle className="w-4 h-4 text-[#A83838] dark:text-[#F28B8B] shrink-0" />;
      case "Flame":
        return <Flame className="w-4 h-4 text-[#D58A2A] dark:text-[#E0983B] shrink-0" />;
      case "TrendingUp":
        return <TrendingUp className="w-4 h-4 text-[#3B7A57] dark:text-[#68B088] shrink-0" />;
      case "Award":
        return <Award className="w-4 h-4 text-[#D58A2A] dark:text-[#E0983B] shrink-0" />;
      case "HelpCircle":
        return <HelpCircle className="w-4 h-4 text-[#8E887E] shrink-0" />;
      case "Clock":
      default:
        return <Clock className="w-4 h-4 text-[#D58A2A] dark:text-[#E0983B] shrink-0" />;
    }
  };

  const tooltipStyle = {
    backgroundColor: "#22211F",
    borderColor: "#3A3731",
    borderRadius: "8px",
    color: "#FAF9F6",
    fontSize: "12px",
  };

  const axisTickColor = theme === "dark" ? "#9A948A" : "#78736A";
  const gridColor = theme === "dark" ? "#32302B" : "#E9E5DE";

  if (loading && !analytics) {
    return (
      <div className="space-y-6">
        <div className={`${CARD_SURFACE} p-6 space-y-4`}>
          <div className="h-6 w-64 bg-[#F5F2EC] dark:bg-[#2A2823] rounded" />
          <div className="h-4 w-96 bg-[#FAF8F4] dark:bg-[#1B1A17] rounded" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-20 bg-[#FAF8F4] dark:bg-[#1B1A17] border border-[#E9E5DE] dark:border-[#32302B] rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (errorMsg && !analytics) {
    return (
      <div className="bg-[#FDF6F5] dark:bg-[#2B1D1D] p-6 rounded-xl border border-[#EFD6D4] dark:border-[#523030] space-y-3">
        <div className="flex items-center gap-2 text-[#A83838] dark:text-[#F28B8B] font-semibold text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>Analytics Computation Error</span>
        </div>
        <p className="text-xs text-[#78736A] dark:text-[#A6A096]">{errorMsg}</p>
        <PrimaryButton onClick={() => fetchAnalytics()}>
          Retry Analytics
        </PrimaryButton>
      </div>
    );
  }

  if (!analytics) return null;

  const {
    overview,
    subjectPerformance,
    studyConsistency,
    examReadiness,
    learningImprovement,
    insights,
    aiExecutiveSummary,
  } = analytics;

  return (
    <div className="space-y-6 pb-8">
      {/* Top Header & Student Performance Report Actions */}
      <PageHeader
        kicker="LEDGER"
        pill="HOURS & ANALYTICS"
        pillTone="amber"
        title="StudyPilot Learning Analytics & Evaluation"
        subtitle="Calculated strictly from recorded focus sessions, measured quiz attempts, syllabus progress, and scheduled study blocks."
        actions={
          <>
            <SecondaryButton onClick={() => fetchAnalytics()} disabled={loading}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </SecondaryButton>
            <SecondaryButton
              id="export-csv-report-btn"
              onClick={() => {
                downloadPerformanceCSV(analytics, profile);
                showToast("Downloaded CSV performance report");
              }}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#3B7A57] dark:text-[#68B088]" />
              <span>Export CSV</span>
            </SecondaryButton>
            <SecondaryButton
              id="export-json-report-btn"
              onClick={() => {
                downloadPerformanceJSON(analytics, profile);
                showToast("Downloaded JSON performance report");
              }}
            >
              <FileJson className="w-3.5 h-3.5 text-[#D58A2A] dark:text-[#E0983B]" />
              <span>Export JSON</span>
            </SecondaryButton>
            <PrimaryButton
              id="open-print-report-btn"
              onClick={() => setIsReportModalOpen(true)}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Performance Report</span>
            </PrimaryButton>
          </>
        }
      >
        {aiExecutiveSummary && (
          <div className="pt-4 border-t border-[#EFECE6] dark:border-[#2E2C27] text-xs text-[#57534E] dark:text-[#C5BFB5] leading-relaxed">
            <span className="font-mono text-[10px] uppercase tracking-[0.08em] font-semibold text-[#B46914] dark:text-[#E0983B] mr-1.5">
              Analytics Summary:
            </span>
            {aiExecutiveSummary}
          </div>
        )}

        {/* Section 01: Learning Overview KPI Grid */}
        <div className="mt-5 pt-5 border-t border-[#EFECE6] dark:border-[#2E2C27]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[11px] font-mono uppercase tracking-[0.12em] font-semibold text-[#78736A] dark:text-[#A6A096]">
              01. Learning Overview
            </h3>
            <span className="text-[11px] text-[#8E887E] dark:text-[#9A948A] font-mono tabular-nums">
              {overview.totalTopicsTracked} tracked syllabus topics
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div className={`${RECESSED_SURFACE} p-4`}>
              <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.08em] text-[#8E887E] dark:text-[#9A948A]">
                <Clock className="w-3.5 h-3.5 text-[#D58A2A] dark:text-[#E0983B]" />
                <span>Recorded Study</span>
              </div>
              <div className="text-xl font-bold font-mono text-[#22211F] dark:text-[#F5F3EE] mt-1.5 tabular-nums">
                {overview.totalRecordedStudyMinutes > 0
                  ? formatMinutes(overview.totalRecordedStudyMinutes)
                  : "No sessions"}
              </div>
              <div className="text-[11px] text-[#78736A] dark:text-[#A6A096] mt-1 font-mono tabular-nums">
                {overview.totalCompletedFocusSessions} completed focus session(s)
              </div>
            </div>

            <div className={`${RECESSED_SURFACE} p-4`}>
              <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.08em] text-[#8E887E] dark:text-[#9A948A]">
                <FileQuestion className="w-3.5 h-3.5 text-[#D58A2A] dark:text-[#E0983B]" />
                <span>Avg Quiz Score</span>
              </div>
              <div className="text-xl font-bold font-mono text-[#22211F] dark:text-[#F5F3EE] mt-1.5 tabular-nums">
                {overview.averageQuizPerformance !== null
                  ? `${overview.averageQuizPerformance}%`
                  : "Insufficient data"}
              </div>
              <div className="text-[11px] text-[#78736A] dark:text-[#A6A096] mt-1 font-mono tabular-nums">
                {overview.totalQuizAttempts > 0
                  ? `${overview.totalQuizAttempts} measured quiz attempt(s)`
                  : "0 quizzes recorded yet"}
              </div>
            </div>

            <div className={`${RECESSED_SURFACE} p-4`}>
              <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.08em] text-[#8E887E] dark:text-[#9A948A]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#3B7A57] dark:text-[#68B088]" />
                <span>Completed Tasks</span>
              </div>
              <div className="text-xl font-bold font-mono text-[#22211F] dark:text-[#F5F3EE] mt-1.5 tabular-nums">
                {overview.totalTasks > 0
                  ? `${overview.completedTasks} / ${overview.totalTasks}`
                  : "No tasks"}
              </div>
              <div className="text-[11px] text-[#78736A] dark:text-[#A6A096] mt-1 font-mono tabular-nums">
                {overview.taskCompletionRate !== null
                  ? `${overview.taskCompletionRate}% completion rate`
                  : "Add tasks in Daily Planner"}
              </div>
            </div>

            <div className={`${RECESSED_SURFACE} p-4`}>
              <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.08em] text-[#8E887E] dark:text-[#9A948A]">
                <BookOpen className="w-3.5 h-3.5 text-[#D58A2A] dark:text-[#E0983B]" />
                <span>Topic Mastery</span>
              </div>
              {overview.totalTopicsTracked > 0 ? (
                <>
                  <div className="text-sm font-bold font-mono text-[#22211F] dark:text-[#F5F3EE] mt-2 tabular-nums">
                    {overview.masteredTopicsCount} Mastered · {overview.developingTopicsCount} Dev
                  </div>
                  <div className="text-[11px] text-[#78736A] dark:text-[#A6A096] mt-1 font-mono tabular-nums">
                    {overview.weakTopicsCount} Weak · {overview.unknownEvidenceTopicsCount} Unassessed
                  </div>
                </>
              ) : (
                <>
                  <div className="text-xl font-bold font-mono text-[#22211F] dark:text-[#F5F3EE] mt-1.5">
                    No topics
                  </div>
                  <div className="text-[11px] text-[#78736A] dark:text-[#A6A096] mt-1">
                    Add courses & syllabus topics
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </PageHeader>

      {/* Section 02: Subject-Wise Performance Analysis */}
      <section className={`${CARD_SURFACE} p-5 sm:p-6 space-y-5`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#EFECE6] dark:border-[#2E2C27]">
          <div>
            <h3 className="font-editorial text-lg font-semibold text-[#22211F] dark:text-[#F5F3EE]">
              02. Course-Wise Performance Analysis
            </h3>
            <p className="text-xs text-[#78736A] dark:text-[#A6A096] mt-0.5">
              Compares measured quiz performance independently from syllabus topic completion and recorded focus hours.
            </p>
          </div>
          {subjects.length === 0 && (
            <PrimaryButton onClick={() => setActivePage("subjects")}>
              <span>Add First Course</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </PrimaryButton>
          )}
        </div>

        {subjectPerformance.length === 0 ? (
          <div className="py-10 text-center space-y-2">
            <p className="text-sm font-medium text-[#22211F] dark:text-[#F5F3EE]">
              No courses configured yet
            </p>
            <p className="text-xs text-[#78736A] dark:text-[#A6A096] max-w-md mx-auto">
              Add your academic courses and topics to track measured quiz averages, topic mastery distribution, and recorded study time.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* Comparative Chart */}
            <div className="xl:col-span-5 h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectChartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke={gridColor}
                  />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: axisTickColor }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    axisLine={false}
                    tickLine={false}
                    unit="%"
                    tick={{ fontSize: 11, fill: axisTickColor }}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: any, name: string) => [
                      value !== null && value !== undefined ? `${value}%` : "No quizzes",
                      name,
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Bar
                    dataKey="measuredQuizAvg"
                    name="Measured Quiz Avg (%)"
                    fill="#D58A2A"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                  />
                  <Bar
                    dataKey="syllabusCompletion"
                    name="Syllabus Completion (%)"
                    fill="#3B7A57"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Course Breakdown Table */}
            <div className="xl:col-span-7 overflow-x-auto border border-[#E9E5DE] dark:border-[#32302B] rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#FAF8F4] dark:bg-[#1B1A17] text-[#78736A] dark:text-[#A6A096] border-b border-[#E9E5DE] dark:border-[#32302B] font-mono text-[10px] uppercase tracking-[0.06em]">
                  <tr>
                    <th className="py-2.5 px-3.5 font-semibold">Course</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Assessed</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Quiz Avg</th>
                    <th className="py-2.5 px-3 font-semibold">Mastery Split</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Activities</th>
                    <th className="py-2.5 px-3.5 font-semibold text-right">Study Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFECE6] dark:divide-[#2E2C27]">
                  {subjectPerformance.map((sp) => (
                    <tr
                      key={sp.subjectId}
                      className="hover:bg-[#FAF8F4] dark:hover:bg-[#1B1A17] transition-colors"
                    >
                      <td className="py-3 px-3.5">
                        <div className="font-semibold text-[#22211F] dark:text-[#F5F3EE]">
                          {sp.subjectName}
                        </div>
                        <div className="text-[11px] text-[#8E887E] dark:text-[#9A948A] font-mono tabular-nums">
                          {sp.syllabusProgressPercent}% syllabus ({sp.completedTopicsCount}/{sp.totalTopics})
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-[#57534E] dark:text-[#C5BFB5]">
                        {sp.assessedTopicsCount}/{sp.totalTopics}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums">
                        {sp.averageMeasuredQuizScore !== null ? (
                          <span
                            className={`font-semibold ${
                              sp.averageMeasuredQuizScore < 50
                                ? "text-[#A83838] dark:text-[#F28B8B]"
                                : sp.averageMeasuredQuizScore < 75
                                ? "text-[#B46914] dark:text-[#F0B35E]"
                                : "text-[#3B7A57] dark:text-[#68B088]"
                            }`}
                          >
                            {sp.averageMeasuredQuizScore}%
                          </span>
                        ) : (
                          <span className="text-[#9A948A]">No quizzes</span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono tabular-nums text-[11px] text-[#78736A] dark:text-[#A6A096]">
                        <span>{sp.masteryDistribution.strong}S</span>
                        <span className="mx-1 text-[#C9C2B6] dark:text-[#58534B]">·</span>
                        <span>{sp.masteryDistribution.developing}D</span>
                        <span className="mx-1 text-[#C9C2B6] dark:text-[#58534B]">·</span>
                        <span className={sp.masteryDistribution.weak > 0 ? "text-[#A83838] dark:text-[#F28B8B] font-semibold" : ""}>
                          {sp.masteryDistribution.weak}W
                        </span>
                        <span className="mx-1 text-[#C9C2B6] dark:text-[#58534B]">·</span>
                        <span>{sp.masteryDistribution.unknown}U</span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-[#57534E] dark:text-[#C5BFB5]">
                        {sp.completedActivitiesCount} done / {sp.pendingActivitiesCount} open
                      </td>
                      <td className="py-3 px-3.5 text-right font-mono tabular-nums text-[#22211F] dark:text-[#F5F3EE]">
                        {sp.recordedStudyMinutes > 0 ? formatMinutes(sp.recordedStudyMinutes) : "0m"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Section 03: Topic Mastery Heatmap */}
      <section className={`${CARD_SURFACE} p-5 sm:p-6 space-y-4`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[#EFECE6] dark:border-[#2E2C27]">
          <div>
            <h3 className="font-editorial text-lg font-semibold text-[#22211F] dark:text-[#F5F3EE]">
              03. Topic Mastery Heatmap
            </h3>
            <p className="text-xs text-[#78736A] dark:text-[#A6A096] mt-0.5">
              Weak (&lt;50%) · Developing (50–74%) · Strong (≥75%) · Unknown (no measured quiz evidence)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filter heatmap by subject"
              value={heatmapSubjectFilter}
              onChange={(e) => setHeatmapSubjectFilter(e.target.value)}
              className={`${INPUT_SURFACE} px-2.5 py-1.5`}
            >
              <option value="all">All Courses</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            <Tabs
              value={heatmapClassFilter}
              onChange={setHeatmapClassFilter}
              options={[
                { id: "all", label: "All" },
                { id: "weak", label: "Weak" },
                { id: "developing", label: "Developing" },
                { id: "strong", label: "Strong" },
                { id: "unknown", label: "Unassessed" },
              ]}
            />
          </div>
        </div>

        {filteredHeatmapTopics.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#78736A] dark:text-[#A6A096]">
            {analytics.topicMasteryHeatmap.length === 0
              ? "Add syllabus topics in Courses & Topics to view your Topic Mastery Heatmap."
              : "No topics match the selected course and mastery filter."}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredHeatmapTopics.map((item) => {
              const visuals = getMasteryVisuals(item.masteryClassification);
              const hasQuiz = item.evidenceSource === "measured_quiz" && item.quizScore !== null;

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border flex flex-col justify-between gap-3 transition-colors ${visuals.surfaceClass}`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-[#22211F] dark:text-[#F5F3EE] truncate">
                          {item.topic}
                        </h4>
                        <div className="text-xs text-[#78736A] dark:text-[#A6A096] truncate">
                          {item.subjectName}
                        </div>
                      </div>
                      <div className="text-right shrink-0 font-mono tabular-nums">
                        <div className={`text-sm font-bold ${visuals.textClass}`}>
                          {hasQuiz ? `${item.latestQuizScore ?? item.score}%` : "N/A"}
                        </div>
                        <div className="text-[10px] text-[#8E887E] dark:text-[#9A948A]">
                          {hasQuiz ? `${item.attemptCount} attempt(s)` : "0 attempts"}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-medium">
                      {visuals.icon}
                      <span className={visuals.textClass}>{visuals.label}</span>
                      <span aria-hidden="true" className="text-[#C9C2B6]">·</span>
                      <span className="text-[#78736A] dark:text-[#A6A096]">
                        {hasQuiz ? "Measured quiz" : "Needs quiz"}
                      </span>
                    </div>

                    <p className="text-xs text-[#57534E] dark:text-[#C5BFB5] leading-relaxed line-clamp-2">
                      {item.recommendedAction || item.suggestedAction}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-2.5 border-t border-[#E9E5DE]/80 dark:border-[#32302B]">
                    <SecondaryButton
                      onClick={() => handleLaunchTopicQuiz(item)}
                      className="flex-1 py-1.5"
                    >
                      <FileQuestion className="w-3.5 h-3.5 text-[#D58A2A]" />
                      <span>{hasQuiz ? "Retake Quiz" : "Take Quiz"}</span>
                    </SecondaryButton>
                    <PrimaryButton
                      onClick={() => handleStartTopicFocus(item)}
                      className="py-1.5 px-3"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Focus</span>
                    </PrimaryButton>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Section 04 & 05 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className={`lg:col-span-7 ${CARD_SURFACE} p-5 sm:p-6 space-y-4`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#EFECE6] dark:border-[#2E2C27]">
            <div>
              <h3 className="font-editorial text-lg font-semibold text-[#22211F] dark:text-[#F5F3EE]">
                04. Quiz Performance Trends
              </h3>
              <p className="text-xs text-[#78736A] dark:text-[#A6A096] mt-0.5">
                Chronological plot of actual recorded quiz attempts
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Filter quiz trend by subject"
                value={trendSubjectFilter}
                onChange={(e) => {
                  setTrendSubjectFilter(e.target.value);
                  setTrendTopicFilter("all");
                }}
                className={`${INPUT_SURFACE} px-2.5 py-1.5`}
              >
                <option value="all">All Courses</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filter quiz trend by topic"
                value={trendTopicFilter}
                onChange={(e) => setTrendTopicFilter(e.target.value)}
                className={`${INPUT_SURFACE} px-2.5 py-1.5`}
              >
                <option value="all">All Topics</option>
                {trendTopicOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filteredQuizTrends.length === 0 ? (
            <div className="h-60 flex flex-col items-center justify-center text-center space-y-2.5">
              <p className="text-sm font-medium text-[#22211F] dark:text-[#F5F3EE]">
                No quiz attempts recorded
              </p>
              <p className="text-xs text-[#78736A] dark:text-[#A6A096] max-w-sm">
                Complete a practice quiz to chart your real score progression over time.
              </p>
              <PrimaryButton onClick={() => setActivePage("quizzes")}>
                Go to Recall & Quizzes
              </PrimaryButton>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredQuizTrends.length === 1 && (
                <div className="text-xs text-[#B46914] dark:text-[#F0B35E] flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Single attempt recorded ({filteredQuizTrends[0].score}% on {filteredQuizTrends[0].date}). Complete a second attempt to establish a trend line.
                  </span>
                </div>
              )}
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={filteredQuizTrends} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke={gridColor}
                    />
                    <XAxis
                      dataKey="attemptLabel"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: axisTickColor }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      axisLine={false}
                      tickLine={false}
                      unit="%"
                      tick={{ fontSize: 11, fill: axisTickColor }}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(val: any, _name: string, props: any) => [
                        `${val}% (${props?.payload?.topic || "Topic"})`,
                        props?.payload?.subjectName || "Quiz Score",
                      ]}
                      labelFormatter={(_label: string, payload: any) =>
                        payload?.[0]?.payload?.date ? `Date: ${payload[0].payload.date}` : _label
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      name="Measured Score"
                      stroke="#D58A2A"
                      strokeWidth={2.5}
                      dot={{ fill: "#D58A2A", r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </section>

        <section className={`lg:col-span-5 ${CARD_SURFACE} p-5 sm:p-6 space-y-4`}>
          <div className="pb-3 border-b border-[#EFECE6] dark:border-[#2E2C27]">
            <h3 className="font-editorial text-lg font-semibold text-[#22211F] dark:text-[#F5F3EE]">
              05. Learning Improvement
            </h3>
            <p className="text-xs text-[#78736A] dark:text-[#A6A096] mt-0.5">
              First vs latest topic scores (percentage points vs relative change)
            </p>
          </div>

          <div className={`${RECESSED_SURFACE} p-3.5 space-y-1.5`}>
            <div className="flex items-center justify-between text-xs font-semibold text-[#22211F] dark:text-[#F5F3EE]">
              <span>Earlier vs Recent Assessment Period</span>
              {learningImprovement.periodComparison.absoluteChangePoints !== null && (
                <span
                  className={`font-mono tabular-nums ${
                    learningImprovement.periodComparison.absoluteChangePoints > 0
                      ? "text-[#3B7A57] dark:text-[#68B088]"
                      : learningImprovement.periodComparison.absoluteChangePoints < 0
                      ? "text-[#A83838] dark:text-[#F28B8B]"
                      : "text-[#8E887E]"
                  }`}
                >
                  {learningImprovement.periodComparison.absoluteChangePoints > 0 ? "+" : ""}
                  {learningImprovement.periodComparison.absoluteChangePoints} pts
                </span>
              )}
            </div>
            <p className="text-xs text-[#78736A] dark:text-[#A6A096] leading-relaxed">
              {learningImprovement.periodComparison.explanation}
            </p>
          </div>

          {learningImprovement.topicComparisons.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#78736A] dark:text-[#A6A096]">
              No topic quiz history recorded yet to evaluate improvement.
            </div>
          ) : (
            <div className="divide-y divide-[#EFECE6] dark:divide-[#2E2C27] max-h-64 overflow-y-auto pr-1">
              {learningImprovement.topicComparisons.map((tc) => (
                <div key={`${tc.subjectId}-${tc.topic}`} className="py-3 first:pt-0 last:pb-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[#22211F] dark:text-[#F5F3EE] truncate">
                        {tc.topic}
                      </div>
                      <div className="text-[11px] text-[#8E887E] dark:text-[#9A948A]">
                        {tc.subjectName} · {tc.attemptCount} attempt(s)
                      </div>
                    </div>

                    {tc.hasComparableHistory ? (
                      <div className="text-right shrink-0 font-mono tabular-nums">
                        <div className="flex items-center justify-end gap-1 text-xs font-bold">
                          {tc.trendDirection === "improved" ? (
                            <TrendingUp className="w-3.5 h-3.5 text-[#3B7A57] dark:text-[#68B088]" />
                          ) : tc.trendDirection === "declined" ? (
                            <TrendingDown className="w-3.5 h-3.5 text-[#A83838] dark:text-[#F28B8B]" />
                          ) : (
                            <Minus className="w-3.5 h-3.5 text-[#8E887E]" />
                          )}
                          <span
                            className={
                              tc.trendDirection === "improved"
                                ? "text-[#3B7A57] dark:text-[#68B088]"
                                : tc.trendDirection === "declined"
                                ? "text-[#A83838] dark:text-[#F28B8B]"
                                : "text-[#57534E] dark:text-[#C5BFB5]"
                            }
                          >
                            {tc.absoluteImprovementPoints! > 0 ? "+" : ""}
                            {tc.absoluteImprovementPoints} pts
                          </span>
                        </div>
                        <div className="text-[10px] text-[#8E887E] dark:text-[#9A948A]">
                          {tc.firstScore}% → {tc.latestScore}%
                          {tc.relativePercentageChange !== null
                            ? ` (${tc.relativePercentageChange > 0 ? "+" : ""}${tc.relativePercentageChange}% rel)`
                            : ""}
                        </div>
                      </div>
                    ) : (
                      <div className="text-right shrink-0 font-mono tabular-nums text-[11px] text-[#8E887E] dark:text-[#9A948A]">
                        {tc.latestScore}% · 1 attempt
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-[#78736A] dark:text-[#A6A096]">
                    {tc.explanation}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Section 06: Study Consistency Analytics */}
      <section className={`${CARD_SURFACE} p-5 sm:p-6 space-y-5`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#EFECE6] dark:border-[#2E2C27]">
          <div>
            <h3 className="font-editorial text-lg font-semibold text-[#22211F] dark:text-[#F5F3EE]">
              06. Study Consistency Analytics
            </h3>
            <p className="text-xs text-[#78736A] dark:text-[#A6A096] mt-0.5">
              Strictly separates planned study blocks from actual recorded focus timer sessions.
            </p>
          </div>
          <div className="text-xs text-[#78736A] dark:text-[#A6A096] font-mono tabular-nums">
            {studyConsistency.consistencyChangeSummary.message}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className={`${RECESSED_SURFACE} p-3.5`}>
            <div className="text-[10px] font-mono uppercase tracking-[0.08em] text-[#8E887E] dark:text-[#9A948A]">
              Planned Sessions
            </div>
            <div className="text-lg font-bold font-mono tabular-nums text-[#22211F] dark:text-[#F5F3EE] mt-1">
              {studyConsistency.plannedSessionsCount}
            </div>
            <div className="text-[11px] text-[#78736A] dark:text-[#A6A096] font-mono tabular-nums">
              {formatMinutes(studyConsistency.totalPlannedDurationMinutes)} planned
            </div>
          </div>

          <div className={`${RECESSED_SURFACE} p-3.5`}>
            <div className="text-[10px] font-mono uppercase tracking-[0.08em] text-[#8E887E] dark:text-[#9A948A]">
              Completed Planned
            </div>
            <div className="text-lg font-bold font-mono tabular-nums text-[#3B7A57] dark:text-[#68B088] mt-1">
              {studyConsistency.completedPlannedSessionsCount}
            </div>
            <div className="text-[11px] text-[#78736A] dark:text-[#A6A096] font-mono tabular-nums">
              {studyConsistency.plannedCompletionPercentage !== null
                ? `${studyConsistency.plannedCompletionPercentage}% adherence`
                : "No planned blocks yet"}
            </div>
          </div>

          <div className={`${RECESSED_SURFACE} p-3.5`}>
            <div className="text-[10px] font-mono uppercase tracking-[0.08em] text-[#8E887E] dark:text-[#9A948A]">
              Missed Sessions
            </div>
            <div className="text-lg font-bold font-mono tabular-nums text-[#A83838] dark:text-[#F28B8B] mt-1">
              {studyConsistency.missedPlannedSessionsCount}
            </div>
            <div className="text-[11px] text-[#78736A] dark:text-[#A6A096] font-mono tabular-nums">
              {studyConsistency.pendingPlannedSessionsCount} pending
            </div>
          </div>

          <div className={`${RECESSED_SURFACE} p-3.5`}>
            <div className="text-[10px] font-mono uppercase tracking-[0.08em] text-[#8E887E] dark:text-[#9A948A]">
              Actual Recorded
            </div>
            <div className="text-lg font-bold font-mono tabular-nums text-[#B46914] dark:text-[#E0983B] mt-1">
              {studyConsistency.totalActualRecordedMinutes > 0
                ? formatMinutes(studyConsistency.totalActualRecordedMinutes)
                : "0m recorded"}
            </div>
            <div className="text-[11px] text-[#78736A] dark:text-[#A6A096] font-mono tabular-nums">
              {studyConsistency.actualRecordedSessionsCount} focus timer session(s)
            </div>
          </div>

          <div className={`${RECESSED_SURFACE} p-3.5 col-span-2 lg:col-span-1`}>
            <div className="text-[10px] font-mono uppercase tracking-[0.08em] text-[#8E887E] dark:text-[#9A948A]">
              Last 7 Days Actual
            </div>
            <div className="text-lg font-bold font-mono tabular-nums text-[#22211F] dark:text-[#F5F3EE] mt-1">
              {formatMinutes(studyConsistency.consistencyChangeSummary.recent7DaysMinutes)}
            </div>
            <div className="text-[11px] text-[#78736A] dark:text-[#A6A096] font-mono tabular-nums">
              {studyConsistency.consistencyChangeSummary.hasComparablePeriods
                ? `Prior 7d: ${formatMinutes(studyConsistency.consistencyChangeSummary.previous7DaysMinutes)}`
                : "No prior 7d baseline"}
            </div>
          </div>
        </div>

        {/* 7-Day Actual vs Planned Hours BarChart */}
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={studyConsistency.dailyActivity} margin={{ top: 8, right: 10, left: -12, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke={gridColor}
              />
              <XAxis
                dataKey="dayLabel"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: axisTickColor }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                unit="h"
                tick={{ fontSize: 11, fill: axisTickColor }}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(val: any, name: string) => [`${val} hours`, name]}
                labelFormatter={(label: string, payload: any) =>
                  payload?.[0]?.payload?.date ? `${label} (${payload[0].payload.date})` : label
                }
              />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
              <Bar
                dataKey="actualRecordedHours"
                name="Actual Recorded Focus (h)"
                fill="#D58A2A"
                radius={[4, 4, 0, 0]}
                maxBarSize={26}
              />
              <Bar
                dataKey="plannedHours"
                name="Planned Study Blocks (h)"
                fill={theme === "dark" ? "#4A463F" : "#D9D3C7"}
                radius={[4, 4, 0, 0]}
                maxBarSize={26}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Section 07: Explainable Exam Readiness Indicator */}
      <section className={`${CARD_SURFACE} p-5 sm:p-6 space-y-4`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#EFECE6] dark:border-[#2E2C27]">
          <div>
            <h3 className="font-editorial text-lg font-semibold text-[#22211F] dark:text-[#F5F3EE]">
              07. Exam Readiness Indicators
            </h3>
            <p className="text-xs text-[#78736A] dark:text-[#A6A096] mt-0.5">
              Estimated readiness score based on available StudyPilot records — does not predict actual exam marks or passing probability.
            </p>
          </div>

          <SecondaryButton onClick={() => setShowReadinessConfig(!showReadinessConfig)}>
            <Sliders className="w-3.5 h-3.5 text-[#D58A2A]" />
            <span>Configure Weights</span>
          </SecondaryButton>
        </div>

        {/* Configurable Calculation Weights Panel */}
        {showReadinessConfig && (
          <div className={`${RECESSED_SURFACE} p-4 space-y-3`}>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#22211F] dark:text-[#F5F3EE]">
                Readiness Weighting Parameters (automatically normalized)
              </span>
              <button
                onClick={handleResetReadinessWeights}
                className="text-[#B46914] dark:text-[#E0983B] hover:underline cursor-pointer"
              >
                Reset Defaults (50% / 35% / 15%)
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[#57534E] dark:text-[#C5BFB5]">Measured Quiz Mastery</span>
                  <span className="font-mono font-semibold tabular-nums text-[#22211F] dark:text-[#F5F3EE]">
                    {Math.round(readinessConfig.assessedTopicMasteryWeight * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.8"
                  step="0.05"
                  value={readinessConfig.assessedTopicMasteryWeight}
                  onChange={(e) =>
                    setReadinessConfig({
                      ...readinessConfig,
                      assessedTopicMasteryWeight: parseFloat(e.target.value),
                    })
                  }
                  className="w-full accent-[#D58A2A] cursor-pointer"
                />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[#57534E] dark:text-[#C5BFB5]">Syllabus Completion</span>
                  <span className="font-mono font-semibold tabular-nums text-[#22211F] dark:text-[#F5F3EE]">
                    {Math.round(readinessConfig.syllabusCompletionWeight * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.7"
                  step="0.05"
                  value={readinessConfig.syllabusCompletionWeight}
                  onChange={(e) =>
                    setReadinessConfig({
                      ...readinessConfig,
                      syllabusCompletionWeight: parseFloat(e.target.value),
                    })
                  }
                  className="w-full accent-[#3B7A57] cursor-pointer"
                />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[#57534E] dark:text-[#C5BFB5]">Focus Study Time</span>
                  <span className="font-mono font-semibold tabular-nums text-[#22211F] dark:text-[#F5F3EE]">
                    {Math.round(readinessConfig.focusConsistencyWeight * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.5"
                  step="0.05"
                  value={readinessConfig.focusConsistencyWeight}
                  onChange={(e) =>
                    setReadinessConfig({
                      ...readinessConfig,
                      focusConsistencyWeight: parseFloat(e.target.value),
                    })
                  }
                  className="w-full accent-[#22211F] cursor-pointer"
                />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[#57534E] dark:text-[#C5BFB5]">Weak Topic Penalty</span>
                  <span className="font-mono font-semibold tabular-nums text-[#22211F] dark:text-[#F5F3EE]">
                    -{readinessConfig.weakTopicPenaltyPerTopic} pts/topic
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="15"
                  step="1"
                  value={readinessConfig.weakTopicPenaltyPerTopic}
                  onChange={(e) =>
                    setReadinessConfig({
                      ...readinessConfig,
                      weakTopicPenaltyPerTopic: parseInt(e.target.value, 10),
                    })
                  }
                  className="w-full accent-[#A83838] cursor-pointer"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <PrimaryButton onClick={handleApplyReadinessWeights} className="py-1.5">
                Apply Weights
              </PrimaryButton>
            </div>
          </div>
        )}

        {examReadiness.length === 0 ? (
          <div className="py-8 text-center space-y-2.5">
            <p className="text-sm font-medium text-[#22211F] dark:text-[#F5F3EE]">
              No upcoming examinations configured
            </p>
            <p className="text-xs text-[#78736A] dark:text-[#A6A096]">
              Add your upcoming exam dates in Exam Timetable to compute evidence-based readiness indicators.
            </p>
            <SecondaryButton onClick={() => setActivePage("exams")}>
              Manage Exams
            </SecondaryButton>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {examReadiness.map((ex) => {
              const statusTone =
                ex.readinessStatus === "High Readiness"
                  ? "text-[#3B7A57] dark:text-[#68B088]"
                  : ex.readinessStatus === "Moderate Readiness"
                  ? "text-[#B46914] dark:text-[#F0B35E]"
                  : ex.readinessStatus === "Needs Attention"
                  ? "text-[#A83838] dark:text-[#F28B8B]"
                  : "text-[#8E887E]";

              return (
                <div
                  key={ex.examId}
                  className={`${RECESSED_SURFACE} p-4 space-y-3`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-editorial text-base font-semibold text-[#22211F] dark:text-[#F5F3EE]">
                        {ex.examTitle}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-[#78736A] dark:text-[#A6A096] mt-0.5">
                        <span>{ex.subjectName}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">{ex.examDate}</span>
                        {ex.daysRemaining !== null && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums font-medium">
                              {ex.daysRemaining >= 0
                                ? `${ex.daysRemaining}d remaining`
                                : `${Math.abs(ex.daysRemaining)}d ago`}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0 font-mono tabular-nums">
                      <div className={`text-lg font-bold ${statusTone}`}>
                        {ex.estimatedReadinessScore !== null ? `${ex.estimatedReadinessScore}%` : "N/A"}
                      </div>
                      <div className={`text-[11px] font-semibold flex items-center justify-end gap-1 ${statusTone}`}>
                        <ShieldCheck className="w-3 h-3" />
                        <span>{ex.readinessStatus}</span>
                      </div>
                    </div>
                  </div>

                  <ul className="space-y-1 text-xs text-[#57534E] dark:text-[#C5BFB5] border-t border-[#E9E5DE] dark:border-[#32302B] pt-2.5">
                    {ex.supportingEvidence.map((ev, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-[#9A948A] select-none">•</span>
                        <span>{ev}</span>
                      </li>
                    ))}
                  </ul>

                  {ex.weakTopicNames.length > 0 && (
                    <div className="text-xs text-[#A83838] dark:text-[#F28B8B]">
                      <span className="font-semibold">Weak areas: </span>
                      <span>{ex.weakTopicNames.join(", ")}</span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-[#E9E5DE] dark:border-[#32302B] text-xs text-[#22211F] dark:text-[#F5F3EE]">
                    <span className="font-semibold">Next action: </span>
                    {ex.suggestedNextAction}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Section 08: Personalized Learning Insights */}
      <section className={`${CARD_SURFACE} p-5 sm:p-6 space-y-4`}>
        <div className="pb-3 border-b border-[#EFECE6] dark:border-[#2E2C27] flex items-center justify-between gap-2">
          <div>
            <h3 className="font-editorial text-lg font-semibold text-[#22211F] dark:text-[#F5F3EE]">
              08. Personalized Learning Insights
            </h3>
            <p className="text-xs text-[#78736A] dark:text-[#A6A096] mt-0.5">
              Deterministic behavioral & academic diagnostics linking observed patterns to supporting data and next steps.
            </p>
          </div>
          <span className="text-xs font-mono tabular-nums text-[#8E887E] dark:text-[#9A948A]">
            {insights.length} insight(s)
          </span>
        </div>

        {insights.length === 0 ? (
          <div className="py-6 text-center text-xs text-[#78736A] dark:text-[#A6A096]">
            No learning patterns detected yet. Record quiz attempts, focus sessions, or study plans to generate insights.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.map((ins) => (
              <div
                key={ins.id}
                className={`${RECESSED_SURFACE} p-4 space-y-2.5 flex flex-col justify-between`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {getInsightIcon(ins.iconName)}
                      <h4 className="text-sm font-semibold text-[#22211F] dark:text-[#F5F3EE]">
                        {ins.title}
                      </h4>
                    </div>
                    {ins.metric && (
                      <span className="text-xs font-mono font-semibold tabular-nums text-[#57534E] dark:text-[#C5BFB5]">
                        {ins.metric}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[#22211F] dark:text-[#F5F3EE] leading-relaxed">
                    {ins.observation}
                  </p>
                  <p className="text-xs text-[#78736A] dark:text-[#A6A096]">
                    <span className="font-semibold text-[#57534E] dark:text-[#C5BFB5]">Evidence: </span>
                    {ins.evidence}
                  </p>
                  <p className="text-xs text-[#78736A] dark:text-[#A6A096]">
                    <span className="font-semibold text-[#57534E] dark:text-[#C5BFB5]">Why it matters: </span>
                    {ins.whyItMatters}
                  </p>
                </div>

                <div className="pt-2.5 border-t border-[#E9E5DE] dark:border-[#32302B] text-xs text-[#B46914] dark:text-[#F0B35E] font-medium flex items-center justify-between gap-2">
                  <span>Next action: {ins.action}</span>
                  <Calendar className="w-3.5 h-3.5 shrink-0 opacity-75" />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <PerformanceReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        analytics={analytics}
        profile={profile}
      />
    </div>
  );
};
