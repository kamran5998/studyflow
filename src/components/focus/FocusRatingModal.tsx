import React, { useState } from "react";
import { Modal } from "../common/Modal";
import { Star } from "lucide-react";

interface FocusRatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitRating: (rating: number, notes?: string) => void;
  sessionDuration: number;
  subjectName: string;
  topic?: string;
}

export const FocusRatingModal: React.FC<FocusRatingModalProps> = ({
  isOpen,
  onClose,
  onSubmitRating,
  sessionDuration,
  subjectName,
  topic,
}) => {
  const [rating, setRating] = useState<number>(5);
  const [notes, setNotes] = useState("");

  const ratingDescriptions = [
    "1 - Highly distracted / unfocused",
    "2 - Frequent interruptions",
    "3 - Moderate focus, got some work done",
    "4 - Strong deep work, minimal distractions",
    "5 - Peak flow state / 100% locked in",
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitRating(rating, notes.trim() || undefined);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Session Completed! 🎉"
      description={`You completed ${sessionDuration} minutes of focused study.`}
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200">
          <div className="font-semibold text-slate-900 dark:text-slate-100">{subjectName}</div>
          {topic && <div className="text-slate-500 dark:text-slate-400 mt-0.5">{topic}</div>}
        </div>

        {/* Question from prompt: "How focused were you?" 1-5 rating */}
        <div>
          <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 text-center mb-2">
            How focused were you?
          </label>
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5].map((starVal) => (
              <button
                key={starVal}
                type="button"
                onClick={() => setRating(starVal)}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  rating >= starVal
                    ? "text-amber-500 scale-110"
                    : "text-slate-300 dark:text-slate-600 hover:text-amber-400"
                }`}
                title={`${starVal} stars`}
              >
                <Star className="w-7 h-7 fill-current" />
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center mt-2 font-medium">
            {ratingDescriptions[rating - 1]}
          </p>
        </div>

        {/* Quick reflection note */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Reflection Note (Optional)
          </label>
          <textarea
            rows={2}
            placeholder="e.g. Mastered binary search tree deletion edge cases"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:border-violet-500 outline-hidden transition-all"
          />
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            Skip
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Save Session
          </button>
        </div>
      </form>
    </Modal>
  );
};
