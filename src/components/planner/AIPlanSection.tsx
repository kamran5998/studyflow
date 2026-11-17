import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Play,
  Clock,
  Calendar,
  Check,
  AlertTriangle,
  RefreshCw,
  Layers,
  BookOpen,
  Sliders,
  CheckCircle2,
  Coffee,
  RotateCcw,
} from "lucide-react";
import { useStudyFlow } from "../../context/StudyFlowContext";
import { aiService } from "../../services/aiService";
import { AIStudyBlock, SchedulingWeights } from "../../types";
import { EmptyState } from "../common/EmptyState";
import { KickerPill, PrimaryButton } from "../common/ui";

export const AIPlanSection: React.FC = () => {
  const {
    subjects,
    tasks,
    assignments = [],
    exams,
    focusSessions,
    quizScores,
    syncPlannedBlocks,
    activeStudyPlan,
    setActiveStudyPlan,
    addTask,
    setActivePage,
    showToast,
  } = useStudyFlow();

  const plan = activeStudyPlan;
  const [availableHours, setAvailableHours] = useState<number>(
    () => activeStudyPlan?.availableStudyHours || 3.0
  );
  const [startTime, setStartTime] = useState<string>(
    () => activeStudyPlan?.blocks?.[0]?.startTime || "02:00 PM"
  );
  const [loading, setLoading] = useState(false);
  const [adopted, setAdopted] = useState(false);
  const [pendingOverwrite, setPendingOverwrite] = useState<{
    label: string;
    execute: () => void;
  } | null>(null);

  const [weights, setWeights] = useState<SchedulingWeights>(() => ({
    topicWeaknessWeight: activeStudyPlan?.weightsUsed?.topicWeaknessWeight ?? 0.35,
    examUrgencyWeight: activeStudyPlan?.weightsUsed?.examUrgencyWeight ?? 0.3,
    deadlineUrgencyWeight: activeStudyPlan?.weightsUsed?.deadlineUrgencyWeight ?? 0.2,
    taskImportanceWeight: activeStudyPlan?.weightsUsed?.taskImportanceWeight ?? 0.15,
  }));
  const [showWeightsConfig, setShowWeightsConfig] = useState(false);
  const [previouslyMissedTopics, setPreviouslyMissedTopics] = useState<string[]>([]);

  const hasProtectedProgress = Boolean(
    plan &&
      plan.blocks &&
      plan.blocks.length > 0 &&
      (adopted || plan.blocks.some((b) => b.status === "completed" || b.status === "missed"))
  );

  const fetchPlan = async (
    hours = availableHours,
    customWeights = weights,
    customStartTime = startTime
  ) => {
    setLoading(true);
    setAdopted(false);
    setPendingOverwrite(null);
    try {
      const res = await aiService.generatePlan({
        subjects,
        tasks,
        assignments,
        exams,
        focusSessions,
        quizScores,
        availableStudyHours: hours,
        weights: customWeights,
        startTime: customStartTime,
        previouslyMissedTopicNames: previouslyMissedTopics,
      });
      setActiveStudyPlan(res);
      if (res.blocks && res.blocks.length > 0) {
        syncPlannedBlocks(res.blocks);
      }
    } catch (err) {
      console.error("Failed to generate adaptive plan:", err);
      showToast("Could not generate StudyPilot adaptive plan", "error");
    } finally {
      setLoading(false);
    }
  };

  const requestPlanUpdate = (label: string, execute: () => void) => {
    if (hasProtectedProgress) {
      setPendingOverwrite({ label, execute });
    } else {
      execute();
    }
  };

  useEffect(() => {
    if (subjects.length === 0) {
      if (activeStudyPlan && activeStudyPlan.blocks.length > 0) {
        setActiveStudyPlan(null);
      }
      return;
    }
    if (!activeStudyPlan || activeStudyPlan.blocks.length === 0) {
      fetchPlan(availableHours, weights, startTime);
    }
  }, [subjects.length]);

  const handleMarkBlockStatus = async (
    blockId: string,
    status: "completed" | "missed" | "pending"
  ) => {
    if (!plan) return;

    const targetBlock = plan.blocks.find((b) => b.id === blockId);
    if (!targetBlock) return;

    try {
      const nextMissedTopics =
        status === "missed"
          ? Array.from(new Set([...previouslyMissedTopics, targetBlock.topic]))
          : previouslyMissedTopics;

      if (status === "missed") {
        setPreviouslyMissedTopics(nextMissedTopics);
      }

      const updated = await aiService.reschedulePlan(
        plan,
        {
          blockId,
          newStatus: status,
          reason: status === "missed" ? "Session missed or rescheduled by student" : undefined,
        },
        {
          subjects,
          tasks,
          assignments,
          exams,
          focusSessions,
          quizScores,
          availableStudyHours: availableHours,
          weights,
          startTime,
          previouslyMissedTopicNames: nextMissedTopics,
        }
      );

      setActiveStudyPlan(updated);
      if (updated.blocks && updated.blocks.length > 0) {
        syncPlannedBlocks(updated.blocks);
      }
      if (status === "completed") {
        showToast(`Completed '${targetBlock.topic}'.`);
      } else if (status === "missed") {
        showToast(`Rescheduled '${targetBlock.topic}' into remaining available time.`);
      } else {
        showToast(`Updated '${targetBlock.topic}' status to pending.`);
      }
    } catch (err) {
      console.error("Reschedule error:", err);
      showToast("Could not update schedule", "error");
    }
  };

  const handleApplyWeights = () => {
    requestPlanUpdate("apply updated scheduling weights", () => {
      fetchPlan(availableHours, weights, startTime);
      setShowWeightsConfig(false);
      showToast("Adaptive scheduling weights applied.");
    });
  };

  const handleResetWeights = () => {
    const defaultW = {
      topicWeaknessWeight: 0.35,
      examUrgencyWeight: 0.3,
      deadlineUrgencyWeight: 0.2,
      taskImportanceWeight: 0.15,
    };
    setWeights(defaultW);
    requestPlanUpdate("reset weights to defaults", () => {
      fetchPlan(availableHours, defaultW, startTime);
      setShowWeightsConfig(false);
      showToast("Scheduling weights reset to defaults (35/30/20/15)");
    });
  };

  const handleAdoptPlan = () => {
    if (!plan || !plan.blocks.length) return;
    const todayStr = new Date().toISOString().split("T")[0];

    const pendingBlocks = plan.blocks.filter((b) => b.status !== "completed");
    if (pendingBlocks.length === 0) {
      showToast("All scheduled blocks are already completed.", "info");
      return;
    }

    const existingTitlesToday = new Set(
      tasks
        .filter((t) => t.date === todayStr)
        .map((t) => t.title.trim().toLowerCase())
    );

    let addedCount = 0;
    pendingBlocks.forEach((block) => {
      const candidateTitle = `${block.type}: ${block.topic}`;
      if (existingTitlesToday.has(candidateTitle.trim().toLowerCase())) {
        return;
      }
      existingTitlesToday.add(candidateTitle.trim().toLowerCase());
      addedCount++;
      addTask({
        title: candidateTitle,
        subjectId: block.subjectId,
        subjectName: block.subjectName,
        date: todayStr,
        time: block.startTime || "02:00 PM",
        priority: block.priority,
        status: "pending",
        estimatedMinutes: block.durationMinutes,
        topic: block.topic,
      });
    });

    setAdopted(true);
    if (addedCount === 0) {
      showToast("All scheduled study blocks are already in today's checklist.", "info");
    } else {
      showToast(`Adopted ${addedCount} StudyPilot blocks into your daily checklist.`);
    }
  };

  const getPriorityBadgeStyle = (p: string) => {
    switch (p) {
      case "high":
        return "bg-[#FDF2F2] dark:bg-[#3A1E1E] text-[#A83838] dark:text-[#E57373] border-[#F3D2D2] dark:border-[#572B2B]";
      case "medium":
        return "bg-[#FAF1E3] dark:bg-[#3A2C16] text-[#B46914] dark:text-[#E0983B] border-[#F0DFC2] dark:border-[#523E20]";
      case "low":
      default:
        return "bg-[#F5F2EC] dark:bg-[#2A2823] text-[#78736A] dark:text-[#A6A096] border-[#E9E5DE] dark:border-[#3A3731]";
    }
  };

  const totalMinutes = Math.round(availableHours * 60);
  const numSubjects = subjects.length;

  return (
    <div className="space-y-6">
      {/* 1. Study Time & Topic Allocator Card matching Reference #2 */}
      <div className="bg-white dark:bg-[#21201C] p-5 sm:p-6 rounded-xl border border-[#E9E5DE] dark:border-[#32302B] transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="max-w-xl">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#78736A] dark:text-[#A6A096]">
                STUDY ALLOCATION
              </span>
              <span className="text-[#C8C2B6] dark:text-[#47443D]" aria-hidden="true">
                ·
              </span>
              <KickerPill variant="amber">PROPORTIONAL</KickerPill>
              {plan && (
                <span className="px-2 py-0.5 rounded bg-[#EDF5F0] dark:bg-[#1C3326] border border-[#CFE3D6] dark:border-[#2B4E3A] font-mono text-[10px] font-medium text-[#3B7A57] dark:text-[#68B088]">
                  {plan.isFallback ? "Local Fallback" : "Live Engine"}
                </span>
              )}
            </div>
            <h3 className="font-editorial text-lg font-bold text-[#22211F] dark:text-[#F5F3EE]">
              Study Time &amp; Topic Allocator
            </h3>
            <p className="text-xs text-[#78736A] dark:text-[#A6A096] mt-1 leading-relaxed">
              Choose your available study hours. Time is distributed proportionally across your courses, high-weightage exam topics, and weak areas.
            </p>
          </div>

          {/* Right Controls matching Reference #2 */}
          <div className="flex flex-col sm:items-end gap-2.5 shrink-0">
            <div className="flex flex-wrap items-center gap-1.5 bg-[#FAF8F4] dark:bg-[#1B1A17] px-2.5 py-1.5 rounded-lg border border-[#E9E5DE] dark:border-[#32302B] text-xs">
              <span className="font-mono text-[11px] text-[#78736A] dark:text-[#A6A096] pr-1">
                Available:
              </span>
              {[1, 1.5, 2, 3, 4, 5].map((h) => (
                <button
                  key={h}
                  onClick={() => {
                    requestPlanUpdate(`change study budget to ${h}h`, () => {
                      setAvailableHours(h);
                      fetchPlan(h, weights, startTime);
                    });
                  }}
                  className={`px-2 py-1 rounded font-mono text-xs font-semibold transition-colors cursor-pointer tabular-nums ${
                    availableHours === h
                      ? "bg-[#22211F] dark:bg-[#F5F3EE] text-white dark:text-[#1C1B18]"
                      : "text-[#68635B] dark:text-[#A6A096] hover:bg-[#EFECE6] dark:hover:bg-[#2A2823]"
                  }`}
                >
                  {h}h
                </button>
              ))}
              <div className="flex items-center gap-1 pl-1.5 ml-1 border-l border-[#E9E5DE] dark:border-[#32302B]">
                <input
                  type="number"
                  min={0.5}
                  max={12}
                  step={0.5}
                  value={availableHours}
                  onChange={(e) => {
                    const val = Math.max(0.5, Math.min(12, Number(e.target.value) || 0.5));
                    setAvailableHours(val);
                  }}
                  className="w-12 px-1.5 py-0.5 bg-white dark:bg-[#21201C] border border-[#E9E5DE] dark:border-[#32302B] rounded text-center font-mono text-xs font-semibold text-[#22211F] dark:text-[#F5F3EE] outline-hidden focus:border-[#D58A2A]"
                  aria-label="Custom study hours"
                />
                <span className="text-[11px] font-mono text-[#78736A] dark:text-[#A6A096]">
                  hrs
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-[#FAF8F4] dark:bg-[#1B1A17] px-2.5 py-1.5 rounded-lg border border-[#E9E5DE] dark:border-[#32302B] text-xs">
                <Clock className="w-3.5 h-3.5 text-[#D58A2A] dark:text-[#E0983B]" />
                <select
                  value={startTime}
                  onChange={(e) => {
                    const nextStart = e.target.value;
                    requestPlanUpdate(`shift start time to ${nextStart}`, () => {
                      setStartTime(nextStart);
                      fetchPlan(availableHours, weights, nextStart);
                    });
                  }}
                  className="bg-transparent font-medium text-[#22211F] dark:text-[#F5F3EE] outline-hidden cursor-pointer"
                >
                  <option value="09:00 AM">09:00 AM</option>
                  <option value="11:00 AM">11:00 AM</option>
                  <option value="02:00 PM">02:00 PM</option>
                  <option value="04:00 PM">04:00 PM</option>
                  <option value="06:00 PM">06:00 PM</option>
                  <option value="08:00 PM">08:00 PM</option>
                </select>
              </div>

              <button
                onClick={() => setShowWeightsConfig(!showWeightsConfig)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E9E5DE] dark:border-[#32302B] hover:bg-[#FAF8F4] dark:hover:bg-[#2A2823] text-[#22211F] dark:text-[#F5F3EE] text-xs font-medium transition-colors cursor-pointer"
                title="Configure Priority Weights"
              >
                <Sliders className="w-3.5 h-3.5 text-[#D58A2A] dark:text-[#E0983B]" />
                <span>Weights</span>
              </button>

              <PrimaryButton
                id="recalculate-plan-btn"
                onClick={() =>
                  requestPlanUpdate("recalculate a fresh schedule", () =>
                    fetchPlan(availableHours, weights, startTime)
                  )
                }
                disabled={loading}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                <span>{loading ? "Scheduling..." : "Recalculate"}</span>
              </PrimaryButton>
            </div>
          </div>
        </div>

        {/* Inline Plan Overwrite Protection Banner */}
        {pendingOverwrite && (
          <div className="mt-4 p-3.5 rounded-lg bg-[#FAF1E3] dark:bg-[#3A2C16] border border-[#F0DFC2] dark:border-[#523E20] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-2 text-[#7A450A] dark:text-[#E6C596]">
              <AlertTriangle className="w-4 h-4 text-[#B46914] dark:text-[#E0983B] shrink-0 mt-0.5" />
              <span>
                You already have completed/missed block progress or adopted tasks in your current schedule. Regenerating to{" "}
                <strong>{pendingOverwrite.label}</strong> will replace the active sequence.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0 justify-end">
              <button
                onClick={() => setPendingOverwrite(null)}
                className="px-3 py-1.5 rounded-lg border border-[#D58A2A]/40 text-[#7A450A] dark:text-[#E6C596] hover:bg-black/5 font-medium cursor-pointer"
              >
                Keep Existing Plan
              </button>
              <button
                onClick={() => pendingOverwrite.execute()}
                className="px-3 py-1.5 rounded-lg bg-[#B46914] hover:bg-[#93540F] text-white font-semibold cursor-pointer"
              >
                Confirm &amp; Replace
              </button>
            </div>
          </div>
        )}

        {/* Weights Configuration Panel */}
        {showWeightsConfig && (
          <div className="mt-4 p-4 rounded-xl bg-[#FAF8F4] dark:bg-[#1B1A17] border border-[#E9E5DE] dark:border-[#32302B] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[#22211F] dark:text-[#F5F3EE] flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[#D58A2A]" />
                Adaptive Multi-Factor Priority Weights
              </span>
              <button
                onClick={handleResetWeights}
                className="text-[11px] text-[#78736A] hover:text-[#22211F] dark:hover:text-[#F5F3EE] underline cursor-pointer"
              >
                Reset Defaults (35% Weakness, 30% Exam, 20% Deadline, 15% Task)
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div>
                <div className="flex justify-between font-medium text-[#22211F] dark:text-[#F5F3EE] mb-1">
                  <span>Topic Weakness:</span>
                  <span className="font-mono font-semibold text-[#A83838] dark:text-[#E57373]">
                    {Math.round(weights.topicWeaknessWeight * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="0.60"
                  step="0.05"
                  value={weights.topicWeaknessWeight}
                  onChange={(e) =>
                    setWeights({ ...weights, topicWeaknessWeight: parseFloat(e.target.value) })
                  }
                  className="w-full accent-[#A83838] cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between font-medium text-[#22211F] dark:text-[#F5F3EE] mb-1">
                  <span>Exam Urgency:</span>
                  <span className="font-mono font-semibold text-[#B46914] dark:text-[#E0983B]">
                    {Math.round(weights.examUrgencyWeight * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="0.60"
                  step="0.05"
                  value={weights.examUrgencyWeight}
                  onChange={(e) =>
                    setWeights({ ...weights, examUrgencyWeight: parseFloat(e.target.value) })
                  }
                  className="w-full accent-[#D58A2A] cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between font-medium text-[#22211F] dark:text-[#F5F3EE] mb-1">
                  <span>Assignment Deadline:</span>
                  <span className="font-mono font-semibold text-[#22211F] dark:text-[#F5F3EE]">
                    {Math.round(weights.deadlineUrgencyWeight * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.40"
                  step="0.05"
                  value={weights.deadlineUrgencyWeight}
                  onChange={(e) =>
                    setWeights({ ...weights, deadlineUrgencyWeight: parseFloat(e.target.value) })
                  }
                  className="w-full accent-[#22211F] dark:accent-[#F5F3EE] cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between font-medium text-[#22211F] dark:text-[#F5F3EE] mb-1">
                  <span>Task Importance:</span>
                  <span className="font-mono font-semibold text-[#3B7A57] dark:text-[#68B088]">
                    {Math.round(weights.taskImportanceWeight * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.40"
                  step="0.05"
                  value={weights.taskImportanceWeight}
                  onChange={(e) =>
                    setWeights({ ...weights, taskImportanceWeight: parseFloat(e.target.value) })
                  }
                  className="w-full accent-[#3B7A57] cursor-pointer"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <PrimaryButton onClick={handleApplyWeights}>
                Apply Weights &amp; Recalculate
              </PrimaryButton>
            </div>
          </div>
        )}

        {/* Time Budget Progress Meter */}
        {plan && plan.blocks.length > 0 && (
          <div className="mt-4 pt-3 border-t border-[#EFECE6] dark:border-[#32302B] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-[#78736A] dark:text-[#A6A096]">Study Allocation:</span>
              <span className="font-mono font-semibold text-[#22211F] dark:text-[#F5F3EE] tabular-nums">
                {plan.allocatedStudyMinutes ?? plan.totalPlannedMinutes}m study +{" "}
                {plan.breakMinutesTotal ?? 0}m breaks = {plan.totalPlannedMinutes}m
              </span>
              <span className="font-mono text-[#9A948A] tabular-nums">
                (Budget: {totalMinutes}m / {availableHours}h)
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <span className="text-[11px] font-mono text-[#78736A] dark:text-[#A6A096] tabular-nums">
                {plan.blocks.filter((b) => b.status === "completed").length} of {plan.blocks.length}{" "}
                Completed
              </span>
              <div className="w-24 h-1.5 bg-[#EFECE6] dark:bg-[#2C2A25] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#D58A2A] rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.round(
                      (plan.blocks.filter((b) => b.status === "completed").length /
                        Math.max(1, plan.blocks.length)) *
                        100
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Zero State when 0 Courses in Workspace matching Reference #2 */}
      {numSubjects === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No Courses in Workspace"
          description={`Add your subjects and syllabus topics so the sequence generator can allocate study blocks for your ${availableHours} available hours.`}
          actionLabel="+ Add Course"
          onAction={() => setActivePage("subjects")}
          secondaryActionLabel="Generate Roadmap"
          onSecondaryAction={() => setActivePage("roadmap")}
        />
      ) : plan ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white dark:bg-[#21201C] p-5 rounded-xl border border-[#E9E5DE] dark:border-[#32302B] transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#EFECE6] dark:border-[#32302B] mb-4 gap-3">
                  <div>
                    <h4 className="font-editorial text-base font-bold text-[#22211F] dark:text-[#F5F3EE]">
                      Optimized Study Sequence Timeline
                    </h4>
                    <p className="text-xs text-[#78736A] dark:text-[#A6A096]">
                      {plan.blocks.length} structured sessions · Starting at {startTime}
                    </p>
                  </div>

                  <button
                    id="adopt-ai-plan-btn"
                    onClick={handleAdoptPlan}
                    disabled={adopted}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      adopted
                        ? "bg-[#EDF5F0] dark:bg-[#1C3326] text-[#3B7A57] dark:text-[#68B088] border border-[#CFE3D6] dark:border-[#2B4E3A] cursor-default"
                        : "bg-[#22211F] hover:bg-[#363430] dark:bg-[#F5F3EE] dark:hover:bg-[#E6E2DA] text-white dark:text-[#1C1B18]"
                    }`}
                  >
                    {adopted ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Adopted to Checklist</span>
                      </>
                    ) : (
                      <>
                        <Layers className="w-3.5 h-3.5" />
                        <span>Adopt Schedule into Tasks</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="space-y-3">
                  {plan.blocks.map((block: AIStudyBlock) => {
                    const isDone = block.status === "completed";
                    const isMissed = block.status === "missed";

                    return (
                      <React.Fragment key={block.id}>
                        <div
                          className={`p-4 rounded-xl border transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-3 ${
                            isDone
                              ? "bg-[#EDF5F0]/50 dark:bg-[#1C3326]/30 border-[#CFE3D6] dark:border-[#2B4E3A] opacity-85"
                              : isMissed
                              ? "bg-[#F5F2EC] dark:bg-[#2A2823] border-[#E9E5DE] dark:border-[#32302B] opacity-65 line-through"
                              : "bg-[#FAF8F4] dark:bg-[#1B1A17] border-[#E9E5DE] dark:border-[#32302B] hover:border-[#D58A2A]"
                          }`}
                        >
                          <div className="flex items-start gap-3 flex-1">
                            <button
                              onClick={() =>
                                handleMarkBlockStatus(block.id, isDone ? "pending" : "completed")
                              }
                              className={`w-7 h-7 rounded-lg text-xs font-mono font-bold flex items-center justify-center shrink-0 mt-0.5 transition-colors cursor-pointer ${
                                isDone
                                  ? "bg-[#3B7A57] text-white"
                                  : isMissed
                                  ? "bg-[#E9E5DE] dark:bg-[#32302B] text-[#78736A]"
                                  : "bg-[#FAF1E3] dark:bg-[#3A2C16] text-[#B46914] dark:text-[#E0983B] border border-[#F0DFC2] dark:border-[#523E20]"
                              }`}
                              title={isDone ? "Mark as pending" : "Mark as completed"}
                            >
                              {isDone ? <Check className="w-4 h-4" /> : block.order}
                            </button>

                            <div className="space-y-1.5 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className={`text-xs font-bold text-[#22211F] dark:text-[#F5F3EE] ${
                                    isDone ? "line-through text-[#9A948A]" : ""
                                  }`}
                                >
                                  {block.topic}
                                </span>
                                <span className="text-[11px] text-[#78736A] dark:text-[#A6A096] font-medium">
                                  · {block.subjectName}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider border ${getPriorityBadgeStyle(
                                    block.priority
                                  )}`}
                                >
                                  {block.priority}
                                </span>
                                {block.isRescheduled && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#FAF1E3] dark:bg-[#3A2C16] text-[#B46914] dark:text-[#E0983B] flex items-center gap-1">
                                    <RotateCcw className="w-2.5 h-2.5" /> Rescheduled
                                  </span>
                                )}
                              </div>

                              <p className="text-xs text-[#68635B] dark:text-[#A6A096]">
                                {block.objective}
                              </p>

                              <div className="text-[11px] text-[#78736A] dark:text-[#A6A096] space-y-0.5">
                                <p className="italic">
                                  <span className="font-semibold text-[#22211F] dark:text-[#F5F3EE] not-italic">
                                    Why now:{" "}
                                  </span>
                                  {block.reason}
                                </p>
                                {block.factors && (
                                  <div className="flex items-center gap-2 flex-wrap pt-0.5 text-[10px] text-[#9A948A] font-mono">
                                    <span>Weakness: {block.factors.weaknessScore}%</span>
                                    <span>· Exam Urgency: {block.factors.examUrgencyScore}%</span>
                                    <span>· Deadline: {block.factors.deadlineScore}%</span>
                                    <span className="font-bold text-[#B46914] dark:text-[#E0983B]">
                                      · Composite: {block.factors.compositePriorityScore}/100
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col sm:items-end justify-between gap-2.5 shrink-0 pt-2 sm:pt-0">
                            <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-[#22211F] dark:text-[#F5F3EE] bg-white dark:bg-[#21201C] px-2.5 py-1 rounded-lg border border-[#E9E5DE] dark:border-[#32302B] tabular-nums">
                              <Clock className="w-3.5 h-3.5 text-[#D58A2A]" />
                              {block.startTime} – {block.endTime} ({block.durationMinutes}m)
                            </span>

                            <div className="flex items-center gap-1.5 flex-wrap">
                              {!isDone && !isMissed && (
                                <>
                                  <button
                                    onClick={() => handleMarkBlockStatus(block.id, "completed")}
                                    className="p-1.5 rounded-lg border border-[#CFE3D6] dark:border-[#2B4E3A] hover:bg-[#EDF5F0] dark:hover:bg-[#1C3326] text-[#3B7A57] dark:text-[#68B088] cursor-pointer"
                                    title="Mark completed"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleMarkBlockStatus(block.id, "missed")}
                                    className="p-1.5 rounded-lg border border-[#E9E5DE] dark:border-[#32302B] hover:bg-[#FDF2F2] dark:hover:bg-[#3A1E1E] text-[#78736A] hover:text-[#A83838] cursor-pointer"
                                    title="Mark missed & adapt schedule"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setActivePage("focus")}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#22211F] hover:bg-[#363430] dark:bg-[#F5F3EE] dark:hover:bg-[#E6E2DA] text-white dark:text-[#1C1B18] text-xs font-medium cursor-pointer"
                                    title="Start focus timer with this block"
                                  >
                                    <Play className="w-3 h-3 fill-current" />
                                    <span>Focus</span>
                                  </button>
                                </>
                              )}

                              {isDone && (
                                <span className="text-[11px] font-semibold text-[#3B7A57] dark:text-[#68B088] flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                                </span>
                              )}

                              {isMissed && (
                                <button
                                  onClick={() => handleMarkBlockStatus(block.id, "pending")}
                                  className="text-[11px] font-medium text-[#B46914] dark:text-[#E0983B] hover:underline cursor-pointer"
                                >
                                  Re-schedule
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {block.breakAfterMinutes && block.breakAfterMinutes > 0 && !isDone && (
                          <div className="flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg bg-[#F5F2EC] dark:bg-[#1B1A17] border border-[#EFECE6] dark:border-[#2E2C27] text-[11px] font-medium text-[#78736A] dark:text-[#A6A096]">
                            <Coffee className="w-3.5 h-3.5 text-[#D58A2A]" />
                            <span>{block.breakAfterMinutes} min rest &amp; hydration break</span>
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {plan.aiStrategyGuidance && (
                <div className="p-4 rounded-xl bg-[#FAF1E3] dark:bg-[#3A2C16]/60 border border-[#F0DFC2] dark:border-[#523E20] text-[#7A450A] dark:text-[#E6C596] text-xs flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-[#B46914] dark:text-[#E0983B] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">StudyPilot Strategy Note: </span>
                    <span>{plan.aiStrategyGuidance}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="bg-white dark:bg-[#21201C] p-5 rounded-xl border border-[#E9E5DE] dark:border-[#32302B] transition-colors">
                <div className="flex items-center gap-2 pb-3 border-b border-[#EFECE6] dark:border-[#32302B] mb-3">
                  <Calendar className="w-4 h-4 text-[#D58A2A]" />
                  <h4 className="font-editorial text-sm font-bold text-[#22211F] dark:text-[#F5F3EE]">
                    5-Day Study Forecast
                  </h4>
                </div>

                <div className="space-y-2.5">
                  {plan.fiveDayForecast?.map((item, i) => (
                    <div
                      key={i}
                      className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-2 ${
                        item.day === "Today"
                          ? "bg-[#FAF1E3] dark:bg-[#3A2C16]/50 border-[#F0DFC2] dark:border-[#523E20] text-[#22211F] dark:text-[#F5F3EE] font-medium"
                          : "bg-[#FAF8F4] dark:bg-[#1B1A17] border-[#EFECE6] dark:border-[#2E2C27] text-[#68635B] dark:text-[#A6A096]"
                      }`}
                    >
                      <div className="min-w-0">
                        <span className="font-semibold text-[#22211F] dark:text-[#F5F3EE]">
                          {item.day}
                        </span>
                        <p className="text-[11px] text-[#78736A] dark:text-[#A6A096] line-clamp-1">
                          {item.primaryFocus}
                        </p>
                      </div>
                      <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-white dark:bg-[#21201C] border border-[#E9E5DE] dark:border-[#32302B] text-[#22211F] dark:text-[#F5F3EE] shrink-0 tabular-nums">
                        {item.targetHours}h
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {plan.upcomingExams && plan.upcomingExams.length > 0 && (
                <div className="bg-white dark:bg-[#21201C] p-5 rounded-xl border border-[#E9E5DE] dark:border-[#32302B] transition-colors">
                  <div className="flex items-center gap-2 pb-3 border-b border-[#EFECE6] dark:border-[#32302B] mb-3">
                    <AlertTriangle className="w-4 h-4 text-[#D58A2A]" />
                    <h4 className="font-editorial text-sm font-bold text-[#22211F] dark:text-[#F5F3EE]">
                      Exam Deadlines Driven
                    </h4>
                  </div>

                  <div className="space-y-2.5">
                    {plan.upcomingExams.map((ex) => (
                      <div
                        key={ex.id}
                        className="p-2.5 rounded-lg border border-[#EFECE6] dark:border-[#2E2C27] bg-[#FAF8F4] dark:bg-[#1B1A17] text-xs flex items-center justify-between"
                      >
                        <div>
                          <p className="font-semibold text-[#22211F] dark:text-[#F5F3EE]">
                            {ex.title}
                          </p>
                          <p className="text-[11px] text-[#78736A] dark:text-[#A6A096]">
                            {ex.subjectName}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-mono font-bold text-[#A83838] dark:text-[#E57373] tabular-nums">
                            {ex.daysLeft}d left
                          </span>
                          <p className="text-[10px] font-mono text-[#9A948A]">{ex.prep}% ready</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
