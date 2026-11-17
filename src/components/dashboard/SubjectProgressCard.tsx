import React from "react";
import { ArrowRight, BookOpen } from "lucide-react";
import { useStudyFlow } from "../../context/StudyFlowContext";
import { ProgressBar } from "../common/ProgressBar";

export const SubjectProgressCard: React.FC = () => {
  const { subjects, setActivePage } = useStudyFlow();

  const getSubjectColor = (color: string) => {
    switch (color) {
      case "green":
        return "green";
      case "blue":
        return "slate";
      case "orange":
        return "amber";
      default:
        return "amber";
    }
  };

  return (
    <div className="bg-white dark:bg-[#21201C] rounded-xl border border-[#E9E5DE] dark:border-[#32302B] p-5 flex flex-col justify-between transition-colors">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-[#EFECE6] dark:border-[#32302B]">
          <div>
            <h3 className="font-editorial text-base font-bold text-[#22211F] dark:text-[#F5F3EE] tracking-tight">
              Syllabus Coverage
            </h3>
            <p className="text-xs text-[#78736A] dark:text-[#A6A096]">
              Curriculum topic mastery
            </p>
          </div>
          <button
            onClick={() => setActivePage("subjects")}
            className="text-xs font-medium text-[#B46914] dark:text-[#E0983B] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Curriculum</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {subjects.length === 0 ? (
          <div className="py-8 text-center flex flex-col items-center justify-center">
            <div className="w-9 h-9 rounded-lg bg-[#FAF1E3] dark:bg-[#3A2C16] border border-[#F0DFC2] dark:border-[#523E20] text-[#D58A2A] dark:text-[#E0983B] flex items-center justify-center mb-2.5">
              <BookOpen className="w-4 h-4" />
            </div>
            <p className="text-xs text-[#22211F] dark:text-[#F5F3EE] font-medium">
              No courses registered
            </p>
            <p className="text-[11px] text-[#78736A] dark:text-[#A6A096] mt-0.5 mb-3">
              Add courses to track chapter mastery
            </p>
            <button
              onClick={() => setActivePage("subjects")}
              className="text-xs px-3.5 py-1.5 rounded-lg bg-[#22211F] hover:bg-[#363430] dark:bg-[#F5F3EE] dark:hover:bg-[#E6E2DA] text-white dark:text-[#1C1B18] font-medium cursor-pointer transition-colors"
            >
              + Add Course
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-3.5">
            {subjects.map((sub) => {
              const colorType = getSubjectColor(sub.color);
              return (
                <div
                  key={sub.id}
                  onClick={() => setActivePage("subjects")}
                  className="group cursor-pointer"
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-semibold text-[#22211F] dark:text-[#F5F3EE] group-hover:text-[#B46914] dark:group-hover:text-[#E0983B] transition-colors truncate">
                        {sub.name}
                      </span>
                      {sub.code && (
                        <span className="text-[10px] text-[#9A948A] font-mono shrink-0">
                          {sub.code}
                        </span>
                      )}
                    </div>
                    <span className="font-mono font-semibold text-[#22211F] dark:text-[#F5F3EE] tabular-nums">
                      {sub.progress}%
                    </span>
                  </div>
                  <ProgressBar
                    value={sub.progress}
                    color={colorType as "amber" | "slate" | "green"}
                    size="sm"
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-5 pt-3 border-t border-[#EFECE6] dark:border-[#32302B] flex items-center justify-between text-xs text-[#78736A] dark:text-[#A6A096]">
        <span className="flex items-center gap-1.5 font-mono tabular-nums">
          <BookOpen className="w-3.5 h-3.5 text-[#9A948A]" />
          {subjects.length} {subjects.length === 1 ? "active course" : "active courses"}
        </span>
        <span className="font-mono tabular-nums">
          Avg:{" "}
          {subjects.length > 0
            ? Math.round(subjects.reduce((a, b) => a + b.progress, 0) / subjects.length)
            : 0}
          %
        </span>
      </div>
    </div>
  );
};
