import React, { useState } from "react";
import { X, Sparkles, AlertCircle, BookOpen, ShieldCheck, CheckCircle2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useStudyFlow } from "../../context/StudyFlowContext";

export const AuthModal: React.FC = () => {
  const { authModalOpen, setAuthModalOpen, googleLogin } = useAuth();
  const { showToast } = useStudyFlow();

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!authModalOpen) return null;

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await googleLogin();
      if (res.success) {
        showToast(`Signed in with Google${res.email ? ` as ${res.email}` : ""}`, "success");
        setAuthModalOpen(false);
      } else {
        setErrorMsg(res.error || "Google sign in failed");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Google sign in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#22211F]/55 dark:bg-black/75 backdrop-blur-xs"
      onClick={() => setAuthModalOpen(false)}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-3xl bg-white dark:bg-[#21201C] rounded-2xl shadow-2xl border border-[#E9E5DE] dark:border-[#32302B] overflow-hidden flex flex-col md:flex-row transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* LEFT PANEL: Editorial Charcoal Brand Showcase */}
        <div className="hidden md:flex md:w-[48%] bg-[#1C1B18] text-[#FAF9F6] p-8 sm:p-9 flex-col justify-between relative overflow-hidden select-none border-r border-[#32302B]">
          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FAF9F6] text-[#1C1B18] flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-base tracking-tight text-[#FAF9F6]">
                    StudyPilot
                  </span>
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#E0983B]">
                    EDITION
                  </span>
                </div>
                <span className="text-[11px] text-[#A6A096] block mt-0.5">
                  AI-Powered Adaptive Study Planner
                </span>
              </div>
            </div>

            <h2 className="font-editorial text-3xl font-bold tracking-tight text-[#FAF9F6] leading-[1.18] mt-8">
              Organize your semester with clarity.
            </h2>

            <p className="text-xs sm:text-[13px] text-[#A6A096] leading-relaxed mt-3.5">
              Adaptive daily schedules, deep-work focus blocks, weakness diagnostics, and syllabus mastery in a calm academic workspace.
            </p>

            <div className="bg-[#25231F] border border-[#36332D] rounded-xl p-3.5 flex items-center gap-3 mt-7">
              <div className="w-9 h-9 rounded-lg bg-[#3A2C16] border border-[#523E20] flex items-center justify-center text-[#E0983B] shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="font-semibold text-xs text-[#FAF9F6] block leading-tight">
                  Adaptive Sequence Engine
                </span>
                <span className="text-[11px] text-[#A6A096] block mt-0.5 truncate">
                  Personalized exam prep &amp; weak-topic prioritization
                </span>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-4 mt-8 border-t border-[#2E2C27]">
            <p className="text-[11px] text-[#A6A096] italic leading-relaxed">
              &ldquo;Continuous effort—not strength or intelligence—is the key to unlocking our potential.&rdquo;
            </p>
          </div>
        </div>

        {/* RIGHT PANEL: Google Sign-In */}
        <div className="flex-1 bg-white dark:bg-[#21201C] p-7 sm:p-9 flex flex-col justify-between relative">
          <button
            onClick={() => setAuthModalOpen(false)}
            className="absolute top-5 right-5 w-8 h-8 rounded-lg bg-[#FAF8F4] dark:bg-[#2A2823] border border-[#E9E5DE] dark:border-[#32302B] text-[#78736A] hover:text-[#22211F] dark:hover:text-[#F5F3EE] flex items-center justify-center transition-colors cursor-pointer z-20"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="my-auto py-4">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#FAF8F4] dark:bg-[#2A2823] border border-[#E9E5DE] dark:border-[#32302B] font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#B46914] dark:text-[#E0983B]">
              <ShieldCheck className="w-3.5 h-3.5" />
              Student Workspace Sync
            </span>

            <h3 className="font-editorial text-2xl font-bold text-[#22211F] dark:text-[#F5F3EE] tracking-tight mt-4">
              Sign in to StudyPilot
            </h3>
            <p className="text-xs text-[#78736A] dark:text-[#A6A096] mt-1.5 leading-relaxed">
              Sign in with your Google account to save your courses, exams, focus sessions, and study roadmaps securely across devices.
            </p>

            {errorMsg && (
              <div className="mt-4 p-3 rounded-lg bg-[#FDF2F2] dark:bg-[#3A1E1E] border border-[#F3D2D2] dark:border-[#572B2B] text-[#A83838] dark:text-[#E57373] text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-tight">{errorMsg}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-3 px-4 bg-[#22211F] hover:bg-[#363430] dark:bg-[#F5F3EE] dark:hover:bg-[#E6E2DA] text-white dark:text-[#1C1B18] rounded-lg flex items-center justify-center gap-2.5 text-xs font-semibold mt-6 transition-colors cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-4 h-4 shrink-0 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>

            <div className="mt-6 space-y-2.5 pt-5 border-t border-[#EFECE6] dark:border-[#32302B]">
              <div className="flex items-center gap-2 text-[11px] text-[#78736A] dark:text-[#A6A096]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#3B7A57] shrink-0" />
                <span>Private per-student workspace isolation</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-[#78736A] dark:text-[#A6A096]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#3B7A57] shrink-0" />
                <span>Automatic sync for subjects, exams, quizzes &amp; focus logs</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
