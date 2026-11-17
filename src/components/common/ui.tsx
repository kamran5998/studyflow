import React from "react";
import { Search } from "lucide-react";
import { cn } from "../../lib/utils";

/* ============================================================================
 * StudyPilot Editorial UI Primitives
 * Shared across all workspaces to enforce warm ivory / charcoal consistency
 * ========================================================================== */

export const CARD_SURFACE =
  "bg-white dark:bg-[#21201C] border border-[#E9E5DE] dark:border-[#32302B] rounded-xl shadow-[0_1px_2px_rgba(34,33,31,0.03)] transition-colors";

export const RECESSED_SURFACE =
  "bg-[#FBF9F5] dark:bg-[#1B1A17] border border-[#E9E5DE] dark:border-[#32302B] rounded-xl";

export const INPUT_SURFACE =
  "bg-[#FAF8F4] dark:bg-[#1B1A17] border border-[#E2DDD4] dark:border-[#3A3731] rounded-lg text-xs text-[#22211F] dark:text-[#F5F3EE] placeholder:text-[#9A948A] dark:placeholder:text-[#7A756C] focus:bg-white dark:focus:bg-[#21201C] focus:border-[#D58A2A] dark:focus:border-[#E0983B] outline-hidden transition-colors";

interface KickerPillProps {
  children: React.ReactNode;
  tone?: "amber" | "crimson" | "sage" | "neutral";
  dashed?: boolean;
  className?: string;
}

export const KickerPill: React.FC<KickerPillProps> = ({
  children,
  tone = "amber",
  dashed = true,
  className,
}) => {
  const toneClasses = {
    amber:
      "bg-[#FAF1E3] dark:bg-[#3A2C16]/70 text-[#B46914] dark:text-[#F0B35E] border-[#E0BE89] dark:border-[#6D5229]",
    crimson:
      "bg-[#FDF2F2] dark:bg-[#3A1E1E]/70 text-[#A83838] dark:text-[#F28B8B] border-[#E8BABA] dark:border-[#6B3333]",
    sage:
      "bg-[#EDF5F0] dark:bg-[#1E3527]/70 text-[#3B7A57] dark:text-[#7AD19E] border-[#BCD8C7] dark:border-[#325E44]",
    neutral:
      "bg-[#F5F2EC] dark:bg-[#2A2823] text-[#78736A] dark:text-[#A6A096] border-[#DDD7CD] dark:border-[#3F3C35]",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-[0.08em] whitespace-nowrap",
        dashed ? "border border-dashed" : "border",
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  );
};

interface PageHeaderProps {
  kicker?: string;
  pill?: string;
  pillTone?: "amber" | "crimson" | "sage" | "neutral";
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  kicker,
  pill,
  pillTone = "amber",
  title,
  subtitle,
  actions,
  children,
  className,
}) => {
  return (
    <section className={cn(CARD_SURFACE, "p-5 sm:p-6", className)}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="min-w-0">
          {(kicker || pill) && (
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              {kicker && (
                <span className="text-[10px] font-mono font-medium uppercase tracking-[0.14em] text-[#8E887E] dark:text-[#8E887E]">
                  {kicker}
                </span>
              )}
              {kicker && pill && (
                <span aria-hidden="true" className="text-[#CBC5BB] dark:text-[#4A463F]">
                  ·
                </span>
              )}
              {pill && <KickerPill tone={pillTone}>{pill}</KickerPill>}
            </div>
          )}
          <h1 className="font-editorial text-2xl sm:text-[26px] font-semibold text-[#22211F] dark:text-[#F5F3EE] leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs sm:text-[13px] text-[#78736A] dark:text-[#A6A096] mt-1 leading-relaxed max-w-2xl">
              {subtitle}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">{actions}</div>
        )}
      </div>

      {children && <div className="mt-5">{children}</div>}
    </section>
  );
};

interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  children,
  className,
  ...props
}) => (
  <button
    {...props}
    className={cn(
      "inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#22211F] hover:bg-[#353330] dark:bg-[#F5F3EE] dark:hover:bg-[#E5E0D5] text-white dark:text-[#1C1B18] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50 disabled:cursor-not-allowed",
      className
    )}
  >
    {children}
  </button>
);

interface SecondaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export const SecondaryButton: React.FC<SecondaryButtonProps> = ({
  children,
  className,
  ...props
}) => (
  <button
    {...props}
    className={cn(
      "inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-white dark:bg-[#21201C] border border-[#E2DDD4] dark:border-[#3A3731] hover:bg-[#FAF8F4] dark:hover:bg-[#2A2823] text-[#22211F] dark:text-[#F5F3EE] text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50 disabled:cursor-not-allowed",
      className
    )}
  >
    {children}
  </button>
);

interface SummaryCardProps {
  label: string;
  value: React.ReactNode;
  subValue?: React.ReactNode;
  badge?: React.ReactNode;
  footerLeft?: React.ReactNode;
  footerRight?: React.ReactNode;
  progressPercent?: number;
  tone?: "default" | "crimson" | "sage" | "amber";
  onClick?: () => void;
  id?: string;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  label,
  value,
  subValue,
  badge,
  footerLeft,
  footerRight,
  progressPercent,
  tone = "default",
  onClick,
  id,
}) => {
  const containerTone = {
    default:
      "bg-white dark:bg-[#21201C] border-[#E9E5DE] dark:border-[#32302B] hover:border-[#D4CEC3] dark:hover:border-[#49453D]",
    crimson:
      "bg-[#FDF6F5] dark:bg-[#2B1D1D] border-[#EFD6D4] dark:border-[#523030] hover:border-[#DFAEAE]",
    sage:
      "bg-[#F5FAF7] dark:bg-[#1B2920] border-[#D3E5DA] dark:border-[#2E4B39]",
    amber:
      "bg-[#FCF7EE] dark:bg-[#2C2417] border-[#EAD9BF] dark:border-[#534125]",
  };

  return (
    <div
      id={id}
      onClick={onClick}
      className={cn(
        "rounded-xl border p-4 sm:p-5 transition-colors flex flex-col justify-between",
        containerTone[tone],
        onClick && "cursor-pointer"
      )}
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-[10px] font-mono font-medium uppercase tracking-[0.12em] text-[#8E887E] dark:text-[#9A948A]">
            {label}
          </span>
          {badge}
        </div>
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-2xl font-mono font-bold tracking-tight text-[#22211F] dark:text-[#F5F3EE] tabular-nums">
            {value}
          </span>
          {subValue && (
            <span className="text-xs font-mono text-[#8E887E] dark:text-[#9A948A] tabular-nums">
              {subValue}
            </span>
          )}
        </div>
      </div>

      {(progressPercent !== undefined || footerLeft || footerRight) && (
        <div className="mt-3.5 space-y-2">
          {progressPercent !== undefined && (
            <div className="w-full h-1 bg-[#EFECE5] dark:bg-[#32302B] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#D58A2A] dark:bg-[#E0983B] rounded-full transition-all duration-300"
                style={{ width: `${Math.max(0, Math.min(100, progressPercent))}%` }}
              />
            </div>
          )}
          {(footerLeft || footerRight) && (
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="text-[#78736A] dark:text-[#A6A096] truncate">{footerLeft}</span>
              {footerRight && (
                <span className="text-[#B46914] dark:text-[#F0B35E] font-medium shrink-0 whitespace-nowrap">
                  {footerRight}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  wrapperClassName?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  wrapperClassName,
  className,
  ...props
}) => (
  <div className={cn("relative", wrapperClassName)}>
    <Search className="w-3.5 h-3.5 text-[#9A948A] dark:text-[#7A756C] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
    <input
      {...props}
      className={cn(INPUT_SURFACE, "pl-8 pr-3 py-1.5 w-full", className)}
    />
  </div>
);

export interface TabOption<T extends string> {
  id: T;
  label: string;
  icon?: React.ReactNode;
}

interface TabsProps<T extends string> {
  options: TabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function Tabs<T extends string>({
  options,
  value,
  onChange,
  className,
}: TabsProps<T>) {
  return (
    <div
      className={cn(
        "inline-flex flex-wrap sm:flex-nowrap items-center gap-1 p-1 bg-[#F5F2EC] dark:bg-[#1B1A17] border border-[#E9E5DE] dark:border-[#32302B] rounded-lg",
        className
      )}
    >
      {options.map((tab) => {
        const isActive = value === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap",
              isActive
                ? "bg-white dark:bg-[#2A2823] text-[#22211F] dark:text-[#F5F3EE] font-semibold shadow-[0_1px_2px_rgba(34,33,31,0.05)] border border-[#E9E5DE]/80 dark:border-[#3E3B34]"
                : "text-[#78736A] dark:text-[#A6A096] hover:text-[#22211F] dark:hover:text-[#F5F3EE]"
            )}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
