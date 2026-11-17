import React from "react";
import { cn } from "../../lib/utils";
import { Priority, TaskStatus, AssignmentStatus } from "../../types";

interface PriorityBadgeProps {
  priority: Priority;
  className?: string;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, className }) => {
  const configs = {
    low: "text-[#78736A] dark:text-[#A6A096] bg-[#F5F2EC] dark:bg-[#2A2823] border-[#E9E5DE] dark:border-[#3A3731]",
    medium:
      "text-[#B46914] dark:text-[#E0983B] bg-[#FAF1E3] dark:bg-[#3A2C16] border-[#F0DFC2] dark:border-[#523E20]",
    high: "text-[#A83838] dark:text-[#E57373] bg-[#FDF2F2] dark:bg-[#3A1E1E] border-[#F3D2D2] dark:border-[#572B2B]",
  };

  const labels = {
    low: "Low",
    medium: "Medium",
    high: "High",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border tabular-nums transition-colors whitespace-nowrap",
        configs[priority],
        className
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full shrink-0",
          priority === "low" && "bg-[#9A948A]",
          priority === "medium" && "bg-[#D58A2A]",
          priority === "high" && "bg-[#A83838]"
        )}
      />
      {labels[priority]}
    </span>
  );
};

interface StatusBadgeProps {
  status: TaskStatus | AssignmentStatus;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const configs = {
    pending:
      "text-[#78736A] dark:text-[#A6A096] bg-[#F5F2EC] dark:bg-[#2A2823] border-[#E9E5DE] dark:border-[#3A3731]",
    in_progress:
      "text-[#B46914] dark:text-[#E0983B] bg-[#FAF1E3] dark:bg-[#3A2C16] border-[#F0DFC2] dark:border-[#523E20]",
    completed:
      "text-[#3B7A57] dark:text-[#68B088] bg-[#EDF5F0] dark:bg-[#1C3326] border-[#CFE3D6] dark:border-[#2B4E3A]",
  };

  const labels = {
    pending: "Pending",
    in_progress: "In Progress",
    completed: "Completed",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border transition-colors whitespace-nowrap",
        configs[status],
        className
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full shrink-0",
          status === "pending" && "bg-[#9A948A]",
          status === "in_progress" && "bg-[#D58A2A]",
          status === "completed" && "bg-[#3B7A57]"
        )}
      />
      {labels[status]}
    </span>
  );
};
