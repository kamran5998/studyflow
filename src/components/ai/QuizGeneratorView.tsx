import React, { useState, useEffect } from "react";
import {
  Sparkles,
  CheckCircle2,
  RotateCcw,
  Clock,
  ChevronRight,
  AlertCircle,
  Play,
} from "lucide-react";
import { useStudyFlow } from "../../context/StudyFlowContext";
import { aiService } from "../../services/aiService";
import { QuizQuestion, QuizResult } from "../../types";
import { cn } from "../../lib/utils";
import {
  CARD_SURFACE,
  INPUT_SURFACE,
  KickerPill,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
} from "../common/ui";

type QuizDifficulty = "Easy" | "Medium" | "Hard";

export const QuizGeneratorView: React.FC = () => {
  const {
    subjects,
    quizPreset,
    setQuizPreset,
    addQuizScore,
    setActivePage,
    showToast,
  } = useStudyFlow();

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(() => {
    if (quizPreset?.subjectId) return quizPreset.subjectId;
    return subjects[0]?.id || "";
  });

  const [topic, setTopic] = useState<string>(() => {
    if (quizPreset?.topic) return quizPreset.topic;
    return "Linked List";
  });

  const [difficulty, setDifficulty] = useState<QuizDifficulty>("Medium");
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const [activeQuestions, setActiveQuestions] = useState<QuizQuestion[] | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showExplanation, setShowExplanation] = useState<boolean>(false);

  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId) || subjects[0];

  useEffect(() => {
    if (quizPreset) {
      if (quizPreset.subjectId) setSelectedSubjectId(quizPreset.subjectId);
      if (quizPreset.topic) setTopic(quizPreset.topic);
      setQuizPreset(null);
    }
  }, [quizPreset, setQuizPreset]);

  const handleGenerateQuiz = async () => {
    if (!selectedSubject) {
      showToast("Please add or select a course first", "error");
      return;
    }

    setIsGenerating(true);
    setQuizResult(null);
    setSelectedAnswers({});
    setCurrentQuestionIndex(0);
    setShowExplanation(false);

    try {
      const questions = await aiService.generateQuiz({
        subjectId: selectedSubject.id,
        subjectName: selectedSubject.name,
        topic: topic.trim() || "Core Concepts",
        difficulty,
        questionCount,
      });

      if (questions && questions.length > 0) {
        setActiveQuestions(questions);
        showToast(`Generated ${questions.length} quiz questions on ${topic}!`);
      } else {
        throw new Error("No questions generated");
      }
    } catch (error) {
      console.error("Quiz gen error:", error);
      showToast("Failed to generate quiz, please try again", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectOption = (optionIndex: number) => {
    if (quizResult) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQuestionIndex]: optionIndex,
    }));
    setShowExplanation(true);
  };

  const handleNextQuestion = () => {
    if (!activeQuestions) return;
    setShowExplanation(false);
    if (currentQuestionIndex < activeQuestions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      handleFinishQuiz();
    }
  };

  const handleFinishQuiz = () => {
    if (!activeQuestions) return;

    let correctCount = 0;
    const strongConceptsSet = new Set<string>();
    const weakConceptsSet = new Set<string>();

    const answers = activeQuestions.map((q, idx) => {
      const selectedOption = selectedAnswers[idx] !== undefined ? selectedAnswers[idx] : -1;
      const isCorrect = selectedOption === q.correctAnswerIndex;
      if (isCorrect) {
        correctCount++;
        strongConceptsSet.add(q.subConcept || "Core Concept");
      } else {
        weakConceptsSet.add(q.subConcept || "Core Concept");
      }
      return {
        questionId: q.id,
        selectedOption,
        isCorrect,
      };
    });

    const scorePercentage = Math.round((correctCount / activeQuestions.length) * 100);
    const strongList = Array.from(strongConceptsSet);
    const weakList = Array.from(weakConceptsSet);
    const primaryWeakTopic = weakList[0] || topic;
    const recommendedDuration = scorePercentage < 70 ? 25 : 15;

    const result: QuizResult = {
      totalQuestions: activeQuestions.length,
      correctCount,
      scorePercentage,
      strongConcepts: strongList.length > 0 ? strongList : [topic],
      weakConcepts: weakList,
      recommendedAction: {
        topic: primaryWeakTopic,
        durationMinutes: recommendedDuration,
        description:
          weakList.length > 0
            ? `Review ${weakList.join(", ")} concepts and solve 3 practice exercises before moving on.`
            : `Great mastery! Take a quick 15-minute formula reinforcement on advanced topics.`,
      },
      answers,
    };

    setQuizResult(result);

    addQuizScore({
      subjectId: selectedSubject.id,
      subjectName: selectedSubject.name,
      topic: topic.trim() || selectedSubject.name,
      score: scorePercentage,
      totalQuestions: activeQuestions.length,
      date: new Date().toISOString().slice(0, 10),
    });

    showToast(`Quiz completed! Score: ${scorePercentage}%`);
  };

  const handleStartRecommendedFocus = () => {
    if (!quizResult) return;
    setActivePage("focus");
    showToast(`Focus mode ready: ${quizResult.recommendedAction.topic} (${quizResult.recommendedAction.durationMinutes}m)`);
  };

  const handleResetQuiz = () => {
    setActiveQuestions(null);
    setQuizResult(null);
    setSelectedAnswers({});
    setCurrentQuestionIndex(0);
    setShowExplanation(false);
  };

  return (
    <div id="quiz-generator-view" className="space-y-6 pb-12">
      <PageHeader
        kicker="ACTIVE RECALL"
        pill="STUDY AIDS"
        pillTone="amber"
<<<<<<< HEAD
        title="AI Practice Quiz"
=======
        title="Recall & Practice Quizzes"
>>>>>>> 9d281b97efabd4f9d488c8bc37687c9b1dfe9f78
        subtitle="Generate tailored multiple-choice quizzes with detailed concept breakdowns and weak-topic synchronization."
        actions={
          activeQuestions && !quizResult ? (
            <SecondaryButton onClick={handleResetQuiz}>
              <RotateCcw className="w-3.5 h-3.5" />
              <span>New Quiz</span>
            </SecondaryButton>
          ) : undefined
        }
      />

      {/* STATE 1: Generator Setup Panel */}
      {!activeQuestions && !quizResult && (
        <div className={`${CARD_SURFACE} p-5 sm:p-6 space-y-6`}>
          <div className="flex items-center justify-between border-b border-[#EFECE6] dark:border-[#2E2C27] pb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#D58A2A] dark:text-[#E0983B]" />
              <h2 className="font-editorial text-base font-semibold text-[#22211F] dark:text-[#F5F3EE]">
                Customize Quiz Parameters
              </h2>
            </div>
            <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-[#8E887E] dark:text-[#9A948A]">
              Context-Aware Generation
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Subject Selector */}
            <div className="space-y-2">
              <label className="text-[11px] font-mono uppercase tracking-[0.08em] text-[#78736A] dark:text-[#A6A096] block">
                Select Course
              </label>
              {subjects.length === 0 ? (
                <div className="p-4 rounded-xl bg-[#FAF8F4] dark:bg-[#1B1A17] border border-[#E9E5DE] dark:border-[#32302B] text-xs text-[#78736A] dark:text-[#A6A096] space-y-2">
                  <p>No courses added yet. Add a course first to link recall quiz scores to your analytics.</p>
                  <SecondaryButton type="button" onClick={() => setActivePage("subjects")}>
<<<<<<< HEAD
                    Go to Subjects
=======
                    Go to Courses & Topics
>>>>>>> 9d281b97efabd4f9d488c8bc37687c9b1dfe9f78
                  </SecondaryButton>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {subjects.map((s) => {
                    const isSelected = s.id === selectedSubjectId;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setSelectedSubjectId(s.id);
                          if (s.topics && s.topics.length > 0) {
                            setTopic(s.topics[0].title);
                          }
                        }}
                        className={cn(
                          "flex items-center gap-2.5 p-3 rounded-lg border text-left transition-colors cursor-pointer text-xs",
                          isSelected
                            ? "border-[#D58A2A] dark:border-[#E0983B] bg-[#FAF1E3] dark:bg-[#3A2C16] text-[#22211F] dark:text-[#F5F3EE] font-semibold"
                            : "border-[#E9E5DE] dark:border-[#32302B] bg-white dark:bg-[#21201C] text-[#57534E] dark:text-[#C5BFB5] hover:bg-[#FAF8F4] dark:hover:bg-[#2A2823]"
                        )}
                      >
                        <div
                          className={cn(
                            "w-2.5 h-2.5 rounded-full shrink-0",
                            isSelected ? "bg-[#D58A2A]" : "bg-[#C9C2B6] dark:bg-[#58534B]"
                          )}
                        />
                        <span className="truncate">{s.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Topic Input / Quick Topic Pills */}
            <div className="space-y-2">
              <label className="text-[11px] font-mono uppercase tracking-[0.08em] text-[#78736A] dark:text-[#A6A096] block">
                Topic / Concept Focus
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Linked List, Trees, Normalization, Virtual Memory..."
                className={`${INPUT_SURFACE} w-full px-3.5 py-2.5`}
              />

              {selectedSubject && selectedSubject.topics && selectedSubject.topics.length > 0 && (
                <div className="pt-1">
                  <span className="text-[10px] font-mono uppercase tracking-[0.08em] text-[#8E887E] dark:text-[#9A948A] block mb-1.5">
                    Syllabus topics:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedSubject.topics.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTopic(t.title)}
                        className={cn(
                          "px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer border",
                          topic === t.title
                            ? "bg-[#22211F] dark:bg-[#F5F3EE] text-white dark:text-[#1C1B18] border-[#22211F] dark:border-[#F5F3EE]"
                            : "bg-[#F5F2EC] dark:bg-[#2A2823] hover:bg-[#FAF1E3] dark:hover:bg-[#3A2C16] text-[#57534E] dark:text-[#C5BFB5] border-[#E2DDD4] dark:border-[#3A3731]"
                        )}
                      >
                        {t.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-3 border-t border-[#EFECE6] dark:border-[#2E2C27]">
            {/* Difficulty Selector */}
            <div className="space-y-2">
              <label className="text-[11px] font-mono uppercase tracking-[0.08em] text-[#78736A] dark:text-[#A6A096] block">
                Difficulty Level
              </label>
              <div className="flex rounded-lg bg-[#F5F2EC] dark:bg-[#1B1A17] border border-[#E9E5DE] dark:border-[#32302B] p-1">
                {(["Easy", "Medium", "Hard"] as QuizDifficulty[]).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setDifficulty(level)}
                    className={cn(
                      "flex-1 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer",
                      difficulty === level
                        ? "bg-white dark:bg-[#2A2823] text-[#22211F] dark:text-[#F5F3EE] font-semibold border border-[#E9E5DE] dark:border-[#3E3B34]"
                        : "text-[#78736A] dark:text-[#A6A096] hover:text-[#22211F] dark:hover:text-[#F5F3EE]"
                    )}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* Question Count Selector */}
            <div className="space-y-2">
              <label className="text-[11px] font-mono uppercase tracking-[0.08em] text-[#78736A] dark:text-[#A6A096] block">
                Number of Questions
              </label>
              <div className="flex rounded-lg bg-[#F5F2EC] dark:bg-[#1B1A17] border border-[#E9E5DE] dark:border-[#32302B] p-1">
                {[5, 10, 15].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setQuestionCount(cnt)}
                    className={cn(
                      "flex-1 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer font-mono tabular-nums",
                      questionCount === cnt
                        ? "bg-white dark:bg-[#2A2823] text-[#22211F] dark:text-[#F5F3EE] font-semibold border border-[#E9E5DE] dark:border-[#3E3B34]"
                        : "text-[#78736A] dark:text-[#A6A096] hover:text-[#22211F] dark:hover:text-[#F5F3EE]"
                    )}
                  >
                    {cnt} Questions
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <PrimaryButton
              onClick={handleGenerateQuiz}
              disabled={isGenerating || !topic.trim() || !selectedSubject}
            >
              {isGenerating ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                  <span>Generating {questionCount} Questions...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-[#D58A2A]" />
                  <span>Generate Quiz with AI</span>
                </>
              )}
            </PrimaryButton>
          </div>
        </div>
      )}

      {/* STATE 2: Active Quiz Taking Mode */}
      {activeQuestions && !quizResult && (
        <div className={`${CARD_SURFACE} p-5 sm:p-6 space-y-6`}>
          <div>
            <div className="flex items-center justify-between text-xs text-[#78736A] dark:text-[#A6A096] mb-2">
              <span className="font-mono font-semibold text-[#22211F] dark:text-[#F5F3EE] tabular-nums">
                Question {currentQuestionIndex + 1} of {activeQuestions.length}
              </span>
              <div className="flex items-center gap-2">
                <KickerPill tone="amber" dashed={false}>
                  {activeQuestions[currentQuestionIndex]?.subConcept || topic}
                </KickerPill>
                <KickerPill tone="neutral" dashed={false}>
                  {difficulty}
                </KickerPill>
              </div>
            </div>

            <div className="w-full h-1.5 bg-[#EFECE6] dark:bg-[#2C2A25] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#D58A2A] dark:bg-[#E0983B] rounded-full transition-all duration-300"
                style={{
                  width: `${((currentQuestionIndex + 1) / activeQuestions.length) * 100}%`,
                }}
              />
            </div>
          </div>

          <div className="py-2">
            <h2 className="font-editorial text-lg sm:text-xl font-semibold text-[#22211F] dark:text-[#F5F3EE] leading-snug">
              {activeQuestions[currentQuestionIndex]?.question}
            </h2>
          </div>

          <div className="space-y-2.5">
            {activeQuestions[currentQuestionIndex]?.options.map((opt, optIdx) => {
              const isSelected = selectedAnswers[currentQuestionIndex] === optIdx;
              const isCorrect = optIdx === activeQuestions[currentQuestionIndex].correctAnswerIndex;
              const hasAnswered = selectedAnswers[currentQuestionIndex] !== undefined;

              return (
                <button
                  key={optIdx}
                  onClick={() => handleSelectOption(optIdx)}
                  className={cn(
                    "w-full flex items-start gap-3 p-3.5 rounded-xl border text-left text-xs transition-colors cursor-pointer leading-relaxed",
                    !hasAnswered &&
                      "hover:bg-[#FAF8F4] dark:hover:bg-[#2A2823] hover:border-[#D4CEC3] dark:hover:border-[#49453D] border-[#E9E5DE] dark:border-[#32302B] text-[#22211F] dark:text-[#F5F3EE] bg-white dark:bg-[#21201C]",
                    hasAnswered &&
                      isCorrect &&
                      "bg-[#EDF5F0] dark:bg-[#1E3527] border-[#3B7A57] dark:border-[#68B088] text-[#22211F] dark:text-[#F5F3EE] font-medium",
                    hasAnswered &&
                      isSelected &&
                      !isCorrect &&
                      "bg-[#FDF2F2] dark:bg-[#3A1E1E] border-[#A83838] dark:border-[#E57373] text-[#A83838] dark:text-[#F28B8B]",
                    hasAnswered &&
                      !isSelected &&
                      !isCorrect &&
                      "opacity-55 border-[#E9E5DE] dark:border-[#32302B] bg-[#FAF8F4] dark:bg-[#1B1A17] text-[#8E887E] dark:text-[#7A756C]"
                  )}
                >
                  <span
                    className={cn(
                      "w-6 h-6 rounded-md flex items-center justify-center font-mono font-bold text-xs shrink-0",
                      !hasAnswered && "bg-[#F5F2EC] dark:bg-[#2A2823] text-[#22211F] dark:text-[#F5F3EE]",
                      hasAnswered && isCorrect && "bg-[#3B7A57] text-white",
                      hasAnswered && isSelected && !isCorrect && "bg-[#A83838] text-white",
                      hasAnswered && !isSelected && !isCorrect && "bg-[#EFECE6] dark:bg-[#2C2A25] text-[#8E887E]"
                    )}
                  >
                    {String.fromCharCode(65 + optIdx)}
                  </span>
                  <span className="flex-1 pt-0.5">{opt}</span>
                </button>
              );
            })}
          </div>

          {showExplanation && activeQuestions[currentQuestionIndex]?.explanation && (
            <div className="p-3.5 bg-[#FBF9F5] dark:bg-[#1B1A17] rounded-xl border border-[#E9E5DE] dark:border-[#32302B] text-xs space-y-1">
              <span className="font-mono text-[10px] uppercase tracking-[0.08em] font-semibold text-[#B46914] dark:text-[#E0983B] block">
                Explanation
              </span>
              <p className="text-[#57534E] dark:text-[#C5BFB5] leading-relaxed">
                {activeQuestions[currentQuestionIndex].explanation}
              </p>
            </div>
          )}

          <div className="pt-3 border-t border-[#EFECE6] dark:border-[#2E2C27] flex items-center justify-between">
            <div className="text-[11px] font-mono text-[#8E887E] dark:text-[#9A948A] tabular-nums">
              Answered {Object.keys(selectedAnswers).length} of {activeQuestions.length}
            </div>

            <PrimaryButton
              onClick={handleNextQuestion}
              disabled={selectedAnswers[currentQuestionIndex] === undefined}
            >
              <span>
                {currentQuestionIndex < activeQuestions.length - 1 ? "Next Question" : "Finish Quiz"}
              </span>
              <ChevronRight className="w-3.5 h-3.5" />
            </PrimaryButton>
          </div>
        </div>
      )}

      {/* STATE 3: Post-Submission Results Screen */}
      {quizResult && (
        <div className="space-y-6">
          <div className={`${CARD_SURFACE} p-6 flex flex-col sm:flex-row items-center justify-between gap-6`}>
            <div className="flex items-center gap-5">
              <div
                className={cn(
                  "w-20 h-20 rounded-xl flex flex-col items-center justify-center font-mono font-bold shrink-0 border tabular-nums",
                  quizResult.scorePercentage >= 70
                    ? "bg-[#EDF5F0] dark:bg-[#1E3527] text-[#3B7A57] dark:text-[#7AD19E] border-[#BCD8C7] dark:border-[#325E44]"
                    : "bg-[#FAF1E3] dark:bg-[#3A2C16] text-[#B46914] dark:text-[#F0B35E] border-[#E0BE89] dark:border-[#6D5229]"
                )}
              >
                <span className="text-2xl leading-none">{quizResult.scorePercentage}%</span>
                <span className="text-[10px] uppercase font-semibold mt-1">
                  {quizResult.correctCount}/{quizResult.totalQuestions}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-mono font-semibold text-[#B46914] dark:text-[#E0983B] uppercase tracking-[0.1em] block">
                  Quiz Completed · {topic}
                </span>
                <h2 className="font-editorial text-xl font-semibold text-[#22211F] dark:text-[#F5F3EE] mt-0.5">
                  {quizResult.scorePercentage >= 80
                    ? "Strong Concept Mastery"
                    : quizResult.scorePercentage >= 60
                    ? "Good Progress with Revision Gaps"
                    : "Focused Revision Recommended"}
                </h2>
                <p className="text-xs text-[#78736A] dark:text-[#A6A096] mt-1 max-w-lg leading-relaxed">
                  Your quiz score has been recorded into StudyPilot analytics and weak-topic detection.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
              <SecondaryButton onClick={handleGenerateQuiz}>
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retake</span>
              </SecondaryButton>
              <PrimaryButton onClick={handleResetQuiz}>
                <span>New Topic</span>
              </PrimaryButton>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Strong Concepts */}
            <div className={`${CARD_SURFACE} p-5 space-y-3`}>
              <div className="flex items-center gap-2 pb-2.5 border-b border-[#EFECE6] dark:border-[#2E2C27]">
                <CheckCircle2 className="w-4 h-4 text-[#3B7A57] dark:text-[#68B088]" />
                <h3 className="text-[11px] font-mono font-semibold text-[#22211F] dark:text-[#F5F3EE] uppercase tracking-[0.1em]">
                  Strong Concepts ({quizResult.strongConcepts.length})
                </h3>
              </div>
              <div className="space-y-2">
                {quizResult.strongConcepts.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-[#EDF5F0] dark:bg-[#1E3527] border border-[#BCD8C7] dark:border-[#325E44] text-xs"
                  >
                    <span className="font-medium text-[#22211F] dark:text-[#F5F3EE]">{item}</span>
                    <KickerPill tone="sage" dashed={false}>
                      Mastered
                    </KickerPill>
                  </div>
                ))}
              </div>
            </div>

            {/* Needs Practice */}
            <div className={`${CARD_SURFACE} p-5 space-y-3`}>
              <div className="flex items-center gap-2 pb-2.5 border-b border-[#EFECE6] dark:border-[#2E2C27]">
                <AlertCircle className="w-4 h-4 text-[#D58A2A] dark:text-[#E0983B]" />
                <h3 className="text-[11px] font-mono font-semibold text-[#22211F] dark:text-[#F5F3EE] uppercase tracking-[0.1em]">
                  Needs Practice ({quizResult.weakConcepts.length})
                </h3>
              </div>
              {quizResult.weakConcepts.length === 0 ? (
                <div className="p-4 text-center text-xs text-[#78736A] dark:text-[#A6A096]">
                  No weak sub-concepts identified in this session.
                </div>
              ) : (
                <div className="space-y-2">
                  {quizResult.weakConcepts.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-[#FDF2F2] dark:bg-[#3A1E1E] border border-[#E8BABA] dark:border-[#6B3333] text-xs"
                    >
                      <span className="font-medium text-[#22211F] dark:text-[#F5F3EE]">{item}</span>
                      <KickerPill tone="crimson" dashed={false}>
                        Needs Review
                      </KickerPill>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recommended Follow-up Study Card */}
          <div className="bg-[#22211F] dark:bg-[#1C1B18] rounded-xl border border-[#32302B] p-5 sm:p-6 text-[#FAF9F6] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#D58A2A] text-[#1C1B18] uppercase tracking-[0.08em]">
                  Recommended Follow-up
                </span>
                <span className="text-xs font-mono text-[#C5BFB5] flex items-center gap-1 tabular-nums">
                  <Clock className="w-3.5 h-3.5 text-[#E0983B]" />
                  {quizResult.recommendedAction.durationMinutes} Minutes
                </span>
              </div>
              <h3 className="font-editorial text-lg font-semibold text-white">
                Deep-Dive: {quizResult.recommendedAction.topic}
              </h3>
              <p className="text-xs text-[#C5BFB5] leading-relaxed">
                {quizResult.recommendedAction.description}
              </p>
            </div>

            <button
              onClick={handleStartRecommendedFocus}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-xs bg-[#FAF9F6] text-[#22211F] hover:bg-[#EFECE6] transition-colors cursor-pointer shrink-0"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start {quizResult.recommendedAction.durationMinutes}m Focus Session</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
