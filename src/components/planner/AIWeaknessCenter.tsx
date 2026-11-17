import React, { useState, useEffect } from "react";
import {
  Plus,
  Sparkles,
  CheckCircle2,
  Play,
  RefreshCw,
  Sliders,
  FileQuestion,
  Clock,
  Layers,
} from "lucide-react";
import { useStudyFlow } from "../../context/StudyFlowContext";
import { aiService } from "../../services/aiService";
import { WeakTopicItem, WeaknessAnalysisResponse, MasteryThresholds } from "../../types";
import { KickerPill, PrimaryButton, SecondaryButton } from "../common/ui";

export const AIWeaknessCenter: React.FC = () => {
  const {
    subjects,
    tasks,
    exams,
    focusSessions,
    quizScores,
    addQuizScore,
    setActivePage,
    setQuizPreset,
    showToast,
  } = useStudyFlow();

  const [weaknessData, setWeaknessData] = useState<WeaknessAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "weak" | "developing" | "strong" | "unknown">("all");

  const [thresholds, setThresholds] = useState<MasteryThresholds>({
    weakMax: 50,
    strongMin: 75,
  });
  const [showThresholdConfig, setShowThresholdConfig] = useState(false);

  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [quizSubjectId, setQuizSubjectId] = useState(subjects[0]?.id || "");
  const [quizTopic, setQuizTopic] = useState("");
  const [quizScoreVal, setQuizScoreVal] = useState<number>(65);

  const fetchAnalysis = async (customThresholds?: MasteryThresholds) => {
    setLoading(true);
    try {
      const activeThresholds = customThresholds || thresholds;
      const res = await aiService.analyzeWeakness(
        {
          subjects,
          tasks,
          exams,
          focusSessions,
          quizScores,
        },
        activeThresholds
      );
      setWeaknessData(res);
    } catch (e) {
      console.error("StudyPilot weakness analysis error:", e);
      showToast("Unable to complete weakness analysis", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, [subjects, tasks, exams, focusSessions, quizScores]);

  const handleApplyThresholds = () => {
    fetchAnalysis(thresholds);
    setShowThresholdConfig(false);
    showToast(
      `Mastery thresholds updated: Weak <${thresholds.weakMax}%, Strong >=${thresholds.strongMin}%`
    );
  };

  const handleResetThresholds = () => {
    const defaultThresh = { weakMax: 50, strongMin: 75 };
    setThresholds(defaultThresh);
    fetchAnalysis(defaultThresh);
    setShowThresholdConfig(false);
    showToast("Mastery thresholds reset to defaults (50% / 75%)");
  };

  const handleSaveQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quizTopic.trim()) {
      showToast("Please enter a topic name", "error");
      return;
    }

    const sub = subjects.find((s) => s.id === quizSubjectId) || subjects[0];
    if (!sub) {
      showToast("Please add at least one course first", "error");
      return;
    }

    addQuizScore({
      subjectId: sub.id,
      subjectName: sub.name,
      topic: quizTopic.trim(),
      score: Math.max(0, Math.min(100, Number(quizScoreVal))),
      date: new Date().toISOString().split("T")[0],
    });

    setIsQuizModalOpen(false);
    setQuizTopic("");
    setQuizScoreVal(65);
    showToast(`Logged quiz score (${quizScoreVal}%) for ${quizTopic}.`);
  };

  const handleStartDiagnosticQuiz = (topic: WeakTopicItem) => {
    if (setQuizPreset) {
      setQuizPreset({
        subjectId: topic.subjectId,
        topic: topic.topic,
      });
    }
    setActivePage("quizzes");
    showToast(`Launching diagnostic quiz for '${topic.topic}'`);
  };

  const handleLogScoreForTopic = (topic: WeakTopicItem) => {
    setQuizSubjectId(topic.subjectId);
    setQuizTopic(topic.topic);
    setQuizScoreVal(topic.quizScore ?? 60);
    setIsQuizModalOpen(true);
  };

  const filteredTopics = (weaknessData?.topics || []).filter((t) => {
    if (filter === "all") return true;
    return t.masteryClassification === filter;
  });

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-[#21201C] p-5 sm:p-6 rounded-xl border border-[#E9E5DE] dark:border-[#32302B] space-y-4 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#78736A] dark:text-[#A6A096]">
                DIAGNOSTIC LEDGER
              </span>
              <span className="text-[#C8C2B6] dark:text-[#47443D]" aria-hidden="true">
                ·
              </span>
              <KickerPill variant="amber">WEAKNESS ENGINE</KickerPill>
              <span className="px-2 py-0.5 rounded bg-[#EDF5F0] dark:bg-[#1C3326] border border-[#CFE3D6] dark:border-[#2B4E3A] font-mono text-[10px] font-medium text-[#3B7A57] dark:text-[#68B088]">
                {weaknessData?.summary?.isFallback ? "Local Fallback" : "Live Backend"}
              </span>
            </div>
            <h3 className="font-editorial text-lg font-bold text-[#22211F] dark:text-[#F5F3EE]">
              StudyPilot AI Weakness Detection Engine
            </h3>
            <p className="text-xs text-[#78736A] dark:text-[#A6A096] mt-0.5">
              Explainable mastery classification using measured quiz scores and upcoming exam deadlines.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <SecondaryButton onClick={() => setShowThresholdConfig(!showThresholdConfig)}>
              <Sliders className="w-3.5 h-3.5 text-[#D58A2A]" />
              <span>Thresholds</span>
            </SecondaryButton>
            <PrimaryButton onClick={() => setIsQuizModalOpen(true)}>
              <Plus className="w-3.5 h-3.5" />
              <span>Record Quiz Score</span>
            </PrimaryButton>
            <button
              onClick={() => fetchAnalysis()}
              disabled={loading}
              className="p-2 rounded-lg border border-[#E9E5DE] dark:border-[#32302B] hover:bg-[#FAF8F4] dark:hover:bg-[#2A2823] text-[#78736A] hover:text-[#22211F] dark:hover:text-[#F5F3EE] transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh Analysis"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {showThresholdConfig && (
          <div className="p-4 rounded-xl bg-[#FAF8F4] dark:bg-[#1B1A17] border border-[#E9E5DE] dark:border-[#32302B] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[#22211F] dark:text-[#F5F3EE] flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[#D58A2A]" />
                Configurable Mastery Thresholds
              </span>
              <button
                onClick={handleResetThresholds}
                className="text-[11px] text-[#78736A] hover:text-[#22211F] dark:hover:text-[#F5F3EE] underline cursor-pointer"
              >
                Reset to Standard (50% / 75%)
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <div className="flex justify-between font-medium text-[#22211F] dark:text-[#F5F3EE] mb-1">
                  <span>Weak Boundary (Score &lt; X%):</span>
                  <span className="font-mono font-bold text-[#A83838] dark:text-[#E57373]">
                    {thresholds.weakMax}%
                  </span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="65"
                  value={thresholds.weakMax}
                  onChange={(e) =>
                    setThresholds({ ...thresholds, weakMax: Number(e.target.value) })
                  }
                  className="w-full accent-[#A83838] cursor-pointer"
                />
                <p className="text-[10px] text-[#9A948A] mt-0.5">
                  Scores strictly below this value are classified as Weak.
                </p>
              </div>

              <div>
                <div className="flex justify-between font-medium text-[#22211F] dark:text-[#F5F3EE] mb-1">
                  <span>Strong Boundary (Score ≥ Y%):</span>
                  <span className="font-mono font-bold text-[#3B7A57] dark:text-[#68B088]">
                    {thresholds.strongMin}%
                  </span>
                </div>
                <input
                  type="range"
                  min="65"
                  max="90"
                  value={thresholds.strongMin}
                  onChange={(e) =>
                    setThresholds({ ...thresholds, strongMin: Number(e.target.value) })
                  }
                  className="w-full accent-[#3B7A57] cursor-pointer"
                />
                <p className="text-[10px] text-[#9A948A] mt-0.5">
                  Scores at or above this value are classified as Strong.
                </p>
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <PrimaryButton onClick={handleApplyThresholds}>
                Apply &amp; Recalculate
              </PrimaryButton>
            </div>
          </div>
        )}

        {weaknessData?.summary?.aiDiagnostic && (
          <div className="p-3.5 rounded-xl bg-[#FAF8F4] dark:bg-[#1B1A17] border border-[#E9E5DE] dark:border-[#32302B] text-xs text-[#68635B] dark:text-[#C8C2B6] flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-[#D58A2A] shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-[#22211F] dark:text-[#F5F3EE]">
                StudyPilot Diagnostic:{" "}
              </span>
              <span>{weaknessData.summary.aiDiagnostic}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          <div
            onClick={() => setFilter(filter === "weak" ? "all" : "weak")}
            className={`p-3.5 rounded-xl border transition-colors cursor-pointer ${
              filter === "weak"
                ? "bg-[#FDF2F2] dark:bg-[#3A1E1E] border-[#A83838]"
                : "bg-[#FAF8F4] dark:bg-[#1B1A17] border-[#E9E5DE] dark:border-[#32302B] hover:border-[#F3D2D2]"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#22211F] dark:text-[#F5F3EE] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#A83838]" />
                Weak (&lt;{weaknessData?.summary.thresholdsUsed.weakMax ?? 50}%)
              </span>
              <span className="text-lg font-mono font-bold text-[#A83838] dark:text-[#E57373] tabular-nums">
                {weaknessData?.summary.weakCount ?? 0}
              </span>
            </div>
            <p className="text-[11px] text-[#78736A] dark:text-[#A6A096] mt-1">
              High priority for revision
            </p>
          </div>

          <div
            onClick={() => setFilter(filter === "developing" ? "all" : "developing")}
            className={`p-3.5 rounded-xl border transition-colors cursor-pointer ${
              filter === "developing"
                ? "bg-[#FAF1E3] dark:bg-[#3A2C16] border-[#D58A2A]"
                : "bg-[#FAF8F4] dark:bg-[#1B1A17] border-[#E9E5DE] dark:border-[#32302B] hover:border-[#F0DFC2]"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#22211F] dark:text-[#F5F3EE] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#D58A2A]" />
                Developing
              </span>
              <span className="text-lg font-mono font-bold text-[#B46914] dark:text-[#E0983B] tabular-nums">
                {weaknessData?.summary.developingCount ?? 0}
              </span>
            </div>
            <p className="text-[11px] text-[#78736A] dark:text-[#A6A096] mt-1">
              Needs practice to reach mastery
            </p>
          </div>

          <div
            onClick={() => setFilter(filter === "strong" ? "all" : "strong")}
            className={`p-3.5 rounded-xl border transition-colors cursor-pointer ${
              filter === "strong"
                ? "bg-[#EDF5F0] dark:bg-[#1C3326] border-[#3B7A57]"
                : "bg-[#FAF8F4] dark:bg-[#1B1A17] border-[#E9E5DE] dark:border-[#32302B] hover:border-[#CFE3D6]"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#22211F] dark:text-[#F5F3EE] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#3B7A57]" />
                Strong (≥{weaknessData?.summary.thresholdsUsed.strongMin ?? 75}%)
              </span>
              <span className="text-lg font-mono font-bold text-[#3B7A57] dark:text-[#68B088] tabular-nums">
                {weaknessData?.summary.strongCount ?? 0}
              </span>
            </div>
            <p className="text-[11px] text-[#78736A] dark:text-[#A6A096] mt-1">
              Light spaced review only
            </p>
          </div>

          <div
            onClick={() => setFilter(filter === "unknown" ? "all" : "unknown")}
            className={`p-3.5 rounded-xl border transition-colors cursor-pointer ${
              filter === "unknown"
                ? "bg-[#EFECE6] dark:bg-[#2A2823] border-[#78736A]"
                : "bg-[#FAF8F4] dark:bg-[#1B1A17] border-[#E9E5DE] dark:border-[#32302B] hover:border-[#D7D1C7]"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#22211F] dark:text-[#F5F3EE] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#9A948A]" />
                Needs Quiz
              </span>
              <span className="text-lg font-mono font-bold text-[#78736A] dark:text-[#A6A096] tabular-nums">
                {weaknessData?.summary.unknownCount ?? 0}
              </span>
            </div>
            <p className="text-[11px] text-[#78736A] dark:text-[#A6A096] mt-1">
              Awaiting diagnostic test
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className="font-editorial text-base font-bold text-[#22211F] dark:text-[#F5F3EE]">
              Evaluated Topics ({filteredTopics.length})
            </h4>
            {filter !== "all" && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F5F2EC] dark:bg-[#2A2823] border border-[#E9E5DE] dark:border-[#32302B] text-[#78736A] dark:text-[#A6A096]">
                FILTER: {filter.toUpperCase()}
              </span>
            )}
          </div>
          {filter !== "all" && (
            <button
              onClick={() => setFilter("all")}
              className="text-xs text-[#B46914] dark:text-[#E0983B] hover:underline font-medium cursor-pointer"
            >
              Show All Topics
            </button>
          )}
        </div>

        {(!subjects || subjects.length === 0) && (
          <div className="p-10 text-center rounded-xl border border-[#E9E5DE] dark:border-[#32302B] bg-white dark:bg-[#21201C]">
            <div className="w-11 h-11 mx-auto rounded-xl bg-[#FAF1E3] dark:bg-[#3A2C16] border border-[#F0DFC2] dark:border-[#523E20] text-[#D58A2A] flex items-center justify-center mb-3">
              <Layers className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-semibold text-[#22211F] dark:text-[#F5F3EE]">
              No Courses Registered
            </h4>
            <p className="text-xs text-[#78736A] dark:text-[#A6A096] max-w-md mx-auto mt-1 mb-4">
              Add your university courses and syllabus topics to enable StudyPilot&apos;s AI Weakness Detection Engine.
            </p>
            <PrimaryButton onClick={() => setActivePage("subjects")}>
              <Plus className="w-3.5 h-3.5" />
              <span>Add Your First Course</span>
            </PrimaryButton>
          </div>
        )}

        {subjects.length > 0 && filteredTopics.length === 0 && (
          <div className="p-8 text-center rounded-xl border border-[#E9E5DE] dark:border-[#32302B] bg-white dark:bg-[#21201C]">
            <CheckCircle2 className="w-7 h-7 mx-auto text-[#3B7A57] mb-2" />
            <p className="text-xs font-semibold text-[#22211F] dark:text-[#F5F3EE]">
              No topics found under filter &apos;{filter.toUpperCase()}&apos;.
            </p>
            <button
              onClick={() => setFilter("all")}
              className="mt-3 text-xs text-[#B46914] dark:text-[#E0983B] font-medium hover:underline cursor-pointer"
            >
              Clear filter to view all topics
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTopics.map((topic) => {
            const hasQuiz = topic.evidenceSource === "measured_quiz";

            return (
              <div
                key={topic.id}
                className="p-4 sm:p-5 rounded-xl border border-[#E9E5DE] dark:border-[#32302B] bg-white dark:bg-[#21201C] flex flex-col justify-between transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-[#22211F] dark:text-[#F5F3EE]">
                          {topic.symbol} {topic.topic}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${
                            topic.masteryClassification === "weak"
                              ? "bg-[#FDF2F2] dark:bg-[#3A1E1E] text-[#A83838] dark:text-[#E57373] border-[#F3D2D2] dark:border-[#572B2B]"
                              : topic.masteryClassification === "developing"
                              ? "bg-[#FAF1E3] dark:bg-[#3A2C16] text-[#B46914] dark:text-[#E0983B] border-[#F0DFC2] dark:border-[#523E20]"
                              : topic.masteryClassification === "strong"
                              ? "bg-[#EDF5F0] dark:bg-[#1C3326] text-[#3B7A57] dark:text-[#68B088] border-[#CFE3D6] dark:border-[#2B4E3A]"
                              : "bg-[#F5F2EC] dark:bg-[#2A2823] text-[#78736A] dark:text-[#A6A096] border-[#E9E5DE] dark:border-[#32302B]"
                          }`}
                        >
                          {topic.label}
                        </span>
                        {topic.revisionPriority === "high" && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#FDF2F2] dark:bg-[#3A1E1E] text-[#A83838] dark:text-[#E57373] flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Urgent Revision
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#78736A] dark:text-[#A6A096]">
                        {topic.subjectName}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      {hasQuiz ? (
                        <>
                          <span className="text-base font-mono font-bold text-[#22211F] dark:text-[#F5F3EE] tabular-nums">
                            {topic.score}%
                          </span>
                          <p className="text-[10px] text-[#9A948A]">Measured Quiz</p>
                        </>
                      ) : (
                        <>
                          <span className="text-xs font-semibold text-[#9A948A] italic">
                            Unmeasured
                          </span>
                          <p className="text-[10px] text-[#9A948A]">No Quiz Taken</p>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center gap-2 flex-wrap text-[11px]">
                    <span className="text-[#78736A] dark:text-[#A6A096]">Evidence:</span>
                    {hasQuiz ? (
                      <span className="px-2 py-0.5 rounded bg-[#FAF1E3] dark:bg-[#3A2C16] text-[#B46914] dark:text-[#E0983B] font-medium">
                        Measured Quiz ({topic.attemptCount} attempt
                        {topic.attemptCount === 1 ? "" : "s"})
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-[#F5F2EC] dark:bg-[#2A2823] text-[#78736A] dark:text-[#A6A096] font-medium">
                        Insufficient Data (Needs Quiz)
                      </span>
                    )}

                    {topic.confidence !== "insufficient_data" && (
                      <span className="text-[10px] text-[#9A948A]">
                        · {topic.confidence === "high" ? "High Confidence" : "Medium Confidence"}
                      </span>
                    )}

                    {topic.daysToExam !== null && (
                      <span className="text-[10px] text-[#B46914] dark:text-[#E0983B] font-mono font-medium">
                        · Exam in {topic.daysToExam}d
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[#68635B] dark:text-[#C8C2B6] mt-2 leading-relaxed">
                    {topic.explanation}
                  </p>

                  <div className="mt-3 p-2.5 rounded-lg bg-[#FAF8F4] dark:bg-[#1B1A17] border border-[#EFECE6] dark:border-[#2E2C27] text-[11px] text-[#68635B] dark:text-[#A6A096]">
                    <span className="font-semibold text-[#22211F] dark:text-[#F5F3EE]">
                      Recommended Action:{" "}
                    </span>
                    {topic.recommendedAction}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#EFECE6] dark:border-[#32302B] flex items-center justify-between gap-2 flex-wrap text-xs">
                  <button
                    onClick={() => handleLogScoreForTopic(topic)}
                    className="text-[11px] text-[#B46914] dark:text-[#E0983B] hover:underline font-medium cursor-pointer"
                  >
                    Log Test Score
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleStartDiagnosticQuiz(topic)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#E9E5DE] dark:border-[#32302B] text-[#22211F] dark:text-[#F5F3EE] hover:bg-[#FAF8F4] dark:hover:bg-[#2A2823] text-xs font-medium transition-colors cursor-pointer"
                    >
                      <FileQuestion className="w-3.5 h-3.5 text-[#D58A2A]" />
                      <span>Take Quiz</span>
                    </button>
                    <button
                      onClick={() => setActivePage("focus")}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#22211F] hover:bg-[#363430] dark:bg-[#F5F3EE] dark:hover:bg-[#E6E2DA] text-white dark:text-[#1C1B18] text-xs font-medium transition-colors cursor-pointer"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Focus</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {isQuizModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#22211F]/45 dark:bg-black/65 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#21201C] rounded-xl max-w-md w-full p-6 shadow-xl border border-[#E9E5DE] dark:border-[#32302B] transition-colors">
            <h3 className="font-editorial text-lg font-bold text-[#22211F] dark:text-[#F5F3EE]">
              Record Measured Quiz Score
            </h3>
            <p className="text-xs text-[#78736A] dark:text-[#A6A096] mt-0.5">
              Enter your midterm, class test, or quiz score to calibrate weakness detection.
            </p>

            <form onSubmit={handleSaveQuiz} className="mt-4 space-y-4">
              <div>
                <label className="block text-[10px] font-mono font-semibold uppercase tracking-[0.14em] text-[#78736A] dark:text-[#A6A096] mb-1">
                  Course
                </label>
                <select
                  value={quizSubjectId}
                  onChange={(e) => setQuizSubjectId(e.target.value)}
                  className="w-full text-xs rounded-lg border border-[#E9E5DE] dark:border-[#32302B] px-3 py-2 text-[#22211F] dark:text-[#F5F3EE] bg-[#FAF8F4] dark:bg-[#1B1A17] outline-hidden"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono font-semibold uppercase tracking-[0.14em] text-[#78736A] dark:text-[#A6A096] mb-1">
                  Topic Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Binary Search Trees, Normalization"
                  value={quizTopic}
                  onChange={(e) => setQuizTopic(e.target.value)}
                  className="w-full text-xs rounded-lg border border-[#E9E5DE] dark:border-[#32302B] px-3 py-2 text-[#22211F] dark:text-[#F5F3EE] bg-[#FAF8F4] dark:bg-[#1B1A17] placeholder:text-[#9A948A] outline-hidden focus:border-[#D58A2A]"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-mono font-semibold uppercase tracking-[0.14em] text-[#78736A] dark:text-[#A6A096]">
                    Measured Score
                  </label>
                  <span className="text-xs font-mono font-bold text-[#B46914] dark:text-[#E0983B]">
                    {quizScoreVal}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={quizScoreVal}
                  onChange={(e) => setQuizScoreVal(Number(e.target.value))}
                  className="w-full accent-[#D58A2A] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-[#9A948A] mt-0.5">
                  <span>0% (Weak)</span>
                  <span>50%</span>
                  <span>75% (Strong)</span>
                  <span>100%</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <SecondaryButton type="button" onClick={() => setIsQuizModalOpen(false)}>
                  Cancel
                </SecondaryButton>
                <PrimaryButton type="submit">Save &amp; Update AI</PrimaryButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
