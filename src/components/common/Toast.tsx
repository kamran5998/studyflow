import React from "react";
import { CheckCircle2, Info, AlertCircle } from "lucide-react";
import { useStudyFlow } from "../../context/StudyFlowContext";

export const Toast: React.FC = () => {
  const { toast } = useStudyFlow();

  if (!toast) return null;

  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-[#3B7A57] dark:text-[#68B088] shrink-0" />,
    info: <Info className="w-4 h-4 text-[#D58A2A] dark:text-[#E0983B] shrink-0" />,
    error: <AlertCircle className="w-4 h-4 text-[#A83838] dark:text-[#E57373] shrink-0" />,
  };

  return (
    <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-6 z-50">
      <div className="flex items-center gap-2.5 px-4 py-2.5 bg-white dark:bg-[#21201C] rounded-xl shadow-lg border border-[#E9E5DE] dark:border-[#32302B] text-xs font-medium text-[#22211F] dark:text-[#F5F3EE] transition-colors">
        {icons[toast.type]}
        <span>{toast.message}</span>
      </div>
    </div>
  );
};
