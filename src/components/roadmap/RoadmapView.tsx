import React, { useState, useEffect, useRef } from "react";
import {
  Route,
  CheckCircle2,
  Circle,
  HelpCircle,
  Timer,
  RefreshCw,
  Layers,
  ChevronDown,
  ChevronUp,
  Network,
  Clock,
  Compass,
  X,
} from "lucide-react";
import { useStudyFlow } from "../../context/StudyFlowContext";
import { useAuth } from "../../context/AuthContext";
import { aiService } from "../../services/aiService";
import { LearningRoadmap } from "../../types";
import { RoadmapFlowchart } from "./RoadmapFlowchart";
import { CARD_SURFACE, KickerPill, PageHeader, Tabs } from "../common/ui";

const QUICK_TOPICS = [
  { name: "Python", label: "Python" },
  { name: "Machine Learning", label: "Machine Learning" },
  { name: "Data Structures & Algorithms", label: "DSA & Algorithms" },
  { name: "React & Next.js", label: "React & Next.js" },
  { name: "SQL & Databases", label: "SQL & Databases" },
  { name: "DevOps & Docker", label: "DevOps & Docker" },
];

export const RoadmapView: React.FC = () => {
  const { setActivePage, setQuizPreset, showToast } = useStudyFlow();
<<<<<<< HEAD
  const { currentUser, isAuthReady, getIdToken } = useAuth();
=======
  const { currentUser, isAuthReady } = useAuth();
>>>>>>> 9d281b97efabd4f9d488c8bc37687c9b1dfe9f78
  const activeUserKey = currentUser?.id || "guest";

  const [inputTopic, setInputTopic] = useState("");
  const [targetLevel, setTargetLevel] = useState("Beginner to Advanced");
  const [weeklyHours] = useState(10);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  // View Mode: visual (diagram flowchart) vs list (modules breakdown)
  const [viewMode, setViewMode] = useState<"visual" | "list">("visual");

<<<<<<< HEAD
  // Saved roadmaps collection & completed topic IDs (persisted in Cloud SQL)
=======
  // Saved roadmaps collection & completed topic IDs (persisted on Express server)
>>>>>>> 9d281b97efabd4f9d488c8bc37687c9b1dfe9f78
  const [savedRoadmaps, setSavedRoadmaps] = useState<LearningRoadmap[]>([]);
  const [currentRoadmap, setCurrentRoadmap] = useState<LearningRoadmap | null>(null);
  const [completedTopicIds, setCompletedTopicIds] = useState<Record<string, boolean>>({});

  // Collapsed phases state for list view
  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>({
    "phase-1": true,
    "phase-2": true,
    "phase-3": true,
    "phase-4": true,
  });

  const hydratedUserKeyRef = useRef<string | null>(null);
  const lastSavedSnapshotRef = useRef<string>("");

  // Hydrate saved roadmaps & completion state from Express backend
  useEffect(() => {
    if (!isAuthReady) return;
    let cancelled = false;
    hydratedUserKeyRef.current = null;

<<<<<<< HEAD
    if (!currentUser) {
      hydratedUserKeyRef.current = "guest";
      if (savedRoadmaps.length === 0) {
        handleGenerateRoadmap("Python");
      }
      return;
    }

    (async () => {
      try {
        const token = await getIdToken();
        if (!token) {
          hydratedUserKeyRef.current = activeUserKey;
          return;
        }
        const res = await fetch("/api/roadmaps", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
=======
    (async () => {
      try {
        const res = await fetch("/api/roadmaps", { credentials: "include" });
>>>>>>> 9d281b97efabd4f9d488c8bc37687c9b1dfe9f78
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;

        const loadedRoadmaps: LearningRoadmap[] = Array.isArray(data.savedRoadmaps)
          ? data.savedRoadmaps
          : [];
        const loadedCompleted: Record<string, boolean> =
          data.completedTopicIds && typeof data.completedTopicIds === "object"
            ? data.completedTopicIds
            : {};

        lastSavedSnapshotRef.current = JSON.stringify({
          savedRoadmaps: loadedRoadmaps,
          completedTopicIds: loadedCompleted,
        });
        hydratedUserKeyRef.current = activeUserKey;

        setSavedRoadmaps(loadedRoadmaps);
        setCompletedTopicIds(loadedCompleted);

        if (loadedRoadmaps.length > 0) {
          setCurrentRoadmap(loadedRoadmaps[0]);
        } else {
          handleGenerateRoadmap("Python");
        }
      } catch (err) {
        console.error("[StudyPilot] Failed to load roadmaps from server:", err);
        hydratedUserKeyRef.current = activeUserKey;
        handleGenerateRoadmap("Python");
      }
    })();

    return () => {
      cancelled = true;
    };
<<<<<<< HEAD
  }, [isAuthReady, activeUserKey, currentUser, getIdToken]);

  // Persist roadmaps and completed topics to Express backend
  useEffect(() => {
    if (!isAuthReady || !currentUser || hydratedUserKeyRef.current !== activeUserKey) return;
=======
  }, [isAuthReady, activeUserKey]);

  // Persist roadmaps and completed topics to Express backend
  useEffect(() => {
    if (!isAuthReady || hydratedUserKeyRef.current !== activeUserKey) return;
>>>>>>> 9d281b97efabd4f9d488c8bc37687c9b1dfe9f78
    const payload = JSON.stringify({ savedRoadmaps, completedTopicIds });
    if (payload === lastSavedSnapshotRef.current) return;

    const timer = setTimeout(async () => {
      try {
<<<<<<< HEAD
        const token = await getIdToken();
        if (!token) return;
        const res = await fetch("/api/roadmaps", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
=======
        const res = await fetch("/api/roadmaps", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
>>>>>>> 9d281b97efabd4f9d488c8bc37687c9b1dfe9f78
          body: payload,
        });
        if (res.ok) {
          lastSavedSnapshotRef.current = payload;
        }
      } catch (err) {
        console.error("[StudyPilot] Failed to save roadmaps to server:", err);
      }
    }, 250);

    return () => clearTimeout(timer);
<<<<<<< HEAD
  }, [isAuthReady, currentUser, activeUserKey, getIdToken, savedRoadmaps, completedTopicIds]);
=======
  }, [isAuthReady, activeUserKey, savedRoadmaps, completedTopicIds]);
>>>>>>> 9d281b97efabd4f9d488c8bc37687c9b1dfe9f78

  const handleGenerateRoadmap = async (topicToGen?: string) => {
    const topic = (topicToGen || inputTopic || "Python").trim();
    if (!topic) {
      showToast("Please enter a skill or subject to learn", "error");
      return;
    }

    setLoading(true);
    setLoadingStep(1);

    const stepInterval = setInterval(() => {
      setLoadingStep((prev) => (prev < 4 ? prev + 1 : prev));
    }, 800);

    try {
      const roadmap = await aiService.generateRoadmap(topic, targetLevel, weeklyHours);
      clearInterval(stepInterval);

      setCurrentRoadmap(roadmap);

      setSavedRoadmaps((prev) => {
        const filtered = prev.filter((r) => r.topic.toLowerCase() !== roadmap.topic.toLowerCase());
        return [roadmap, ...filtered];
      });

      const exp: Record<string, boolean> = {};
      roadmap.phases.forEach((p) => {
        exp[p.id] = true;
      });
      setExpandedPhases(exp);

      showToast(`Study roadmap for ${roadmap.topic} generated!`, "success");
    } catch (err) {
      clearInterval(stepInterval);
      console.error("Roadmap generation error:", err);
      showToast("Could not generate roadmap. Please try again.", "error");
    } finally {
      setLoading(false);
      setLoadingStep(0);
    }
  };

  const toggleTopicCompletion = (topicId: string) => {
    setCompletedTopicIds((prev) => ({
      ...prev,
      [topicId]: !prev[topicId],
    }));
  };

  const togglePhaseExpansion = (phaseId: string) => {
    setExpandedPhases((prev) => ({
      ...prev,
      [phaseId]: !prev[phaseId],
    }));
  };

  const handleStartQuizForTopic = (topicTitle: string) => {
    setQuizPreset({ topic: topicTitle });
    setActivePage("quizzes");
    showToast(`Loading practice quiz on "${topicTitle}"`, "info");
  };

  const totalTopicsCount = currentRoadmap
    ? currentRoadmap.phases.reduce((acc, p) => acc + p.topics.length, 0)
    : 0;

  const completedCount = currentRoadmap
    ? currentRoadmap.phases.reduce(
        (acc, p) => acc + p.topics.filter((t) => completedTopicIds[t.id]).length,
        0
      )
    : 0;

  const progressPercentage = totalTopicsCount > 0 ? Math.round((completedCount / totalTopicsCount) * 100) : 0;

  const loadingMessages = [
    "Analyzing subject prerequisites & domain scope...",
    "Structuring modular phases from basic to advanced...",
    "Curating hands-on projects & key concepts...",
    "Finalizing your personalized study roadmap...",
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <PageHeader
        kicker="CURRICULUM ARCHITECTURE"
        pill="STUDY AIDS"
        pillTone="amber"
        title="Study Roadmap"
        subtitle="Generate an end-to-end learning path for any skill or academic subject, from foundations to mastery."
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Tabs
              value={viewMode}
              onChange={setViewMode}
              options={[
                {
                  id: "visual",
                  label: "Flowchart View",
                  icon: <Network className="w-3.5 h-3.5" />,
                },
                {
                  id: "list",
                  label: "Curriculum Guide",
                  icon: <Layers className="w-3.5 h-3.5" />,
                },
              ]}
            />

            {savedRoadmaps.length > 1 && (
              <select
                value={currentRoadmap?.id || ""}
                onChange={(e) => {
                  const found = savedRoadmaps.find((r) => r.id === e.target.value);
                  if (found) setCurrentRoadmap(found);
                }}
                className="text-xs font-medium px-3 py-2 rounded-lg bg-[#FAF8F4] dark:bg-[#1B1A17] border border-[#E2DDD4] dark:border-[#3A3731] text-[#22211F] dark:text-[#F5F3EE] outline-hidden focus:border-[#D58A2A]"
              >
                {savedRoadmaps.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.topic}
                  </option>
                ))}
              </select>
            )}
          </div>
        }
      />

      {/* Generator Dispatch Banner (Charcoal Espresso Editorial Panel) */}
      <div className="bg-[#22211F] dark:bg-[#1C1B18] text-[#FAF9F6] p-6 sm:p-7 rounded-xl border border-[#32302B]">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#3A2C16] border border-[#6D5229] text-[10px] font-mono font-semibold uppercase tracking-[0.1em] text-[#F0B35E]">
            <Compass className="w-3.5 h-3.5" />
            <span>AI Curriculum Architect</span>
          </div>

          <h2 className="font-editorial text-xl sm:text-2xl font-semibold text-white leading-snug">
            What skill or subject do you want to master?
          </h2>
          <p className="text-xs sm:text-[13px] text-[#C5BFB5] max-w-2xl leading-relaxed">
            Enter <strong className="text-white">&ldquo;Python&rdquo;</strong>,{" "}
            <strong className="text-white">&ldquo;Machine Learning&rdquo;</strong>, or any curriculum area to generate a structured milestone sequence.
          </p>

          {/* Search Bar Input */}
          <div className="pt-1 flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <input
                id="roadmap-topic-input"
                type="text"
                placeholder="e.g. Python, Machine Learning, Operating Systems, System Design..."
                value={inputTopic}
                onChange={(e) => setInputTopic(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !loading) {
                    handleGenerateRoadmap();
                  }
                }}
                className="w-full pl-3.5 pr-9 py-2.5 bg-[#2B2926] border border-[#423F39] rounded-lg text-xs text-white placeholder:text-[#8E887E] focus:border-[#D58A2A] outline-hidden font-medium transition-colors"
              />
              {inputTopic && (
                <button
                  type="button"
                  onClick={() => setInputTopic("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8E887E] hover:text-white cursor-pointer"
                  aria-label="Clear topic"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <select
                value={targetLevel}
                onChange={(e) => setTargetLevel(e.target.value)}
                className="px-3 py-2.5 bg-[#2B2926] border border-[#423F39] rounded-lg text-xs font-medium text-[#FAF9F6] outline-hidden cursor-pointer hover:border-[#6D685E]"
              >
                <option value="Beginner to Advanced" className="text-[#22211F] bg-white">
                  Beginner to Advanced
                </option>
                <option value="Zero to Hero (Industry-Ready)" className="text-[#22211F] bg-white">
                  Zero to Hero
                </option>
                <option value="Fast Track" className="text-[#22211F] bg-white">
                  Fast Track
                </option>
              </select>

              <button
                id="generate-roadmap-btn"
                onClick={() => handleGenerateRoadmap()}
                disabled={loading}
                className="px-5 py-2.5 rounded-lg bg-[#D58A2A] hover:bg-[#C0781E] text-[#1C1B18] font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 shrink-0"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Route className="w-3.5 h-3.5" />
                    <span>Generate Roadmap</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Topic Suggestions */}
          <div className="pt-1 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[10px] font-mono uppercase tracking-[0.1em] text-[#8E887E] mr-1">
              Popular:
            </span>
            {QUICK_TOPICS.map((t) => (
              <button
                key={t.name}
                type="button"
                onClick={() => {
                  setInputTopic(t.name);
                  handleGenerateRoadmap(t.name);
                }}
                className="px-2.5 py-1 rounded bg-[#2B2926] hover:bg-[#3A2C16] hover:border-[#D58A2A] border border-[#3E3B35] text-[11px] font-medium text-[#E5E0D5] transition-colors cursor-pointer"
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className={`${CARD_SURFACE} p-8 text-center space-y-4`}>
          <div className="w-12 h-12 rounded-xl bg-[#FAF1E3] dark:bg-[#3A2C16] border border-[#F0DFC2] dark:border-[#523E20] text-[#D58A2A] dark:text-[#E0983B] mx-auto flex items-center justify-center">
            <RefreshCw className="w-5 h-5 animate-spin" />
          </div>
          <div>
            <h4 className="font-editorial text-lg font-semibold text-[#22211F] dark:text-[#F5F3EE]">
              Architecting {inputTopic || "Python"} Roadmap...
            </h4>
            <p className="text-xs text-[#B46914] dark:text-[#E0983B] mt-1 font-medium">
              {loadingMessages[loadingStep - 1] || "Building roadmap..."}
            </p>
          </div>
          <div className="w-64 h-1.5 bg-[#EFECE6] dark:bg-[#2C2A25] rounded-full mx-auto overflow-hidden">
            <div
              className="h-full bg-[#D58A2A] dark:bg-[#E0983B] rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, loadingStep * 25)}%` }}
            />
          </div>
        </div>
      )}

      {/* Main Roadmap Content Display */}
      {!loading && currentRoadmap && (
        <div className="space-y-6">
          {/* Progress & Overview Bar */}
          <div className={`${CARD_SURFACE} p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4`}>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-editorial font-semibold text-base text-[#22211F] dark:text-[#F5F3EE]">
                  {currentRoadmap.topic} Learning Path
                </h3>
                <KickerPill tone="amber" dashed={false}>
                  {currentRoadmap.targetLevel}
                </KickerPill>
              </div>
              <p className="text-xs text-[#78736A] dark:text-[#A6A096] line-clamp-1 max-w-2xl">
                {currentRoadmap.overview}
              </p>
            </div>

            {/* Progress Stats */}
            <div className="flex items-center gap-4 w-full sm:w-auto shrink-0 justify-between sm:justify-end">
              <div className="flex items-center gap-3">
                <div className="text-right font-mono tabular-nums">
                  <span className="text-xs font-semibold text-[#22211F] dark:text-[#F5F3EE] block">
                    {completedCount} / {totalTopicsCount} Topics
                  </span>
                  <span className="text-[10px] text-[#8E887E] dark:text-[#9A948A] block">
                    {progressPercentage}% Completed
                  </span>
                </div>
                <div className="w-24 h-1.5 bg-[#EFECE6] dark:bg-[#2C2A25] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#3B7A57] dark:bg-[#68B088] rounded-full transition-all duration-300"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>

              <div className="hidden md:flex items-center gap-1.5 text-[11px] font-mono font-medium px-3 py-1.5 rounded-lg bg-[#FAF8F4] dark:bg-[#1B1A17] border border-[#E9E5DE] dark:border-[#32302B] text-[#78736A] dark:text-[#A6A096] tabular-nums">
                <Clock className="w-3.5 h-3.5 text-[#D58A2A]" />
                <span>~{currentRoadmap.estimatedWeeks} Weeks</span>
              </div>
            </div>
          </div>

          {/* Main Visual Flowchart or Curriculum List */}
          <div>
            {viewMode === "visual" ? (
              <RoadmapFlowchart
                roadmap={currentRoadmap}
                completedTopicIds={completedTopicIds}
                onToggleTopic={toggleTopicCompletion}
                onSelectRoadmap={(name) => {
                  setInputTopic(name);
                  handleGenerateRoadmap(name);
                }}
              />
            ) : (
              <div className="space-y-5">
                <div className={`${CARD_SURFACE} p-5 sm:p-6 space-y-2`}>
                  <h3 className="font-editorial text-lg font-semibold text-[#22211F] dark:text-[#F5F3EE]">
                    {currentRoadmap.topic} Step-by-Step Curriculum
                  </h3>
                  <p className="text-xs text-[#78736A] dark:text-[#A6A096] leading-relaxed">
                    {currentRoadmap.overview}
                  </p>
                </div>

                <div className="space-y-4">
                  {currentRoadmap.phases.map((phase, pIdx) => {
                    const isExpanded = expandedPhases[phase.id] ?? true;

                    return (
                      <div key={phase.id} className={`${CARD_SURFACE} overflow-hidden`}>
                        <div
                          onClick={() => togglePhaseExpansion(phase.id)}
                          className="p-4 sm:p-5 bg-[#FAF8F4] dark:bg-[#1B1A17] border-b border-[#E9E5DE] dark:border-[#32302B] flex items-center justify-between cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-7 h-7 rounded-lg bg-[#22211F] dark:bg-[#F5F3EE] text-white dark:text-[#1C1B18] font-mono text-xs font-bold flex items-center justify-center tabular-nums">
                              {pIdx + 1}
                            </span>
                            <div>
                              <h4 className="font-editorial font-semibold text-base text-[#22211F] dark:text-[#F5F3EE]">
                                {phase.title}
                              </h4>
                              <span className="text-[11px] font-mono text-[#8E887E] dark:text-[#9A948A]">
                                {phase.durationEstimate} · {phase.level}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 font-mono text-xs text-[#78736A] dark:text-[#A6A096]">
                            <span className="tabular-nums font-semibold">
                              {phase.topics.filter((t) => completedTopicIds[t.id]).length}/{phase.topics.length}
                            </span>
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="p-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                              {phase.topics.map((topic) => {
                                const isDone = !!completedTopicIds[topic.id];

                                return (
                                  <div
                                    key={topic.id}
                                    className={`p-4 rounded-xl border transition-colors flex flex-col justify-between gap-3 ${
                                      isDone
                                        ? "bg-[#EDF5F0] dark:bg-[#1B2920] border-[#BCD8C7] dark:border-[#325E44]"
                                        : "bg-[#FBF9F5] dark:bg-[#1B1A17] border-[#E9E5DE] dark:border-[#32302B]"
                                    }`}
                                  >
                                    <div>
                                      <div className="flex items-start gap-2.5">
                                        <button
                                          onClick={() => toggleTopicCompletion(topic.id)}
                                          className="mt-0.5 text-[#8E887E] hover:text-[#3B7A57] cursor-pointer"
                                        >
                                          {isDone ? (
                                            <CheckCircle2 className="w-4 h-4 text-[#3B7A57] dark:text-[#68B088]" />
                                          ) : (
                                            <Circle className="w-4 h-4 text-[#C9C2B6] dark:text-[#58534B]" />
                                          )}
                                        </button>
                                        <div>
                                          <h5 className="font-semibold text-xs text-[#22211F] dark:text-[#F5F3EE]">
                                            {topic.title}
                                          </h5>
                                          <p className="text-[11px] text-[#78736A] dark:text-[#A6A096] mt-0.5 leading-relaxed">
                                            {topic.description}
                                          </p>
                                        </div>
                                      </div>

                                      {topic.keyConcepts && (
                                        <div className="mt-2.5 flex flex-wrap gap-1">
                                          {topic.keyConcepts.map((c, idx) => (
                                            <span
                                              key={idx}
                                              className="px-2 py-0.5 rounded bg-white dark:bg-[#21201C] text-[10px] font-medium text-[#57534E] dark:text-[#C5BFB5] border border-[#E2DDD4] dark:border-[#3A3731]"
                                            >
                                              {c}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>

                                    <div className="pt-2.5 border-t border-[#E9E5DE] dark:border-[#32302B] flex items-center justify-between">
                                      <button
                                        onClick={() => handleStartQuizForTopic(topic.title)}
                                        className="text-[11px] font-semibold text-[#B46914] dark:text-[#E0983B] hover:underline flex items-center gap-1 cursor-pointer"
                                      >
                                        <HelpCircle className="w-3.5 h-3.5" />
                                        <span>Recall Quiz</span>
                                      </button>
                                      <button
                                        onClick={() => {
                                          setActivePage("focus");
                                          showToast(`Focus session ready for "${topic.title}"`, "info");
                                        }}
                                        className="text-[11px] font-semibold text-[#57534E] dark:text-[#C5BFB5] hover:underline flex items-center gap-1 cursor-pointer"
                                      >
                                        <Timer className="w-3.5 h-3.5" />
                                        <span>Focus</span>
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
