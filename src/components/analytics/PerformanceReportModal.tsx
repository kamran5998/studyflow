import React from "react";
import { X, Printer, FileSpreadsheet, FileJson, GraduationCap, AlertTriangle } from "lucide-react";
import { LearningAnalyticsResponse, StudentProfile } from "../../types";
import { formatMinutes } from "../../lib/utils";
import { PrimaryButton, SecondaryButton } from "../common/ui";

interface PerformanceReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  analytics: LearningAnalyticsResponse;
  profile: StudentProfile;
}

function escapeCsvCell(val: unknown): string {
  const str = val === null || val === undefined ? "" : String(val);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function downloadPerformanceJSON(
  analytics: LearningAnalyticsResponse,
  profile: StudentProfile
): void {
  const payload = {
    reportTitle: "StudyPilot AI — Student Learning Performance Report",
    generatedAt: new Date().toISOString(),
    student: {
      name: profile.name,
      institution: profile.institution || "Not specified",
      major: profile.major || "Not specified",
      semester: profile.semester || "Not specified",
      studentId: profile.studentId || "Not specified",
    },
    analytics,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `studypilot-performance-report-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadPerformanceCSV(
  analytics: LearningAnalyticsResponse,
  profile: StudentProfile
): void {
  const rows: string[][] = [];
  const pushRow = (...cells: unknown[]) => rows.push(cells.map(escapeCsvCell));

  pushRow("StudyPilot AI — Student Learning Performance Report");
  pushRow("Student Name", profile.name, "Institution", profile.institution || "N/A", "Generated At", analytics.evaluatedAt);
  pushRow("");

  pushRow("SECTION 1: LEARNING OVERVIEW");
  pushRow("Metric", "Value");
  pushRow("Total Recorded Study Time", formatMinutes(analytics.overview.totalRecordedStudyMinutes));
  pushRow("Completed Focus Sessions", analytics.overview.totalCompletedFocusSessions);
  pushRow("Completed Tasks", `${analytics.overview.completedTasks} / ${analytics.overview.totalTasks}`);
  pushRow("Total Quiz Attempts", analytics.overview.totalQuizAttempts);
  pushRow(
    "Average Measured Quiz Score",
    analytics.overview.averageQuizPerformance !== null
      ? `${analytics.overview.averageQuizPerformance}%`
      : "Insufficient Quiz Data"
  );
  pushRow("Mastered Topics", analytics.overview.masteredTopicsCount);
  pushRow("Developing Topics", analytics.overview.developingTopicsCount);
  pushRow("Weak Topics", analytics.overview.weakTopicsCount);
  pushRow("Unassessed Topics", analytics.overview.unknownEvidenceTopicsCount);
  pushRow("");

  pushRow("SECTION 2: COURSE-WISE PERFORMANCE");
  pushRow(
    "Course",
    "Total Topics",
    "Assessed Topics",
    "Measured Quiz Avg (%)",
    "Syllabus Progress (%)",
    "Completed Activities",
    "Pending Activities",
    "Recorded Study Time (min)"
  );
  analytics.subjectPerformance.forEach((s) => {
    pushRow(
      s.subjectName,
      s.totalTopics,
      s.assessedTopicsCount,
      s.averageMeasuredQuizScore !== null ? s.averageMeasuredQuizScore : "Insufficient Data",
      s.syllabusProgressPercent,
      s.completedActivitiesCount,
      s.pendingActivitiesCount,
      s.recordedStudyMinutes
    );
  });
  pushRow("");

  pushRow("SECTION 3: TOPIC MASTERY & IMPROVEMENT");
  pushRow("Topic", "Course", "Attempts", "First Score (%)", "Latest Score (%)", "Change (Percentage Points)", "Classification");
  analytics.learningImprovement.topicComparisons.forEach((tc) => {
    pushRow(
      tc.topic,
      tc.subjectName,
      tc.attemptCount,
      tc.firstScore,
      tc.latestScore,
      tc.absoluteImprovementPoints !== null ? tc.absoluteImprovementPoints : "Insufficient History (1 attempt)",
      tc.latestMasteryTier
    );
  });
  pushRow("");

  pushRow("SECTION 4: EXAM READINESS INDICATORS (ESTIMATED FROM AVAILABLE RECORDS)");
  pushRow("Exam", "Course", "Date", "Days Remaining", "Estimated Readiness (%)", "Status", "Disclaimer");
  analytics.examReadiness.forEach((ex) => {
    pushRow(
      ex.examTitle,
      ex.subjectName,
      ex.examDate,
      ex.daysRemaining !== null ? ex.daysRemaining : "N/A",
      ex.estimatedReadinessScore !== null ? ex.estimatedReadinessScore : "Insufficient Data",
      ex.readinessStatus,
      ex.disclaimer
    );
  });

  const csvContent = rows.map((r) => r.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `studypilot-performance-report-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const PerformanceReportModal: React.FC<PerformanceReportModalProps> = ({
  isOpen,
  onClose,
  analytics,
  profile,
}) => {
  if (!isOpen) return null;

  const { overview, subjectPerformance, topicMasteryHeatmap, learningImprovement, studyConsistency, examReadiness, insights } =
    analytics;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1C1B18]/65 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto print:static print:bg-white print:p-0"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
    >
      <div className="print-only-container w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#21201C] border border-[#E9E5DE] dark:border-[#32302B] rounded-2xl shadow-xl text-[#22211F] dark:text-[#F5F3EE]">
        {/* Modal Toolbar (hidden in print) */}
        <div className="no-print sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 px-6 py-4 bg-white/95 dark:bg-[#21201C]/95 backdrop-blur-md border-b border-[#EFECE6] dark:border-[#2E2C27]">
          <div>
            <h3 id="report-modal-title" className="text-base font-editorial font-semibold">
              StudyPilot Student Performance Report
            </h3>
            <p className="text-xs text-[#78736A] dark:text-[#A6A096]">
              Verified academic summary generated from recorded StudyPilot activity
            </p>
          </div>
          <div className="flex items-center gap-2">
            <SecondaryButton onClick={() => downloadPerformanceCSV(analytics, profile)} className="py-1.5 px-3">
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#3B7A57] dark:text-[#68B088]" />
              <span>CSV</span>
            </SecondaryButton>
            <SecondaryButton onClick={() => downloadPerformanceJSON(analytics, profile)} className="py-1.5 px-3">
              <FileJson className="w-3.5 h-3.5 text-[#D58A2A] dark:text-[#E0983B]" />
              <span>JSON</span>
            </SecondaryButton>
            <PrimaryButton onClick={() => window.print()} className="py-1.5 px-3.5">
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </PrimaryButton>
            <button
              onClick={onClose}
              aria-label="Close report preview"
              className="p-1.5 rounded-lg text-[#8E887E] hover:text-[#22211F] dark:hover:text-[#F5F3EE] hover:bg-[#F5F2EC] dark:hover:bg-[#2A2823] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-6 sm:p-8 space-y-6 text-sm">
          {/* Document Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-[#E9E5DE] dark:border-[#32302B]">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#22211F] dark:bg-[#F5F3EE] text-white dark:text-[#1C1B18] flex items-center justify-center shrink-0">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-editorial font-semibold">
                  StudyPilot — Student Performance Report
                </h1>
                <div className="text-xs text-[#78736A] dark:text-[#A6A096] mt-1 flex flex-wrap items-center gap-2">
                  <span>{profile.name || "Student"}</span>
                  {profile.major && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{profile.major}</span>
                    </>
                  )}
                  {profile.institution && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{profile.institution}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="text-xs text-[#78736A] dark:text-[#A6A096] font-mono tabular-nums sm:text-right">
              <div>Report Date: {new Date(analytics.evaluatedAt).toISOString().slice(0, 10)}</div>
              {profile.studentId && <div>ID: {profile.studentId}</div>}
            </div>
          </div>

          {/* Executive Summary */}
          {analytics.aiExecutiveSummary && (
            <div className="p-4 rounded-xl bg-[#FAF8F4] dark:bg-[#1B1A17] border border-[#E9E5DE] dark:border-[#32302B] text-xs leading-relaxed text-[#57534E] dark:text-[#C5BFB5]">
              <span className="font-semibold text-[#22211F] dark:text-[#F5F3EE]">Executive Summary: </span>
              {analytics.aiExecutiveSummary}
            </div>
          )}

          {/* Overview Metrics */}
          <div>
            <h2 className="font-editorial text-base font-semibold text-[#22211F] dark:text-[#F5F3EE] mb-3">
              01. Recorded Learning Overview
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl border border-[#E9E5DE] dark:border-[#32302B]">
                <div className="text-[11px] font-mono uppercase tracking-[0.06em] text-[#8E887E]">
                  Recorded Study Time
                </div>
                <div className="text-base font-bold font-mono tabular-nums mt-0.5">
                  {overview.totalRecordedStudyMinutes > 0
                    ? formatMinutes(overview.totalRecordedStudyMinutes)
                    : "No sessions"}
                </div>
              </div>
              <div className="p-3 rounded-xl border border-[#E9E5DE] dark:border-[#32302B]">
                <div className="text-[11px] font-mono uppercase tracking-[0.06em] text-[#8E887E]">
                  Average Quiz Score
                </div>
                <div className="text-base font-bold font-mono tabular-nums mt-0.5">
                  {overview.averageQuizPerformance !== null
                    ? `${overview.averageQuizPerformance}%`
                    : "Insufficient data"}
                </div>
              </div>
              <div className="p-3 rounded-xl border border-[#E9E5DE] dark:border-[#32302B]">
                <div className="text-[11px] font-mono uppercase tracking-[0.06em] text-[#8E887E]">
                  Task Completion
                </div>
                <div className="text-base font-bold font-mono tabular-nums mt-0.5">
                  {overview.taskCompletionRate !== null
                    ? `${overview.completedTasks}/${overview.totalTasks} (${overview.taskCompletionRate}%)`
                    : "No tasks"}
                </div>
              </div>
              <div className="p-3 rounded-xl border border-[#E9E5DE] dark:border-[#32302B]">
                <div className="text-[11px] font-mono uppercase tracking-[0.06em] text-[#8E887E]">
                  Topic Mastery Split
                </div>
                <div className="text-xs font-mono tabular-nums mt-1">
                  {overview.masteredTopicsCount} Strong · {overview.developingTopicsCount} Dev · {overview.weakTopicsCount} Weak
                </div>
              </div>
            </div>
          </div>

          {/* Course Performance Table */}
          <div>
            <h2 className="font-editorial text-base font-semibold text-[#22211F] dark:text-[#F5F3EE] mb-3">
              02. Course-Wise Performance Analysis
            </h2>
            {subjectPerformance.length === 0 ? (
              <p className="text-xs text-[#78736A]">No courses configured yet.</p>
            ) : (
              <div className="overflow-x-auto border border-[#E9E5DE] dark:border-[#32302B] rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#FAF8F4] dark:bg-[#1B1A17] text-[#78736A] dark:text-[#A6A096] font-mono text-[10px] uppercase tracking-[0.06em]">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Course</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Assessed</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Measured Quiz Avg</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Syllabus</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Recorded Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFECE6] dark:divide-[#2E2C27]">
                    {subjectPerformance.map((sp) => (
                      <tr key={sp.subjectId}>
                        <td className="py-2.5 px-3 font-medium">{sp.subjectName}</td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                          {sp.assessedTopicsCount}/{sp.totalTopics}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                          {sp.averageMeasuredQuizScore !== null ? `${sp.averageMeasuredQuizScore}%` : "No quizzes"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                          {sp.syllabusProgressPercent}%
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                          {sp.recordedStudyMinutes > 0 ? formatMinutes(sp.recordedStudyMinutes) : "0m"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Learning Improvement & Consistency */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-[#E9E5DE] dark:border-[#32302B] space-y-2">
              <h2 className="font-editorial text-base font-semibold text-[#22211F] dark:text-[#F5F3EE]">
                03. Learning Improvement Evaluation
              </h2>
              <p className="text-xs text-[#78736A] dark:text-[#A6A096]">
                {learningImprovement.periodComparison.explanation}
              </p>
              {learningImprovement.topicComparisons.slice(0, 5).map((tc) => (
                <div key={`${tc.subjectId}-${tc.topic}`} className="text-xs pt-1.5 border-t border-[#EFECE6] dark:border-[#2E2C27] flex justify-between gap-2">
                  <span className="font-medium truncate">{tc.topic}</span>
                  <span className="font-mono tabular-nums shrink-0">
                    {tc.hasComparableHistory
                      ? `${tc.firstScore}% → ${tc.latestScore}% (${tc.absoluteImprovementPoints! > 0 ? "+" : ""}${tc.absoluteImprovementPoints} pts)`
                      : `${tc.latestScore}% (1 attempt)`}
                  </span>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-xl border border-[#E9E5DE] dark:border-[#32302B] space-y-2">
              <h2 className="font-editorial text-base font-semibold text-[#22211F] dark:text-[#F5F3EE]">
                04. Study Consistency Summary
              </h2>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[#8E887E]">Planned Sessions: </span>
                  <span className="font-mono font-semibold tabular-nums">{studyConsistency.plannedSessionsCount}</span>
                </div>
                <div>
                  <span className="text-[#8E887E]">Completed: </span>
                  <span className="font-mono font-semibold tabular-nums">{studyConsistency.completedPlannedSessionsCount}</span>
                </div>
                <div>
                  <span className="text-[#8E887E]">Missed: </span>
                  <span className="font-mono font-semibold tabular-nums">{studyConsistency.missedPlannedSessionsCount}</span>
                </div>
                <div>
                  <span className="text-[#8E887E]">Planned vs Actual: </span>
                  <span className="font-mono font-semibold tabular-nums">
                    {studyConsistency.totalPlannedDurationMinutes}m / {studyConsistency.totalActualRecordedMinutes}m
                  </span>
                </div>
              </div>
              <p className="text-xs text-[#78736A] dark:text-[#A6A096] pt-1">
                {studyConsistency.consistencyChangeSummary.message}
              </p>
            </div>
          </div>

          {/* Exam Readiness */}
          {examReadiness.length > 0 && (
            <div className="space-y-2.5">
              <h2 className="font-editorial text-base font-semibold text-[#22211F] dark:text-[#F5F3EE]">
                05. Exam Readiness Indicators
              </h2>
              <div className="space-y-2">
                {examReadiness.map((ex) => (
                  <div key={ex.examId} className="p-3.5 rounded-xl border border-[#E9E5DE] dark:border-[#32302B] text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold text-[#22211F] dark:text-[#F5F3EE]">
                        {ex.examTitle} · {ex.subjectName}
                      </div>
                      <div className="text-[#78736A] dark:text-[#A6A096] mt-0.5">
                        {ex.supportingEvidence.slice(0, 2).join(" · ")}
                      </div>
                    </div>
                    <div className="font-mono tabular-nums text-right shrink-0">
                      <div className="font-bold">
                        {ex.estimatedReadinessScore !== null ? `${ex.estimatedReadinessScore}%` : "Insufficient Data"}
                      </div>
                      <div className="text-[#8E887E]">{ex.readinessStatus}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-start gap-2 text-[11px] text-[#78736A] dark:text-[#A6A096] pt-1">
                <AlertTriangle className="w-3.5 h-3.5 text-[#D58A2A] shrink-0 mt-0.5" />
                <span>
                  Estimated readiness scores are computed from available StudyPilot records (quizzes, syllabus completion, and recorded focus sessions). They do not predict actual examination marks or guarantee passing probability.
                </span>
              </div>
            </div>
          )}

          {/* Actionable Insights */}
          {insights.length > 0 && (
            <div className="space-y-2">
              <h2 className="font-editorial text-base font-semibold text-[#22211F] dark:text-[#F5F3EE]">
                06. Personalized Learning Insights ({topicMasteryHeatmap.filter((t) => t.masteryClassification === "weak").length} weak topics)
              </h2>
              <ul className="space-y-2 text-xs">
                {insights.slice(0, 4).map((ins) => (
                  <li key={ins.id} className="p-3 rounded-xl border border-[#E9E5DE] dark:border-[#32302B]">
                    <div className="font-semibold text-[#22211F] dark:text-[#F5F3EE]">
                      {ins.title}: {ins.observation}
                    </div>
                    <div className="text-[#78736A] dark:text-[#A6A096] mt-0.5">
                      Next action: {ins.action}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
