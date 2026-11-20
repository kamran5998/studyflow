import React, { useState, useEffect } from "react";
import { useStudyFlow } from "../../context/StudyFlowContext";
import { useAuth } from "../../context/AuthContext";
import {
  CARD_SURFACE,
  INPUT_SURFACE,
  KickerPill,
  PageHeader,
  PrimaryButton,
} from "../common/ui";
import {
  User,
  Mail,
  Sparkles,
  Sun,
  Moon,
  CheckCircle2,
  Save,
  Check,
} from "lucide-react";

export const SettingsView: React.FC = () => {
  const { profile, updateProfile, theme, setTheme, showToast } = useStudyFlow();
  const { currentUser, updateAccount } = useAuth();

  const [name, setName] = useState(currentUser?.name || profile.name || "");
  const [email, setEmail] = useState(currentUser?.email || profile.email || "");
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || profile.name);
      setEmail(currentUser.email || profile.email);
    } else {
      setName(profile.name);
      setEmail(profile.email);
    }
  }, [currentUser, profile.name, profile.email]);

  const handleSaveStudentInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast("Please enter a valid student name", "error");
      return;
    }
    if (!email.trim()) {
      showToast("Please enter a valid email address", "error");
      return;
    }

    updateProfile({
      name: name.trim(),
      email: email.trim(),
    });

    if (currentUser) {
      updateAccount({
        name: name.trim(),
        email: email.trim(),
      });
    }

    setIsSaved(true);
    showToast("Student information updated successfully", "success");
    setTimeout(() => setIsSaved(false), 2500);
  };

  const studentInitial = (name || "S").charAt(0).toUpperCase();

  return (
    <div className="space-y-6 pb-10">
      {/* Page Header */}
      <PageHeader
        kicker="SYSTEM"
<<<<<<< HEAD
        pill="SETTINGS"
        pillTone="amber"
        title="Settings"
=======
        pill="NOTEBOOK SETTINGS"
        pillTone="amber"
        title="Notebook Settings"
>>>>>>> 9d281b97efabd4f9d488c8bc37687c9b1dfe9f78
        subtitle="Manage your student identity details and editorial workspace theme."
        actions={
          <KickerPill tone="sage" dashed={false}>
            Active Student
          </KickerPill>
        }
      />

      {/* 1. Student Information Card */}
      <div className={`${CARD_SURFACE} p-6 sm:p-7 space-y-6`}>
        <div className="flex items-center justify-between pb-5 border-b border-[#EFECE6] dark:border-[#2E2C27]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FAF1E3] dark:bg-[#3A2C16] border border-[#E0BE89] dark:border-[#6D5229] text-[#D58A2A] dark:text-[#E0983B] flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-editorial text-base font-semibold text-[#22211F] dark:text-[#F5F3EE]">
                Student Information
              </h3>
              <p className="text-xs text-[#78736A] dark:text-[#A6A096]">
                Identity details for your study schedule and progress reports
              </p>
            </div>
          </div>

          <div className="w-9 h-9 rounded-full bg-[#22211F] dark:bg-[#F5F3EE] text-white dark:text-[#1C1B18] font-mono font-bold text-sm flex items-center justify-center">
            {studentInitial}
          </div>
        </div>

        <form onSubmit={handleSaveStudentInfo} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {/* Student Name */}
            <div>
              <label
                htmlFor="student-name-input"
                className="block text-[11px] font-mono uppercase tracking-[0.08em] text-[#78736A] dark:text-[#A6A096] mb-1.5"
              >
                Name <span className="text-[#A83838]">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9A948A]">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="student-name-input"
                  type="text"
                  required
                  placeholder="e.g. Kamran Bagwan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`${INPUT_SURFACE} w-full pl-10 pr-3.5 py-2.5 font-medium`}
                />
              </div>
            </div>

            {/* Email ID */}
            <div>
              <label
                htmlFor="student-email-input"
                className="block text-[11px] font-mono uppercase tracking-[0.08em] text-[#78736A] dark:text-[#A6A096] mb-1.5"
              >
                Email ID <span className="text-[#A83838]">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#9A948A]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="student-email-input"
                  type="email"
                  required
                  placeholder="e.g. student@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`${INPUT_SURFACE} w-full pl-10 pr-3.5 py-2.5 font-medium`}
                />
              </div>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <span className="text-[11px] text-[#8E887E] dark:text-[#9A948A]">
              Only Name and Email ID are stored for your student profile.
            </span>

            <PrimaryButton id="save-student-info-btn" type="submit">
              {isSaved ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </PrimaryButton>
          </div>
        </form>
      </div>

      {/* 2. Appearance & Theme Mode Card */}
      <div className={`${CARD_SURFACE} p-6 sm:p-7 space-y-5`}>
        <div className="flex items-center gap-2.5 pb-4 border-b border-[#EFECE6] dark:border-[#2E2C27]">
          <Sparkles className="w-4 h-4 text-[#D58A2A] dark:text-[#E0983B]" />
          <div>
            <h3 className="font-editorial text-base font-semibold text-[#22211F] dark:text-[#F5F3EE]">
              Appearance & Theme Mode
            </h3>
            <p className="text-xs text-[#78736A] dark:text-[#A6A096] mt-0.5">
              Switch between warm editorial daylight paper and dark obsidian notebook
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Light Ivory Option */}
          <button
            type="button"
            onClick={() => setTheme("light")}
            className={`p-4 rounded-xl border text-left flex flex-col justify-between gap-3.5 transition-colors cursor-pointer ${
              theme === "light"
                ? "bg-[#FCF7EE] dark:bg-[#2C2417] border-[#D58A2A]"
                : "bg-[#FAF8F4] dark:bg-[#1B1A17] border-[#E9E5DE] dark:border-[#32302B] hover:border-[#D4CEC3]"
            }`}
          >
            <div className="flex items-start justify-between w-full">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg border ${
                    theme === "light"
                      ? "bg-[#FAF1E3] border-[#E0BE89] text-[#B46914]"
                      : "bg-[#F5F2EC] dark:bg-[#2A2823] border-[#E2DDD4] dark:border-[#3A3731] text-[#8E887E]"
                  }`}
                >
                  <Sun className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-[#22211F] dark:text-[#F5F3EE]">
                    Light Ivory
                  </div>
                  <span className="text-[10px] font-mono text-[#8E887E] dark:text-[#9A948A]">
                    Warm paper & ink
                  </span>
                </div>
              </div>

              {theme === "light" && (
                <KickerPill tone="amber" dashed={false}>
                  <Check className="w-3 h-3" />
                  <span>Active</span>
                </KickerPill>
              )}
            </div>

            <p className="text-[11px] text-[#78736A] dark:text-[#A6A096] leading-relaxed">
              Warm ivory canvas with crisp charcoal ink typography, tuned for calm daylight focus sessions.
            </p>

            {/* Mini preview */}
            <div className="w-full bg-[#FAF9F6] rounded-lg p-2.5 flex flex-col gap-1.5 border border-[#E9E5DE]">
              <div className="h-2 w-1/3 bg-[#DDD7CD] rounded-full" />
              <div className="h-6 bg-white rounded border border-[#E9E5DE] flex items-center px-2">
                <div className="h-2 w-2/3 bg-[#E0BE89] rounded-full" />
              </div>
            </div>
          </button>

          {/* Dark Obsidian Option */}
          <button
            type="button"
            onClick={() => setTheme("dark")}
            className={`p-4 rounded-xl border text-left flex flex-col justify-between gap-3.5 transition-colors cursor-pointer ${
              theme === "dark"
                ? "bg-[#2C2417] border-[#E0983B]"
                : "bg-[#FAF8F4] dark:bg-[#1B1A17] border-[#E9E5DE] dark:border-[#32302B] hover:border-[#D4CEC3] dark:hover:border-[#49453D]"
            }`}
          >
            <div className="flex items-start justify-between w-full">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg border ${
                    theme === "dark"
                      ? "bg-[#3A2C16] border-[#6D5229] text-[#F0B35E]"
                      : "bg-[#F5F2EC] dark:bg-[#2A2823] border-[#E2DDD4] dark:border-[#3A3731] text-[#8E887E]"
                  }`}
                >
                  <Moon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-[#22211F] dark:text-[#F5F3EE]">
                    Dark Obsidian
                  </div>
                  <span className="text-[10px] font-mono text-[#8E887E] dark:text-[#9A948A]">
                    Warm espresso & amber
                  </span>
                </div>
              </div>

              {theme === "dark" && (
                <KickerPill tone="amber" dashed={false}>
                  <Check className="w-3 h-3" />
                  <span>Active</span>
                </KickerPill>
              )}
            </div>

            <p className="text-[11px] text-[#78736A] dark:text-[#A6A096] leading-relaxed">
              Low-glare warm espresso palette that reduces eye fatigue during late-night revision hours.
            </p>

            {/* Mini preview */}
            <div className="w-full bg-[#161513] rounded-lg p-2.5 flex flex-col gap-1.5 border border-[#32302B]">
              <div className="h-2 w-1/3 bg-[#32302B] rounded-full" />
              <div className="h-6 bg-[#21201C] rounded border border-[#32302B] flex items-center px-2">
                <div className="h-2 w-2/3 bg-[#D58A2A]/60 rounded-full" />
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
