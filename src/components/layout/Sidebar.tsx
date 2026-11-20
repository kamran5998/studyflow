import React from "react";
import {
  LayoutGrid,
  BookOpen,
  CalendarDays,
  GraduationCap,
  Timer,
  BarChart3,
  Settings,
  HelpCircle,
  FileText,
  Compass,
} from "lucide-react";
import { useStudyFlow, PageId } from "../../context/StudyFlowContext";
import { cn } from "../../lib/utils";
import { StudyFlowLogo } from "../common/StudyFlowLogo";

interface NavGroup {
  label: string;
  items: {
    id: PageId;
    label: string;
    icon: React.ElementType;
    badge?: string | number;
  }[];
}

export const Sidebar: React.FC = () => {
  const { activePage, setActivePage, tasks, exams } = useStudyFlow();

  const todayStr = new Date().toISOString().split("T")[0];
  const pendingTasksCount = tasks.filter(
    (t) => t.date === todayStr && t.status !== "completed"
  ).length;

  const upcomingExamsCount = exams.length;

  const navGroups: NavGroup[] = [
    {
      label: "NOTEBOOK",
      items: [
        { id: "dashboard", label: "Dashboard", icon: LayoutGrid },
        {
          id: "planner",
          label: "Planner",
          icon: CalendarDays,
          badge: pendingTasksCount > 0 ? pendingTasksCount : undefined,
        },
        { id: "focus", label: "Focus Session", icon: Timer },
      ],
    },
    {
      label: "CURRICULUM",
      items: [
        { id: "subjects", label: "Subjects", icon: BookOpen },
        {
          id: "exams",
          label: "Exams",
          icon: GraduationCap,
          badge: upcomingExamsCount > 0 ? upcomingExamsCount : undefined,
        },
      ],
    },
    {
      label: "STUDY AIDS",
      items: [
        { id: "roadmap", label: "Study Roadmap", icon: Compass },
        { id: "quizzes", label: "AI Practice Quiz", icon: HelpCircle },
        { id: "summarizer", label: "AI Summarizer", icon: FileText },
      ],
    },
    {
      label: "LEDGER",
      items: [{ id: "analytics", label: "Analytics", icon: BarChart3 }],
    },
  ];

  return (
    <aside
      id="desktop-sidebar"
      className="hidden lg:flex flex-col w-64 h-screen sticky top-0 bg-[#FAF8F4] dark:bg-[#1C1B18] border-r border-[#E9E5DE] dark:border-[#32302B] shrink-0 z-30 select-none transition-colors duration-200"
    >
      {/* Brand Header */}
      <div className="h-16 px-5 border-b border-[#EFECE6] dark:border-[#2B2924] flex items-center">
        <StudyFlowLogo
          size="md"
          subtitle="AI-Powered Study Planner"
          onClick={() => setActivePage("dashboard")}
        />
      </div>

      {/* Main Navigation Groups */}
      <div className="flex-1 px-3.5 py-5 space-y-6 overflow-y-auto">
        {navGroups.map((group, groupIdx) => (
          <div key={groupIdx} className="space-y-1">
            <div className="px-3 pb-1 text-[10px] font-mono font-semibold text-[#9A948A] dark:text-[#7A756C] uppercase tracking-[0.14em]">
              {group.label}
            </div>
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-${item.id}`}
                  onClick={() => setActivePage(item.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] transition-all cursor-pointer relative border",
                    isActive
                      ? "bg-white dark:bg-[#21201C] text-[#22211F] dark:text-[#F5F3EE] font-semibold border-[#E9E5DE] dark:border-[#32302B] shadow-2xs before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:bg-[#D58A2A] dark:before:bg-[#E0983B] before:rounded-r"
                      : "border-transparent text-[#68635B] dark:text-[#A6A096] font-medium hover:bg-[#F3EFE8] dark:hover:bg-[#262420] hover:text-[#22211F] dark:hover:text-[#F5F3EE]"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={cn(
                        "w-4 h-4 transition-colors shrink-0",
                        isActive
                          ? "text-[#D58A2A] dark:text-[#E0983B]"
                          : "text-[#9A948A] dark:text-[#7A756C]"
                      )}
                      strokeWidth={isActive ? 2 : 1.75}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span
                      className={cn(
                        "px-1.5 py-0.5 rounded text-[10px] font-mono font-medium tabular-nums",
                        isActive
                          ? "bg-[#FAF1E3] dark:bg-[#3A2C16] text-[#B46914] dark:text-[#E0983B]"
                          : "bg-[#EFECE6] dark:bg-[#2A2823] text-[#78736A] dark:text-[#A6A096]"
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Bottom Settings */}
      <div className="p-3.5 border-t border-[#EFECE6] dark:border-[#2B2924]">
        <button
          id="nav-settings"
          onClick={() => setActivePage("settings")}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors cursor-pointer relative border",
            activePage === "settings" || activePage === "profile"
              ? "bg-white dark:bg-[#21201C] text-[#22211F] dark:text-[#F5F3EE] font-semibold border-[#E9E5DE] dark:border-[#32302B] shadow-2xs before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:bg-[#D58A2A] before:rounded-r"
              : "border-transparent text-[#68635B] dark:text-[#A6A096] font-medium hover:bg-[#F3EFE8] dark:hover:bg-[#262420] hover:text-[#22211F] dark:hover:text-[#F5F3EE]"
          )}
        >
          <Settings
            className={cn(
              "w-4 h-4 shrink-0",
              activePage === "settings" || activePage === "profile"
                ? "text-[#D58A2A] dark:text-[#E0983B]"
                : "text-[#9A948A] dark:text-[#7A756C]"
            )}
            strokeWidth={1.75}
          />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
};
