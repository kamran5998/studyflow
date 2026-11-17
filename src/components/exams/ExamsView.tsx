import React, { useState } from "react";
import { useStudyFlow } from "../../context/StudyFlowContext";
import { Exam } from "../../types";
import { ExamCard } from "./ExamCard";
import { ExamModal } from "./ExamModal";
import { AIExamPrepModal } from "./AIExamPrepModal";
import { EmptyState } from "../common/EmptyState";
import { PageHeader, PrimaryButton } from "../common/ui";
import { Plus, GraduationCap } from "lucide-react";
import { getDaysRemaining } from "../../lib/utils";
import { calculateExamReadiness } from "../../lib/examCalculations";

export const ExamsView: React.FC = () => {
  const { exams, subjects, quizScores, focusSessions, addExam, updateExam, deleteExam } = useStudyFlow();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);

  // AI Exam Strategy Modal
  const [aiExam, setAiExam] = useState<Exam | null>(null);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);

  const handleOpenAdd = () => {
    setEditingExam(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (exam: Exam) => {
    setEditingExam(exam);
    setIsModalOpen(true);
  };

  const handleOpenAIPrep = (exam: Exam) => {
    setAiExam(exam);
    setIsAIModalOpen(true);
  };

  const handleSave = (examData: Omit<Exam, "id">) => {
    if (editingExam) {
      updateExam(editingExam.id, examData);
    } else {
      addExam(examData);
    }
  };

  // Sort exams by date ascending
  const sortedExams = [...exams].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const closestExam = sortedExams.find((e) => getDaysRemaining(e.date).days >= 0);

  // Dynamic real readiness average across all active exams
  const avgReadiness =
    exams.length > 0
      ? Math.round(
          exams.reduce((acc, e) => {
            const sub = subjects.find((s) => s.id === e.subjectId || s.name.toLowerCase() === e.subjectName.toLowerCase());
            return acc + calculateExamReadiness(e, sub, quizScores, focusSessions).overallReadiness;
          }, 0) / exams.length
        )
      : 0;

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <PageHeader
        kicker="EXAMINATION TIMETABLE"
        pill="MILESTONES"
        pillTone="crimson"
        title="Exam Timetable & Readiness"
        subtitle="Countdown timestamps, syllabus preparation targets, and live readiness diagnostics."
        actions={
          <PrimaryButton id="add-exam-btn" onClick={handleOpenAdd}>
            <Plus className="w-3.5 h-3.5" />
            <span>Schedule Exam</span>
          </PrimaryButton>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="p-4 bg-[#FBF9F5] dark:bg-[#1B1A17] rounded-xl border border-[#E9E5DE] dark:border-[#32302B]">
            <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-[#8E887E] dark:text-[#9A948A] font-medium block">
              Upcoming Exams
            </span>
            <div className="text-lg font-mono font-bold text-[#22211F] dark:text-[#F5F3EE] mt-1 tabular-nums">
              {exams.length} Scheduled
            </div>
          </div>

          <div className="p-4 bg-[#FDF5F5] dark:bg-[#2B1D1D] rounded-xl border border-[#F0D3D2] dark:border-[#523030]">
            <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-[#A83838] dark:text-[#F28B8B] font-medium block">
              Next Critical Test
            </span>
            <div className="text-lg font-editorial font-bold text-[#A83838] dark:text-[#F28B8B] mt-1 truncate">
              {closestExam
                ? `${closestExam.subjectName.split(" ")[0]} (${getDaysRemaining(closestExam.date).label})`
                : "None scheduled"}
            </div>
          </div>

          <div className="p-4 bg-[#FBF9F5] dark:bg-[#1B1A17] rounded-xl border border-[#E9E5DE] dark:border-[#32302B]">
            <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-[#8E887E] dark:text-[#9A948A] font-medium block">
              Average Readiness
            </span>
            <div className="text-lg font-mono font-bold text-[#22211F] dark:text-[#F5F3EE] mt-1 tabular-nums">
              {avgReadiness}% across subjects
            </div>
          </div>
        </div>
      </PageHeader>

      {/* Grid of Exams or Empty State */}
      {sortedExams.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No exams on the timetable"
          description="Add your upcoming midterms or final exams to initiate readiness tracking and custom study countdowns."
          actionLabel="Schedule First Exam"
          onAction={handleOpenAdd}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sortedExams.map((exam) => (
            <ExamCard
              key={exam.id}
              exam={exam}
              onEdit={handleOpenEdit}
              onDelete={deleteExam}
              onOpenAIPrep={handleOpenAIPrep}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      <ExamModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        examToEdit={editingExam}
      />

      {/* AI Exam Strategy Modal */}
      <AIExamPrepModal
        exam={aiExam}
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
      />
    </div>
  );
};
