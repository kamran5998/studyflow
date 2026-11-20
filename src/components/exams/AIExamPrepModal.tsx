import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Calendar,
  Clock,
  CheckCircle2,
  RefreshCw,
  X,
  Play,
  Target,
  BookCheck,
  Brain,
  Layers,
} from "lucide-react";
import { Exam, AIExamPrepPlan } from "../../types";
import { useStudyFlow } from "../../context/StudyFlowContext";
import { aiService } from "../../services/aiService";
import { KickerPill, PrimaryButton } from "../common/ui";

interface AIExamPrepModalProps {
  exam: Exam | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AIExamPrepModal: React.FC<AIExamPrepModalProps> = ({ exam, isOpen, onClose }) => {
  const { subjects, tasks, exams, focusSessions, quizScores, addTask, setActivePage, showToast } = useStudyFlow();
  const [prepPlan, setPrepPlan] = useState<AIExamPrepPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [adopted, setAdopted] = useState(false);

  const fetchExamPlan = async () => {
    if (!exam) return;
    setLoading(true);
    setAdopted(false);
    try {
      const res = await aiService.getExamPlan(exam, {
        subjects,
        tasks,
        exams,
        focusSessions,
        quizScores,
      });
      setPrepPlan(res);
    } catch (err) {
      console.error("Exam plan error:", err);
      showToast("Unable to generate exam preparation plan", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && exam) {
      fetchExamPlan();
    }
  }, [isOpen, exam?.id]);

  const handleAdoptIntoTasks = () => {
    if (!prepPlan || !prepPlan.priorityTopics.length) return;
    const todayStr = new Date().toISOString().split("T")[0];

    prepPlan.priorityTopics.forEach((pt, idx) => {
      const baseHour = 14 + idx * 2;
      const timeStr = `${baseHour > 12 ? baseHour - 12 : baseHour}:00 ${baseHour >= 12 ? "PM" : "AM"}`;

      addTask({
        title: `Exam Prep: ${pt.topic} (${pt.weightage}% Marks Focus)`,
        subjectId: exam?.subjectId || "gen",
        subjectName: exam?.subjectName || "Core Subject",
        date: todayStr,
        time: timeStr,
        priority: pt.priority.toLowerCase() === "high" ? "high" : "medium",
        status: "pending",
        estimatedMinutes: pt.allocatedMinutes || 60,
        topic: pt.topic,
      });
    });

    setAdopted(true);
    showToast(`Added ${prepPlan.priorityTopics.length} high-weightage study sessions to your tasks!`);
  };

  if (!isOpen || !exam) return null;

  const breakdown = prepPlan?.readinessBreakdown;

  return (
    <div className="fixed inset-0 z-50 bg-[#1C1B18]/65 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#21201C] rounded-2xl max-w-3xl w-full p-6 sm:p-7 shadow-2xl border border-[#E9E5DE] dark:border-[#32302B] max-h-[90vh] overflow-y-auto space-y-6 transition-colors">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[#EFECE6] dark:border-[#2E2C27] pb-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <KickerPill tone="amber">
                <Sparkles className="w-3 h-3" />
                <span>{exam.subjectName}</span>
              </KickerPill>
              <KickerPill tone="crimson" dashed={false}>
                {prepPlan?.daysRemaining ?? "--"} days remaining
              </KickerPill>
            </div>
            <h2 className="font-editorial text-xl font-semibold text-[#22211F] dark:text-[#F5F3EE] mt-2">
              Weightage-Optimized Strategy: {exam.title}
            </h2>
            <p className="text-xs text-[#78736A] dark:text-[#A6A096] mt-0.5">
              Allocates largest study blocks to high-weightage topics to maximize your exam score in minimum hours.
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={fetchExamPlan}
              disabled={loading}
              className="p-2 text-[#8E887E] hover:text-[#22211F] dark:hover:text-[#F5F3EE] hover:bg-[#F5F2EC] dark:hover:bg-[#2A2823] rounded-lg transition-colors cursor-pointer"
              title="Regenerate strategy"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-[#8E887E] hover:text-[#22211F] dark:hover:text-[#F5F3EE] hover:bg-[#F5F2EC] dark:hover:bg-[#2A2823] rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 1. Real Activity-Calculated Readiness & Strategy Verdict */}
        {prepPlan && (
          <div className="p-5 rounded-xl bg-[#FAF8F4] dark:bg-[#1B1A17] border border-[#E9E5DE] dark:border-[#32302B] space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-semibold uppercase tracking-[0.12em] text-[#B46914] dark:text-[#E0983B]">
                    Live Exam Readiness Score
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white dark:bg-[#21201C] text-[#22211F] dark:text-[#F5F3EE] font-mono font-bold text-xs border border-[#E2DDD4] dark:border-[#3A3731] tabular-nums">
                    {prepPlan.currentPreparation}%
                  </span>
                </div>
                <p className="text-xs text-[#57534E] dark:text-[#C5BFB5] mt-1 font-medium">
                  {prepPlan.aiStrategyVerdict}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleAdoptIntoTasks}
                  disabled={adopted}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    adopted
                      ? "bg-[#EDF5F0] text-[#3B7A57] dark:bg-[#1E3527] dark:text-[#7AD19E] border border-[#BCD8C7] dark:border-[#325E44] cursor-default"
                      : "bg-[#22211F] hover:bg-[#353330] dark:bg-[#F5F3EE] dark:hover:bg-[#E5E0D5] text-white dark:text-[#1C1B18]"
                  }`}
                >
                  {adopted ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Added to Daily Tasks</span>
                    </>
                  ) : (
                    <>
                      <Layers className="w-3.5 h-3.5" />
                      <span>Adopt Plan into Tasks</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Real Data Breakdown Strip */}
            {breakdown && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-3 border-t border-[#E9E5DE] dark:border-[#32302B] text-xs">
                <div className="p-2.5 rounded-lg bg-white dark:bg-[#21201C] border border-[#E9E5DE] dark:border-[#32302B] flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#3B7A57] dark:text-[#68B088] shrink-0" />
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-[0.06em] text-[#8E887E] block">
                      Topics Completed
                    </span>
                    <span className="font-mono font-bold text-[#22211F] dark:text-[#F5F3EE] tabular-nums">
                      {breakdown.completedTopics} / {breakdown.totalTopics} ({breakdown.topicCompletionRate}%)
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-white dark:bg-[#21201C] border border-[#E9E5DE] dark:border-[#32302B] flex items-center gap-2.5">
                  <Brain className="w-4 h-4 text-[#D58A2A] dark:text-[#E0983B] shrink-0" />
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-[0.06em] text-[#8E887E] block">
                      Quiz Average Score
                    </span>
                    <span className="font-mono font-bold text-[#22211F] dark:text-[#F5F3EE] tabular-nums">
                      {breakdown.quizAverageScore}% ({breakdown.quizzesTaken} Quizzes)
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-white dark:bg-[#21201C] border border-[#E9E5DE] dark:border-[#32302B] flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-[#78736A] dark:text-[#A6A096] shrink-0" />
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-[0.06em] text-[#8E887E] block">
                      Study Hours Logged
                    </span>
                    <span className="font-mono font-bold text-[#22211F] dark:text-[#F5F3EE] tabular-nums">
                      {(breakdown.totalFocusMinutes / 60).toFixed(1)}h / {(breakdown.targetFocusMinutes / 60).toFixed(1)}h Goal
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. Weightage-Prioritized Topics Breakdown */}
        {prepPlan && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h4 className="font-editorial text-base font-semibold text-[#22211F] dark:text-[#F5F3EE] flex items-center gap-2">
                <Target className="w-4 h-4 text-[#D58A2A] dark:text-[#E0983B]" />
                <span>High-Weightage Topic Allocation</span>
              </h4>
              <span className="text-[11px] text-[#8E887E] dark:text-[#9A948A]">
                Ranked by exam marks payoff
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {prepPlan.priorityTopics.map((pt, idx) => {
                const isHigh = pt.weightageLevel === "high";

                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border text-xs flex flex-col justify-between space-y-3 ${
                      isHigh
                        ? "bg-[#FDF6F5] dark:bg-[#2B1D1D] border-[#EFD6D4] dark:border-[#523030]"
                        : "bg-[#FBF9F5] dark:bg-[#1B1A17] border-[#E9E5DE] dark:border-[#32302B]"
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-semibold text-[#22211F] dark:text-[#F5F3EE] text-sm block">
                            {pt.topic}
                          </span>
                          <span
                            className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase ${
                              isHigh
                                ? "bg-[#A83838] text-white"
                                : "bg-[#F5F2EC] dark:bg-[#2A2823] text-[#78736A] dark:text-[#A6A096]"
                            }`}
                          >
                            {pt.weightage}% Exam Marks
                          </span>
                        </div>

                        <span className="px-2 py-0.5 rounded bg-[#FAF1E3] dark:bg-[#3A2C16] text-[#B46914] dark:text-[#F0B35E] border border-[#E0BE89] dark:border-[#6D5229] font-mono font-bold text-[11px] shrink-0 tabular-nums">
                          {pt.allocatedMinutes || 60}m Block
                        </span>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between text-[11px] text-[#78736A] dark:text-[#A6A096] pt-2 border-t border-[#E9E5DE] dark:border-[#32302B] font-mono tabular-nums">
                        <span>Mastery: <strong className="text-[#22211F] dark:text-[#F5F3EE]">{pt.mastery}%</strong></span>
                        <span>Quiz: <strong className="text-[#22211F] dark:text-[#F5F3EE]">{pt.quizScore !== null && pt.quizScore !== undefined ? `${pt.quizScore}%` : "Untested"}</strong></span>
                      </div>

                      <p className="text-[11px] text-[#57534E] dark:text-[#C5BFB5] mt-2 leading-relaxed">
                        {pt.reason}
                      </p>
                    </div>

                    <PrimaryButton
                      type="button"
                      onClick={() => {
                        onClose();
                        setActivePage("focus");
                      }}
                      className="w-full"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Start {pt.allocatedMinutes}m Focus Block</span>
                    </PrimaryButton>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. Day-by-Day Weightage Countdown Schedule */}
        {prepPlan && (
          <div className="space-y-3">
            <h4 className="font-editorial text-base font-semibold text-[#22211F] dark:text-[#F5F3EE] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#D58A2A] dark:text-[#E0983B]" />
              <span>Weightage-Based Countdown Milestones</span>
            </h4>

            <div className="space-y-2">
              {prepPlan.studySchedule.map((milestone, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-[#E9E5DE] dark:border-[#32302B] bg-white dark:bg-[#21201C] flex items-start gap-3 text-xs"
                >
                  <span className="px-2.5 py-1 rounded-md bg-[#FAF1E3] dark:bg-[#3A2C16] text-[#B46914] dark:text-[#F0B35E] border border-[#E0BE89] dark:border-[#6D5229] font-mono font-bold shrink-0 tabular-nums">
                    Day {milestone.dayNumber}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#22211F] dark:text-[#F5F3EE]">
                          {milestone.milestone}
                        </span>
                        {milestone.weightageFocus && (
                          <span className="px-2 py-0.5 rounded bg-[#FDF2F2] dark:bg-[#3A1E1E] text-[#A83838] dark:text-[#F28B8B] text-[10px] font-mono font-semibold border border-[#E8BABA] dark:border-[#6B3333]">
                            {milestone.weightageFocus}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-mono font-semibold text-[#78736A] dark:text-[#A6A096] flex items-center gap-1 tabular-nums">
                        <Clock className="w-3.5 h-3.5 text-[#D58A2A]" />
                        {milestone.targetHours} hrs
                      </span>
                    </div>
                    <p className="text-[#78736A] dark:text-[#A6A096] mt-1">{milestone.focusDescription}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. Revision Schedule Milestones */}
        {prepPlan && (
          <div className="space-y-3">
            <h4 className="font-editorial text-base font-semibold text-[#22211F] dark:text-[#F5F3EE] flex items-center gap-2">
              <BookCheck className="w-4 h-4 text-[#3B7A57] dark:text-[#68B088]" />
              <span>Final Revision Protocol</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {prepPlan.revisionSchedule.map((rev, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-[#E9E5DE] dark:border-[#32302B] bg-[#FBF9F5] dark:bg-[#1B1A17] text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-[#22211F] dark:text-[#F5F3EE]">{rev.phase}</span>
                    <span className="px-1.5 py-0.5 rounded bg-white dark:bg-[#21201C] text-[#78736A] dark:text-[#A6A096] text-[10px] font-mono border border-[#E2DDD4] dark:border-[#3A3731]">
                      {rev.timing}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#78736A] dark:text-[#A6A096] leading-relaxed">{rev.activity}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
