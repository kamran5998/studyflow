import React, { useState, useEffect } from "react";
import { Modal } from "../common/Modal";
import { Assignment, Priority, AssignmentStatus } from "../../types";
import { useStudyFlow } from "../../context/StudyFlowContext";
import { INPUT_SURFACE, PrimaryButton, SecondaryButton } from "../common/ui";

interface AssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Assignment, "id">) => void;
  assignmentToEdit?: Assignment | null;
}

export const AssignmentModal: React.FC<AssignmentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  assignmentToEdit,
}) => {
  const { subjects } = useStudyFlow();

  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || "");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [status, setStatus] = useState<AssignmentStatus>("pending");
  const [description, setDescription] = useState("");
  const [points, setPoints] = useState(100);

  useEffect(() => {
    if (assignmentToEdit) {
      setTitle(assignmentToEdit.title);
      setSubjectId(assignmentToEdit.subjectId);
      setDueDate(assignmentToEdit.dueDate);
      setPriority(assignmentToEdit.priority);
      setStatus(assignmentToEdit.status);
      setDescription(assignmentToEdit.description || "");
      setPoints(assignmentToEdit.points || 100);
    } else {
      setTitle("");
      setSubjectId(subjects[0]?.id || "");
      const d = new Date();
      d.setDate(d.getDate() + 3);
      setDueDate(d.toISOString().split("T")[0]);
      setPriority("medium");
      setStatus("pending");
      setDescription("");
      setPoints(100);
    }
  }, [assignmentToEdit, isOpen, subjects]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueDate) return;

    const sub = subjects.find((s) => s.id === subjectId);
    const subjectName = sub ? sub.name : "General Course";

    onSave({
      title: title.trim(),
      subjectId,
      subjectName,
      dueDate,
      priority,
      status,
      description: description.trim() || undefined,
      points,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={assignmentToEdit ? "Edit Assignment" : "Add New Assignment"}
      description="Track coursework deadlines, problem sets, and lab submissions"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-[11px] font-mono uppercase tracking-[0.08em] text-[#78736A] dark:text-[#A6A096] mb-1.5">
            Assignment Title *
          </label>
          <input
            id="assignment-title-input"
            type="text"
            required
            placeholder="e.g. Problem Set 4: Dynamic Programming"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={`${INPUT_SURFACE} w-full px-3 py-2`}
          />
        </div>

        {/* Subject & Due Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-[0.08em] text-[#78736A] dark:text-[#A6A096] mb-1.5">
              Course *
            </label>
            <select
              id="assignment-subject-select"
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
              Due Date *
            </label>
            <input
              id="assignment-due-date-input"
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={`${INPUT_SURFACE} w-full px-3 py-2`}
            />
          </div>
        </div>

        {/* Priority & Points */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-[0.08em] text-[#78736A] dark:text-[#A6A096] mb-1.5">
              Priority
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(["low", "medium", "high"] as Priority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`py-1.5 text-center text-xs rounded-lg font-medium border cursor-pointer capitalize transition-colors ${
                    priority === p
                      ? p === "high"
                        ? "bg-[#FDF2F2] dark:bg-[#3A1E1E] border-[#E8BABA] dark:border-[#6B3333] text-[#A83838] dark:text-[#F28B8B] font-semibold"
                        : p === "medium"
                        ? "bg-[#FAF1E3] dark:bg-[#3A2C16] border-[#E0BE89] dark:border-[#6D5229] text-[#B46914] dark:text-[#F0B35E] font-semibold"
                        : "bg-[#F5F2EC] dark:bg-[#2A2823] border-[#D4CEC3] dark:border-[#49453D] text-[#22211F] dark:text-[#F5F3EE] font-semibold"
                      : "border-[#E9E5DE] dark:border-[#32302B] bg-white dark:bg-[#21201C] text-[#78736A] dark:text-[#A6A096] hover:bg-[#FAF8F4] dark:hover:bg-[#2A2823]"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase tracking-[0.08em] text-[#78736A] dark:text-[#A6A096] mb-1.5">
              Max Points / Weight
            </label>
            <input
              id="assignment-points-input"
              type="number"
              min={0}
              max={1000}
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
              className={`${INPUT_SURFACE} w-full px-3 py-2 font-mono tabular-nums`}
            />
          </div>
        </div>

        {/* Notes / Instructions */}
        <div>
          <label className="block text-[11px] font-mono uppercase tracking-[0.08em] text-[#78736A] dark:text-[#A6A096] mb-1.5">
            Instructions / Guidelines
          </label>
          <textarea
            id="assignment-desc-input"
            rows={2}
            placeholder="e.g. Upload PDF report and repository link by 11:59 PM"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`${INPUT_SURFACE} w-full px-3 py-2`}
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EFECE6] dark:border-[#2E2C27]">
          <SecondaryButton type="button" onClick={onClose}>
            Cancel
          </SecondaryButton>
          <PrimaryButton id="assignment-save-btn" type="submit">
            {assignmentToEdit ? "Save Changes" : "Create Assignment"}
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  );
};
