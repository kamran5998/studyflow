import React, { useState } from "react";
import { Bell, Menu, Moon, Sun, Search } from "lucide-react";
import { useStudyFlow, PageId } from "../../context/StudyFlowContext";
import { NotificationsPopover } from "../common/NotificationsPopover";
import { UserDropdown } from "../auth/UserDropdown";

interface HeaderProps {
  onOpenMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu }) => {
  const {
    activePage,
    unreadNotificationCount,
    theme,
    toggleTheme,
    setIsSearchOpen,
  } = useStudyFlow();

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const pageBreadcrumbs: Record<PageId, { section: string; title: string }> = {
    dashboard: { section: "WORKSPACE", title: "Dashboard" },
    planner: { section: "DAILY FOCUS", title: "Planner" },
    focus: { section: "DEEP WORK", title: "Focus Timer" },
    subjects: { section: "CURRICULUM", title: "Subjects" },
    exams: { section: "MILESTONES", title: "Exams" },
    assignments: { section: "CURRICULUM", title: "Assignments & Deadlines" },
    roadmap: { section: "STUDY AIDS", title: "Study Roadmap" },
    quizzes: { section: "STUDY AIDS", title: "AI Practice Quiz" },
    summarizer: { section: "STUDY AIDS", title: "AI Summarizer" },
    analytics: { section: "LEDGER", title: "Analytics" },
    profile: { section: "SYSTEM", title: "Settings" },
    settings: { section: "SYSTEM", title: "Settings" },
  };

  const currentMeta = pageBreadcrumbs[activePage] || {
    section: "WORKSPACE",
    title: "Dashboard",
  };

  return (
    <header
      id="top-header"
      className="sticky top-0 z-20 h-16 bg-[#FAF9F6]/90 dark:bg-[#161513]/90 backdrop-blur-md border-b border-[#E9E5DE] dark:border-[#32302B] px-4 sm:px-8 flex items-center justify-between transition-colors duration-200"
    >
      {/* Left Zone: Breadcrumb Trail / Mobile Wordmark */}
      <div className="flex items-center gap-3 min-w-0">
        {onOpenMobileMenu && (
          <button
            id="mobile-menu-btn"
            onClick={onOpenMobileMenu}
            className="lg:hidden p-1.5 -ml-1 text-[#78736A] hover:text-[#22211F] dark:text-[#A6A096] dark:hover:text-[#F5F3EE] hover:bg-[#EFECE6] dark:hover:bg-[#2A2823] rounded-lg transition-colors cursor-pointer"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="lg:hidden flex items-center gap-1.5">
          <span className="font-semibold text-sm tracking-tight text-[#22211F] dark:text-[#F5F3EE]">
            StudyPilot
          </span>
          <span className="text-[9px] font-mono font-semibold uppercase tracking-[0.14em] text-[#B46914] dark:text-[#E0983B]">
            EDITION
          </span>
        </div>

        {/* Clean editorial breadcrumb navigation */}
        <div className="hidden lg:flex items-center gap-2 text-xs min-w-0">
          <span className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[#9A948A] dark:text-[#7A756C]">
            {currentMeta.section}
          </span>
          <span className="text-[#C8C2B6] dark:text-[#47443D]" aria-hidden="true">
            /
          </span>
          <span className="font-semibold text-[13px] text-[#22211F] dark:text-[#F5F3EE] tracking-tight truncate">
            {currentMeta.title}
          </span>
        </div>
      </div>

      {/* Right Zone: Search shortcut, Theme Toggle, Notifications, Profile */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        <button
          onClick={() => setIsSearchOpen(true)}
          className="hidden sm:inline-flex items-center gap-2 h-8 px-2.5 rounded-lg bg-white dark:bg-[#21201C] border border-[#E9E5DE] dark:border-[#32302B] text-[#78736A] dark:text-[#A6A096] hover:text-[#22211F] dark:hover:text-[#F5F3EE] hover:border-[#D7D1C7] dark:hover:border-[#47443D] text-xs transition-colors cursor-pointer"
          title="Quick search (Ctrl+K)"
        >
          <Search className="w-3.5 h-3.5" />
          <kbd className="font-mono text-[10px] text-[#9A948A]">⌘K</kbd>
        </button>

        {/* Theme Toggle */}
        <button
          id="theme-toggle-btn"
          onClick={toggleTheme}
          className="w-8 h-8 rounded-lg bg-white dark:bg-[#21201C] border border-[#E9E5DE] dark:border-[#32302B] text-[#78736A] hover:text-[#22211F] dark:text-[#A6A096] dark:hover:text-[#F5F3EE] hover:border-[#D7D1C7] dark:hover:border-[#47443D] transition-colors cursor-pointer flex items-center justify-center"
          title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          aria-label={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {theme === "dark" ? (
            <Sun className="w-3.5 h-3.5 text-[#E0983B]" />
          ) : (
            <Moon className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            id="notifications-toggle-btn"
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="w-8 h-8 rounded-lg bg-white dark:bg-[#21201C] border border-[#E9E5DE] dark:border-[#32302B] text-[#78736A] hover:text-[#22211F] dark:text-[#A6A096] dark:hover:text-[#F5F3EE] hover:border-[#D7D1C7] dark:hover:border-[#47443D] transition-colors relative cursor-pointer flex items-center justify-center"
            aria-label="View notifications"
          >
            <Bell className="w-3.5 h-3.5" />
            {unreadNotificationCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#D58A2A] rounded-full" />
            )}
          </button>
          <NotificationsPopover
            isOpen={isNotificationsOpen}
            onClose={() => setIsNotificationsOpen(false)}
          />
        </div>

        <div className="hidden sm:block w-px h-5 bg-[#E9E5DE] dark:bg-[#32302B] mx-0.5" />

        {/* User Account / Auth Dropdown */}
        <UserDropdown />
      </div>
    </header>
  );
};
