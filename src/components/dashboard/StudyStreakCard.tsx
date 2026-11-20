import React from "react";
import { Award, Flame } from "lucide-react";
import { useStudyFlow } from "../../context/StudyFlowContext";

export const StudyStreakCard: React.FC = () => {
  const { profile } = useStudyFlow();
  const streakDays = profile.streakDays || 0;

  const weekDays = ["M", "T", "W", "T", "F", "S", "S"];
  const currentDayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

  return (
    <div className="bg-white dark:bg-[#21201C] rounded-xl border border-[#E9E5DE] dark:border-[#32302B] p-5 flex flex-col justify-between transition-colors">
      <div className="flex items-center justify-between pb-3 border-b border-[#EFECE6] dark:border-[#32302B]">
        <div>
          <h3 className="font-editorial text-base font-bold text-[#22211F] dark:text-[#F5F3EE] tracking-tight">
            Consistency Streak
          </h3>
          <p className="text-xs text-[#78736A] dark:text-[#A6A096]">
            Daily study habit tracker
          </p>
        </div>
        <div className="w-7 h-7 rounded-lg bg-[#FAF1E3] dark:bg-[#3A2C16] border border-[#F0DFC2] dark:border-[#523E20] text-[#D58A2A] dark:text-[#E0983B] flex items-center justify-center">
          <Award className="w-3.5 h-3.5" />
        </div>
      </div>

      <div className="py-4 flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-[#FAF1E3] dark:bg-[#3A2C16] border border-[#F0DFC2] dark:border-[#523E20] flex items-center justify-center text-[#D58A2A] dark:text-[#E0983B] shrink-0">
          <Flame className="w-5 h-5" />
        </div>
        <div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-[#22211F] dark:text-[#F5F3EE] tracking-tight tabular-nums">
            {streakDays}{" "}
            <span className="text-xs font-sans font-normal text-[#78736A] dark:text-[#A6A096]">
              days active
            </span>
          </div>
          <p className="text-[11px] text-[#B46914] dark:text-[#E0983B] font-medium mt-0.5">
            {streakDays > 0 ? "Daily consistency active" : "Log a focus block to begin"}
          </p>
        </div>
      </div>

      <div className="pt-3 border-t border-[#EFECE6] dark:border-[#32302B]">
        <div className="flex items-center justify-between">
          {weekDays.map((day, idx) => {
            const isCompleted = streakDays > 0 && idx <= currentDayIndex;
            const isToday = idx === currentDayIndex;
            return (
              <div key={idx} className="flex flex-col items-center gap-1">
                <span className="text-[10px] text-[#9A948A] font-mono">{day}</span>
                <div
                  className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-mono font-semibold transition-colors ${
                    isCompleted
                      ? "bg-[#D58A2A] text-white"
                      : isToday
                      ? "bg-[#FAF1E3] dark:bg-[#3A2C16] text-[#B46914] dark:text-[#E0983B] border border-[#F0DFC2] dark:border-[#523E20]"
                      : "bg-[#F5F2EC] dark:bg-[#2A2823] text-[#9A948A]"
                  }`}
                >
                  {isCompleted ? "✓" : "·"}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
