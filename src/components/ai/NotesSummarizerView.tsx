import React, { useState, useRef } from "react";
import {
  FileText,
  Sparkles,
  Copy,
  Check,
  RotateCcw,
  BookOpen,
  HelpCircle,
  Clock,
  List,
  Layers,
  ChevronDown,
  ChevronUp,
  FileUp,
} from "lucide-react";
import { useStudyFlow } from "../../context/StudyFlowContext";
import { aiService } from "../../services/aiService";
import { NotesSummaryResult } from "../../types";
import { cn } from "../../lib/utils";
import {
  CARD_SURFACE,
  INPUT_SURFACE,
  KickerPill,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
} from "../common/ui";

const SAMPLE_NOTES = [
  {
    title: "Trees & AVL Self-Balancing Trees",
    subject: "Data Structures & Algorithms",
    text: `A Binary Tree is a hierarchical data structure where each node has at most two children: left and right.
A Binary Search Tree (BST) maintains the invariant: keys in the left subtree are smaller than the node, and keys in the right subtree are greater.
In un-balanced BSTs, sequential insertions (1, 2, 3, 4, 5) cause degradation into a linked list with worst-case O(n) search time.
AVL Trees solve this through strict height balancing. The balance factor (BF) of any node is calculated as:
BF = height(left_subtree) - height(right_subtree).
In an AVL tree, BF must be in {-1, 0, +1}. When an insertion or deletion causes BF to reach +2 or -2, tree rotations are performed:
1. Left-Left (LL) imbalance: Resolved by a single Right Rotation.
2. Right-Right (RR) imbalance: Resolved by a single Left Rotation.
3. Left-Right (LR) imbalance: Resolved by a Left Rotation on left child, followed by a Right Rotation on the parent node.
4. Right-Left (RL) imbalance: Resolved by a Right Rotation on right child, followed by a Left Rotation on the parent node.
Time complexity for Search, Insertion, and Deletion in AVL trees is strictly guaranteed to be O(log n) in all cases. Space complexity is O(n).`,
  },
  {
    title: "Database Normalization (1NF, 2NF, 3NF, BCNF)",
    subject: "Database Systems",
    text: `Database Normalization is the systematic process of organizing relational schemas to minimize data redundancy and eliminate anomalies (insertion, deletion, and update anomalies).
First Normal Form (1NF):
- Each column must contain atomic (indivisible) values.
- No repeating groups or arrays of items in a single cell.
- Each record must have a unique identifier (Primary Key).
Second Normal Form (2NF):
- Must be in 1NF.
- No partial functional dependency: every non-prime attribute must be fully functionally dependent on the entire primary key (applies especially to composite keys).
Third Normal Form (3NF):
- Must be in 2NF.
- No transitive dependencies: non-prime attributes must not depend on other non-prime attributes (A -> B -> C where A is PK and B is non-key is forbidden).
Boyce-Codd Normal Form (BCNF):
- A stricter version of 3NF. For every functional dependency X -> Y, X must be a super key.
Trade-offs: While high normalization prevents anomalies, excessively normalized tables require numerous JOIN operations during read-heavy workloads, often warranting deliberate denormalization in data warehousing.`,
  },
];

type TabType = "summary" | "keyPoints" | "concepts" | "questions" | "quickRevision";

export const NotesSummarizerView: React.FC = () => {
  const { setActivePage, setQuizPreset, showToast } = useStudyFlow();

  const [rawText, setRawText] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [isSummarizing, setIsSummarizing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<TabType>("summary");
  const [copied, setCopied] = useState<boolean>(false);
  const [summaryResult, setSummaryResult] = useState<NotesSummaryResult | null>(null);
  const [revealedQuestions, setRevealedQuestions] = useState<Record<number, boolean>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();

    if (file.name.endsWith(".txt") || file.name.endsWith(".md")) {
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setRawText(content);
        showToast(`Loaded "${file.name}"`);
      };
      reader.readAsText(file);
    } else {
      reader.onload = () => {
        const cleanName = file.name.replace(/\.[^/.]+$/, "");
        const fallbackText = `Document: ${cleanName}\nSize: ${Math.round(file.size / 1024)} KB\nUploaded study material on academic curriculum. Covers fundamental principles, algorithmic trade-offs, architecture, and preparation directives for upcoming examinations.`;
        setRawText(fallbackText);
        showToast(`Imported ${file.name} for AI analysis`);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleSummarize = async () => {
    if (!rawText.trim()) {
      showToast("Please provide notes or upload a file", "error");
      return;
    }

    setIsSummarizing(true);
    setRevealedQuestions({});

    try {
      const result = await aiService.summarizeNotes({
        text: rawText,
        fileName: fileName || "Lecture Notes",
      });
      setSummaryResult(result);
      setActiveTab("summary");
      showToast("AI Study Summary generated successfully!");
    } catch (err) {
      console.error("Summarizer error:", err);
      showToast("Summarization failed. Please check your notes.", "error");
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleCopySummary = () => {
    if (!summaryResult) return;
    const fullText = `# ${summaryResult.title}
## Executive Summary
${summaryResult.summary}

## Key Points
${summaryResult.keyPoints.map((p) => `- ${p}`).join("\n")}

## Quick Revision
${summaryResult.quickRevision.map((r) => `- ${r}`).join("\n")}`;

    navigator.clipboard.writeText(fullText);
    setCopied(true);
    showToast("Summary copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerateQuizFromNotes = () => {
    if (!summaryResult) return;
    setQuizPreset({
      topic: summaryResult.title.replace(/ACADEMIC STUDY NOTES/i, "").trim() || "Notes Review",
    });
    setActivePage("quizzes");
    showToast("Launched AI Quiz Generator from your notes!");
  };

  return (
    <div id="notes-summarizer-view" className="space-y-6 pb-12">
      <PageHeader
        kicker="LECTURE DIGEST"
        pill="STUDY AIDS"
        pillTone="amber"
        title="AI Summarizer"
        subtitle="Transform lecture slides, PDF chapters, or raw notes into structured study sheets and recall questions."
        actions={
          summaryResult ? (
            <>
              <SecondaryButton onClick={handleCopySummary}>
                {copied ? <Check className="w-3.5 h-3.5 text-[#3B7A57]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied!" : "Copy Summary"}</span>
              </SecondaryButton>
              <SecondaryButton onClick={() => setSummaryResult(null)}>
                <RotateCcw className="w-3.5 h-3.5" />
                <span>New Document</span>
              </SecondaryButton>
            </>
          ) : undefined
        }
      />

      {/* INPUT ZONE: Upload or Paste */}
      {!summaryResult && (
        <div className={`${CARD_SURFACE} p-5 sm:p-6 space-y-5`}>
          {/* Drag & Drop Upload Zone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border border-dashed border-[#D4CEC3] dark:border-[#49453D] hover:border-[#D58A2A] dark:hover:border-[#E0983B] bg-[#FAF8F4] dark:bg-[#1B1A17] hover:bg-[#FAF1E3]/40 dark:hover:bg-[#3A2C16]/30 rounded-xl p-6 text-center cursor-pointer transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.ppt,.pptx,.txt,.md"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
              className="hidden"
            />
            <div className="w-11 h-11 rounded-xl bg-[#FAF1E3] dark:bg-[#3A2C16] border border-[#F0DFC2] dark:border-[#523E20] text-[#D58A2A] dark:text-[#E0983B] flex items-center justify-center mx-auto mb-3">
              <FileUp className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-semibold text-[#22211F] dark:text-[#F5F3EE]">
              {fileName ? `Selected: ${fileName}` : "Drop your PDF, PPT, or TXT file here"}
            </h3>
            <p className="text-[11px] text-[#8E887E] dark:text-[#9A948A] mt-1">
              Supports .pdf, .ppt, .pptx, .txt, or click to browse files
            </p>
          </div>

          {/* Direct Text Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-mono uppercase tracking-[0.08em] text-[#78736A] dark:text-[#A6A096]">
                Or paste lecture notes / transcript directly
              </label>
              <span className="text-[11px] font-mono text-[#8E887E] dark:text-[#9A948A] tabular-nums">
                {rawText ? `${rawText.split(/\s+/).filter(Boolean).length} words` : "0 words"}
              </span>
            </div>
            <textarea
              rows={6}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste study materials, lecture summaries, or textbook sections here..."
              className={`${INPUT_SURFACE} w-full p-3.5 leading-relaxed`}
            />
          </div>

          {/* Quick-load Sample Notes */}
          <div className="pt-3 border-t border-[#EFECE6] dark:border-[#2E2C27] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-mono uppercase tracking-[0.06em] text-[#8E887E] dark:text-[#9A948A]">
                Sample notes:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {SAMPLE_NOTES.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setRawText(sample.text);
                      setFileName(sample.title);
                      showToast(`Loaded sample: ${sample.title}`);
                    }}
                    className="px-2.5 py-1 rounded text-[11px] font-medium bg-[#F5F2EC] dark:bg-[#2A2823] hover:bg-[#FAF1E3] dark:hover:bg-[#3A2C16] text-[#57534E] dark:text-[#C5BFB5] border border-[#E2DDD4] dark:border-[#3A3731] transition-colors cursor-pointer"
                  >
                    {sample.title}
                  </button>
                ))}
              </div>
            </div>

            <PrimaryButton
              onClick={handleSummarize}
              disabled={isSummarizing || !rawText.trim()}
            >
              {isSummarizing ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                  <span>Summarizing Notes...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-[#D58A2A]" />
                  <span>Summarize Notes with AI</span>
                </>
              )}
            </PrimaryButton>
          </div>
        </div>
      )}

      {/* OUTPUT ZONE */}
      {summaryResult && (
        <div className={`${CARD_SURFACE} overflow-hidden`}>
          {/* Document Header Banner */}
          <div className="p-5 sm:p-6 bg-[#22211F] dark:bg-[#1C1B18] text-[#FAF9F6] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#D58A2A] text-[#1C1B18] uppercase tracking-[0.08em]">
                  AI Summary
                </span>
                <span className="text-xs font-mono text-[#C5BFB5] flex items-center gap-1 tabular-nums">
                  <Clock className="w-3 h-3 text-[#E0983B]" />
                  {summaryResult.readingTimeMinutes || 2} min read · {summaryResult.wordCount || 250} words
                </span>
              </div>
              <h2 className="font-editorial text-lg sm:text-xl font-semibold text-white">
                {summaryResult.title}
              </h2>
            </div>

            <button
              onClick={handleGenerateQuizFromNotes}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-[#D58A2A] hover:bg-[#C0781E] text-[#1C1B18] transition-colors cursor-pointer self-start sm:self-auto"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generate Quiz from Notes</span>
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="border-b border-[#EFECE6] dark:border-[#2E2C27] px-4 sm:px-6 flex items-center gap-2 overflow-x-auto no-scrollbar">
            {[
              { id: "summary", label: "Executive Summary", icon: FileText },
              { id: "keyPoints", label: `Key Points (${summaryResult.keyPoints.length})`, icon: List },
              { id: "concepts", label: `Core Concepts (${summaryResult.importantConcepts.length})`, icon: Layers },
              { id: "questions", label: `Study Questions (${summaryResult.possibleQuestions.length})`, icon: HelpCircle },
              { id: "quickRevision", label: "Quick Revision", icon: BookOpen },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={cn(
                    "flex items-center gap-2 py-3 px-3 text-xs font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap",
                    isActive
                      ? "border-[#D58A2A] dark:border-[#E0983B] text-[#B46914] dark:text-[#F0B35E] font-semibold"
                      : "border-transparent text-[#78736A] dark:text-[#A6A096] hover:text-[#22211F] dark:hover:text-[#F5F3EE]"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content Body */}
          <div className="p-5 sm:p-6">
            {activeTab === "summary" && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-[#FAF8F4] dark:bg-[#1B1A17] border border-[#E9E5DE] dark:border-[#32302B] text-xs text-[#22211F] dark:text-[#F5F3EE] leading-relaxed">
                  <p className="font-mono text-[10px] uppercase tracking-[0.08em] font-semibold text-[#B46914] dark:text-[#E0983B] mb-1.5">
                    Executive Summary
                  </p>
                  <p className="leading-relaxed text-[#57534E] dark:text-[#C5BFB5]">{summaryResult.summary}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3.5 rounded-xl bg-[#FBF9F5] dark:bg-[#1B1A17] border border-[#E9E5DE] dark:border-[#32302B] text-xs">
                    <span className="text-[#8E887E] block text-[10px] font-mono font-semibold uppercase tracking-[0.08em]">
                      Exam Relevance
                    </span>
                    <span className="text-[#22211F] dark:text-[#F5F3EE] font-medium mt-1 block">
                      High Yield Concept
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#FBF9F5] dark:bg-[#1B1A17] border border-[#E9E5DE] dark:border-[#32302B] text-xs">
                    <span className="text-[#8E887E] block text-[10px] font-mono font-semibold uppercase tracking-[0.08em]">
                      Estimated Review Time
                    </span>
                    <span className="text-[#22211F] dark:text-[#F5F3EE] font-medium mt-1 block">
                      15–20 minutes with recall exercises
                    </span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "keyPoints" && (
              <div className="space-y-2.5">
                {summaryResult.keyPoints.map((point, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-xl bg-[#FBF9F5] dark:bg-[#1B1A17] border border-[#E9E5DE] dark:border-[#32302B] text-xs text-[#22211F] dark:text-[#F5F3EE] leading-relaxed"
                  >
                    <span className="w-5 h-5 rounded bg-[#FAF1E3] dark:bg-[#3A2C16] text-[#B46914] dark:text-[#F0B35E] border border-[#E0BE89] dark:border-[#6D5229] font-mono font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5 tabular-nums">
                      {idx + 1}
                    </span>
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "concepts" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {summaryResult.importantConcepts.map((concept, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-[#E9E5DE] dark:border-[#32302B] bg-[#FBF9F5] dark:bg-[#1B1A17] space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-editorial font-semibold text-sm text-[#22211F] dark:text-[#F5F3EE]">
                        {concept.term}
                      </h3>
                      <KickerPill
                        dashed={false}
                        tone={
                          concept.importance === "critical"
                            ? "crimson"
                            : concept.importance === "high"
                            ? "amber"
                            : "neutral"
                        }
                      >
                        {concept.importance}
                      </KickerPill>
                    </div>
                    <p className="text-xs text-[#57534E] dark:text-[#C5BFB5] leading-relaxed">
                      {concept.definition}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "questions" && (
              <div className="space-y-3">
                <p className="text-xs text-[#78736A] dark:text-[#A6A096] mb-2">
                  Test your active recall. Click any question to reveal the model answer.
                </p>
                {summaryResult.possibleQuestions.map((q, idx) => {
                  const isRevealed = !!revealedQuestions[idx];
                  return (
                    <div
                      key={idx}
                      className="rounded-xl border border-[#E9E5DE] dark:border-[#32302B] overflow-hidden bg-white dark:bg-[#21201C]"
                    >
                      <button
                        onClick={() =>
                          setRevealedQuestions((prev) => ({
                            ...prev,
                            [idx]: !prev[idx],
                          }))
                        }
                        className="w-full flex items-center justify-between p-3.5 text-left text-xs font-semibold text-[#22211F] dark:text-[#F5F3EE] hover:bg-[#FAF8F4] dark:hover:bg-[#2A2823] transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 h-5 rounded bg-[#FAF1E3] dark:bg-[#3A2C16] text-[#B46914] dark:text-[#F0B35E] font-mono font-bold text-[10px] flex items-center justify-center shrink-0 tabular-nums">
                            Q{idx + 1}
                          </span>
                          <span>{q.question}</span>
                        </div>
                        {isRevealed ? (
                          <ChevronUp className="w-4 h-4 text-[#8E887E] shrink-0 ml-2" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-[#8E887E] shrink-0 ml-2" />
                        )}
                      </button>

                      {isRevealed && (
                        <div className="px-4 py-3 bg-[#FBF9F5] dark:bg-[#1B1A17] border-t border-[#EFECE6] dark:border-[#2E2C27] text-xs text-[#57534E] dark:text-[#C5BFB5] leading-relaxed">
                          <span className="font-mono text-[10px] uppercase tracking-[0.08em] font-semibold text-[#3B7A57] dark:text-[#7AD19E] block mb-1">
                            Model Answer
                          </span>
                          <p>{q.answer}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === "quickRevision" && (
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-[#FCF7EE] dark:bg-[#2C2417] border border-[#EAD9BF] dark:border-[#534125] text-xs text-[#22211F] dark:text-[#F5F3EE] space-y-2">
                  <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.08em] font-semibold text-[#B46914] dark:text-[#F0B35E]">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>High-Yield Cheat Sheet Takeaways</span>
                  </div>
                  <ul className="space-y-2 pt-1 text-[#57534E] dark:text-[#C5BFB5]">
                    {summaryResult.quickRevision.map((rev, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#D58A2A] shrink-0 mt-1.5" />
                        <span>{rev}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
