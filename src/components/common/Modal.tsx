import React, { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = "md",
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-2xl",
  };

  return (
    <div
      id="modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#22211F]/45 dark:bg-black/65 backdrop-blur-[2px] transition-opacity"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="modal-container"
        className={cn(
          "w-full bg-white dark:bg-[#21201C] rounded-xl shadow-xl border border-[#E9E5DE] dark:border-[#32302B] overflow-hidden flex flex-col max-h-[90vh] transition-colors",
          maxWidthClasses[maxWidth]
        )}
      >
        <div className="flex items-start justify-between px-6 py-4 border-b border-[#EFECE6] dark:border-[#32302B] bg-[#FAF8F4] dark:bg-[#1C1B18]">
          <div>
            <h3 className="font-editorial text-lg font-bold text-[#22211F] dark:text-[#F5F3EE] leading-snug">
              {title}
            </h3>
            {description && (
              <p className="text-xs text-[#78736A] dark:text-[#A6A096] mt-0.5">{description}</p>
            )}
          </div>
          <button
            id="modal-close-btn"
            onClick={onClose}
            className="p-1.5 text-[#78736A] hover:text-[#22211F] dark:hover:text-[#F5F3EE] hover:bg-[#EFECE6] dark:hover:bg-[#2A2823] rounded-lg transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto text-[#22211F] dark:text-[#F5F3EE]">{children}</div>
      </div>
    </div>
  );
};
