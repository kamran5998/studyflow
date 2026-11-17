import React, { useState } from "react";
import { Calendar, FileText, ArrowRight } from "lucide-react";
import { useStudyFlow } from "../../context/StudyFlowContext";
import { getDaysRemaining } from "../../lib/utils";
import { PriorityBadge } from "../common/Badge";

export const UpcomingSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"exams" | "assignments">("exams");
  const { exams, assignments, setActivePage } = useStudyFlow();

  const displayExams = exams.slice(0, 4).map((e) => {
    const timing = getDaysRemaining(e.date);
    return {
      id: e.id,
      subject: e.subjectName,
      title: e.title,
      dateLabel: e.date,
      countdown: timing.label,
      isUrgent: timing.isUrgent,
    };
  });

  const displayAssignments = assignments.slice(0, 4).map((a) => {
    const timing = getDaysRemaining(a.dueDate);
    return {
      id: a.id,
      title: a.title,
      subject: a.subjectName,
      dueDate: a.dueDate,
      countdown: timing.label,
      priority: a.priority,
      status: a.status,
    };
  });

  return (
    <div className="bg-white dark:bg-[#21201C] rounded-xl border border-[#E9E5DE] dark:border-[#32302B] p-5 flex flex-col justify-between transition-colors">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-[#EFECE6] dark:border-[#32302B]">
          <div>
            <h3 className="font-editorial text-base font-bold text-[#22211F] dark:text-[#F5F3EE] tracking-tight">
              Milestones &amp; Deadlines
            </h3>
            <p className="text-xs text-[#78736A] dark:text-[#A6A096]">
              Scheduled exams and deliverables
            </p>
          </div>

          <div className="flex items-center p-0.5 bg-[#F5F2EC] dark:bg-[#1B1A17] border border-[#E9E5DE] dark:border-[#32302B] rounded-lg">
            <button
              onClick={() => setActiveTab("exams")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                activeTab === "exams"
                  ? "bg-white dark:bg-[#2A2823] text-[#22211F] dark:text-[#F5F3EE] shadow-2xs font-semibold"
                  : "text-[#78736A] dark:text-[#A6A096] hover:text-[#22211F] dark:hover:text-[#F5F3EE]"
              }`}
            >
              Exams ({exams.length})
            </button>
            <button
              onClick={() => setActiveTab("assignments")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                activeTab === "assignments"
                  ? "bg-white dark:bg-[#2A2823] text-[#22211F] dark:text-[#F5F3EE] shadow-2xs font-semibold"
                  : "text-[#78736A] dark:text-[#A6A096] hover:text-[#22211F] dark:hover:text-[#F5F3EE]"
              }`}
            >
              Assignments ({assignments.length})
            </button>
          </div>
        </div>

        <div className="mt-3.5 space-y-2">
          {activeTab === "exams" ? (
            displayExams.length === 0 ? (
              <div className="py-8 text-center flex flex-col items-center justify-center">
                <div className="w-9 h-9 rounded-lg bg-[#FAF1E3] dark:bg-[#3A2C16] border border-[#F0DFC2] dark:border-[#523E20] text-[#D58A2A] dark:text-[#E0983B] flex items-center justify-center mb-2">
                  <Calendar className="w-4 h-4" />
                </div>
                <p className="text-xs text-[#22211F] dark:text-[#F5F3EE] font-medium">
                  No exams scheduled
                </p>
                <p className="text-[11px] text-[#78736A] dark:text-[#A6A096] mt-0.5 mb-3">
                  Add exam dates to calibrate countdowns
                </p>
                <button
                  onClick={() => setActivePage("exams")}
                  className="text-xs px-3 py-1.5 rounded-lg bg-[#22211F] hover:bg-[#363430] dark:bg-[#F5F3EE] dark:hover:bg-[#E6E2DA] text-white dark:text-[#1C1B18] font-medium cursor-pointer"
                >
                  + Schedule Exam
                </button>
              </div>
            ) : (
              displayExams.map((exam) => (
                <div
                  key={exam.id}
                  onClick={() => setActivePage("exams")}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-[#EFECE6] dark:border-[#32302B] hover:border-[#D58A2A] hover:bg-[#FAF8F4] dark:hover:bg-[#2A2823] transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-[#FAF1E3] dark:bg-[#3A2C16] text-[#B46914] dark:text-[#E0983B] flex items-center justify-center shrink-0">
                      <Calendar className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold text-[#22211F] dark:text-[#F5F3EE] truncate">
                        {exam.subject} {exam.title ? `· ${exam.title}` : ""}
                      </h4>
                      <span className="text-[11px] font-mono text-[#9A948A] tabular-nums">
                        {exam.dateLabel}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <span
                      className={`text-xs font-mono font-medium tabular-nums ${
                        exam.isUrgent
                          ? "text-[#A83838] dark:text-[#E57373] font-semibold"
                          : "text-[#78736A] dark:text-[#A6A096]"
                      }`}
                    >
                      {exam.countdown}
                    </span>
                  </div>
                </div>
              ))
            )
          ) : displayAssignments.length === 0 ? (
            <div className="py-8 text-center flex flex-col items-center justify-center">
              <div className="w-9 h-9 rounded-lg bg-[#FAF1E3] dark:bg-[#3A2C16] border border-[#F0DFC2] dark:border-[#523E20] text-[#D58A2A] dark:text-[#E0983B] flex items-center justify-center mb-2">
                <FileText className="w-4 h-4" />
              </div>
              <p className="text-xs text-[#22211F] dark:text-[#F5F3EE] font-medium">
                No assignments pending
              </p>
              <p className="text-[11px] text-[#78736A] dark:text-[#A6A096] mt-0.5 mb-3">
                Add coursework &amp; problem sets to track deadlines
              </p>
              <button
                onClick={() => setActivePage("assignments")}
                className="text-xs px-3 py-1.5 rounded-lg bg-[#22211F] hover:bg-[#363430] dark:bg-[#F5F3EE] dark:hover:bg-[#E6E2DA] text-white dark:text-[#1C1B18] font-medium cursor-pointer"
              >
                + Add Assignment
              </button>
            </div>
          ) : (
            displayAssignments.map((a) => (
              <div
                key={a.id}
                onClick={() => setActivePage("assignments")}
                className="flex items-center justify-between p-2.5 rounded-lg border border-[#EFECE6] dark:border-[#32302B] hover:border-[#D58A2A] hover:bg-[#FAF8F4] dark:hover:bg-[#2A2823] transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-[#F5F2EC] dark:bg-[#2A2823] text-[#22211F] dark:text-[#F5F3EE] flex items-center justify-center shrink-0">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-semibold text-[#22211F] dark:text-[#F5F3EE] truncate">
                      {a.title}
                    </h4>
                    <span className="text-[11px] text-[#78736A] dark:text-[#A6A096]">
                      {a.subject}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <PriorityBadge priority={a.priority} />
                  <span className="text-xs font-mono font-medium text-[#78736A] dark:text-[#A6A096] tabular-nums">
                    {a.countdown}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-[#EFECE6] dark:border-[#32302B] flex items-center justify-between text-xs">
        <span className="text-[#78736A] dark:text-[#A6A096] font-mono tabular-nums">
          {activeTab === "exams"
            ? `${exams.length} ${exams.length === 1 ? "exam" : "exams"}`
            : `${assignments.length} ${assignments.length === 1 ? "assignment" : "assignments"}`}
        </span>
        <button
          onClick={() => setActivePage(activeTab)}
          className="text-[#B46914] dark:text-[#E0983B] hover:underline font-medium flex items-center gap-1 cursor-pointer"
        >
          <span>View all {activeTab}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
