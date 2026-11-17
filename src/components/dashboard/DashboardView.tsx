import React from "react";
import { useStudyFlow } from "../../context/StudyFlowContext";
import { KpiCards } from "./KpiCards";
import { AIRecommendationBanner } from "./AIRecommendationBanner";
import { TodaysPlan } from "./TodaysPlan";
import { SubjectProgressCard } from "./SubjectProgressCard";
import { WeeklyStudyChart } from "./WeeklyStudyChart";
import { StudyStreakCard } from "./StudyStreakCard";
import { Play, Plus } from "lucide-react";
import { KickerPill, PrimaryButton, SecondaryButton } from "../common/ui";

export const DashboardView: React.FC = () => {
  const { profile, tasks, setActivePage } = useStudyFlow();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const studentFirstName = profile.name ? profile.name.split(" ")[0] : "Student";
  const todayFormatted = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })
    .format(new Date())
    .toUpperCase();

  const todayStr = new Date().toISOString().split("T")[0];
  const todayTasks = tasks.filter((t) => t.date === todayStr);
  const pendingToday = todayTasks.filter((t) => t.status !== "completed").length;

  const subMessage =
    todayTasks.length === 0 || pendingToday === 0
      ? "All today's tasks completed. Feel free to review or start a fresh focus session."
      : `${pendingToday} study ${pendingToday === 1 ? "block" : "blocks"} remaining on today's agenda. Stay steady on current syllabus targets.`;

  return (
    <div className="space-y-6">
      {/* Editorial Greeting Header matching Reference #1 */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-1 pb-1">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[#78736A] dark:text-[#A6A096]">
              {todayFormatted}
            </span>
            <span className="text-[#C8C2B6] dark:text-[#47443D]" aria-hidden="true">
              ·
            </span>
            <KickerPill variant="amber">SEMESTER NOTEBOOK</KickerPill>
          </div>
          <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-[#22211F] dark:text-[#F5F3EE] tracking-tight leading-tight">
            {getGreeting()},{" "}
            <span className="bg-[#F4ECC9] dark:bg-[#4A3B1E] px-2 py-0.5 rounded-sm inline-block">
              {studentFirstName}
            </span>
            .
          </h1>
          <p className="text-xs sm:text-[13px] text-[#78736A] dark:text-[#A6A096] mt-2 leading-relaxed max-w-2xl">
            {subMessage}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <PrimaryButton
            id="dashboard-start-focus-btn"
            onClick={() => setActivePage("focus")}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Focus Session</span>
          </PrimaryButton>
          <SecondaryButton
            id="dashboard-add-task-btn"
            onClick={() => setActivePage("planner")}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Plan Today</span>
          </SecondaryButton>
        </div>
      </div>

      {/* 3 Editorial Summary KPI Cards */}
      <KpiCards />

      {/* Today's Study Agenda */}
      <div className="w-full">
        <TodaysPlan />
      </div>

      {/* Explainable AI Recommendation Banner */}
      <AIRecommendationBanner />

      {/* Secondary Academic & Velocity Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        <SubjectProgressCard />
        <WeeklyStudyChart />
        <StudyStreakCard />
      </div>
    </div>
  );
};
