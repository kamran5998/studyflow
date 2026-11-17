import React, { useState, useEffect } from "react";
import { Modal } from "../common/Modal";
import { Subject, SubjectTopic } from "../../types";
import { INPUT_SURFACE, PrimaryButton, SecondaryButton } from "../common/ui";
import { Plus, Trash2 } from "lucide-react";
import { generateId } from "../../lib/utils";

interface SubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (subjectData: Omit<Subject, "id" | "createdAt">) => void;
  onDelete?: (id: string) => void;
  subjectToEdit?: Subject | null;
}

export const SubjectModal: React.FC<SubjectModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  subjectToEdit,
}) => {
  const [name, setName] = useState("");
  const [topics, setTopics] = useState<SubjectTopic[]>([]);
  const [newTopicTitle, setNewTopicTitle] = useState("");

  useEffect(() => {
    if (subjectToEdit) {
      setName(subjectToEdit.name);
      setTopics(subjectToEdit.topics || []);
    } else {
      setName("");
      setTopics([
        { id: generateId(), title: "Foundations & Introduction", completed: false },
        { id: generateId(), title: "Core Principles & Theory", completed: false },
      ]);
    }
  }, [subjectToEdit, isOpen]);

  const handleAddTopic = () => {
    if (!newTopicTitle.trim()) return;
    setTopics((prev) => [
      ...prev,
      { id: generateId(), title: newTopicTitle.trim(), completed: false },
    ]);
    setNewTopicTitle("");
  };

  const handleRemoveTopic = (id: string) => {
    setTopics((prev) => prev.filter((t) => t.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const completedCount = topics.filter((t) => t.completed).length;
    const progress = topics.length > 0 ? Math.round((completedCount / topics.length) * 100) : 0;

    onSave({
      name: name.trim(),
      color: "amber",
      iconName: "BookOpen",
      progress,
      topics,
      totalStudyMinutes: subjectToEdit?.totalStudyMinutes || 0,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={subjectToEdit ? "Edit Course" : "Add New Course"}
      description="Create a curriculum module and syllabus checklist"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Course Name */}
        <div>
          <label className="block text-[11px] font-mono uppercase tracking-[0.08em] text-[#78736A] dark:text-[#A6A096] mb-1.5">
            Course Name *
          </label>
          <input
            id="subject-name-input"
            type="text"
            required
            placeholder="e.g. Data Structures & Algorithms"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`${INPUT_SURFACE} w-full px-3 py-2`}
          />
        </div>

        {/* Topics List */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-[11px] font-mono uppercase tracking-[0.08em] text-[#78736A] dark:text-[#A6A096]">
              Syllabus Topics ({topics.length})
            </label>
            <span className="text-[10px] text-[#8E887E] dark:text-[#9A948A]">
              Checking topics updates progress %
            </span>
          </div>

          <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 bg-[#FBF9F5] dark:bg-[#1B1A17] rounded-xl border border-[#E9E5DE] dark:border-[#32302B] mb-2">
            {topics.length === 0 ? (
              <p className="text-[11px] text-[#8E887E] dark:text-[#9A948A] text-center py-2">
                No topics yet. Add chapters or units below.
              </p>
            ) : (
              topics.map((t, idx) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between bg-white dark:bg-[#21201C] px-2.5 py-1.5 rounded-lg border border-[#E9E5DE] dark:border-[#32302B] text-xs text-[#22211F] dark:text-[#F5F3EE]"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-[10px] text-[#8E887E] dark:text-[#9A948A] font-mono tabular-nums">
                      #{idx + 1}
                    </span>
                    <span className="truncate">{t.title}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveTopic(t.id)}
                    className="text-[#8E887E] hover:text-[#A83838] dark:hover:text-[#F28B8B] p-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Add topic input */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Add topic (e.g. Binary Search Trees)"
              value={newTopicTitle}
              onChange={(e) => setNewTopicTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddTopic();
                }
              }}
              className={`${INPUT_SURFACE} flex-1 px-3 py-1.5`}
            />
            <SecondaryButton type="button" onClick={handleAddTopic}>
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </SecondaryButton>
          </div>
        </div>

        {/* Submit / Cancel Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-[#EFECE6] dark:border-[#2E2C27]">
          {subjectToEdit && onDelete ? (
            <button
              type="button"
              onClick={() => {
                onDelete(subjectToEdit.id);
                onClose();
              }}
              className="px-3 py-2 text-xs font-semibold text-[#A83838] dark:text-[#F28B8B] hover:bg-[#FDF2F2] dark:hover:bg-[#3A1E1E] rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Course</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <SecondaryButton type="button" onClick={onClose}>
              Cancel
            </SecondaryButton>
            <PrimaryButton id="subject-save-btn" type="submit">
              {subjectToEdit ? "Save Changes" : "Create Course"}
            </PrimaryButton>
          </div>
        </div>
      </form>
    </Modal>
  );
};
