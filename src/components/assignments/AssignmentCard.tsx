import React from "react";
import { Assignment } from "../../types";
import { useStudyFlow } from "../../context/StudyFlowContext";
import { PriorityBadge } from "../common/Badge";
import { CARD_SURFACE } from "../common/ui";
import { getDaysRemaining } from "../../lib/utils";
import {
  CheckCircle2,
  Circle,
  Calendar,
  Edit3,
  Trash2,
  Award,
} from "lucide-react";

interface AssignmentCardProps {
  assignment: Assignment;
  onEdit: (assignment: Assignment) => void;
  onDelete: (id: string) => void;
}

export const AssignmentCard: React.FC<AssignmentCardProps> = ({
  assignment,
  onEdit,
  onDelete,
}) => {
  const { toggleAssignmentStatus } = useStudyFlow();
  const isCompleted = assignment.status === "completed";
  const timing = getDaysRemaining(assignment.dueDate);

  return (
    <div
      className={`p-4 sm:p-5 rounded-xl border transition-colors ${
        isCompleted
          ? "bg-[#FAF8F4] dark:bg-[#1B1A17] border-[#EFECE6] dark:border-[#2E2C27] opacity-75"
          : `${CARD_SURFACE} hover:border-[#D4CEC3] dark:hover:border-[#49453D]`
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Checkbox and title */}
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <button
            onClick={() => toggleAssignmentStatus(assignment.id)}
            className="mt-0.5 text-[#8E887E] hover:text-[#3B7A57] transition-colors cursor-pointer shrink-0"
            title={isCompleted ? "Mark incomplete" : "Mark completed"}
          >
            {isCompleted ? (
              <CheckCircle2 className="w-5 h-5 text-[#3B7A57] dark:text-[#68B088]" />
            ) : (
              <Circle className="w-5 h-5 text-[#C9C2B6] dark:text-[#58534B] hover:text-[#78736A]" />
            )}
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3
                className={`text-sm font-semibold text-[#22211F] dark:text-[#F5F3EE] ${
                  isCompleted ? "line-through text-[#9A948A] dark:text-[#7A756C]" : ""
                }`}
              >
                {assignment.title}
              </h3>
              <PriorityBadge priority={assignment.priority} />
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#78736A] dark:text-[#A6A096]">
              <span className="font-medium text-[#B46914] dark:text-[#F0B35E] bg-[#FAF1E3] dark:bg-[#3A2C16] border border-[#E6CDA3] dark:border-[#5C4422] px-2 py-0.5 rounded text-[11px]">
                {assignment.subjectName}
              </span>
              <span className="flex items-center gap-1 font-mono text-[11px] text-[#8E887E] dark:text-[#9A948A] tabular-nums">
                <Calendar className="w-3.5 h-3.5" />
                {assignment.dueDate}
              </span>
              {assignment.points && (
                <span className="flex items-center gap-1 font-mono text-[11px] text-[#8E887E] dark:text-[#9A948A] tabular-nums">
                  <Award className="w-3.5 h-3.5" />
                  {assignment.points} pts
                </span>
              )}
            </div>

            {assignment.description && (
              <p className="mt-2 text-xs text-[#57534E] dark:text-[#C5BFB5] line-clamp-2 bg-[#FBF9F5] dark:bg-[#1B1A17] p-2.5 rounded-lg border border-[#E9E5DE] dark:border-[#32302B]">
                {assignment.description}
              </p>
            )}
          </div>
        </div>

        {/* Due date countdown & actions */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span
            className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-medium tabular-nums border ${
              isCompleted
                ? "bg-[#EDF5F0] dark:bg-[#1E3527] text-[#3B7A57] dark:text-[#7AD19E] border-[#BCD8C7] dark:border-[#325E44]"
                : timing.isUrgent
                ? "bg-[#FDF2F2] dark:bg-[#3A1E1E] text-[#A83838] dark:text-[#F28B8B] border-[#E8BABA] dark:border-[#6B3333] font-semibold"
                : "bg-[#F5F2EC] dark:bg-[#2A2823] text-[#78736A] dark:text-[#A6A096] border-[#DDD7CD] dark:border-[#3F3C35]"
            }`}
          >
            {isCompleted ? "Submitted" : timing.label}
          </span>

          <div className="flex items-center gap-1 mt-1">
            <button
              onClick={() => onEdit(assignment)}
              className="p-1.5 text-[#8E887E] hover:text-[#22211F] dark:hover:text-[#F5F3EE] hover:bg-[#F5F2EC] dark:hover:bg-[#2A2823] rounded-lg transition-colors cursor-pointer"
              title="Edit Assignment"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(assignment.id)}
              className="p-1.5 text-[#8E887E] hover:text-[#A83838] dark:hover:text-[#F28B8B] hover:bg-[#FDF2F2] dark:hover:bg-[#3A1E1E] rounded-lg transition-colors cursor-pointer"
              title="Delete Assignment"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
