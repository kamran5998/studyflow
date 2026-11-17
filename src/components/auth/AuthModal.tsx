import React, { useState } from "react";
import {
  X,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  KeyRound,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useStudyFlow } from "../../context/StudyFlowContext";

export const AuthModal: React.FC = () => {
  const {
    authModalOpen,
    setAuthModalOpen,
    authModalMode,
    setAuthModalMode,
    login,
    googleLogin,
    register,
    resetPassword,
  } = useAuth();

  const { showToast } = useStudyFlow();

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);

  const [forgotEmail, setForgotEmail] = useState("");
  const [resetFeedback, setResetFeedback] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!authModalOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await login({
        email: loginEmail,
        password: loginPassword,
        rememberMe,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Failed to sign in");
      } else {
        showToast("Welcome back! Signed in successfully.", "success");
        setAuthModalOpen(false);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!regName.trim()) {
      setErrorMsg("Please enter your full name.");
      return;
    }
    if (!regEmail.trim()) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }
    if (!regPassword || regPassword.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await register({
        name: regName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        avatarColor: "bg-[#22211F]",
      });

      if (!res.success) {
        setErrorMsg(res.error || "Failed to create account");
      } else {
        showToast("Account created! Welcome to StudyPilot.", "success");
        setAuthModalOpen(false);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

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

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!forgotEmail) {
      setErrorMsg("Please enter your registered email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await resetPassword(forgotEmail);
      if (res.success) {
        setResetFeedback(res.message);
        showToast("Password reset link ready", "success");
      } else {
        setErrorMsg(res.message);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full pl-10 pr-10 py-2.5 bg-[#FAF8F4] dark:bg-[#1B1A17] border border-[#E9E5DE] dark:border-[#32302B] rounded-lg text-xs text-[#22211F] dark:text-[#F5F3EE] placeholder:text-[#9A948A] focus:bg-white dark:focus:bg-[#21201C] focus:border-[#D58A2A] outline-hidden transition-colors font-medium";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#22211F]/55 dark:bg-black/75 backdrop-blur-xs"
      onClick={() => setAuthModalOpen(false)}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-4xl bg-white dark:bg-[#21201C] rounded-2xl shadow-2xl border border-[#E9E5DE] dark:border-[#32302B] overflow-hidden flex flex-col md:flex-row transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* LEFT PANEL: Editorial Charcoal Brand Showcase */}
        <div className="hidden md:flex md:w-[46%] bg-[#1C1B18] text-[#FAF9F6] p-8 sm:p-9 flex-col justify-between relative overflow-hidden select-none border-r border-[#32302B]">
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

        {/* RIGHT PANEL: Form Panel */}
        <div className="flex-1 bg-white dark:bg-[#21201C] p-7 sm:p-9 flex flex-col justify-between relative overflow-y-auto max-h-[92vh]">
          <button
            onClick={() => setAuthModalOpen(false)}
            className="absolute top-5 right-5 w-8 h-8 rounded-lg bg-[#FAF8F4] dark:bg-[#2A2823] border border-[#E9E5DE] dark:border-[#32302B] text-[#78736A] hover:text-[#22211F] dark:hover:text-[#F5F3EE] flex items-center justify-center transition-colors cursor-pointer z-20"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          <div>
            {authModalMode !== "forgot" && (
              <div className="inline-flex p-1 bg-[#F5F2EC] dark:bg-[#1B1A17] border border-[#E9E5DE] dark:border-[#32302B] rounded-lg gap-1 mb-5">
                <button
                  type="button"
                  onClick={() => {
                    setAuthModalMode("login");
                    setErrorMsg(null);
                  }}
                  className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    authModalMode === "login"
                      ? "bg-white dark:bg-[#2A2823] text-[#22211F] dark:text-[#F5F3EE] shadow-2xs"
                      : "text-[#78736A] dark:text-[#A6A096] hover:text-[#22211F] dark:hover:text-[#F5F3EE]"
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthModalMode("register");
                    setErrorMsg(null);
                  }}
                  className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    authModalMode === "register"
                      ? "bg-white dark:bg-[#2A2823] text-[#22211F] dark:text-[#F5F3EE] shadow-2xs"
                      : "text-[#78736A] dark:text-[#A6A096] hover:text-[#22211F] dark:hover:text-[#F5F3EE]"
                  }`}
                >
                  Create Account
                </button>
              </div>
            )}

            {errorMsg && (
              <div className="mb-4 p-3 rounded-lg bg-[#FDF2F2] dark:bg-[#3A1E1E] border border-[#F3D2D2] dark:border-[#572B2B] text-[#A83838] dark:text-[#E57373] text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-tight">{errorMsg}</span>
              </div>
            )}

            {authModalMode === "login" && (
              <div>
                <div className="mb-1">
                  <h3 className="font-editorial text-2xl font-bold text-[#22211F] dark:text-[#F5F3EE] tracking-tight">
                    Welcome back
                  </h3>
                  <p className="text-xs text-[#78736A] dark:text-[#A6A096] mt-1">
                    Enter your student credentials to open your study notebook.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full py-2.5 px-4 border border-[#E9E5DE] dark:border-[#32302B] hover:bg-[#FAF8F4] dark:hover:bg-[#2A2823] rounded-lg flex items-center justify-center gap-2.5 text-xs font-medium text-[#22211F] dark:text-[#F5F3EE] mt-5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
                </button>

                <div className="relative my-4 flex items-center justify-center">
                  <div className="grow border-t border-[#EFECE6] dark:border-[#32302B]" />
                  <span className="px-3 text-[10px] font-mono uppercase font-semibold tracking-[0.14em] text-[#9A948A]">
                    OR CONTINUE WITH EMAIL
                  </span>
                  <div className="grow border-t border-[#EFECE6] dark:border-[#32302B]" />
                </div>

                <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-[10px] font-mono font-semibold uppercase tracking-[0.14em] text-[#78736A] dark:text-[#A6A096] mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#9A948A] absolute left-3.5 top-2.5 pointer-events-none" />
                      <input
                        id="login-email-input"
                        type="email"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="you@university.edu"
                        className={inputClass}
                      />
                      <CheckCircle2
                        className={`w-4 h-4 text-[#3B7A57] absolute right-3.5 top-2.5 transition-opacity ${
                          loginEmail.includes("@") ? "opacity-100" : "opacity-30"
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[10px] font-mono font-semibold uppercase tracking-[0.14em] text-[#78736A] dark:text-[#A6A096]">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthModalMode("forgot");
                          setErrorMsg(null);
                        }}
                        className="text-xs text-[#B46914] dark:text-[#E0983B] hover:underline font-medium cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>

                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#9A948A] absolute left-3.5 top-2.5 pointer-events-none" />
                      <input
                        id="login-password-input"
                        type={showPassword ? "text" : "password"}
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className={inputClass}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-2.5 text-[#9A948A] hover:text-[#22211F] dark:hover:text-[#F5F3EE] cursor-pointer"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-[#78736A] dark:text-[#A6A096] font-medium">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded accent-[#22211F] dark:accent-[#D58A2A]"
                      />
                      <span>Remember this workstation</span>
                    </label>
                  </div>

                  <button
                    id="submit-signin-btn"
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 rounded-lg bg-[#22211F] hover:bg-[#363430] dark:bg-[#F5F3EE] dark:hover:bg-[#E6E2DA] text-white dark:text-[#1C1B18] font-medium text-xs flex items-center justify-center gap-2 mt-4 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Sign In to StudyPilot</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {authModalMode === "register" && (
              <div>
                <div className="mb-1">
                  <h3 className="font-editorial text-2xl font-bold text-[#22211F] dark:text-[#F5F3EE] tracking-tight">
                    Create your account
                  </h3>
                  <p className="text-xs text-[#78736A] dark:text-[#A6A096] mt-1">
                    Enter your student details to initialize your personal study ledger.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full py-2.5 px-4 border border-[#E9E5DE] dark:border-[#32302B] hover:bg-[#FAF8F4] dark:hover:bg-[#2A2823] rounded-lg flex items-center justify-center gap-2.5 text-xs font-medium text-[#22211F] dark:text-[#F5F3EE] mt-5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
                </button>

                <div className="relative my-4 flex items-center justify-center">
                  <div className="grow border-t border-[#EFECE6] dark:border-[#32302B]" />
                  <span className="px-3 text-[10px] font-mono uppercase font-semibold tracking-[0.14em] text-[#9A948A]">
                    OR CONTINUE WITH EMAIL
                  </span>
                  <div className="grow border-t border-[#EFECE6] dark:border-[#32302B]" />
                </div>

                <form onSubmit={handleRegisterSubmit} className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-mono font-semibold uppercase tracking-[0.14em] text-[#78736A] dark:text-[#A6A096] mb-1.5">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-[#9A948A] absolute left-3.5 top-2.5 pointer-events-none" />
                      <input
                        id="reg-name-input"
                        type="text"
                        required
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="e.g. Kamran Bagwan"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono font-semibold uppercase tracking-[0.14em] text-[#78736A] dark:text-[#A6A096] mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#9A948A] absolute left-3.5 top-2.5 pointer-events-none" />
                      <input
                        id="reg-email-input"
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="you@university.edu"
                        className={inputClass}
                      />
                      <CheckCircle2
                        className={`w-4 h-4 text-[#3B7A57] absolute right-3.5 top-2.5 transition-opacity ${
                          regEmail.includes("@") ? "opacity-100" : "opacity-30"
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono font-semibold uppercase tracking-[0.14em] text-[#78736A] dark:text-[#A6A096] mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#9A948A] absolute left-3.5 top-2.5 pointer-events-none" />
                      <input
                        id="reg-password-input"
                        type={showRegPassword ? "text" : "password"}
                        required
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        className={inputClass}
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute right-3.5 top-2.5 text-[#9A948A] hover:text-[#22211F] dark:hover:text-[#F5F3EE] cursor-pointer"
                        tabIndex={-1}
                      >
                        {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    id="submit-register-btn"
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 rounded-lg bg-[#22211F] hover:bg-[#363430] dark:bg-[#F5F3EE] dark:hover:bg-[#E6E2DA] text-white dark:text-[#1C1B18] font-medium text-xs flex items-center justify-center gap-2 mt-4 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Create Student Account</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {authModalMode === "forgot" && (
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setAuthModalMode("login");
                    setErrorMsg(null);
                    setResetFeedback(null);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-[#B46914] dark:text-[#E0983B] hover:underline cursor-pointer mb-3"
                >
                  ← Back to Sign In
                </button>

                <div className="mb-4">
                  <h3 className="font-editorial text-2xl font-bold text-[#22211F] dark:text-[#F5F3EE] tracking-tight">
                    Reset your password
                  </h3>
                  <p className="text-xs text-[#78736A] dark:text-[#A6A096] mt-1">
                    Enter your registered email address and we&apos;ll prepare recovery instructions.
                  </p>
                </div>

                {resetFeedback ? (
                  <div className="p-4 rounded-xl bg-[#EDF5F0] dark:bg-[#1C3326] border border-[#CFE3D6] dark:border-[#2B4E3A] text-[#3B7A57] dark:text-[#68B088] text-xs space-y-2">
                    <div className="flex items-center gap-2 font-semibold">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Password Reset Ready</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">{resetFeedback}</p>
                    <button
                      type="button"
                      onClick={() => setAuthModalMode("login")}
                      className="mt-2 px-3.5 py-1.5 rounded-lg bg-[#3B7A57] text-white text-xs font-medium hover:opacity-90 transition-opacity cursor-pointer"
                    >
                      Sign In Now
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleResetSubmit} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-mono font-semibold uppercase tracking-[0.14em] text-[#78736A] dark:text-[#A6A096] mb-1.5">
                        Registered Email Address
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-[#9A948A] absolute left-3.5 top-2.5 pointer-events-none" />
                        <input
                          type="email"
                          required
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          placeholder="you@university.edu"
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 rounded-lg bg-[#22211F] hover:bg-[#363430] dark:bg-[#F5F3EE] dark:hover:bg-[#E6E2DA] text-white dark:text-[#1C1B18] font-medium text-xs flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <KeyRound className="w-4 h-4" />
                      <span>Send Recovery Instructions</span>
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
