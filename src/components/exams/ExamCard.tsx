import React from "react";
import { Exam } from "../../types";
import { getDaysRemaining } from "../../lib/utils";
import { useStudyFlow } from "../../context/StudyFlowContext";
import { calculateExamReadiness } from "../../lib/examCalculations";
import { CARD_SURFACE } from "../common/ui";
import {
  Calendar,
  AlertTriangle,
  Edit3,
  Trash2,
  Sparkles,
  CheckCircle2,
  Brain,
  Clock,
  Target,
} from "lucide-react";

interface ExamCardProps {
  exam: Exam;
  onEdit: (exam: Exam) => void;
  onDelete: (id: string) => void;
  onOpenAIPrep?: (exam: Exam) => void;
}

export const ExamCard: React.FC<ExamCardProps> = ({ exam, onEdit, onDelete, onOpenAIPrep }) => {
  const { subjects, quizScores, focusSessions } = useStudyFlow();
  const matchingSubject = subjects.find((s) => s.id === exam.subjectId || s.name.toLowerCase() === exam.subjectName.toLowerCase());

  // Real-time automatic readiness calculation
  const readiness = calculateExamReadiness(exam, matchingSubject, quizScores, focusSessions);

  const timing = getDaysRemaining(exam.date);
  const isClose = timing.days >= 0 && timing.days <= 5;

  const getReadinessColor = (val: number) => {
    if (val >= 80) return "text-[#3B7A57] dark:text-[#7AD19E] bg-[#EDF5F0] dark:bg-[#1E3527] border-[#BCD8C7] dark:border-[#325E44]";
    if (val >= 60) return "text-[#22211F] dark:text-[#F5F3EE] bg-[#F5F2EC] dark:bg-[#2A2823] border-[#DDD7CD] dark:border-[#3F3C35]";
    if (val >= 40) return "text-[#B46914] dark:text-[#F0B35E] bg-[#FAF1E3] dark:bg-[#3A2C16] border-[#E0BE89] dark:border-[#6D5229]";
    return "text-[#A83838] dark:text-[#F28B8B] bg-[#FDF2F2] dark:bg-[#3A1E1E] border-[#E8BABA] dark:border-[#6B3333]";
  };

  const getBarColor = (val: number) => {
    if (val >= 80) return "bg-[#3B7A57] dark:bg-[#68B088]";
    if (val >= 60) return "bg-[#22211F] dark:bg-[#E5E0D5]";
    if (val >= 40) return "bg-[#D58A2A] dark:bg-[#E0983B]";
    return "bg-[#A83838] dark:bg-[#E57373]";
  };

  return (
    <div
      className={`rounded-xl border transition-colors p-5 flex flex-col justify-between ${
        isClose
          ? "bg-[#FDF6F5] dark:bg-[#2B1D1D] border-[#EFD6D4] dark:border-[#523030]"
          : `${CARD_SURFACE} hover:border-[#D4CEC3] dark:hover:border-[#49453D]`
      }`}
    >
      <div className="space-y-4">
        {/* Header: Subject & Countdown Badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-mono text-[11px] uppercase tracking-[0.06em] font-semibold text-[#B46914] dark:text-[#E0983B] truncate">
                {exam.subjectName}
              </span>
              {isClose && (
                <>
                  <span aria-hidden="true" className="text-[#C9C2B6] dark:text-[#58534B]">·</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-[0.06em] font-semibold text-[#A83838] dark:text-[#F28B8B]">
                    <AlertTriangle className="w-3 h-3" /> Imminent
                  </span>
                </>
              )}
            </div>
            <h3 className="font-editorial text-lg font-semibold text-[#22211F] dark:text-[#F5F3EE] mt-1 truncate">
              {exam.title}
            </h3>
          </div>

          <span
            className={`px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold tabular-nums shrink-0 border ${
              isClose
                ? "bg-[#A83838] text-white border-[#8E2D2D]"
                : "bg-[#F5F2EC] dark:bg-[#2A2823] text-[#22211F] dark:text-[#F5F3EE] border-[#E2DDD4] dark:border-[#3A3731]"
            }`}
          >
            {timing.label}
          </span>
        </div>

        {/* Real Activity-Calculated Readiness Meter */}
        <div className="p-3 bg-[#FBF9F5] dark:bg-[#1B1A17] rounded-xl border border-[#E9E5DE] dark:border-[#32302B] space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-[#57534E] dark:text-[#C5BFB5]">
                Live Readiness
              </span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border tabular-nums ${getReadinessColor(readiness.overallReadiness)}`}>
                {readiness.overallReadiness}%
              </span>
            </div>
            <span className="text-[10px] font-mono text-[#8E887E] dark:text-[#9A948A]">
              {readiness.statusLabel}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-1.5 bg-[#EFECE6] dark:bg-[#2C2A25] rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${getBarColor(readiness.overallReadiness)}`}
              style={{ width: `${readiness.overallReadiness}%` }}
            />
          </div>

          {/* 3 Activity Metrics Breakdown */}
          <div className="grid grid-cols-3 gap-1 pt-1 text-[10px] font-mono text-[#78736A] dark:text-[#A6A096] tabular-nums">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-[#3B7A57] dark:text-[#68B088] shrink-0" />
              <span className="truncate">Topics: {readiness.topicCompletionRate}%</span>
            </div>
            <div className="flex items-center gap-1">
              <Brain className="w-3 h-3 text-[#D58A2A] dark:text-[#E0983B] shrink-0" />
              <span className="truncate">Quiz: {readiness.quizAverageScore}%</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-[#78736A] dark:text-[#A6A096] shrink-0" />
              <span className="truncate">Hours: {Math.round(readiness.totalFocusMinutes / 60)}h</span>
            </div>
          </div>
        </div>

        {/* Date & High-Weightage Indicator */}
        <div className="flex items-center justify-between gap-2 text-xs text-[#78736A] dark:text-[#A6A096]">
          <div className="flex items-center gap-1.5 font-mono text-[11px] tabular-nums">
            <Calendar className="w-3.5 h-3.5 text-[#9A948A]" />
            <span>{exam.date}</span>
          </div>
          {matchingSubject && matchingSubject.topics && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#B46914] dark:text-[#E0983B]">
              <Target className="w-3 h-3" />
              {matchingSubject.topics.length} Syllabus Topics
            </span>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="mt-5 pt-3 border-t border-[#EFECE6] dark:border-[#2E2C27] flex items-center justify-between">
        <span className="text-[11px] font-mono text-[#8E887E] dark:text-[#9A948A]">
          {timing.days === 0
            ? "Exam is today"
            : timing.days > 0
            ? `${timing.days} days remaining`
            : "Completed"}
        </span>

        <div className="flex items-center gap-1.5">
          {onOpenAIPrep && (
            <button
              onClick={() => onOpenAIPrep(exam)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#B46914] dark:text-[#F0B35E] bg-[#FAF1E3] dark:bg-[#3A2C16] hover:bg-[#F3E4CB] dark:hover:bg-[#49371B] rounded-lg transition-colors cursor-pointer border border-[#E6CDA3] dark:border-[#5C4422]"
              title="Open AI Exam Weightage & Strategy Planner"
            >
              <Sparkles className="w-3 h-3" />
              <span>Weightage Plan</span>
            </button>
          )}

          <button
            onClick={() => onEdit(exam)}
            className="p-1.5 text-[#8E887E] hover:text-[#22211F] dark:hover:text-[#F5F3EE] hover:bg-[#F5F2EC] dark:hover:bg-[#2A2823] rounded-lg transition-colors cursor-pointer"
            title="Edit Exam"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(exam.id)}
            className="p-1.5 text-[#8E887E] hover:text-[#A83838] dark:hover:text-[#F28B8B] hover:bg-[#FDF2F2] dark:hover:bg-[#3A1E1E] rounded-lg transition-colors cursor-pointer"
            title="Delete Exam"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
