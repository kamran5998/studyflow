import React from "react";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className = "",
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-xl border border-[#E9E5DE] dark:border-[#32302B] bg-white dark:bg-[#21201C] transition-colors ${className}`}
    >
      <div className="w-11 h-11 rounded-xl bg-[#FAF1E3] dark:bg-[#3A2C16] border border-[#F0DFC2] dark:border-[#523E20] text-[#D58A2A] dark:text-[#E0983B] flex items-center justify-center mb-4">
        <Icon className="w-5 h-5" strokeWidth={1.8} />
      </div>
      <h3 className="text-[15px] font-semibold text-[#22211F] dark:text-[#F5F3EE] mb-1.5">
        {title}
      </h3>
      <p className="text-xs text-[#78736A] dark:text-[#A6A096] max-w-sm leading-relaxed mb-5">
        {description}
      </p>
      {(actionLabel || secondaryActionLabel) && (
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {actionLabel && onAction && (
            <button
              onClick={onAction}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white dark:text-[#1C1B18] bg-[#22211F] hover:bg-[#363430] dark:bg-[#F5F3EE] dark:hover:bg-[#E6E2DA] rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              {actionLabel}
            </button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <button
              onClick={onSecondaryAction}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-[#22211F] dark:text-[#F5F3EE] bg-white dark:bg-[#2A2823] border border-[#E9E5DE] dark:border-[#3A3731] hover:bg-[#FAF8F4] dark:hover:bg-[#32302B] rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              {secondaryActionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
