import React, { useState, useRef, useEffect } from "react";
import {
  CheckCircle2,
  Circle,
  HelpCircle,
  Timer,
  BookOpen,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Code2,
  Award,
  X,
  Compass,
} from "lucide-react";
import { LearningRoadmap } from "../../types";
import { useStudyFlow } from "../../context/StudyFlowContext";
import { CARD_SURFACE, PrimaryButton, SecondaryButton } from "../common/ui";

interface RoadmapFlowchartProps {
  roadmap: LearningRoadmap;
  completedTopicIds: Record<string, boolean>;
  onToggleTopic: (id: string) => void;
  onSelectRoadmap?: (topicName: string) => void;
}

export const RoadmapFlowchart: React.FC<RoadmapFlowchartProps> = ({
  roadmap,
  completedTopicIds,
  onToggleTopic,
}) => {
  const { setActivePage, setQuizPreset, showToast } = useStudyFlow();

  const [selectedNode, setSelectedNode] = useState<{
    id: string;
    title: string;
    description: string;
    keyConcepts: string[];
    handsOn?: string[];
    isCompleted: boolean;
  } | null>(null);

  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  }, [roadmap.id]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === containerRef.current || (e.target as HTMLElement).tagName === "svg") {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.15, 1.8));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.15, 0.6));
  const handleResetZoom = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  const phases = roadmap.phases || [];

  return (
    <div className={`relative w-full ${CARD_SURFACE} overflow-hidden select-none`}>
      {/* Top Banner Toolbar */}
      <div className="h-14 px-4 sm:px-6 bg-[#FAF8F4] dark:bg-[#1B1A17] border-b border-[#E9E5DE] dark:border-[#32302B] flex items-center justify-between z-20 sticky top-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#FAF1E3] dark:bg-[#3A2C16] border border-[#E0BE89] dark:border-[#6D5229] text-[#D58A2A] dark:text-[#E0983B] flex items-center justify-center">
            <Compass className="w-4 h-4" />
          </div>
          <span className="font-editorial font-semibold text-sm text-[#22211F] dark:text-[#F5F3EE]">
            {roadmap.topic} Sequence Diagram
          </span>
        </div>

        {/* Canvas Controls */}
        <div className="flex items-center gap-1 bg-white dark:bg-[#21201C] p-1 rounded-lg border border-[#E2DDD4] dark:border-[#3A3731]">
          <button
            onClick={handleZoomOut}
            className="p-1.5 text-[#78736A] dark:text-[#A6A096] hover:bg-[#F5F2EC] dark:hover:bg-[#2A2823] rounded transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono font-semibold px-1.5 text-[#22211F] dark:text-[#F5F3EE] min-w-[40px] text-center tabular-nums">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-1.5 text-[#78736A] dark:text-[#A6A096] hover:bg-[#F5F2EC] dark:hover:bg-[#2A2823] rounded transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleResetZoom}
            className="p-1.5 text-[#78736A] dark:text-[#A6A096] hover:bg-[#F5F2EC] dark:hover:bg-[#2A2823] rounded transition-colors cursor-pointer"
            title="Reset Canvas View"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Flowchart Canvas */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="w-full min-h-[680px] max-h-[82vh] overflow-auto p-6 sm:p-10 cursor-grab active:cursor-grabbing relative flex justify-center bg-[#FAF9F6] dark:bg-[#161513] bg-[radial-gradient(#DDD7CD_1px,transparent_1px)] dark:bg-[radial-gradient(#2E2C27_1px,transparent_1px)] [background-size:22px_22px]"
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin: "top center",
            transition: isDragging ? "none" : "transform 0.15s ease-out",
          }}
          className="flex flex-col items-center max-w-4xl w-full py-4 space-y-10"
        >
          {/* Top Main Roadmap Header Node */}
          <div className="flex flex-col items-center space-y-3">
            <h1 className="font-editorial font-semibold text-2xl sm:text-3xl text-[#22211F] dark:text-[#F5F3EE] text-center">
              {roadmap.topic}
            </h1>
            <div className="w-px h-8 bg-[#D58A2A] dark:bg-[#E0983B]" />
          </div>

          {/* Sequential Phases Flow */}
          {phases.map((phase, pIdx) => (
            <div key={phase.id} className="w-full flex flex-col items-center space-y-8">
              {/* Section Header Name */}
              <div className="text-[11px] font-mono font-semibold tracking-[0.12em] uppercase text-[#78736A] dark:text-[#A6A096] bg-white dark:bg-[#21201C] px-4 py-1.5 rounded-full border border-[#E2DDD4] dark:border-[#3A3731]">
                {phase.title.replace(/^Phase \d+:\s*/i, "")}
              </div>

              <div className="w-px h-6 bg-[#D58A2A] dark:bg-[#E0983B]" />

              {/* Topics in this Phase */}
              <div className="w-full space-y-8 flex flex-col items-center">
                {phase.topics.map((topic, tIdx) => {
                  const isDone = !!completedTopicIds[topic.id];
                  const branchLeft = tIdx % 2 === 1;

                  return (
                    <div key={topic.id} className="w-full flex flex-col items-center relative">
                      <div className="w-full flex flex-col lg:flex-row items-center justify-center gap-4 lg:gap-8 relative">
                        {/* Left Branch Subtopics */}
                        {branchLeft && topic.keyConcepts && topic.keyConcepts.length > 0 && (
                          <div className="order-2 lg:order-1 flex flex-col items-end gap-2 max-w-xs w-full relative">
                            <svg className="hidden lg:block absolute -right-8 top-1/2 -translate-y-1/2 w-8 h-20 pointer-events-none overflow-visible">
                              <path
                                d="M 32 10 C 16 10, 16 40, 0 40"
                                fill="none"
                                stroke="#D58A2A"
                                strokeWidth="1.5"
                                strokeDasharray="4 4"
                              />
                            </svg>

                            {topic.keyConcepts.map((concept, cIdx) => (
                              <div
                                key={cIdx}
                                onClick={() =>
                                  setSelectedNode({
                                    id: `${topic.id}-c-${cIdx}`,
                                    title: concept,
                                    description: `Sub-topic part of ${topic.title}. Focus on mastering this specific concept.`,
                                    keyConcepts: [concept, topic.title],
                                    handsOn: topic.handsOnProjects,
                                    isCompleted: isDone,
                                  })
                                }
                                className="w-full text-right p-2.5 px-3.5 rounded-lg bg-[#FAF1E3] dark:bg-[#3A2C16] border border-[#E0BE89] dark:border-[#6D5229] hover:border-[#D58A2A] transition-colors cursor-pointer text-xs font-medium text-[#22211F] dark:text-[#F5F3EE]"
                              >
                                {concept}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Center Milestone Box */}
                        <div
                          onClick={() =>
                            setSelectedNode({
                              id: topic.id,
                              title: topic.title,
                              description: topic.description,
                              keyConcepts: topic.keyConcepts,
                              handsOn: topic.handsOnProjects,
                              isCompleted: isDone,
                            })
                          }
                          className={`order-1 lg:order-2 w-full max-w-sm p-3.5 sm:p-4 rounded-xl border transition-colors cursor-pointer relative text-center ${
                            isDone
                              ? "bg-[#EDF5F0] dark:bg-[#1E3527] border-[#3B7A57] dark:border-[#68B088] text-[#22211F] dark:text-[#F5F3EE]"
                              : "bg-white dark:bg-[#21201C] border-[#22211F] dark:border-[#E0983B] text-[#22211F] dark:text-[#F5F3EE] hover:border-[#D58A2A]"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-mono font-semibold text-[#B46914] dark:text-[#F0B35E] uppercase px-1.5 py-0.5 bg-[#FAF1E3] dark:bg-[#3A2C16] border border-[#E6CDA3] dark:border-[#5C4422] rounded">
                              {phase.level.slice(0, 3)}
                            </span>

                            <h3 className="font-editorial font-semibold text-sm sm:text-base flex-1 truncate">
                              {topic.title}
                            </h3>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleTopic(topic.id);
                              }}
                              className="p-1 rounded hover:bg-[#F5F2EC] dark:hover:bg-[#2A2823] transition-colors cursor-pointer"
                              title={isDone ? "Mark Incomplete" : "Mark Mastered"}
                            >
                              {isDone ? (
                                <CheckCircle2 className="w-4 h-4 text-[#3B7A57] dark:text-[#68B088]" />
                              ) : (
                                <Circle className="w-4 h-4 text-[#9A948A]" />
                              )}
                            </button>
                          </div>

                          {topic.description && (
                            <p className="text-[11px] text-[#78736A] dark:text-[#A6A096] mt-1 line-clamp-1">
                              {topic.description}
                            </p>
                          )}
                        </div>

                        {/* Right Branch Subtopics */}
                        {!branchLeft && topic.keyConcepts && topic.keyConcepts.length > 0 && (
                          <div className="order-3 flex flex-col items-start gap-2 max-w-xs w-full relative">
                            <svg className="hidden lg:block absolute -left-8 top-1/2 -translate-y-1/2 w-8 h-20 pointer-events-none overflow-visible">
                              <path
                                d="M 0 10 C 16 10, 16 40, 32 40"
                                fill="none"
                                stroke="#D58A2A"
                                strokeWidth="1.5"
                                strokeDasharray="4 4"
                              />
                            </svg>

                            {topic.keyConcepts.map((concept, cIdx) => (
                              <div
                                key={cIdx}
                                onClick={() =>
                                  setSelectedNode({
                                    id: `${topic.id}-c-${cIdx}`,
                                    title: concept,
                                    description: `Sub-topic part of ${topic.title}. Focus on mastering this specific concept.`,
                                    keyConcepts: [concept, topic.title],
                                    handsOn: topic.handsOnProjects,
                                    isCompleted: isDone,
                                  })
                                }
                                className="w-full text-left p-2.5 px-3.5 rounded-lg bg-[#FAF1E3] dark:bg-[#3A2C16] border border-[#E0BE89] dark:border-[#6D5229] hover:border-[#D58A2A] transition-colors cursor-pointer text-xs font-medium text-[#22211F] dark:text-[#F5F3EE]"
                              >
                                {concept}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {tIdx < phase.topics.length - 1 && (
                        <div className="w-px h-8 bg-[#D58A2A] dark:bg-[#E0983B] my-1" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Milestone Project Card at Phase End */}
              {phase.milestoneProject && (
                <div className="w-full max-w-md p-4 rounded-xl bg-[#FAF1E3] dark:bg-[#2C2417] border border-[#E0BE89] dark:border-[#534125] flex items-start gap-3.5">
                  <div className="p-2 rounded-lg bg-[#D58A2A] text-white shrink-0">
                    <Award className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-mono font-semibold text-[#B46914] dark:text-[#F0B35E] uppercase tracking-[0.1em] block">
                      Phase Milestone Project
                    </span>
                    <h4 className="font-semibold text-xs sm:text-sm text-[#22211F] dark:text-[#F5F3EE] mt-0.5">
                      {phase.milestoneProject.title}
                    </h4>
                    <p className="text-[11px] text-[#78736A] dark:text-[#A6A096] mt-1 leading-relaxed">
                      {phase.milestoneProject.description}
                    </p>
                  </div>
                </div>
              )}

              {pIdx < phases.length - 1 && (
                <div className="w-px h-10 bg-[#D58A2A] dark:bg-[#E0983B]" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Node Detail Modal */}
      {selectedNode && (
        <div
          className="fixed inset-0 z-50 bg-[#1C1B18]/65 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedNode(null)}
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-[#21201C] rounded-2xl border border-[#E9E5DE] dark:border-[#32302B] shadow-2xl p-6 sm:p-7 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-[#EFECE6] dark:border-[#2E2C27] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FAF1E3] dark:bg-[#3A2C16] border border-[#E0BE89] dark:border-[#6D5229] text-[#D58A2A] dark:text-[#E0983B] flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-editorial font-semibold text-lg text-[#22211F] dark:text-[#F5F3EE]">
                    {selectedNode.title}
                  </h3>
                  <span className="text-[11px] text-[#8E887E] dark:text-[#9A948A]">
                    Topic details & study actions
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedNode(null)}
                className="p-1.5 rounded-lg text-[#8E887E] hover:text-[#22211F] dark:hover:text-[#F5F3EE] hover:bg-[#F5F2EC] dark:hover:bg-[#2A2823] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs sm:text-[13px] text-[#57534E] dark:text-[#C5BFB5] leading-relaxed">
              {selectedNode.description}
            </div>

            {selectedNode.keyConcepts && selectedNode.keyConcepts.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-mono font-semibold text-[#8E887E] uppercase tracking-[0.1em]">
                  Key Concepts & Patterns
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedNode.keyConcepts.map((concept, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded bg-[#FAF1E3] dark:bg-[#3A2C16] border border-[#E0BE89] dark:border-[#6D5229] text-xs font-medium text-[#B46914] dark:text-[#F0B35E]"
                    >
                      {concept}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {selectedNode.handsOn && selectedNode.handsOn.length > 0 && (
              <div className="space-y-2 p-3.5 rounded-xl bg-[#FBF9F5] dark:bg-[#1B1A17] border border-[#E9E5DE] dark:border-[#32302B]">
                <span className="text-[10px] font-mono font-semibold text-[#B46914] dark:text-[#E0983B] uppercase tracking-[0.1em] flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5" /> Hands-On Mini Project
                </span>
                <ul className="text-xs text-[#57534E] dark:text-[#C5BFB5] list-disc list-inside space-y-1">
                  {selectedNode.handsOn.map((proj, idx) => (
                    <li key={idx}>{proj}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <PrimaryButton
                type="button"
                onClick={() => {
                  setQuizPreset({ topic: selectedNode.title });
                  setActivePage("quizzes");
                  setSelectedNode(null);
                  showToast(`Launching Practice Quiz for "${selectedNode.title}"`, "info");
                }}
                className="flex-1"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Test with AI Quiz</span>
              </PrimaryButton>

              <SecondaryButton
                type="button"
                onClick={() => {
                  setActivePage("focus");
                  setSelectedNode(null);
                  showToast(`Focus Timer ready for "${selectedNode.title}"`, "info");
                }}
                className="flex-1"
              >
                <Timer className="w-3.5 h-3.5" />
                <span>Start Focus Timer</span>
              </SecondaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
