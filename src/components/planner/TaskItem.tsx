import React from "react";
import { Task } from "../../types";
import { useStudyFlow } from "../../context/StudyFlowContext";
import { PriorityBadge, StatusBadge } from "../common/Badge";
import {
  CheckCircle2,
  Circle,
  Clock,
  Edit3,
  Trash2,
  Play,
  Calendar,
} from "lucide-react";

interface TaskItemProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({ task, onEdit, onDelete }) => {
  const { toggleTaskStatus, setActivePage } = useStudyFlow();

  const isCompleted = task.status === "completed";

  return (
    <div
      className={`group flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border transition-colors gap-3 ${
        isCompleted
          ? "bg-[#FAF8F4] dark:bg-[#1B1A17] border-[#EFECE6] dark:border-[#2E2C27] opacity-75"
          : "bg-white dark:bg-[#21201C] border-[#E9E5DE] dark:border-[#32302B] hover:border-[#D58A2A]"
      }`}
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <button
          onClick={() => toggleTaskStatus(task.id)}
          className="mt-0.5 text-[#9A948A] hover:text-[#3B7A57] transition-colors cursor-pointer shrink-0"
          title={isCompleted ? "Mark pending" : "Mark completed"}
        >
          {isCompleted ? (
            <CheckCircle2 className="w-4 h-4 text-[#3B7A57] dark:text-[#68B088]" />
          ) : (
            <Circle className="w-4 h-4 text-[#C8C2B6] dark:text-[#57534E] group-hover:text-[#78736A]" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4
              className={`text-xs sm:text-sm font-semibold text-[#22211F] dark:text-[#F5F3EE] break-words ${
                isCompleted ? "line-through text-[#9A948A]" : ""
              }`}
            >
              {task.title}
            </h4>
            <PriorityBadge priority={task.priority} />
          </div>

          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1 text-[11px] text-[#78736A] dark:text-[#A6A096]">
            <span className="font-medium text-[#B46914] dark:text-[#E0983B]">
              {task.subjectName}
            </span>
            {task.topic && (
              <>
                <span aria-hidden="true" className="text-[#C8C2B6] dark:text-[#57534E]">
                  ·
                </span>
                <span className="truncate max-w-[200px]">{task.topic}</span>
              </>
            )}
            {task.time && (
              <>
                <span aria-hidden="true" className="text-[#C8C2B6] dark:text-[#57534E]">
                  ·
                </span>
                <span className="flex items-center gap-1 font-mono tabular-nums text-[#9A948A]">
                  <Clock className="w-3 h-3" />
                  {task.time}
                </span>
              </>
            )}
            <span aria-hidden="true" className="text-[#C8C2B6] dark:text-[#57534E]">
              ·
            </span>
            <span className="flex items-center gap-1 font-mono tabular-nums text-[#9A948A]">
              <Calendar className="w-3 h-3" />
              {task.date}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#EFECE6] dark:border-[#32302B]">
        <StatusBadge status={task.status} />

        <div className="flex items-center gap-0.5">
          {!isCompleted && (
            <button
              onClick={() => setActivePage("focus")}
              className="p-1.5 text-[#9A948A] hover:text-[#B46914] dark:hover:text-[#E0983B] hover:bg-[#FAF1E3] dark:hover:bg-[#3A2C16] rounded-lg transition-colors cursor-pointer"
              title="Focus on this task"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
            </button>
          )}

          <button
            onClick={() => onEdit(task)}
            className="p-1.5 text-[#9A948A] hover:text-[#22211F] dark:hover:text-[#F5F3EE] hover:bg-[#F5F2EC] dark:hover:bg-[#2A2823] rounded-lg transition-colors cursor-pointer"
            title="Edit Task"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onDelete(task.id)}
            className="p-1.5 text-[#9A948A] hover:text-[#A83838] dark:hover:text-[#E57373] hover:bg-[#FDF2F2] dark:hover:bg-[#3A1E1E] rounded-lg transition-colors cursor-pointer"
            title="Delete Task"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
