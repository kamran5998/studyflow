import React, { useState, useRef, useEffect } from "react";
import { X, Send, RotateCcw, ArrowRight } from "lucide-react";
import { useStudyFlow } from "../../context/StudyFlowContext";
import { aiService } from "../../services/aiService";
import { ChatMessage, ChatMessageAction } from "../../types";
import { cn } from "../../lib/utils";

const INITIAL_SUGGESTIONS = [
  "Plan my day",
  "Generate Python roadmap",
  "What should I study?",
  "Generate a quiz",
  "Exam priority check",
];

export const KamranAssistant: React.FC = () => {
  const {
    subjects,
    tasks,
    exams,
    focusSessions,
    quizScores,
    profile,
    setActivePage,
    setQuizPreset,
    showToast,
  } = useStudyFlow();

  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    return [
      {
        id: "msg-welcome",
        role: "assistant",
        content: `Hi ${profile.name.split(" ")[0] || "there"}! I'm Study Tutor, your StudyPilot dispatch. I'm connected to your courses, upcoming exams, and weak topics. What would you like to tackle first?`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        actionTrigger: {
          label: "View Today's Priority Plan",
          type: "open_planner",
        },
      },
    ];
  });

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages, isThinking]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isThinking) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setIsThinking(true);

    try {
      const response = await aiService.chatWithKamran({
        message: text,
        history: messages,
        context: {
          subjects,
          tasks,
          exams,
          focusSessions,
          quizScores,
          profile,
        },
      });

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content:
          response.content ||
          "I'm reviewing your study ledger now. Let me know what subject or exam you'd like to prioritize.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        actionTrigger: response.actionTrigger || undefined,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error("Study Tutor Chat Error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-err-${Date.now()}`,
          role: "assistant",
          content:
            "I ran into an issue reaching the tutoring endpoint, but your planner and weakness ledger remain available.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleActionClick = (action: ChatMessageAction) => {
    if (action.type === "open_planner") {
      setActivePage("planner");
<<<<<<< HEAD
      showToast("Opened Planner");
=======
      showToast("Opened Daily Planner");
>>>>>>> 9d281b97efabd4f9d488c8bc37687c9b1dfe9f78
    } else if (action.type === "start_quiz") {
      if (action.payload) {
        setQuizPreset({
          subjectId: action.payload.subjectId,
          topic: action.payload.topic || "Core Concepts",
        });
      }
      setActivePage("quizzes");
<<<<<<< HEAD
      showToast("AI Practice Quiz opened");
    } else if (action.type === "open_exam") {
      setActivePage("exams");
      showToast("Exams opened");
=======
      showToast("Recall & Quizzes opened");
    } else if (action.type === "open_exam") {
      setActivePage("exams");
      showToast("Exam Timetable opened");
>>>>>>> 9d281b97efabd4f9d488c8bc37687c9b1dfe9f78
    } else if (action.type === "start_focus") {
      setActivePage("focus");
      showToast("Focus Session opened");
    } else if (action.type === "open_summarizer") {
      setActivePage("summarizer");
<<<<<<< HEAD
      showToast("AI Summarizer opened");
=======
      showToast("Lecture Notes opened");
>>>>>>> 9d281b97efabd4f9d488c8bc37687c9b1dfe9f78
    } else if (action.type === "open_roadmap") {
      setActivePage("roadmap");
      showToast("Study Roadmap opened");
    }
    if (window.innerWidth < 768) {
      setIsOpen(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: `msg-reset-${Date.now()}`,
        role: "assistant",
        content: "Dispatch cleared. How can I assist with your study plan?",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  return (
    <>
      {/* 1. Floating Editorial Trigger Pill matching Reference Screenshots */}
      <button
        id="studybuddy-floating-trigger"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Open Study Tutor AI Dispatch"
        className={cn(
          "fixed z-50 flex items-center gap-2.5 px-3.5 py-2 rounded-full text-xs shadow-md transition-all duration-150 cursor-pointer select-none border",
          "bottom-20 lg:bottom-6 right-4 sm:right-6",
          isOpen
            ? "bg-[#22211F] dark:bg-[#F5F3EE] text-[#FAF9F6] dark:text-[#1C1B18] border-[#22211F] dark:border-[#F5F3EE]"
            : "bg-white dark:bg-[#21201C] text-[#22211F] dark:text-[#F5F3EE] border-[#E9E5DE] dark:border-[#32302B] hover:border-[#D58A2A]"
        )}
      >
        <span className="w-2 h-2 rounded-full bg-[#D58A2A] shrink-0" />
        <span className="font-semibold text-xs tracking-tight">Study Tutor</span>
        <span
          className={cn(
            "text-[10px] font-mono uppercase tracking-[0.12em] hidden sm:inline-block",
            isOpen ? "text-[#C8C2B6] dark:text-[#57534E]" : "text-[#9A948A] dark:text-[#7A756C]"
          )}
        >
          AI DISPATCH
        </span>
      </button>

      {/* 2. Floating Editorial Dispatch Drawer */}
      {isOpen && (
        <div
          id="studybuddy-chat-panel"
          className="fixed z-50 bottom-32 lg:bottom-20 right-4 sm:right-6 w-[calc(100vw-2rem)] sm:w-[410px] h-[560px] max-h-[calc(100vh-8.5rem)] bg-white dark:bg-[#21201C] rounded-xl shadow-2xl border border-[#E9E5DE] dark:border-[#32302B] flex flex-col overflow-hidden transition-colors"
        >
          {/* Header */}
          <div className="px-4 py-3.5 bg-[#22211F] dark:bg-[#161513] text-[#FAF9F6] flex items-center justify-between border-b border-[#32302B]">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#3A2C16] border border-[#523E20] flex items-center justify-center shrink-0">
                <span className="w-2 h-2 rounded-full bg-[#D58A2A]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-semibold text-[#FAF9F6] tracking-tight">
                    Study Tutor
                  </h3>
                  <span className="text-[9px] font-mono uppercase tracking-[0.12em] text-[#E0983B]">
                    AI DISPATCH
                  </span>
                </div>
                <p className="text-[10px] text-[#A6A096]">Connected to your study ledger</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleClearHistory}
                title="Reset conversation"
                className="p-1.5 text-[#A6A096] hover:text-[#FAF9F6] rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close chat"
                className="p-1.5 text-[#A6A096] hover:text-[#FAF9F6] rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Context Summary */}
          {(() => {
            const todayMs = new Date().setHours(0, 0, 0, 0);
            const upcoming = exams
              .map((ex) => {
                const exMs = new Date(ex.date).setHours(0, 0, 0, 0);
                const days = Math.round((exMs - todayMs) / (1000 * 60 * 60 * 24));
                return { ex, days };
              })
              .filter((x) => !Number.isNaN(x.days) && x.days >= 0)
              .sort((a, b) => a.days - b.days);
            const examLabel =
              upcoming.length > 0
                ? `${upcoming[0].ex.subjectName || upcoming[0].ex.title} in ${upcoming[0].days}d`
                : "No upcoming exams";
            return (
              <div className="px-3.5 py-2 bg-[#FAF8F4] dark:bg-[#1C1B18] border-b border-[#EFECE6] dark:border-[#32302B] flex items-center justify-between text-[11px] text-[#78736A] dark:text-[#A6A096]">
                <span className="flex items-center gap-1.5 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D58A2A] shrink-0" />
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#22211F] dark:text-[#F5F3EE]">
                    Context:
                  </span>
                  <span className="truncate">
                    {subjects.length} Courses · {examLabel}
                  </span>
                </span>
                <button
                  onClick={() => handleSendMessage("What should I study right now?")}
                  className="text-[10px] font-medium text-[#B46914] dark:text-[#E0983B] hover:underline shrink-0 ml-2 cursor-pointer"
                >
                  Analyze
                </button>
              </div>
            );
          })()}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#FAF9F6] dark:bg-[#161513]">
            {messages.map((msg) => {
              const isAssistant = msg.role === "assistant";
              return (
                <div
                  key={msg.id}
                  className={cn(
                    "flex flex-col max-w-[85%] text-xs leading-relaxed",
                    isAssistant ? "mr-auto items-start" : "ml-auto items-end"
                  )}
                >
                  <div
                    className={cn(
                      "px-3.5 py-2.5 rounded-xl border",
                      isAssistant
                        ? "bg-white dark:bg-[#21201C] text-[#22211F] dark:text-[#F5F3EE] border-[#E9E5DE] dark:border-[#32302B] rounded-tl-xs"
                        : "bg-[#22211F] dark:bg-[#F5F3EE] text-[#FAF9F6] dark:text-[#1C1B18] border-[#22211F] dark:border-[#F5F3EE] rounded-tr-xs"
                    )}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>

                    {isAssistant && msg.actionTrigger && (
                      <div className="mt-2.5 pt-2 border-t border-[#EFECE6] dark:border-[#32302B]">
                        <button
                          onClick={() => handleActionClick(msg.actionTrigger!)}
                          className="w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-[#FAF1E3] dark:bg-[#3A2C16] hover:bg-[#F4E4C8] dark:hover:bg-[#4A381C] text-[#B46914] dark:text-[#E0983B] text-[11px] font-semibold transition-colors cursor-pointer border border-[#F0DFC2] dark:border-[#523E20]"
                        >
                          <span>{msg.actionTrigger.label}</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] font-mono text-[#9A948A] mt-1 px-1">
                    {msg.timestamp}
                  </span>
                </div>
              );
            })}

            {isThinking && (
              <div className="mr-auto items-start max-w-[85%] flex flex-col">
                <div className="px-3.5 py-2.5 rounded-xl rounded-tl-xs bg-white dark:bg-[#21201C] text-[#78736A] dark:text-[#A6A096] border border-[#E9E5DE] dark:border-[#32302B] flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D58A2A] animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D58A2A] animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D58A2A] animate-bounce [animation-delay:300ms]" />
                  </div>
                  <span className="text-xs font-medium">Reviewing syllabus ledger...</span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Prompt Suggestions */}
          <div className="px-3 py-2 bg-[#FAF8F4] dark:bg-[#1C1B18] border-t border-[#EFECE6] dark:border-[#32302B] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {INITIAL_SUGGESTIONS.map((suggestion, idx) => (
              <button
                key={idx}
                disabled={isThinking}
                onClick={() => handleSendMessage(suggestion)}
                className="shrink-0 px-2.5 py-1 rounded-md text-[10px] font-medium bg-white dark:bg-[#21201C] hover:border-[#D58A2A] hover:text-[#B46914] dark:hover:text-[#E0983B] text-[#78736A] dark:text-[#A6A096] border border-[#E9E5DE] dark:border-[#32302B] transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
              >
                {suggestion}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="p-3 bg-white dark:bg-[#21201C] border-t border-[#EFECE6] dark:border-[#32302B]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask Study Tutor about your courses..."
                disabled={isThinking}
                className="flex-1 text-xs px-3 py-2 bg-[#FAF8F4] dark:bg-[#1B1A17] border border-[#E9E5DE] dark:border-[#32302B] rounded-lg focus:outline-hidden focus:border-[#D58A2A] text-[#22211F] dark:text-[#F5F3EE] placeholder-[#9A948A]"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isThinking}
                aria-label="Send message"
                className="p-2 rounded-lg bg-[#22211F] dark:bg-[#F5F3EE] text-white dark:text-[#1C1B18] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity cursor-pointer shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
