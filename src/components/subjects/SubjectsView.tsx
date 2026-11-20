import React, { useState } from "react";
import { useStudyFlow } from "../../context/StudyFlowContext";
import { Subject } from "../../types";
import { SubjectCard } from "./SubjectCard";
import { SubjectModal } from "./SubjectModal";
import { EmptyState } from "../common/EmptyState";
import { CARD_SURFACE, PageHeader, PrimaryButton, SearchInput } from "../common/ui";
import { Plus, BookOpen } from "lucide-react";

export const SubjectsView: React.FC = () => {
  const { subjects, addSubject, updateSubject, deleteSubject } = useStudyFlow();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [searchFilter, setSearchFilter] = useState("");

  const handleOpenAdd = () => {
    setEditingSubject(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setIsModalOpen(true);
  };

  const handleSave = (subjectData: Omit<Subject, "id" | "createdAt">) => {
    if (editingSubject) {
      updateSubject(editingSubject.id, subjectData);
    } else {
      addSubject(subjectData);
    }
  };

  const filteredSubjects = subjects.filter(
    (s) =>
      s.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (s.code && s.code.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Top Header Controls */}
      <PageHeader
        kicker="CURRICULUM LEDGER"
        pill={`${subjects.length} REGISTERED`}
        pillTone="amber"
<<<<<<< HEAD
        title="Subjects"
=======
        title="Courses & Syllabus Coverage"
>>>>>>> 9d281b97efabd4f9d488c8bc37687c9b1dfe9f78
        subtitle="Track topic mastery, syllabus checklists, and accumulated focus time per course."
        actions={
          <>
            <SearchInput
              placeholder="Filter courses..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              wrapperClassName="w-40 sm:w-52"
            />
            <PrimaryButton id="add-subject-btn" onClick={handleOpenAdd}>
              <Plus className="w-3.5 h-3.5" />
              <span>Add Course</span>
            </PrimaryButton>
          </>
        }
      />

      {/* Grid or Empty State */}
      {subjects.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No courses registered"
          description="Add your first college course to start tracking chapters, syllabus completion, and exam preparation."
          actionLabel="Add Course"
          onAction={handleOpenAdd}
        />
      ) : filteredSubjects.length === 0 ? (
        <div className={`${CARD_SURFACE} text-center py-12 p-8`}>
          <p className="text-xs text-[#78736A] dark:text-[#A6A096]">
            No courses matching &ldquo;{searchFilter}&rdquo;
          </p>
          <button
            onClick={() => setSearchFilter("")}
            className="mt-2 text-xs font-medium text-[#B46914] dark:text-[#E0983B] hover:underline cursor-pointer"
          >
            Clear filter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSubjects.map((sub) => (
            <SubjectCard
              key={sub.id}
              subject={sub}
              onEdit={handleOpenEdit}
              onDelete={deleteSubject}
            />
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      <SubjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        onDelete={deleteSubject}
        subjectToEdit={editingSubject}
      />
    </div>
  );
};
