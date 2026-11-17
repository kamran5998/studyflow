import React, { useState } from "react";
import { Subject } from "../../types";
import { useStudyFlow } from "../../context/StudyFlowContext";
import { ProgressBar } from "../common/ProgressBar";
import { CARD_SURFACE } from "../common/ui";
import {
  Edit3,
  Trash2,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  Play,
  BookOpen,
} from "lucide-react";
import { formatMinutes } from "../../lib/utils";

interface SubjectCardProps {
  subject: Subject;
  onEdit: (subject: Subject) => void;
  onDelete: (id: string) => void;
}

export const SubjectCard: React.FC<SubjectCardProps> = ({
  subject,
  onEdit,
  onDelete,
}) => {
  const { toggleTopicCompletion, setActivePage } = useStudyFlow();
  const [isExpanded, setIsExpanded] = useState(false);

  const completedTopicsCount = subject.topics.filter((t) => t.completed).length;

  return (
    <div
      className={`${CARD_SURFACE} hover:border-[#D4CEC3] dark:hover:border-[#49453D] p-5 flex flex-col justify-between transition-all`}
    >
      <div>
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#FAF1E3] dark:bg-[#3A2C16] text-[#D58A2A] dark:text-[#E0983B] flex items-center justify-center shrink-0 border border-[#F0DFC2] dark:border-[#523E20]">
              <BookOpen className="w-4 h-4" strokeWidth={1.9} />
            </div>
            <div className="min-w-0">
              <h3 className="font-editorial text-base font-semibold text-[#22211F] dark:text-[#F5F3EE] truncate leading-snug">
                {subject.name}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] font-mono text-[#8E887E] dark:text-[#9A948A] tabular-nums">
                  {completedTopicsCount} of {subject.topics.length} topics
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onEdit(subject)}
              className="p-1.5 text-[#8E887E] hover:text-[#22211F] dark:hover:text-[#F5F3EE] hover:bg-[#F5F2EC] dark:hover:bg-[#2A2823] rounded-lg transition-colors cursor-pointer"
              title="Edit Course"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(subject.id)}
              className="p-1.5 text-[#8E887E] hover:text-[#A83838] dark:hover:text-[#F28B8B] hover:bg-[#FDF2F2] dark:hover:bg-[#3A1E1E] rounded-lg transition-colors cursor-pointer"
              title="Delete Course"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-[10px] font-mono uppercase tracking-[0.1em] text-[#8E887E] dark:text-[#9A948A]">
              Mastery Progress
            </span>
            <span className="font-mono font-bold text-[#22211F] dark:text-[#F5F3EE] tabular-nums">
              {subject.progress}%
            </span>
          </div>
          <ProgressBar
            value={subject.progress}
            color={subject.progress >= 80 ? "green" : "amber"}
            size="md"
          />
        </div>

        {/* Topics Accordion / Preview */}
        <div className="mt-4">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between text-xs font-medium text-[#57534E] dark:text-[#C5BFB5] hover:text-[#22211F] dark:hover:text-[#F5F3EE] py-1 cursor-pointer"
          >
            <span>Syllabus Topics ({subject.topics.length})</span>
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-[#9A948A]" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-[#9A948A]" />
            )}
          </button>

          {isExpanded && (
            <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {subject.topics.map((t) => (
                <div
                  key={t.id}
                  onClick={() => toggleTopicCompletion(subject.id, t.id)}
                  className={`flex items-center gap-2 p-2 rounded-lg text-xs cursor-pointer transition-colors border ${
                    t.completed
                      ? "bg-[#FAF8F4] dark:bg-[#1B1A17] border-[#EFECE5] dark:border-[#2C2A25] text-[#9A948A] dark:text-[#7A756C] line-through"
                      : "bg-white dark:bg-[#262420] hover:bg-[#FAF8F4] dark:hover:bg-[#2D2B26] text-[#22211F] dark:text-[#F5F3EE] border-[#E9E5DE] dark:border-[#36332D]"
                  }`}
                >
                  {t.completed ? (
                    <CheckCircle2 className="w-4 h-4 text-[#3B7A57] dark:text-[#68B088] shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-[#C9C2B6] dark:text-[#58534B] shrink-0" />
                  )}
                  <span className="truncate">{t.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer Info & Quick Start Focus Button */}
      <div className="mt-5 pt-3 border-t border-[#EFECE6] dark:border-[#2E2C27] flex items-center justify-between text-xs">
        <div className="text-[#8E887E] dark:text-[#9A948A] font-mono text-[11px] tabular-nums">
          <span className="font-semibold text-[#22211F] dark:text-[#F5F3EE]">
            {formatMinutes(subject.totalStudyMinutes || 0)}
          </span>{" "}
          logged
        </div>
        <button
          onClick={() => setActivePage("focus")}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F5F2EC] dark:bg-[#2A2823] hover:bg-[#FAF1E3] dark:hover:bg-[#3A2C16] text-[#22211F] dark:text-[#F5F3EE] hover:text-[#B46914] dark:hover:text-[#F0B35E] font-semibold border border-[#E9E5DE] dark:border-[#3A3731] transition-colors cursor-pointer text-[11px]"
        >
          <Play className="w-3 h-3 fill-current" />
          <span>Study</span>
        </button>
      </div>
    </div>
  );
};
