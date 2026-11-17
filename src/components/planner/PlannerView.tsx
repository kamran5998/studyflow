import React, { useState } from "react";
import { useStudyFlow } from "../../context/StudyFlowContext";
import { Task, Priority } from "../../types";
import { TaskItem } from "./TaskItem";
import { TaskModal } from "./TaskModal";
import { EmptyState } from "../common/EmptyState";
import { AIPlanSection } from "./AIPlanSection";
import { AIWeaknessCenter } from "./AIWeaknessCenter";
import {
  Plus,
  CalendarDays,
  CheckCircle2,
  Clock,
  Sparkles,
  ListTodo,
  Target,
} from "lucide-react";
import { PageHeader, PrimaryButton } from "../common/ui";

export const PlannerView: React.FC = () => {
  const { tasks, addTask, updateTask, deleteTask, subjects } = useStudyFlow();

  const [activeTab, setActiveTab] = useState<"ai_plan" | "weaknesses" | "tasks">("ai_plan");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const [dateFilter, setDateFilter] = useState<"today" | "tomorrow" | "upcoming" | "all">("today");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "all">("all");
  const [quickInput, setQuickInput] = useState("");

  const todayStr = new Date().toISOString().split("T")[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const handleOpenAdd = () => {
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleSave = (taskData: Omit<Task, "id">) => {
    if (editingTask) {
      updateTask(editingTask.id, taskData);
    } else {
      addTask(taskData);
    }
  };

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim()) return;

    const defaultSubject = subjects[0] || { id: "gen", name: "General Study" };
    addTask({
      title: quickInput.trim(),
      subjectId: defaultSubject.id,
      subjectName: defaultSubject.name,
      date: dateFilter === "tomorrow" ? tomorrowStr : todayStr,
      time: "02:00 PM",
      priority: "medium",
      status: "pending",
      estimatedMinutes: 45,
    });
    setQuickInput("");
  };

  const filteredTasks = tasks.filter((t) => {
    if (dateFilter === "today" && t.date !== todayStr) return false;
    if (dateFilter === "tomorrow" && t.date !== tomorrowStr) return false;
    if (dateFilter === "upcoming" && t.date <= todayStr) return false;
    if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
    return true;
  });

  const completedCount = filteredTasks.filter((t) => t.status === "completed").length;

  return (
    <div className="space-y-6">
      {/* Top Header Card matching Reference #2 */}
      <PageHeader
        kickerLabel="TIMETABLE & SEQUENCING"
        kickerBadge="ACTIVE SEMESTER"
        kickerVariant="amber"
        title="Study Planner & Sequence Engine"
        description="Balanced daily study blocks, syllabus priority allocation, and execution checklist."
        actions={
          <PrimaryButton id="add-task-btn" onClick={handleOpenAdd}>
            <Plus className="w-3.5 h-3.5" />
            <span>Add Task</span>
          </PrimaryButton>
        }
      >
        <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-[#F5F2EC] dark:bg-[#1B1A17] border border-[#E9E5DE] dark:border-[#32302B] rounded-lg">
          <button
            onClick={() => setActiveTab("ai_plan")}
            className={`inline-flex items-center gap-2 py-1.5 px-3 rounded-md text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "ai_plan"
                ? "bg-white dark:bg-[#2A2823] text-[#22211F] dark:text-[#F5F3EE] font-semibold shadow-2xs border border-[#E9E5DE] dark:border-[#3A3731]"
                : "text-[#78736A] dark:text-[#A6A096] hover:text-[#22211F] dark:hover:text-[#F5F3EE] border border-transparent"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#D58A2A] dark:text-[#E0983B]" />
            <span>AI Study Sequence</span>
          </button>

          <button
            id="planner-weakness-tab"
            onClick={() => setActiveTab("weaknesses")}
            className={`inline-flex items-center gap-2 py-1.5 px-3 rounded-md text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "weaknesses"
                ? "bg-white dark:bg-[#2A2823] text-[#22211F] dark:text-[#F5F3EE] font-semibold shadow-2xs border border-[#E9E5DE] dark:border-[#3A3731]"
                : "text-[#78736A] dark:text-[#A6A096] hover:text-[#22211F] dark:hover:text-[#F5F3EE] border border-transparent"
            }`}
          >
            <Target className="w-3.5 h-3.5 text-[#B46914] dark:text-[#E0983B]" />
            <span>Weakness Center</span>
          </button>

          <button
            onClick={() => setActiveTab("tasks")}
            className={`inline-flex items-center gap-2 py-1.5 px-3 rounded-md text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "tasks"
                ? "bg-white dark:bg-[#2A2823] text-[#22211F] dark:text-[#F5F3EE] font-semibold shadow-2xs border border-[#E9E5DE] dark:border-[#3A3731]"
                : "text-[#78736A] dark:text-[#A6A096] hover:text-[#22211F] dark:hover:text-[#F5F3EE] border border-transparent"
            }`}
          >
            <ListTodo className="w-3.5 h-3.5 text-[#78736A]" />
            <span className="font-mono tabular-nums">Tasks ({tasks.length})</span>
          </button>
        </div>
      </PageHeader>

      {activeTab === "ai_plan" && <AIPlanSection />}

      {activeTab === "weaknesses" && <AIWeaknessCenter />}

      {activeTab === "tasks" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#21201C] p-4 rounded-xl border border-[#E9E5DE] dark:border-[#32302B] transition-colors">
            <form onSubmit={handleQuickAdd} className="flex gap-2">
              <input
                id="quick-task-input"
                type="text"
                placeholder="Quick add a study task for today... (Press Enter)"
                value={quickInput}
                onChange={(e) => setQuickInput(e.target.value)}
                className="flex-1 px-3.5 py-2 bg-[#FAF8F4] dark:bg-[#1B1A17] border border-[#E9E5DE] dark:border-[#32302B] rounded-lg text-xs text-[#22211F] dark:text-[#F5F3EE] placeholder:text-[#9A948A] focus:bg-white dark:focus:bg-[#21201C] focus:border-[#D58A2A] outline-hidden transition-colors"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-[#22211F] hover:bg-[#363430] dark:bg-[#F5F3EE] dark:hover:bg-[#E6E2DA] text-white dark:text-[#1C1B18] font-medium text-xs rounded-lg transition-colors cursor-pointer shrink-0"
              >
                Add
              </button>
            </form>

            <div className="mt-3 pt-3 border-t border-[#EFECE6] dark:border-[#32302B] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1 p-1 bg-[#F5F2EC] dark:bg-[#1B1A17] border border-[#E9E5DE] dark:border-[#32302B] rounded-lg">
                {(
                  [
                    { id: "today", label: "Today" },
                    { id: "tomorrow", label: "Tomorrow" },
                    { id: "upcoming", label: "Upcoming" },
                    { id: "all", label: "All Tasks" },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setDateFilter(tab.id)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                      dateFilter === tab.id
                        ? "bg-white dark:bg-[#2A2823] text-[#22211F] dark:text-[#F5F3EE] font-semibold shadow-2xs"
                        : "text-[#78736A] dark:text-[#A6A096] hover:text-[#22211F] dark:hover:text-[#F5F3EE]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-[#78736A] dark:text-[#A6A096]">Priority:</span>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value as Priority | "all")}
                  className="px-2.5 py-1.5 bg-[#FAF8F4] dark:bg-[#1B1A17] border border-[#E9E5DE] dark:border-[#32302B] rounded-lg text-xs text-[#22211F] dark:text-[#F5F3EE] outline-hidden"
                >
                  <option value="all">All</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-[#78736A] dark:text-[#A6A096] px-1">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 font-mono tabular-nums">
                <Clock className="w-3.5 h-3.5 text-[#9A948A]" />
                {filteredTasks.length} tasks scheduled
              </span>
              <span className="flex items-center gap-1 text-[#3B7A57] dark:text-[#68B088] font-medium font-mono tabular-nums">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {completedCount} completed
              </span>
            </div>
            {filteredTasks.length > 0 && (
              <span className="font-mono tabular-nums">
                {Math.round((completedCount / filteredTasks.length) * 100)}% complete
              </span>
            )}
          </div>

          {filteredTasks.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No tasks found"
              description={
                dateFilter === "today"
                  ? "You have no tasks scheduled for today. Generate an AI Study Sequence or add one manually."
                  : "No tasks match the selected date and priority filters."
              }
              actionLabel="Add New Task"
              onAction={handleOpenAdd}
            />
          ) : (
            <div className="space-y-2.5">
              {filteredTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onEdit={handleOpenEdit}
                  onDelete={deleteTask}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        taskToEdit={editingTask}
        defaultDate={dateFilter === "tomorrow" ? tomorrowStr : todayStr}
      />
    </div>
  );
};
