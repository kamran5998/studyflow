import React, { useState, useEffect } from "react";
import { useStudyFlow } from "../../context/StudyFlowContext";
import {
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  Minimize2,
} from "lucide-react";
import confetti from "canvas-confetti";

export const FocusTimer: React.FC = () => {
  const { subjects, focusSessions, addFocusSession, settings, showToast } =
    useStudyFlow();

  const [selectedSubjectId, setSelectedSubjectId] = useState(
    subjects[0]?.id || "subj-1"
  );
  const [selectedTopic, setSelectedTopic] = useState("Core Revision");

  const defaultMinutes = settings.defaultFocusDuration || 45;
  const [customMinutes, setCustomMinutes] = useState(defaultMinutes);
  const [totalDurationSeconds, setTotalDurationSeconds] = useState(
    defaultMinutes * 60
  );
  const [timeLeft, setTimeLeft] = useState(defaultMinutes * 60);
  const [isActive, setIsActive] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isEditingTime, setIsEditingTime] = useState(false);

  const activeSubject =
    subjects.find((s) => s.id === selectedSubjectId) || subjects[0];

  useEffect(() => {
    if (activeSubject && activeSubject.topics.length > 0) {
      setSelectedTopic(activeSubject.topics[0].title);
    } else {
      setSelectedTopic("Core Revision");
    }
  }, [selectedSubjectId, activeSubject]);

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#D58A2A", "#F4ECC9", "#3B7A57", "#22211F"],
      });
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      triggerConfetti();

      const completedMinutes = Math.max(
        1,
        Math.round(totalDurationSeconds / 60)
      );

      addFocusSession({
        subjectId: activeSubject?.id || "gen",
        subjectName: activeSubject?.name || "General Study",
        topic: selectedTopic || "Focused Revision",
        durationMinutes: completedMinutes,
        rating: 5,
        timestamp: new Date().toISOString(),
        notes: "Completed focus session",
      });

      showToast(
        `Focus block finished! Logged ${completedMinutes} minutes to your ledger.`,
        "success"
      );

      setTimeLeft(totalDurationSeconds);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, totalDurationSeconds, activeSubject, selectedTopic]);

  const handleStart = () => {
    setIsEditingTime(false);
    setIsActive(true);
  };

  const handlePause = () => {
    setIsActive(false);
  };

  const handleReset = () => {
    setIsActive(false);
    setTimeLeft(totalDurationSeconds);
  };

  const handleSetDuration = (minutes: number) => {
    const validMinutes = Math.max(1, Math.min(360, Math.round(minutes) || 1));
    setIsActive(false);
    setCustomMinutes(validMinutes);
    setTotalDurationSeconds(validMinutes * 60);
    setTimeLeft(validMinutes * 60);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")} : ${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const progressPercent = Math.min(
    100,
    Math.round(((totalDurationSeconds - timeLeft) / totalDurationSeconds) * 100)
  );

  return (
    <div
      className={`space-y-6 max-w-3xl mx-auto transition-all ${
        isFullscreen
          ? "fixed inset-0 z-50 bg-[#161513] text-[#F5F3EE] p-6 sm:p-12 flex flex-col justify-center items-center overflow-y-auto max-w-none"
          : ""
      }`}
    >
      {isFullscreen && (
        <div className="w-full max-w-xl flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#D58A2A]" />
            <span className="text-[11px] font-mono font-semibold uppercase tracking-[0.14em] text-[#E0983B]">
              Distraction-Free Study Block
            </span>
          </div>
          <button
            onClick={() => setIsFullscreen(false)}
            className="p-2 text-[#A6A096] hover:text-[#F5F3EE] rounded-lg bg-[#21201C] border border-[#32302B] cursor-pointer"
            title="Exit Fullscreen"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Centered Editorial Focus Card matching Reference #3 */}
      <div
        className={`rounded-xl border transition-colors p-6 sm:p-10 text-center flex flex-col items-center justify-center relative ${
          isFullscreen
            ? "bg-[#21201C] border-[#32302B] shadow-2xl w-full max-w-xl"
            : "bg-white dark:bg-[#21201C] border-[#E9E5DE] dark:border-[#32302B]"
        }`}
      >
        {/* Top Controls Row */}
        <div className="w-full flex items-center justify-between gap-3 pb-5 mb-6 border-b border-[#EFECE6] dark:border-[#32302B]">
          <div className="flex flex-wrap items-center gap-2 text-left">
            <select
              id="focus-subject-select"
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              disabled={isActive}
              className="px-3 py-1.5 bg-[#FAF8F4] dark:bg-[#1B1A17] border border-[#E9E5DE] dark:border-[#32302B] rounded-lg text-xs font-medium text-[#22211F] dark:text-[#F5F3EE] outline-hidden focus:border-[#D58A2A] cursor-pointer disabled:opacity-60"
            >
              {subjects.length === 0 && <option value="gen">General Study</option>}
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>

            <input
              id="focus-topic-input"
              type="text"
              placeholder="Topic name"
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              disabled={isActive}
              className="px-3 py-1.5 bg-[#FAF8F4] dark:bg-[#1B1A17] border border-[#E9E5DE] dark:border-[#32302B] rounded-lg text-xs text-[#22211F] dark:text-[#F5F3EE] placeholder:text-[#9A948A] outline-hidden focus:border-[#D58A2A] max-w-[180px] disabled:opacity-60"
            />
          </div>

          {!isFullscreen && (
            <button
              onClick={() => setIsFullscreen(true)}
              className="w-8 h-8 rounded-lg border border-[#E9E5DE] dark:border-[#32302B] bg-[#FAF8F4] dark:bg-[#1B1A17] hover:bg-[#EFECE6] dark:hover:bg-[#2A2823] text-[#78736A] dark:text-[#A6A096] flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title="Enter Fullscreen Mode"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Metadata Subtitle */}
        <div className="mb-2 flex flex-wrap items-center justify-center gap-2 text-xs text-[#78736A] dark:text-[#A6A096]">
          <span className="font-semibold text-[#22211F] dark:text-[#F5F3EE]">
            {activeSubject?.name || "General Study"}
          </span>
          <span aria-hidden="true" className="text-[#C8C2B6] dark:text-[#57534E]">
            ·
          </span>
          <span>{selectedTopic || "Core Revision"}</span>
          <span aria-hidden="true" className="text-[#C8C2B6] dark:text-[#57534E]">
            ·
          </span>
          <span className="font-mono tabular-nums text-[#B46914] dark:text-[#E0983B] font-semibold">
            {Math.round(totalDurationSeconds / 60)}m Block
          </span>
        </div>

        {/* Large Monospace Timer Display */}
        <div className="relative my-4 sm:my-6 flex flex-col items-center justify-center">
          {!isActive && isEditingTime ? (
            <div className="flex items-center gap-3 p-3 bg-[#FAF8F4] dark:bg-[#1B1A17] rounded-xl border border-[#E9E5DE] dark:border-[#32302B]">
              <label className="text-xs font-medium text-[#78736A] dark:text-[#A6A096]">
                Set Time:
              </label>
              <input
                type="number"
                min="1"
                max="360"
                value={customMinutes}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setCustomMinutes(val);
                  handleSetDuration(val);
                }}
                className="w-20 px-2.5 py-1.5 rounded-lg border border-[#E9E5DE] dark:border-[#32302B] bg-white dark:bg-[#21201C] font-mono font-bold text-center text-lg text-[#22211F] dark:text-[#F5F3EE]"
                autoFocus
              />
              <span className="text-xs text-[#78736A]">min</span>
              <button
                type="button"
                onClick={() => setIsEditingTime(false)}
                className="px-3 py-1.5 rounded-lg bg-[#22211F] dark:bg-[#F5F3EE] text-white dark:text-[#1C1B18] text-xs font-medium cursor-pointer"
              >
                Done
              </button>
            </div>
          ) : (
            <div
              id="focus-timer-display"
              onClick={() => {
                if (!isActive) setIsEditingTime(true);
              }}
              title={!isActive ? "Click to customize time" : undefined}
              className={`text-6xl sm:text-8xl font-mono font-bold tracking-tight text-[#22211F] dark:text-[#F5F3EE] select-none tabular-nums ${
                !isActive
                  ? "cursor-pointer hover:text-[#B46914] dark:hover:text-[#E0983B] transition-colors"
                  : ""
              }`}
            >
              {formatTime(timeLeft)}
            </div>
          )}

          {/* Thin progress rule */}
          <div className="w-56 sm:w-64 h-1 bg-[#EFECE6] dark:bg-[#2C2A25] rounded-full mx-auto mt-5 overflow-hidden">
            <div
              className="h-full bg-[#D58A2A] dark:bg-[#E0983B] rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <span className="font-mono text-[11px] text-[#9A948A] mt-3">
            {isActive
              ? "Focus block active · auto-logs upon completion"
              : "Click digits or pick a duration preset below"}
          </span>
        </div>

        {/* Duration Presets & Custom Selector matching Reference #3 */}
        {!isActive && (
          <div className="flex flex-wrap items-center justify-center gap-1.5 p-1.5 bg-[#FAF8F4] dark:bg-[#1B1A17] border border-[#E9E5DE] dark:border-[#32302B] rounded-lg mb-7">
            {[15, 25, 45, 60, 90].map((mins) => (
              <button
                key={mins}
                onClick={() => handleSetDuration(mins)}
                className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-colors cursor-pointer tabular-nums border ${
                  totalDurationSeconds === mins * 60
                    ? "bg-white dark:bg-[#2A2823] text-[#22211F] dark:text-[#F5F3EE] border-[#E9E5DE] dark:border-[#3A3731] shadow-2xs font-semibold"
                    : "border-transparent text-[#78736A] dark:text-[#A6A096] hover:text-[#22211F] dark:hover:text-[#F5F3EE]"
                }`}
              >
                {mins}m
              </button>
            ))}

            <div className="flex items-center gap-1.5 pl-2.5 ml-1 border-l border-[#E9E5DE] dark:border-[#32302B] text-xs">
              <span className="font-mono text-[11px] text-[#9A948A]">Custom:</span>
              <input
                type="number"
                min="1"
                max="360"
                placeholder="45"
                value={customMinutes}
                onChange={(e) => handleSetDuration(Number(e.target.value))}
                className="w-12 px-1.5 py-1 rounded border border-[#E9E5DE] dark:border-[#32302B] bg-white dark:bg-[#21201C] text-xs font-mono font-semibold text-center text-[#22211F] dark:text-[#F5F3EE]"
              />
              <span className="font-mono text-[11px] text-[#9A948A]">m</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {!isActive ? (
            <button
              id="focus-start-btn"
              onClick={handleStart}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#22211F] hover:bg-[#363430] dark:bg-[#F5F3EE] dark:hover:bg-[#E6E2DA] text-white dark:text-[#1C1B18] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Begin Focus Session</span>
            </button>
          ) : (
            <button
              id="focus-pause-btn"
              onClick={handlePause}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#D58A2A] hover:bg-[#B46914] text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
            >
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span>Pause</span>
            </button>
          )}

          <button
            id="focus-reset-btn"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-white dark:bg-[#21201C] border border-[#E9E5DE] dark:border-[#32302B] hover:bg-[#FAF8F4] dark:hover:bg-[#2A2823] text-[#22211F] dark:text-[#F5F3EE] text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
            title="Reset Timer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Recent Study Blocks Card matching Reference #3 */}
      {!isFullscreen && (
        <div className="bg-white dark:bg-[#21201C] rounded-xl border border-[#E9E5DE] dark:border-[#32302B] p-5 sm:p-6 transition-colors">
          <div className="flex items-center justify-between pb-3 border-b border-[#EFECE6] dark:border-[#32302B]">
            <div>
              <h3 className="font-editorial text-base font-bold text-[#22211F] dark:text-[#F5F3EE]">
                Recent Study Blocks
              </h3>
              <p className="text-xs text-[#78736A] dark:text-[#A6A096]">
                Automatically logged into your student ledger when timer expires
              </p>
            </div>
            <span className="font-mono text-xs font-medium text-[#78736A] dark:text-[#A6A096] tabular-nums">
              {focusSessions.length} sessions logged
            </span>
          </div>

          <div className="mt-3 divide-y divide-[#EFECE6] dark:divide-[#2E2C27]">
            {focusSessions.length === 0 ? (
              <p className="py-6 text-center text-xs text-[#9A948A]">
                No study blocks logged yet. Set your duration and begin your first focus session.
              </p>
            ) : (
              focusSessions.slice(0, 5).map((session) => (
                <div
                  key={session.id}
                  className="py-3 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="font-semibold text-[#22211F] dark:text-[#F5F3EE]">
                      {session.subjectName}{" "}
                      {session.topic && (
                        <span className="font-normal text-[#78736A] dark:text-[#A6A096]">
                          · {session.topic}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-mono text-[#9A948A] mt-0.5">
                      {new Date(session.timestamp).toLocaleDateString()} ·{" "}
                      {new Date(session.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>

                  <span className="font-mono font-semibold text-[#B46914] dark:text-[#E0983B] bg-[#FAF1E3] dark:bg-[#3A2C16] border border-[#F0DFC2] dark:border-[#523E20] px-2.5 py-0.5 rounded tabular-nums">
                    {session.durationMinutes} min
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
