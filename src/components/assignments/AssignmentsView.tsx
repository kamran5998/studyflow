import React, { useState } from "react";
import { useStudyFlow } from "../../context/StudyFlowContext";
import { Assignment } from "../../types";
import { AssignmentCard } from "./AssignmentCard";
import { AssignmentModal } from "./AssignmentModal";
import { EmptyState } from "../common/EmptyState";
import { CARD_SURFACE, PageHeader, PrimaryButton, SearchInput, Tabs } from "../common/ui";
import { Plus, FileText } from "lucide-react";

export const AssignmentsView: React.FC = () => {
  const {
    assignments,
    addAssignment,
    updateAssignment,
    deleteAssignment,
  } = useStudyFlow();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "completed">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const handleOpenAdd = () => {
    setEditingAssignment(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (assignment: Assignment) => {
    setEditingAssignment(assignment);
    setIsModalOpen(true);
  };

  const handleSave = (data: Omit<Assignment, "id">) => {
    if (editingAssignment) {
      updateAssignment(editingAssignment.id, data);
    } else {
      addAssignment(data);
    }
  };

  const filteredAssignments = assignments.filter((a) => {
    if (statusFilter === "pending" && a.status === "completed") return false;
    if (statusFilter === "completed" && a.status !== "completed") return false;

    if (
      searchQuery &&
      !a.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !a.subjectName.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }

    return true;
  });

  const pendingCount = assignments.filter((a) => a.status !== "completed").length;
  const completedCount = assignments.filter((a) => a.status === "completed").length;

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="COURSEWORK & SUBMISSIONS"
        pill={`${pendingCount} PENDING`}
        pillTone="amber"
        title="Assignments & Coursework"
        subtitle="Track project deadlines, problem sets, and submission milestones across courses."
        actions={
          <>
            <SearchInput
              placeholder="Filter assignments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              wrapperClassName="w-40 sm:w-52"
            />
            <PrimaryButton id="add-assignment-btn" onClick={handleOpenAdd}>
              <Plus className="w-3.5 h-3.5" />
              <span>Add Assignment</span>
            </PrimaryButton>
          </>
        }
      >
        <div className="pt-4 border-t border-[#EFECE6] dark:border-[#2E2C27] flex items-center justify-between gap-3">
          <Tabs
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { id: "all", label: `All (${assignments.length})` },
              { id: "pending", label: `Pending (${pendingCount})` },
              { id: "completed", label: `Completed (${completedCount})` },
            ]}
          />
          <span className="text-[11px] font-mono text-[#8E887E] dark:text-[#9A948A] hidden sm:inline tabular-nums">
            {pendingCount} remaining
          </span>
        </div>
      </PageHeader>

      {assignments.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No assignments recorded"
          description="Add your course assignments and deadlines to stay ahead of submissions."
          actionLabel="Add Assignment"
          onAction={handleOpenAdd}
        />
      ) : filteredAssignments.length === 0 ? (
        <div className={`${CARD_SURFACE} text-center py-12 p-8`}>
          <p className="text-xs text-[#78736A] dark:text-[#A6A096]">
            No assignments match the selected filter.
          </p>
          <button
            onClick={() => {
              setStatusFilter("all");
              setSearchQuery("");
            }}
            className="mt-2 text-xs font-medium text-[#B46914] dark:text-[#E0983B] hover:underline cursor-pointer"
          >
            Show all assignments
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAssignments.map((a) => (
            <AssignmentCard
              key={a.id}
              assignment={a}
              onEdit={handleOpenEdit}
              onDelete={deleteAssignment}
            />
          ))}
        </div>
      )}

      <AssignmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        assignmentToEdit={editingAssignment}
      />
    </div>
  );
};
