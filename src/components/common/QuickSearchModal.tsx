import React, { useState, useEffect, useMemo } from "react";
import { Search, X, BookOpen, CheckSquare, FileText, Calendar, ArrowRight } from "lucide-react";
import { useStudyFlow, PageId } from "../../context/StudyFlowContext";

export const QuickSearchModal: React.FC = () => {
  const {
    isSearchOpen,
    setIsSearchOpen,
    subjects,
    tasks,
    assignments,
    exams,
    setActivePage,
  } = useStudyFlow();

  const [query, setQuery] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen(!isSearchOpen);
      }
      if (e.key === "Escape" && isSearchOpen) {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSearchOpen, setIsSearchOpen]);

  useEffect(() => {
    if (isSearchOpen) setQuery("");
  }, [isSearchOpen]);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return { subjects: [], tasks: [], assignments: [], exams: [] };

    return {
      subjects: subjects.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.code && s.code.toLowerCase().includes(q))
      ),
      tasks: tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.subjectName.toLowerCase().includes(q)
      ),
      assignments: assignments.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.subjectName.toLowerCase().includes(q)
      ),
      exams: exams.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.subjectName.toLowerCase().includes(q)
      ),
    };
  }, [query, subjects, tasks, assignments, exams]);

  if (!isSearchOpen) return null;

  const totalResults =
    searchResults.subjects.length +
    searchResults.tasks.length +
    searchResults.assignments.length +
    searchResults.exams.length;

  const handleSelect = (page: PageId) => {
    setActivePage(page);
    setIsSearchOpen(false);
  };

  return (
    <div
      id="search-modal-backdrop"
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-[#22211F]/45 dark:bg-black/65 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsSearchOpen(false);
      }}
    >
      <div className="w-full max-w-xl bg-white dark:bg-[#21201C] rounded-xl shadow-2xl border border-[#E9E5DE] dark:border-[#32302B] overflow-hidden transition-colors">
        <div className="flex items-center px-4 py-3 border-b border-[#EFECE6] dark:border-[#32302B] gap-3">
          <Search className="w-4 h-4 text-[#9A948A] shrink-0" />
          <input
            id="quick-search-input"
            autoFocus
            type="text"
            placeholder="Search courses, tasks, assignments, exams..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-[#22211F] dark:text-[#F5F3EE] placeholder:text-[#9A948A] outline-hidden font-normal"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-[#9A948A] hover:text-[#22211F] dark:hover:text-[#F5F3EE] p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-[#78736A] dark:text-[#A6A096] bg-[#FAF8F4] dark:bg-[#2A2823] rounded border border-[#E9E5DE] dark:border-[#3A3731]">
            ESC
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {!query.trim() ? (
            <div className="py-8 text-center text-xs text-[#78736A] dark:text-[#A6A096]">
              Type a course, task title, assignment, or exam to jump directly.
            </div>
          ) : totalResults === 0 ? (
            <div className="py-8 text-center text-xs text-[#78736A] dark:text-[#A6A096]">
              No matches found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            <div className="space-y-4 p-1">
              {searchResults.subjects.length > 0 && (
                <div>
                  <div className="text-[10px] font-mono font-semibold text-[#9A948A] uppercase tracking-[0.14em] px-2.5 mb-1">
                    Courses
                  </div>
                  {searchResults.subjects.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleSelect("subjects")}
                      className="w-full flex items-center justify-between px-3 py-2 text-left rounded-lg hover:bg-[#FAF8F4] dark:hover:bg-[#2A2823] text-xs transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <BookOpen className="w-3.5 h-3.5 text-[#D58A2A]" />
                        <span className="font-medium text-[#22211F] dark:text-[#F5F3EE]">
                          {s.name}
                        </span>
                        {s.code && (
                          <span className="text-[10px] font-mono text-[#78736A] dark:text-[#A6A096] bg-[#F5F2EC] dark:bg-[#2A2823] px-1.5 py-0.5 rounded">
                            {s.code}
                          </span>
                        )}
                      </div>
                      <ArrowRight className="w-3 h-3 text-[#9A948A] group-hover:text-[#22211F] dark:group-hover:text-[#F5F3EE]" />
                    </button>
                  ))}
                </div>
              )}

              {searchResults.tasks.length > 0 && (
                <div>
                  <div className="text-[10px] font-mono font-semibold text-[#9A948A] uppercase tracking-[0.14em] px-2.5 mb-1">
                    Tasks
                  </div>
                  {searchResults.tasks.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleSelect("planner")}
                      className="w-full flex items-center justify-between px-3 py-2 text-left rounded-lg hover:bg-[#FAF8F4] dark:hover:bg-[#2A2823] text-xs transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <CheckSquare className="w-3.5 h-3.5 text-[#3B7A57]" />
                        <div>
                          <span className="font-medium text-[#22211F] dark:text-[#F5F3EE]">
                            {t.title}
                          </span>
                          <span className="ml-2 text-[10px] text-[#78736A] dark:text-[#A6A096]">
                            {t.subjectName}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-[#9A948A]">
                        {t.time || t.date}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {searchResults.assignments.length > 0 && (
                <div>
                  <div className="text-[10px] font-mono font-semibold text-[#9A948A] uppercase tracking-[0.14em] px-2.5 mb-1">
                    Assignments
                  </div>
                  {searchResults.assignments.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => handleSelect("assignments")}
                      className="w-full flex items-center justify-between px-3 py-2 text-left rounded-lg hover:bg-[#FAF8F4] dark:hover:bg-[#2A2823] text-xs transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <FileText className="w-3.5 h-3.5 text-[#B46914]" />
                        <div>
                          <span className="font-medium text-[#22211F] dark:text-[#F5F3EE]">
                            {a.title}
                          </span>
                          <span className="ml-2 text-[10px] text-[#78736A] dark:text-[#A6A096]">
                            {a.subjectName}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-[#9A948A]">
                        Due {a.dueDate}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {searchResults.exams.length > 0 && (
                <div>
                  <div className="text-[10px] font-mono font-semibold text-[#9A948A] uppercase tracking-[0.14em] px-2.5 mb-1">
                    Exams
                  </div>
                  {searchResults.exams.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => handleSelect("exams")}
                      className="w-full flex items-center justify-between px-3 py-2 text-left rounded-lg hover:bg-[#FAF8F4] dark:hover:bg-[#2A2823] text-xs transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <Calendar className="w-3.5 h-3.5 text-[#A83838]" />
                        <div>
                          <span className="font-medium text-[#22211F] dark:text-[#F5F3EE]">
                            {e.subjectName}
                          </span>
                          <span className="ml-2 text-[10px] text-[#78736A] dark:text-[#A6A096]">
                            {e.title}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-[#A83838] dark:text-[#E57373] font-medium">
                        {e.date}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-2 bg-[#FAF8F4] dark:bg-[#1C1B18] border-t border-[#EFECE6] dark:border-[#32302B] text-[11px] text-[#78736A] dark:text-[#A6A096]">
          <span>Index search</span>
          <div className="flex items-center gap-2">
            <span>Press</span>
            <kbd className="px-1.5 py-0.5 bg-white dark:bg-[#21201C] border border-[#E9E5DE] dark:border-[#32302B] rounded font-mono text-[10px] text-[#22211F] dark:text-[#F5F3EE]">
              Ctrl+K
            </kbd>
            <span>anywhere</span>
          </div>
        </div>
      </div>
    </div>
  );
};
