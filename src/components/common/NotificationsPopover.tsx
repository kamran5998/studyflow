import React, { useRef, useEffect } from "react";
import { Bell, Check, Calendar, FileText, Flame, ExternalLink } from "lucide-react";
import { useStudyFlow, PageId } from "../../context/StudyFlowContext";

interface NotificationsPopoverProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationsPopover: React.FC<NotificationsPopoverProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    setActivePage,
  } = useStudyFlow();
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getIcon = (type: string) => {
    switch (type) {
      case "exam":
        return <Calendar className="w-3.5 h-3.5 text-[#A83838] dark:text-[#E57373]" />;
      case "assignment":
        return <FileText className="w-3.5 h-3.5 text-[#B46914] dark:text-[#E0983B]" />;
      case "streak":
        return <Flame className="w-3.5 h-3.5 text-[#D58A2A] dark:text-[#E0983B]" />;
      default:
        return <Bell className="w-3.5 h-3.5 text-[#22211F] dark:text-[#F5F3EE]" />;
    }
  };

  return (
    <div
      ref={popoverRef}
      id="notifications-popover"
      className="absolute right-0 top-12 w-80 sm:w-96 bg-white dark:bg-[#21201C] rounded-xl shadow-lg border border-[#E9E5DE] dark:border-[#32302B] z-50 overflow-hidden transition-colors"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#EFECE6] dark:border-[#32302B] bg-[#FAF8F4] dark:bg-[#1C1B18]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#22211F] dark:text-[#F5F3EE]">
            Notifications
          </span>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 bg-[#FAF1E3] dark:bg-[#3A2C16] text-[#B46914] dark:text-[#E0983B] border border-[#F0DFC2] dark:border-[#523E20] text-[10px] font-mono font-semibold rounded">
              {unreadCount} new
            </span>
          )}
        </div>
        <button
          onClick={markAllNotificationsRead}
          className="text-[11px] text-[#B46914] dark:text-[#E0983B] hover:underline font-medium flex items-center gap-1 cursor-pointer"
        >
          <Check className="w-3 h-3" /> Mark all read
        </button>
      </div>

      <div className="max-h-80 overflow-y-auto divide-y divide-[#EFECE6] dark:divide-[#32302B]">
        {notifications.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#78736A] dark:text-[#A6A096]">
            No notifications right now
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => {
                markNotificationRead(n.id);
                if (n.linkPage) {
                  setActivePage(n.linkPage as PageId);
                  onClose();
                }
              }}
              className={`p-3.5 hover:bg-[#FAF8F4] dark:hover:bg-[#2A2823] transition-colors cursor-pointer flex items-start gap-3 ${
                !n.read ? "bg-[#FAF1E3]/40 dark:bg-[#3A2C16]/25" : ""
              }`}
            >
              <div className="w-7 h-7 rounded-lg bg-[#F5F2EC] dark:bg-[#2A2823] border border-[#E9E5DE] dark:border-[#3A3731] flex items-center justify-center shrink-0 mt-0.5">
                {getIcon(n.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <h4 className="text-xs font-semibold text-[#22211F] dark:text-[#F5F3EE] truncate">
                    {n.title}
                  </h4>
                  <span className="text-[10px] font-mono text-[#9A948A] shrink-0 ml-2">
                    {n.timestamp}
                  </span>
                </div>
                <p className="text-xs text-[#78736A] dark:text-[#A6A096] leading-snug line-clamp-2">
                  {n.message}
                </p>
                {n.linkPage && (
                  <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-medium text-[#B46914] dark:text-[#E0983B]">
                    Open {n.linkPage} <ExternalLink className="w-2.5 h-2.5" />
                  </span>
                )}
              </div>
              {!n.read && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#D58A2A] shrink-0 mt-1.5" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
