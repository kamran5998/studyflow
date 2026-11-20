import React, { useState, useEffect } from "react";
import { Modal } from "../common/Modal";
import { Task, Priority, TaskStatus } from "../../types";
import { useStudyFlow } from "../../context/StudyFlowContext";
import { PrimaryButton, SecondaryButton } from "../common/ui";

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: Omit<Task, "id">) => void;
  taskToEdit?: Task | null;
  defaultDate?: string;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  taskToEdit,
  defaultDate,
}) => {
  const { subjects } = useStudyFlow();

  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || "");
  const [topic, setTopic] = useState("");
  const [date, setDate] = useState(
    defaultDate || new Date().toISOString().split("T")[0]
  );
  const [time, setTime] = useState("10:00 AM");
  const [priority, setPriority] = useState<Priority>("medium");
  const [estimatedMinutes, setEstimatedMinutes] = useState(45);
  const [status, setStatus] = useState<TaskStatus>("pending");

  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title);
      setSubjectId(taskToEdit.subjectId);
      setTopic(taskToEdit.topic || "");
      setDate(taskToEdit.date);
      setTime(taskToEdit.time || "10:00 AM");
      setPriority(taskToEdit.priority);
      setEstimatedMinutes(taskToEdit.estimatedMinutes || 45);
      setStatus(taskToEdit.status);
    } else {
      setTitle("");
      setSubjectId(subjects[0]?.id || "");
      setTopic("");
      setDate(defaultDate || new Date().toISOString().split("T")[0]);
      setTime("10:00 AM");
      setPriority("medium");
      setEstimatedMinutes(45);
      setStatus("pending");
    }
  }, [taskToEdit, defaultDate, isOpen, subjects]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const selectedSubject = subjects.find((s) => s.id === subjectId);
    const subjectName = selectedSubject ? selectedSubject.name : "General Study";

    onSave({
      title: title.trim(),
      subjectId,
      subjectName,
      topic: topic.trim() || undefined,
      date,
      time: time || undefined,
      priority,
      status,
      estimatedMinutes,
    });
    onClose();
  };

  const fieldClass =
    "w-full px-3 py-2 bg-[#FAF8F4] dark:bg-[#1B1A17] border border-[#E9E5DE] dark:border-[#32302B] rounded-lg text-xs text-[#22211F] dark:text-[#F5F3EE] placeholder:text-[#9A948A] focus:bg-white dark:focus:bg-[#21201C] focus:border-[#D58A2A] outline-hidden transition-colors";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={taskToEdit ? "Edit Study Task" : "Add Study Task"}
      description="Schedule a focused study block with date, time, and priority."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[10px] font-mono font-semibold uppercase tracking-[0.14em] text-[#78736A] dark:text-[#A6A096] mb-1">
            Task Description *
          </label>
          <input
            id="task-title-input"
            type="text"
            required
            placeholder="e.g. Read Chapter 4 Normalization & solve exercises"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={fieldClass}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-mono font-semibold uppercase tracking-[0.14em] text-[#78736A] dark:text-[#A6A096] mb-1">
              Course
            </label>
            <select
              id="task-subject-select"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className={fieldClass}
            >
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
              <option value="general">General Study</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-mono font-semibold uppercase tracking-[0.14em] text-[#78736A] dark:text-[#A6A096] mb-1">
              Topic / Chapter
            </label>
            <input
              id="task-topic-input"
              type="text"
              placeholder="e.g. BCNF Decomposition"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className={fieldClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-mono font-semibold uppercase tracking-[0.14em] text-[#78736A] dark:text-[#A6A096] mb-1">
              Date *
            </label>
            <input
              id="task-date-input"
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={fieldClass}
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono font-semibold uppercase tracking-[0.14em] text-[#78736A] dark:text-[#A6A096] mb-1">
              Scheduled Time
            </label>
            <input
              id="task-time-input"
              type="text"
              placeholder="e.g. 02:00 PM"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className={fieldClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-mono font-semibold uppercase tracking-[0.14em] text-[#78736A] dark:text-[#A6A096] mb-1">
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
                        ? "bg-[#FDF2F2] dark:bg-[#3A1E1E] border-[#A83838] text-[#A83838] dark:text-[#E57373] font-semibold"
                        : p === "medium"
                        ? "bg-[#FAF1E3] dark:bg-[#3A2C16] border-[#D58A2A] text-[#B46914] dark:text-[#E0983B] font-semibold"
                        : "bg-[#F5F2EC] dark:bg-[#2A2823] border-[#78736A] text-[#22211F] dark:text-[#F5F3EE] font-semibold"
                      : "border-[#E9E5DE] dark:border-[#32302B] bg-white dark:bg-[#21201C] text-[#78736A] dark:text-[#A6A096] hover:bg-[#FAF8F4] dark:hover:bg-[#2A2823]"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono font-semibold uppercase tracking-[0.14em] text-[#78736A] dark:text-[#A6A096] mb-1">
              Est. Minutes
            </label>
            <input
              id="task-minutes-input"
              type="number"
              min={10}
              max={300}
              step={5}
              value={estimatedMinutes}
              onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
              className={fieldClass}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EFECE6] dark:border-[#32302B]">
          <SecondaryButton type="button" onClick={onClose}>
            Cancel
          </SecondaryButton>
          <PrimaryButton id="task-save-btn" type="submit">
            {taskToEdit ? "Save Task" : "Add to Planner"}
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  );
};
