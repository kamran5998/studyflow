import React, { useEffect, useState } from "react";
import { Sparkles, Clock, TrendingUp, AlertCircle, Flame, RefreshCw, Lightbulb } from "lucide-react";
import { useStudyFlow } from "../../context/StudyFlowContext";
import { aiService } from "../../services/aiService";
import { AIProductivityInsight } from "../../types";

export const AIProductivityInsightsCard: React.FC = () => {
  const { subjects, tasks, exams, focusSessions, quizScores } = useStudyFlow();
  const [insights, setInsights] = useState<AIProductivityInsight[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const data = await aiService.getInsights({
        subjects,
        tasks,
        exams,
        focusSessions,
        quizScores,
      });
      setInsights(data);
    } catch (e) {
      console.error("Failed to load insights:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [subjects, tasks, exams, focusSessions, quizScores]);

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "strength":
        return { label: "Strength", color: "text-emerald-600 dark:text-emerald-400" };
      case "improvement":
        return { label: "Focus Target", color: "text-amber-600 dark:text-amber-400" };
      case "efficiency":
        return { label: "Efficiency", color: "text-blue-600 dark:text-blue-400" };
      case "habit":
      default:
        return { label: "Habit Pattern", color: "text-indigo-600 dark:text-indigo-400" };
    }
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "TrendingUp":
        return <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />;
      case "AlertCircle":
        return <AlertCircle className="w-3.5 h-3.5 text-amber-500" />;
      case "Flame":
        return <Flame className="w-3.5 h-3.5 text-orange-500" />;
      case "Clock":
      default:
        return <Clock className="w-3.5 h-3.5 text-indigo-500" />;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
              Behavioral & Productivity Diagnostics
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Evaluated from task velocities, focus frequency, and retention rhythms
            </p>
          </div>
        </div>

        <button
          onClick={fetchInsights}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
          title="Recalculate Behavioral Diagnostics"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          <span>Recalibrate</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {insights.map((item) => {
          const meta = getCategoryLabel(item.category);
          return (
            <div
              key={item.id}
              className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/90 bg-slate-50/60 dark:bg-slate-800/40 hover:border-indigo-300 dark:hover:border-indigo-700/60 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    {getIcon(item.iconName)}
                    <span className={`text-[11px] font-semibold ${meta.color}`}>
                      {meta.label}
                    </span>
                  </div>
                </div>
                <p className="text-xs font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                  &ldquo;{item.text}&rdquo;
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
                <Lightbulb className="w-3 h-3 text-amber-500 shrink-0" />
                <span className="truncate">
                  {item.category === "habit"
                    ? "Schedule complex tasks in this window"
                    : item.category === "strength"
                    ? "Maintain active recall momentum"
                    : "Break study blocks into 25m Pomodoros"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

