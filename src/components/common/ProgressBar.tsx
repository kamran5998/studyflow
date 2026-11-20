import React from "react";
import { cn } from "../../lib/utils";

interface ProgressBarProps {
  value: number; // 0 to 100
  color?: "purple" | "blue" | "green" | "orange" | "slate" | "amber" | "crimson";
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  color = "amber",
  size = "md",
  showLabel = false,
  className,
}) => {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));

  const colorStyles = {
    purple: "bg-[#D58A2A] dark:bg-[#E0983B]",
    amber: "bg-[#D58A2A] dark:bg-[#E0983B]",
    orange: "bg-[#D58A2A] dark:bg-[#E0983B]",
    blue: "bg-[#22211F] dark:bg-[#F5F3EE]",
    slate: "bg-[#22211F] dark:bg-[#E5E0D5]",
    green: "bg-[#3B7A57] dark:bg-[#68B088]",
    crimson: "bg-[#A83838] dark:bg-[#E57373]",
  };

  const bgStyles = {
    purple: "bg-[#EFECE6] dark:bg-[#2C2A25]",
    amber: "bg-[#EFECE6] dark:bg-[#2C2A25]",
    orange: "bg-[#EFECE6] dark:bg-[#2C2A25]",
    blue: "bg-[#EFECE6] dark:bg-[#2C2A25]",
    slate: "bg-[#EFECE6] dark:bg-[#2C2A25]",
    green: "bg-[#E6EFEA] dark:bg-[#243029]",
    crimson: "bg-[#F5E8E8] dark:bg-[#342323]",
  };

  const heights = {
    sm: "h-1",
    md: "h-1.5",
    lg: "h-2.5",
  };

  return (
    <div className={cn("w-full", className)}>
      {showLabel && (
        <div className="flex justify-between items-center text-xs mb-1 font-medium text-[#78736A] dark:text-[#A6A096]">
          <span>Progress</span>
          <span className="font-semibold text-[#22211F] dark:text-[#F5F3EE] tabular-nums">
            {clamped}%
          </span>
        </div>
      )}
      <div
        className={cn(
          "w-full rounded-full overflow-hidden transition-all",
          heights[size],
          bgStyles[color]
        )}
      >
        <div
          className={cn("h-full rounded-full transition-all duration-300", colorStyles[color])}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
};
