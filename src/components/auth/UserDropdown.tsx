import React, { useState, useRef, useEffect } from "react";
import { LogOut, ChevronDown, LogIn, Settings } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useStudyFlow } from "../../context/StudyFlowContext";

interface UserDropdownProps {
  onOpenSecurity?: () => void;
}

export const UserDropdown: React.FC<UserDropdownProps> = () => {
  const { currentUser, isAuthenticated, logout, setAuthModalOpen } = useAuth();
  const { setActivePage, showToast } = useStudyFlow();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = () => {
    logout();
    setIsOpen(false);
    showToast("Signed out successfully.", "info");
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {isAuthenticated && currentUser ? (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2.5 h-8 px-1.5 sm:px-2.5 rounded-lg bg-white dark:bg-[#21201C] border border-[#E9E5DE] dark:border-[#32302B] hover:border-[#D7D1C7] dark:hover:border-[#47443D] transition-colors cursor-pointer"
          aria-expanded={isOpen}
          aria-haspopup="true"
        >
          <div className="w-5 h-5 rounded bg-[#22211F] dark:bg-[#F5F3EE] text-[#FAF9F6] dark:text-[#1C1B18] font-semibold flex items-center justify-center text-[11px] shrink-0">
            {currentUser.name.charAt(0).toUpperCase()}
          </div>
          <div className="hidden sm:flex flex-col text-left leading-none">
            <span className="text-[11px] font-semibold text-[#22211F] dark:text-[#F5F3EE] max-w-[125px] truncate">
              {currentUser.name}
            </span>
            <span className="text-[10px] text-[#9A948A] dark:text-[#7A756C] truncate max-w-[125px] mt-0.5">
              {currentUser.email}
            </span>
          </div>
          <ChevronDown className="w-3 h-3 text-[#9A948A] shrink-0" />
        </button>
      ) : (
        <button
          onClick={() => setAuthModalOpen(true, "login")}
          className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#22211F] hover:bg-[#363430] dark:bg-[#F5F3EE] dark:hover:bg-[#E6E2DA] text-white dark:text-[#1C1B18] text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
        >
          <LogIn className="w-3.5 h-3.5" />
          <span>Sign In</span>
        </button>
      )}

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white dark:bg-[#21201C] border border-[#E9E5DE] dark:border-[#32302B] shadow-lg z-50 py-1.5 text-xs text-[#22211F] dark:text-[#F5F3EE]">
          {currentUser && (
            <div className="px-4 py-3 border-b border-[#EFECE6] dark:border-[#32302B]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#22211F] dark:bg-[#F5F3EE] text-[#FAF9F6] dark:text-[#1C1B18] font-semibold flex items-center justify-center text-sm shrink-0">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-[#22211F] dark:text-[#F5F3EE] truncate">
                    {currentUser.name}
                  </div>
                  <div className="text-[11px] text-[#78736A] dark:text-[#A6A096] truncate">
                    {currentUser.email}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="py-1">
            <button
              onClick={() => {
                setActivePage("settings");
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-[#FAF8F4] dark:hover:bg-[#2A2823] transition-colors text-left cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 text-[#78736A]" />
<<<<<<< HEAD
              <span>Settings</span>
=======
              <span>Notebook Settings</span>
>>>>>>> 9d281b97efabd4f9d488c8bc37687c9b1dfe9f78
            </button>
          </div>

          <div className="py-1 border-t border-[#EFECE6] dark:border-[#32302B]">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-[#A83838] dark:text-[#E57373] hover:bg-[#FDF2F2] dark:hover:bg-[#3A1E1E] transition-colors text-left cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
