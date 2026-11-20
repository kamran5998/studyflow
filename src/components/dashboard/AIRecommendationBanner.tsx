import React, { useEffect, useState } from "react";
import {
  ArrowRight,
  Play,
  AlertCircle,
  Clock,
  TrendingUp,
  Flame,
  RefreshCw,
  Compass,
  Check,
  X,
  HelpCircle,
  Award,
} from "lucide-react";
import { useStudyFlow } from "../../context/StudyFlowContext";
import { aiService } from "../../services/aiService";
import { ExplainableRecommendation, PersonalizedLearningInsight } from "../../types";

export const AIRecommendationBanner: React.FC = () => {
  const {
    subjects,
    tasks,
    assignments,
    exams,
    focusSessions,
    quizScores,
    completedRecommendationIds,
    dismissedRecommendationIds,
    markRecommendationCompleted,
    dismissRecommendation,
    resetRecommendationPreferences,
    setActivePage,
    setQuizPreset,
  } = useStudyFlow();

  const [topRec, setTopRec] = useState<ExplainableRecommendation | null>(null);
  const [secondaryRecs, setSecondaryRecs] = useState<ExplainableRecommendation[]>([]);
  const [insights, setInsights] = useState<PersonalizedLearningInsight[]>([]);
  const [totalGenerated, setTotalGenerated] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activeInsightIdx, setActiveInsightIdx] = useState(0);

  const fetchAIRecommendations = async () => {
    if (subjects.length === 0 && exams.length === 0) {
      setTopRec(null);
      setSecondaryRecs([]);
      setTotalGenerated(0);
      setInsights([]);
      return;
    }

    setLoading(true);
    try {
      const [recRes, insRes] = await Promise.all([
        aiService.getExplainableRecommendations({
          subjects,
          tasks,
          assignments,
          exams,
          focusSessions,
          quizScores,
          completedRecommendationIds,
          dismissedRecommendationIds,
        }),
        aiService.getPersonalizedLearningInsights({
          subjects,
          tasks,
          assignments,
          exams,
          focusSessions,
          quizScores,
        }),
      ]);
      const activeRecs = (recRes.recommendations || []).filter(
        (r) => !r.isCompleted && !r.isDismissed
      );
      setTopRec(activeRecs[0] || null);
      setSecondaryRecs(activeRecs.slice(1, 3));
      setTotalGenerated(recRes.totalGenerated || 0);
      setInsights(insRes.insights || []);
    } catch (err) {
      console.warn("Failed to fetch explainable AI recommendations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAIRecommendations();
  }, [
    subjects,
    tasks,
    assignments,
    exams,
    focusSessions,
    quizScores,
    completedRecommendationIds,
    dismissedRecommendationIds,
  ]);

  const currentInsight = insights.length > 0 ? insights[activeInsightIdx % insights.length] : null;
  const isNewUser = subjects.length === 0 && exams.length === 0;

  const handlePrimaryAction = (rec: ExplainableRecommendation) => {
    if (rec.actionType === "take_quiz") {
      setQuizPreset({ subjectId: rec.subjectId, topic: rec.topic });
      setActivePage("quizzes");
    } else if (rec.actionType === "start_focus") {
      setActivePage("focus");
    } else if (rec.actionType === "view_exams") {
      setActivePage("exams");
    } else {
      setActivePage("planner");
    }
  };

  return (
    <div
      id="ai-recommendation-banner"
      className="relative overflow-hidden rounded-xl bg-[#22211F] dark:bg-[#1C1B18] border border-[#32302B] text-[#FAF9F6] p-5 sm:p-6"
    >
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-2.5 max-w-2xl">
          <div className="flex items-center gap-2 text-xs text-[#A6A096] flex-wrap">
            <span className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#E0983B]">
              <Compass className="w-3.5 h-3.5" />
              Explainable AI Next Best Action
            </span>
            {topRec?.daysToDeadline !== undefined && topRec.daysToDeadline !== null && (
              <>
                <span aria-hidden="true" className="text-[#57534E]">
                  ·
                </span>
                <span className="text-[#E0983B] font-mono text-[11px] font-medium tabular-nums">
                  {topRec.deadlineType === "assignment" ? "Due" : "Exam"} in {topRec.daysToDeadline}d
                </span>
              </>
            )}
            {topRec?.subjectName && (
              <>
                <span aria-hidden="true" className="text-[#57534E]">
                  ·
                </span>
                <span className="text-[#E6E2DA] font-medium">{topRec.subjectName}</span>
              </>
            )}
            {topRec && (
              <>
                <span aria-hidden="true" className="text-[#57534E]">
                  ·
                </span>
                <span className="text-[11px] font-mono text-[#68B088]">
                  Priority {topRec.priorityScore}/100
                </span>
              </>
            )}
            {!isNewUser && (
              <button
                onClick={fetchAIRecommendations}
                disabled={loading}
                title="Recalculate study priorities"
                className="text-[#A6A096] hover:text-[#FAF9F6] transition-colors p-1 rounded hover:bg-white/10 cursor-pointer disabled:opacity-50 ml-1"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
              </button>
            )}
          </div>

          {isNewUser ? (
            <>
              <h3 className="text-lg font-editorial font-bold tracking-tight text-[#FAF9F6] leading-snug">
                Initialize Your Course Ledger
              </h3>
              <p className="text-xs sm:text-[13px] text-[#C8C2B6] leading-relaxed max-w-xl">
                Register your semester courses and upcoming exam dates to activate explainable priority recommendations and weakness diagnostics.
              </p>
            </>
          ) : topRec ? (
            <>
              <h3 className="text-lg font-editorial font-bold tracking-tight text-[#FAF9F6] leading-snug">
                {topRec.title}
              </h3>
              <p className="text-xs sm:text-[13px] text-[#C8C2B6] leading-relaxed max-w-xl">
                {topRec.reason}
              </p>
              {topRec.evidence && (
                <p className="text-[11px] text-[#A6A096] leading-relaxed">
                  <span className="font-semibold text-[#E6E2DA]">Evidence: </span>
                  {topRec.evidence}
                </p>
              )}
            </>
          ) : (
            <>
              <h3 className="text-lg font-editorial font-bold tracking-tight text-[#FAF9F6] leading-snug">
                {totalGenerated > 0
                  ? "All active recommendations handled"
                  : "Curriculum looks balanced right now"}
              </h3>
              <p className="text-xs sm:text-[13px] text-[#C8C2B6] leading-relaxed max-w-xl">
                {totalGenerated > 0
                  ? "You have completed or dismissed all active recommendations. Restore them or review your full adaptive study sequence."
                  : "Continue logging focus blocks or taking recall quizzes to refine StudyPilot's adaptive recommendations."}
              </p>
            </>
          )}

          {secondaryRecs.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px] text-[#A6A096]">
              <span>Up next:</span>
              {secondaryRecs.map((sec) => (
                <button
                  key={sec.id}
                  onClick={() => handlePrimaryAction(sec)}
                  className="px-2.5 py-0.5 rounded bg-[#2D2B27] hover:bg-[#383530] text-[#E6E2DA] border border-[#3E3B35] transition-colors cursor-pointer"
                >
                  {sec.topic || sec.subjectName} ({sec.suggestedDuration})
                </button>
              ))}
            </div>
          )}

          {currentInsight && (
            <div className="pt-1 flex items-center gap-2 text-xs text-[#A6A096]">
              {currentInsight.iconName === "Clock" && (
                <Clock className="w-3.5 h-3.5 text-[#E0983B] shrink-0" />
              )}
              {currentInsight.iconName === "TrendingUp" && (
                <TrendingUp className="w-3.5 h-3.5 text-[#68B088] shrink-0" />
              )}
              {currentInsight.iconName === "AlertCircle" && (
                <AlertCircle className="w-3.5 h-3.5 text-[#E0983B] shrink-0" />
              )}
              {currentInsight.iconName === "Flame" && (
                <Flame className="w-3.5 h-3.5 text-[#D58A2A] shrink-0" />
              )}
              {currentInsight.iconName === "HelpCircle" && (
                <HelpCircle className="w-3.5 h-3.5 text-[#E0983B] shrink-0" />
              )}
              {currentInsight.iconName === "Award" && (
                <Award className="w-3.5 h-3.5 text-[#68B088] shrink-0" />
              )}
              <span className="text-[#E6E2DA]">{currentInsight.observation}</span>
              {insights.length > 1 && (
                <button
                  onClick={() => setActiveInsightIdx((prev) => (prev + 1) % insights.length)}
                  className="text-[#E0983B] hover:underline text-[11px] ml-1 cursor-pointer font-medium shrink-0"
                >
                  Next insight
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
          {isNewUser ? (
            <>
              <button
                id="ai-banner-add-subject"
                onClick={() => setActivePage("subjects")}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#FAF9F6] text-[#22211F] hover:bg-[#EFECE6] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
              >
                <span>+ Add Course</span>
              </button>
              <button
                id="ai-banner-open-planner"
                onClick={() => setActivePage("planner")}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#2D2B27] hover:bg-[#383530] text-[#E6E2DA] border border-[#3E3B35] text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
              >
                <span>Open Planner</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          ) : topRec ? (
            <>
              <button
                id="ai-banner-primary-cta"
                onClick={() => handlePrimaryAction(topRec)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#D58A2A] hover:bg-[#B46914] text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{topRec.recommendedAction}</span>
              </button>
              <button
                id="ai-banner-complete-rec"
                onClick={() => markRecommendationCompleted(topRec.id)}
                title="Mark recommendation completed"
                className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-lg bg-[#1C3326] hover:bg-[#244232] text-[#68B088] border border-[#2B4E3A] text-xs font-medium transition-colors cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Done</span>
              </button>
              <button
                id="ai-banner-dismiss-rec"
                onClick={() => dismissRecommendation(topRec.id)}
                title="Dismiss recommendation"
                className="inline-flex items-center justify-center p-2 rounded-lg bg-[#2D2B27] hover:bg-[#383530] text-[#A6A096] hover:text-[#FAF9F6] border border-[#3E3B35] text-xs transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <>
              {(completedRecommendationIds.length > 0 || dismissedRecommendationIds.length > 0) && (
                <button
                  onClick={resetRecommendationPreferences}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#2D2B27] hover:bg-[#383530] text-[#E6E2DA] border border-[#3E3B35] text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Restore Recommendations</span>
                </button>
              )}
              <button
                onClick={() => setActivePage("planner")}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#D58A2A] hover:bg-[#B46914] text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
              >
                <span>Open Planner</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
