import React, { useState, useEffect } from "react";
import { Modal } from "../common/Modal";
import { Exam } from "../../types";
import { useStudyFlow } from "../../context/StudyFlowContext";
import { INPUT_SURFACE, PrimaryButton, SecondaryButton } from "../common/ui";
import { Target, Clock } from "lucide-react";

interface ExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (examData: Omit<Exam, "id">) => void;
  examToEdit?: Exam | null;
}

export const ExamModal: React.FC<ExamModalProps> = ({
  isOpen,
  onClose,
  onSave,
  examToEdit,
}) => {
  const { subjects } = useStudyFlow();

  const [subjectId, setSubjectId] = useState(subjects[0]?.id || "");
  const [title, setTitle] = useState("Midterm Examination");
  const [date, setDate] = useState("");
  const [targetHours, setTargetHours] = useState(6.0);
  const [topicWeightages, setTopicWeightages] = useState<Record<string, number>>({});

  const selectedSubject = subjects.find((s) => s.id === subjectId);

  useEffect(() => {
    if (examToEdit) {
      setSubjectId(examToEdit.subjectId);
      setTitle(examToEdit.title);
      setDate(examToEdit.date);
      setTargetHours(examToEdit.targetHours || 6.0);
      setTopicWeightages(examToEdit.topicWeightages || {});
    } else {
      setSubjectId(subjects[0]?.id || "");
      setTitle("Midterm Examination");
      const d = new Date();
      d.setDate(d.getDate() + 7);
      setDate(d.toISOString().split("T")[0]);
      setTargetHours(6.0);
      setTopicWeightages({});
    }
  }, [examToEdit, isOpen, subjects]);

  // Set default topic weightages when subject changes
  useEffect(() => {
    if (selectedSubject && selectedSubject.topics && selectedSubject.topics.length > 0) {
      const defaultWeights: Record<string, number> = {};
      const presets = [35, 25, 20, 20, 15, 10];
      selectedSubject.topics.forEach((t, i) => {
        defaultWeights[t.id] = topicWeightages[t.id] || t.weightage || presets[i % presets.length] || 20;
      });
      setTopicWeightages((prev) => ({ ...defaultWeights, ...prev }));
    }
  }, [subjectId, selectedSubject]);

  const handleWeightageChange = (topicId: string, val: number) => {
    setTopicWeightages((prev) => ({
      ...prev,
      [topicId]: Math.max(5, Math.min(100, val)),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) return;

    const sub = subjects.find((s) => s.id === subjectId);
    const subjectName = sub ? sub.name : "Core Subject";

    onSave({
      subjectId,
      subjectName,
      title: title.trim(),
      date,
      targetHours,
      topicWeightages,
      preparationPercentage: examToEdit?.preparationPercentage ?? 50,
      topicsCovered: examToEdit?.topicsCovered ?? [],
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={examToEdit ? "Edit Exam & Syllabus Weightages" : "Schedule Exam & Set Topic Weightages"}
      description="Record upcoming exam dates and configure syllabus topic marks weightages for AI score optimization"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Subject & Title */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-[0.08em] text-[#78736A] dark:text-[#A6A096] mb-1.5">
              Course *
            </label>
            <select
              id="exam-subject-select"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className={`${INPUT_SURFACE} w-full px-3 py-2`}
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id} className="dark:bg-[#21201C] dark:text-[#F5F3EE]">
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase tracking-[0.08em] text-[#78736A] dark:text-[#A6A096] mb-1.5">
              Exam Type / Title *
            </label>
            <input
              id="exam-title-input"
              type="text"
              required
              placeholder="e.g. Final Examination"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`${INPUT_SURFACE} w-full px-3 py-2`}
            />
          </div>
        </div>

        {/* Date & Target Study Hours */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-[0.08em] text-[#78736A] dark:text-[#A6A096] mb-1.5">
              Exam Date *
            </label>
            <input
              id="exam-date-input"
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={`${INPUT_SURFACE} w-full px-3 py-2`}
            />
          </div>

          <div>
            <label className="text-[11px] font-mono uppercase tracking-[0.08em] text-[#78736A] dark:text-[#A6A096] mb-1.5 flex items-center justify-between">
              <span>Target Study Goal</span>
              <span className="text-[#B46914] dark:text-[#E0983B] font-bold">{targetHours} hrs</span>
            </label>
            <div className="flex items-center gap-2 bg-[#FAF8F4] dark:bg-[#1B1A17] px-3 py-2 rounded-lg border border-[#E2DDD4] dark:border-[#3A3731]">
              <Clock className="w-3.5 h-3.5 text-[#8E887E]" />
              <input
                type="number"
                min="1"
                max="40"
                step="0.5"
                value={targetHours}
                onChange={(e) => setTargetHours(parseFloat(e.target.value) || 6.0)}
                className="w-full text-xs font-mono font-semibold bg-transparent text-[#22211F] dark:text-[#F5F3EE] outline-hidden"
              />
              <span className="text-[11px] text-[#8E887E] font-medium">hours</span>
            </div>
          </div>
        </div>

        {/* Topic Marks Weightage Configuration */}
        {selectedSubject && selectedSubject.topics && selectedSubject.topics.length > 0 && (
          <div className="pt-3 space-y-2 border-t border-[#EFECE6] dark:border-[#2E2C27]">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Target className="w-4 h-4 text-[#D58A2A] dark:text-[#E0983B]" />
                <span className="text-xs font-semibold text-[#22211F] dark:text-[#F5F3EE]">
                  Topic Marks / Weightage (% of Exam)
                </span>
              </div>
              <span className="text-[11px] text-[#8E887E] dark:text-[#9A948A]">
                AI prioritizes high-weightage topics
              </span>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {selectedSubject.topics.map((t) => {
                const currentWeight = topicWeightages[t.id] || 20;
                const isHigh = currentWeight >= 30;

                return (
                  <div
                    key={t.id}
                    className="p-2.5 rounded-xl border border-[#E9E5DE] dark:border-[#32302B] bg-[#FBF9F5] dark:bg-[#1B1A17] flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="truncate flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${isHigh ? "bg-[#A83838]" : "bg-[#D58A2A]"}`} />
                      <span className="font-medium text-[#22211F] dark:text-[#F5F3EE] truncate">
                        {t.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase ${
                          isHigh
                            ? "bg-[#FDF2F2] dark:bg-[#3A1E1E] text-[#A83838] dark:text-[#F28B8B]"
                            : "bg-[#F5F2EC] dark:bg-[#2A2823] text-[#78736A] dark:text-[#A6A096]"
                        }`}
                      >
                        {isHigh ? "High Weight" : "Standard"}
                      </span>

                      <div className="flex items-center gap-1 bg-white dark:bg-[#21201C] border border-[#E2DDD4] dark:border-[#3A3731] rounded-lg px-2 py-0.5">
                        <input
                          type="number"
                          min="5"
                          max="100"
                          step="5"
                          value={currentWeight}
                          onChange={(e) => handleWeightageChange(t.id, parseInt(e.target.value) || 20)}
                          className="w-10 text-center font-mono font-bold text-xs bg-transparent text-[#22211F] dark:text-[#F5F3EE] outline-hidden tabular-nums"
                        />
                        <span className="text-[10px] text-[#8E887E] font-mono font-bold">%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EFECE6] dark:border-[#2E2C27]">
          <SecondaryButton type="button" onClick={onClose}>
            Cancel
          </SecondaryButton>
          <PrimaryButton id="exam-save-btn" type="submit">
            {examToEdit ? "Save Exam & Weightages" : "Schedule Exam"}
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  );
};
