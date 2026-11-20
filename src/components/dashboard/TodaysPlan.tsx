import React from "react";
import { ArrowRight, CheckCircle2, Clock, Circle, Plus } from "lucide-react";
import { useStudyFlow } from "../../context/StudyFlowContext";
import { StatusBadge } from "../common/Badge";
import { TaskStatus } from "../../types";

export const TodaysPlan: React.FC = () => {
  const { tasks, toggleTaskStatus, setActivePage } = useStudyFlow();

  const todayStr = new Date().toISOString().split("T")[0];
  const todayTasks = tasks.filter((t) => t.date === todayStr);

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-[#3B7A57] dark:text-[#68B088]" />;
      case "in_progress":
        return <Clock className="w-4 h-4 text-[#D58A2A] dark:text-[#E0983B]" />;
      case "pending":
      default:
        return <Circle className="w-4 h-4 text-[#C8C2B6] dark:text-[#57534E]" />;
    }
  };

  return (
    <div className="bg-white dark:bg-[#21201C] rounded-xl border border-[#E9E5DE] dark:border-[#32302B] p-5 sm:p-6 flex flex-col justify-between transition-colors">
      <div>
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#EFECE6] dark:border-[#32302B]">
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="font-editorial text-lg font-bold text-[#22211F] dark:text-[#F5F3EE] tracking-tight">
                Today&apos;s Study Agenda
              </h3>
              <span className="px-2 py-0.5 rounded bg-[#F5F2EC] dark:bg-[#2A2823] border border-[#E9E5DE] dark:border-[#3A3731] font-mono text-[10px] font-medium text-[#78736A] dark:text-[#A6A096] tabular-nums">
                {todayTasks.length} {todayTasks.length === 1 ? "block" : "blocks"}
              </span>
            </div>
            <p className="text-xs text-[#78736A] dark:text-[#A6A096] mt-0.5">
              Mark items as you finish each revision block
            </p>
          </div>
          <button
            onClick={() => setActivePage("planner")}
            className="text-xs font-medium text-[#B46914] dark:text-[#E0983B] hover:underline flex items-center gap-1 transition-colors cursor-pointer shrink-0 pt-1"
          >
            <span>Full Planner</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {todayTasks.length === 0 ? (
          <div className="py-10 text-center flex flex-col items-center justify-center">
            <div className="w-10 h-10 rounded-lg bg-[#FAF8F4] dark:bg-[#2A2823] border border-[#E9E5DE] dark:border-[#3A3731] text-[#D58A2A] dark:text-[#E0983B] flex items-center justify-center mb-3">
              <div className="w-3.5 h-3.5 rounded-[3px] border-2 border-current" />
            </div>
            <p className="text-sm font-semibold text-[#22211F] dark:text-[#F5F3EE]">
              No study sessions scheduled for today
            </p>
            <p className="text-xs text-[#78736A] dark:text-[#A6A096] mt-1 max-w-sm leading-relaxed mb-4">
              Plan your syllabus chapters or let the AI sequence generator schedule high-priority exam topics.
            </p>
            <button
              onClick={() => setActivePage("planner")}
              className="inline-flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg bg-[#22211F] hover:bg-[#363430] dark:bg-[#F5F3EE] dark:hover:bg-[#E6E2DA] text-white dark:text-[#1C1B18] font-medium cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add First Task</span>
            </button>
          </div>
        ) : (
          <div className="mt-4 divide-y divide-[#EFECE6] dark:divide-[#2E2C27]">
            {todayTasks.slice(0, 6).map((item) => (
              <div
                key={item.id}
                onClick={() => toggleTaskStatus(item.id)}
                className="flex items-center justify-between gap-3 py-3 px-2 -mx-2 rounded-lg hover:bg-[#FAF8F4] dark:hover:bg-[#2A2823] transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="shrink-0">{getStatusIcon(item.status)}</div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="font-mono text-[11px] text-[#78736A] dark:text-[#A6A096] tabular-nums">
                        {item.time || "Flexible"}
                      </span>
                      <span aria-hidden="true" className="text-[#C8C2B6] dark:text-[#57534E]">
                        ·
                      </span>
                      <span className="font-semibold text-[#22211F] dark:text-[#F5F3EE] truncate">
                        {item.subjectName}
                      </span>
                    </div>
                    <div
                      className={`text-xs mt-0.5 truncate ${
                        item.status === "completed"
                          ? "line-through text-[#9A948A] dark:text-[#7A756C]"
                          : "text-[#68635B] dark:text-[#A6A096]"
                      }`}
                    >
                      {item.title}
                    </div>
                  </div>
                </div>

                <div className="shrink-0">
                  <StatusBadge status={item.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {todayTasks.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[#EFECE6] dark:border-[#32302B] flex items-center justify-between text-[11px] text-[#78736A] dark:text-[#A6A096]">
          <span>Click any row to update block status</span>
          <span className="font-mono tabular-nums">
            {todayTasks.length} {todayTasks.length === 1 ? "block" : "blocks"}
          </span>
        </div>
      )}
    </div>
  );
};
