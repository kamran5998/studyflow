import React from "react";
import { ArrowUpRight } from "lucide-react";
import { useStudyFlow } from "../../context/StudyFlowContext";
import { formatMinutes } from "../../lib/utils";
import { ProgressBar } from "../common/ProgressBar";

export const KpiCards: React.FC = () => {
  const { tasks, exams, profile, focusSessions, setActivePage } = useStudyFlow();

  const todayStr = new Date().toISOString().split("T")[0];
  const todayTasks = tasks.filter((t) => t.date === todayStr);
  const completedTodayTasks = todayTasks.filter((t) => t.status === "completed").length;
  const totalTodayTasks = todayTasks.length;

  const todaySessionsMinutes = focusSessions
    .filter((s) => s.timestamp.startsWith(todayStr))
    .reduce((acc, curr) => acc + curr.durationMinutes, 0);

  const studyTimeFormatted = formatMinutes(todaySessionsMinutes);
  const goalHours = profile.dailyGoalHours || 4;
  const quotaPct = Math.min(
    100,
    Math.round((todaySessionsMinutes / (goalHours * 60)) * 100)
  );
  const checklistPct =
    totalTodayTasks > 0
      ? Math.round((completedTodayTasks / totalTodayTasks) * 100)
      : 0;

  const upcomingCount = exams.length;
  const nextExam = exams[0] || null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* 1. DEEP WORK TODAY */}
      <div
        id="kpi-study-time"
        onClick={() => setActivePage("focus")}
        className="bg-white dark:bg-[#21201C] p-5 rounded-xl border border-[#E9E5DE] dark:border-[#32302B] hover:border-[#D7D1C7] dark:hover:border-[#47443D] transition-colors cursor-pointer flex flex-col justify-between gap-3.5"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9A948A] dark:text-[#7A756C]">
            DEEP WORK TODAY
          </span>
          <span className="px-2 py-0.5 rounded bg-[#FAF1E3] dark:bg-[#3A2C16] border border-[#F0DFC2] dark:border-[#523E20] font-mono text-[10px] font-medium text-[#B46914] dark:text-[#E0983B] tabular-nums">
            Goal: {goalHours}h
          </span>
        </div>

        <div className="text-2xl font-bold font-mono tracking-tight text-[#22211F] dark:text-[#F5F3EE] tabular-nums">
          {studyTimeFormatted}
        </div>

        <div className="space-y-2">
          <ProgressBar value={quotaPct} color="amber" size="sm" />
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[#78736A] dark:text-[#A6A096] tabular-nums">
              {quotaPct}% of daily quota
            </span>
            <span className="inline-flex items-center gap-0.5 text-[#B46914] dark:text-[#E0983B] font-medium">
              Log block <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      {/* 2. DAILY CHECKLIST */}
      <div
        id="kpi-tasks"
        onClick={() => setActivePage("planner")}
        className="bg-white dark:bg-[#21201C] p-5 rounded-xl border border-[#E9E5DE] dark:border-[#32302B] hover:border-[#D7D1C7] dark:hover:border-[#47443D] transition-colors cursor-pointer flex flex-col justify-between gap-3.5"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9A948A] dark:text-[#7A756C]">
            DAILY CHECKLIST
          </span>
          <span className="px-2 py-0.5 rounded bg-[#EDF5F0] dark:bg-[#1C3326] border border-[#CFE3D6] dark:border-[#2B4E3A] font-mono text-[10px] font-medium text-[#3B7A57] dark:text-[#68B088] tabular-nums">
            {completedTodayTasks}/{totalTodayTasks} Done
          </span>
        </div>

        <div className="text-2xl font-bold font-mono tracking-tight text-[#22211F] dark:text-[#F5F3EE] tabular-nums">
          {completedTodayTasks}{" "}
          <span className="text-xs font-sans font-normal text-[#78736A] dark:text-[#A6A096]">
            / {totalTodayTasks} tasks
          </span>
        </div>

        <div className="space-y-2">
          <ProgressBar value={checklistPct} color="green" size="sm" />
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[#78736A] dark:text-[#A6A096] truncate">
              {totalTodayTasks === 0
                ? "No tasks slated"
                : totalTodayTasks - completedTodayTasks === 0
                ? "All complete"
                : `${totalTodayTasks - completedTodayTasks} pending`}
            </span>
            <span className="inline-flex items-center gap-0.5 text-[#B46914] dark:text-[#E0983B] font-medium shrink-0">
              Open planner <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      {/* 3. NEAREST MILESTONE */}
      <div
        id="kpi-upcoming-exams"
        onClick={() => setActivePage("exams")}
        className="bg-white dark:bg-[#21201C] p-5 rounded-xl border border-[#E9E5DE] dark:border-[#32302B] hover:border-[#D7D1C7] dark:hover:border-[#47443D] transition-colors cursor-pointer flex flex-col justify-between gap-3.5"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9A948A] dark:text-[#7A756C]">
            NEAREST MILESTONE
          </span>
        </div>

        <div className="min-h-[32px] flex items-center">
          {nextExam ? (
            <div className="min-w-0">
              <div className="font-editorial text-lg font-bold text-[#22211F] dark:text-[#F5F3EE] truncate">
                {nextExam.subjectName}
              </div>
              <div className="text-[11px] font-mono text-[#B46914] dark:text-[#E0983B] mt-0.5 tabular-nums">
                {nextExam.title} · {nextExam.date}
              </div>
            </div>
          ) : (
            <span className="font-editorial italic text-sm text-[#78736A] dark:text-[#A6A096]">
              No exams scheduled
            </span>
          )}
        </div>

        <div className="pt-2 border-t border-[#EFECE6] dark:border-[#32302B] flex items-center justify-between text-[11px]">
          <span className="text-[#78736A] dark:text-[#A6A096] tabular-nums">
            {upcomingCount} {upcomingCount === 1 ? "exam" : "exams"} on calendar
          </span>
          <span className="inline-flex items-center gap-0.5 text-[#B46914] dark:text-[#E0983B] font-medium shrink-0">
            Timetable <ArrowUpRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </div>
  );
};
