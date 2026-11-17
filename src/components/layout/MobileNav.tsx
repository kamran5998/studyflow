import React from "react";
import {
  LayoutGrid,
  BookOpen,
  CalendarDays,
  Timer,
  MoreHorizontal,
  GraduationCap,
  BarChart3,
  Settings,
  X,
  HelpCircle,
  FileText,
  Compass,
  Moon,
  Sun,
} from "lucide-react";
import { useStudyFlow, PageId } from "../../context/StudyFlowContext";
import { useAuth } from "../../context/AuthContext";
import { cn } from "../../lib/utils";
import { StudyFlowLogo } from "../common/StudyFlowLogo";

interface MobileNavProps {
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  isDrawerOpen,
  setIsDrawerOpen,
}) => {
  const { activePage, setActivePage, theme, toggleTheme, showToast } = useStudyFlow();
  const { currentUser, isAuthenticated, setAuthModalOpen, logout } = useAuth();

  const primaryTabs: { id: PageId; label: string; icon: React.ElementType }[] = [
    { id: "dashboard", label: "Desk", icon: LayoutGrid },
    { id: "planner", label: "Planner", icon: CalendarDays },
    { id: "focus", label: "Focus", icon: Timer },
    { id: "subjects", label: "Courses", icon: BookOpen },
    { id: "exams", label: "Exams", icon: GraduationCap },
  ];

  const secondaryTabs: { id: PageId; label: string; icon: React.ElementType }[] = [
    { id: "roadmap", label: "Study Roadmap", icon: Compass },
    { id: "quizzes", label: "Recall & Quizzes", icon: HelpCircle },
    { id: "summarizer", label: "Lecture Notes", icon: FileText },
    { id: "analytics", label: "Hours & Analytics", icon: BarChart3 },
    { id: "settings", label: "Notebook Settings", icon: Settings },
  ];

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav
        id="mobile-bottom-nav"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FAF8F4]/95 dark:bg-[#1C1B18]/95 backdrop-blur-md border-t border-[#E9E5DE] dark:border-[#32302B] px-2 py-1.5 flex items-center justify-around transition-colors duration-200"
      >
        {primaryTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activePage === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActivePage(tab.id);
                setIsDrawerOpen(false);
              }}
              className={cn(
                "flex flex-col items-center justify-center py-1 px-2 rounded-lg text-[10px] font-medium transition-colors cursor-pointer min-w-[54px]",
                isActive
                  ? "text-[#B46914] dark:text-[#E0983B] font-semibold"
                  : "text-[#78736A] dark:text-[#A6A096] hover:text-[#22211F] dark:hover:text-[#F5F3EE]"
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 mb-0.5",
                  isActive && "text-[#D58A2A] dark:text-[#E0983B]"
                )}
              />
              <span>{tab.label}</span>
            </button>
          );
        })}

        <button
          onClick={() => setIsDrawerOpen(!isDrawerOpen)}
          className={cn(
            "flex flex-col items-center justify-center py-1 px-2 rounded-lg text-[10px] font-medium transition-colors cursor-pointer min-w-[54px]",
            ["roadmap", "analytics", "settings", "quizzes", "summarizer", "assignments"].includes(
              activePage
            )
              ? "text-[#B46914] dark:text-[#E0983B] font-semibold"
              : "text-[#78736A] dark:text-[#A6A096] hover:text-[#22211F] dark:hover:text-[#F5F3EE]"
          )}
        >
          <MoreHorizontal className="w-4 h-4 mb-0.5" />
          <span>More</span>
        </button>
      </nav>

      {/* Drawer Overlay */}
      {isDrawerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-[#22211F]/45 dark:bg-black/65 backdrop-blur-[2px] flex justify-end"
          onClick={() => setIsDrawerOpen(false)}
        >
          <div
            className="w-72 h-full bg-[#FAF8F4] dark:bg-[#1C1B18] shadow-2xl p-5 flex flex-col justify-between border-l border-[#E9E5DE] dark:border-[#32302B]"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#E9E5DE] dark:border-[#32302B]">
                <StudyFlowLogo
                  size="sm"
                  subtitle="AI-Powered Study Planner"
                  onClick={() => {
                    setActivePage("dashboard");
                    setIsDrawerOpen(false);
                  }}
                />
                <div className="flex items-center gap-1">
                  <button
                    onClick={toggleTheme}
                    className="p-1.5 text-[#78736A] hover:text-[#22211F] dark:text-[#A6A096] dark:hover:text-[#F5F3EE] rounded-lg hover:bg-[#EFECE6] dark:hover:bg-[#2A2823] transition-colors cursor-pointer"
                    title="Toggle Theme"
                  >
                    {theme === "dark" ? (
                      <Sun className="w-4 h-4 text-[#E0983B]" />
                    ) : (
                      <Moon className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => setIsDrawerOpen(false)}
                    className="p-1 text-[#78736A] hover:text-[#22211F] dark:hover:text-[#F5F3EE] rounded-lg hover:bg-[#EFECE6] dark:hover:bg-[#2A2823] transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-1 overflow-y-auto max-h-[calc(100vh-190px)]">
                <div className="text-[10px] font-mono font-semibold text-[#9A948A] dark:text-[#7A756C] uppercase tracking-[0.14em] px-2 mb-1.5">
                  Notebook Sections
                </div>
                {[...primaryTabs, ...secondaryTabs].map((item) => {
                  const Icon = item.icon;
                  const isActive = activePage === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActivePage(item.id);
                        setIsDrawerOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-left transition-colors cursor-pointer border",
                        isActive
                          ? "bg-white dark:bg-[#21201C] border-[#E9E5DE] dark:border-[#32302B] text-[#22211F] dark:text-[#F5F3EE] font-semibold"
                          : "border-transparent text-[#68635B] dark:text-[#A6A096] font-medium hover:bg-[#F3EFE8] dark:hover:bg-[#262420]"
                      )}
                    >
                      <Icon
                        className={cn(
                          "w-4 h-4",
                          isActive
                            ? "text-[#D58A2A] dark:text-[#E0983B]"
                            : "text-[#9A948A] dark:text-[#7A756C]"
                        )}
                      />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-[#E9E5DE] dark:border-[#32302B] space-y-2">
              {isAuthenticated && currentUser ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-md bg-[#22211F] dark:bg-[#F5F3EE] text-white dark:text-[#1C1B18] font-semibold flex items-center justify-center text-xs shrink-0">
                      {currentUser.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[#22211F] dark:text-[#F5F3EE] truncate">
                        {currentUser.name}
                      </div>
                      <div className="text-[10px] text-[#78736A] dark:text-[#A6A096] truncate">
                        {currentUser.email}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      logout();
                      setIsDrawerOpen(false);
                      showToast("Signed out of account", "info");
                    }}
                    className="text-[11px] text-[#A83838] dark:text-[#E57373] hover:underline cursor-pointer"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setIsDrawerOpen(false);
                    setAuthModalOpen(true, "login");
                  }}
                  className="w-full py-2 px-3 rounded-lg bg-[#22211F] hover:bg-[#363430] dark:bg-[#F5F3EE] dark:hover:bg-[#E6E2DA] text-white dark:text-[#1C1B18] text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Sign In / Create Account</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
