import React from "react";

interface StudyFlowLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  subtitle?: string;
  className?: string;
  onClick?: () => void;
}

export const StudyFlowLogoIcon: React.FC<{ sizeClass?: string; iconClass?: string }> = ({
  sizeClass = "w-8 h-8 rounded-lg",
  iconClass = "w-4 h-4",
}) => {
  return (
    <div
      className={`${sizeClass} bg-[#22211F] dark:bg-[#F5F3EE] text-[#FAF9F6] dark:text-[#1C1B18] flex items-center justify-center shrink-0 transition-transform duration-150 group-hover:scale-[1.03] border border-[#22211F]/10 dark:border-white/10`}
    >
      <svg
        className={iconClass}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H12v17H6.5A2.5 2.5 0 0 0 4 22V5.5Z" />
        <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H12v17h5.5A2.5 2.5 0 0 1 20 22V5.5Z" />
        <path d="M15 7.5h2" />
        <path d="M15 11h2" />
      </svg>
    </div>
  );
};

export const StudyFlowLogo: React.FC<StudyFlowLogoProps> = ({
  size = "md",
  showText = true,
  subtitle = "AI-Powered Study Planner",
  className = "",
  onClick,
}) => {
  const sizeMap = {
    sm: {
      container: "w-7 h-7 rounded-md",
      icon: "w-3.5 h-3.5",
      title: "text-xs",
      badge: "text-[9px]",
      sub: "text-[10px]",
    },
    md: {
      container: "w-8 h-8 rounded-lg",
      icon: "w-4 h-4",
      title: "text-[14px]",
      badge: "text-[10px]",
      sub: "text-[11px]",
    },
    lg: {
      container: "w-10 h-10 rounded-xl",
      icon: "w-5 h-5",
      title: "text-base",
      badge: "text-[11px]",
      sub: "text-xs",
    },
  };

  const currentSize = sizeMap[size];

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-2.5 ${onClick ? "cursor-pointer group" : ""} ${className}`}
    >
      <StudyFlowLogoIcon sizeClass={currentSize.container} iconClass={currentSize.icon} />
      {showText && (
        <div className="leading-tight min-w-0">
          <span
            className={`font-semibold tracking-tight text-[#22211F] dark:text-[#F5F3EE] flex items-center gap-1.5 ${currentSize.title}`}
          >
            <span>StudyPilot</span>
            <span
              className={`font-mono font-semibold uppercase tracking-[0.14em] text-[#B46914] dark:text-[#E0983B] ${currentSize.badge}`}
            >
              EDITION
            </span>
          </span>
          {subtitle && (
            <span
              className={`text-[#78736A] dark:text-[#A6A096] font-normal block leading-tight mt-0.5 truncate ${currentSize.sub}`}
            >
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
