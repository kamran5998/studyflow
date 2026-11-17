import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  UserAccount,
  UserSession,
  LoginCredentials,
  RegisterCredentials,
} from "../types/auth";

interface AuthContextType {
  currentUser: UserAccount | null;
  isAuthenticated: boolean;
  isAuthReady: boolean;
  isGuest: boolean;
  accounts: UserAccount[];
  activeSessions: UserSession[];
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean, mode?: "login" | "register" | "forgot" | "security") => void;
  authModalMode: "login" | "register" | "forgot" | "security";
  setAuthModalMode: (mode: "login" | "register" | "forgot" | "security") => void;
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: string }>;
  googleLogin: () => Promise<{ success: boolean; error?: string; email?: string }>;
  register: (data: RegisterCredentials) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  switchAccount: (userId: string) => Promise<void>;
  updateAccount: (updates: Partial<UserAccount>) => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; message: string; tempPass?: string }>;
  toggle2FA: () => Promise<void>;
  revokeSession: (sessionId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [activeSessions, setActiveSessions] = useState<UserSession[]>([]);
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);

  const [authModalOpen, setAuthModalOpenState] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<"login" | "register" | "forgot" | "security">("login");

  const setAuthModalOpen = (open: boolean, mode: "login" | "register" | "forgot" | "security" = "login") => {
    setAuthModalMode(mode);
    setAuthModalOpenState(open);
  };

  const applyServerAuthPayload = useCallback((data: any) => {
    setCurrentUser(data.currentUser ?? null);
    if (Array.isArray(data.accounts)) setAccounts(data.accounts);
    if (Array.isArray(data.activeSessions)) setActiveSessions(data.activeSessions);
  }, []);

  // Hydrate initial authentication & session from server database (HttpOnly cookie)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            applyServerAuthPayload(data);
          }
        }
      } catch (err) {
        console.error("[StudyPilot] Failed to load server auth session:", err);
      } finally {
        if (!cancelled) {
          setIsAuthReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyServerAuthPayload]);

  const isAuthenticated = currentUser !== null;
  const isGuest = !isAuthenticated;

  // 1. Login
  const login = async (credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(credentials),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || "Failed to sign in." };
      }
      applyServerAuthPayload(data);
      setAuthModalOpenState(false);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || "Network error while signing in." };
    }
  };

  // 1b. Google Sign-In helper (uses primary demo account on server without hardcoded password on client)
  const googleLogin = async (): Promise<{ success: boolean; error?: string; email?: string }> => {
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || "Google sign in failed." };
      }
      applyServerAuthPayload(data);
      setAuthModalOpenState(false);
      return { success: true, email: data.currentUser?.email };
    } catch (err: any) {
      return { success: false, error: err?.message || "Google sign in failed." };
    }
  };

  // 2. Register
  const register = async (data: RegisterCredentials): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      const payload = await res.json();
      if (!res.ok || !payload.success) {
        return { success: false, error: payload.error || "Failed to create account." };
      }
      applyServerAuthPayload(payload);
      setAuthModalOpenState(false);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || "Network error while creating account." };
    }
  };

  // 3. Logout
  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error("[StudyPilot] Logout error:", err);
    } finally {
      setCurrentUser(null);
      setActiveSessions([]);
    }
  };

  // 4. Switch Account
  const switchAccount = async (userId: string) => {
    try {
      const res = await fetch("/api/auth/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          applyServerAuthPayload(data);
          setAuthModalOpenState(false);
        }
      }
    } catch (err) {
      console.error("[StudyPilot] Account switch error:", err);
    }
  };

  // 5. Update Account
  const updateAccount = async (updates: Partial<UserAccount>) => {
    if (!currentUser) return;
    setCurrentUser((prev) => (prev ? { ...prev, ...updates } : prev));
    try {
      const res = await fetch("/api/auth/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.account) {
          setCurrentUser(data.account);
          setAccounts((prev) => prev.map((a) => (a.id === data.account.id ? data.account : a)));
        }
      }
    } catch (err) {
      console.error("[StudyPilot] Update account error:", err);
    }
  };

  // 6. Change Password
  const changePassword = async (
    oldPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err?.message || "Failed to update password." };
    }
  };

  // 7. Reset Password
  const resetPassword = async (
    email: string
  ): Promise<{ success: boolean; message: string; tempPass?: string }> => {
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, message: err?.message || "Failed to reset password." };
    }
  };

  // 8. Toggle 2FA
  const toggle2FA = async () => {
    if (!currentUser) return;
    await updateAccount({ twoFactorEnabled: !currentUser.twoFactorEnabled });
  };

  // 9. Revoke Session
  const revokeSession = async (sessionId: string) => {
    setActiveSessions((prev) => prev.filter((s) => s.id !== sessionId));
    try {
      const res = await fetch(`/api/auth/sessions/${encodeURIComponent(sessionId)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.activeSessions)) {
          setActiveSessions(data.activeSessions);
        }
      }
    } catch (err) {
      console.error("[StudyPilot] Failed to revoke session:", err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        isAuthReady,
        isGuest,
        accounts,
        activeSessions,
        authModalOpen,
        setAuthModalOpen,
        authModalMode,
        setAuthModalMode,
        login,
        googleLogin,
        register,
        logout,
        switchAccount,
        updateAccount,
        changePassword,
        resetPassword,
        toggle2FA,
        revokeSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
