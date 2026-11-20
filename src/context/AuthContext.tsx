import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { onAuthStateChanged, signInWithPopup, signOut, User } from "firebase/auth";
import { auth, googleAuthProvider } from "../lib/firebase";
import { UserAccount, UserSession } from "../types/auth";

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
  getIdToken: (forceRefresh?: boolean) => Promise<string | null>;
  googleLogin: () => Promise<{ success: boolean; error?: string; email?: string }>;
  logout: () => Promise<void>;
  updateAccount: (updates: Partial<UserAccount>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapFirebaseUserFallback(firebaseUser: User): UserAccount {
  return {
    id: firebaseUser.uid,
    name: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "Student",
    email: firebaseUser.email || "",
    institution: "",
    major: "",
    semester: "",
    studentId: "",
    avatarUrl: firebaseUser.photoURL || "",
    avatarColor: "bg-[#22211F]",
    role: "student",
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    twoFactorEnabled: false,
    dailyGoalHours: 4,
    focusScore: 0,
    streakDays: 0,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [activeSessions, setActiveSessions] = useState<UserSession[]>([]);
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);

  // Store Firebase ID token strictly in memory (never in localStorage/sessionStorage)
  const idTokenRef = useRef<string | null>(null);
  const firebaseUserRef = useRef<User | null>(null);

  const [authModalOpen, setAuthModalOpenState] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<"login" | "register" | "forgot" | "security">("login");

  const setAuthModalOpen = (open: boolean, mode: "login" | "register" | "forgot" | "security" = "login") => {
    setAuthModalMode(mode);
    setAuthModalOpenState(open);
  };

  const getIdToken = useCallback(async (forceRefresh = false): Promise<string | null> => {
    const fbUser = auth.currentUser || firebaseUserRef.current;
    if (!fbUser) {
      idTokenRef.current = null;
      return null;
    }
    const token = await fbUser.getIdToken(forceRefresh);
    idTokenRef.current = token;
    return token;
  }, []);

  const syncUserWithBackend = useCallback(async (fbUser: User) => {
    const token = await fbUser.getIdToken();
    idTokenRef.current = token;

    const res = await fetch("/api/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      let detail = `HTTP ${res.status}`;
      try {
        const errBody = await res.json();
        if (errBody?.error) detail = errBody.error;
      } catch {
        // ignore JSON parse failure
      }
      throw new Error(`Account sync failed: ${detail}`);
    }
    const data = await res.json();
    if (data.currentUser) {
      setCurrentUser(data.currentUser);
      setAccounts(Array.isArray(data.accounts) ? data.accounts : [data.currentUser]);
      setActiveSessions(Array.isArray(data.activeSessions) ? data.activeSessions : []);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      firebaseUserRef.current = fbUser;
      if (!fbUser) {
        idTokenRef.current = null;
        setCurrentUser(null);
        setAccounts([]);
        setActiveSessions([]);
        setIsAuthReady(true);
        return;
      }

      try {
        await syncUserWithBackend(fbUser);
      } catch (err) {
        console.error("[StudyPilot] Failed to sync Firebase user with PostgreSQL:", err);
        setCurrentUser(mapFirebaseUserFallback(fbUser));
      } finally {
        setIsAuthReady(true);
      }
    });

    return () => unsubscribe();
  }, [syncUserWithBackend]);

  const isAuthenticated = currentUser !== null;
  const isGuest = !isAuthenticated;

  const googleLogin = async (): Promise<{ success: boolean; error?: string; email?: string }> => {
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      firebaseUserRef.current = result.user;
      await syncUserWithBackend(result.user);
      setAuthModalOpenState(false);
      return { success: true, email: result.user.email || undefined };
    } catch (err: any) {
      console.error("[StudyPilot] Google Sign-In failed:", err);
      const code = err?.code || "";
      let message = err?.message || "Google sign in failed.";
      if (code === "auth/popup-closed-by-user") {
        message = "Sign-in popup was closed before completing authentication.";
      } else if (code === "auth/popup-blocked") {
        message = "Your browser blocked the Google sign-in popup. Please allow popups for this site and try again.";
      } else if (code === "auth/cancelled-popup-request") {
        message = "A sign-in popup is already open. Please complete or close it and try again.";
      } else if (code === "auth/unauthorized-domain") {
        const host = typeof window !== "undefined" ? window.location.hostname : "this domain";
        message = `Domain "${host}" is not authorized in Firebase Authentication. Open StudyPilot from the AI Studio URL or add "${host}" to Firebase Console → Authentication → Settings → Authorized domains.`;
      } else if (code === "auth/network-request-failed") {
        message = "Network error while contacting Firebase Authentication. Please check your connection and try again.";
      }
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("[StudyPilot] Logout error:", err);
    } finally {
      firebaseUserRef.current = null;
      idTokenRef.current = null;
      setCurrentUser(null);
      setAccounts([]);
      setActiveSessions([]);
    }
  };

  const updateAccount = async (updates: Partial<UserAccount>) => {
    if (!currentUser) return;
    setCurrentUser((prev) => (prev ? { ...prev, ...updates } : prev));
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch("/api/auth/account", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.account) {
          setCurrentUser(data.account);
          setAccounts([data.account]);
        }
      }
    } catch (err) {
      console.error("[StudyPilot] Update account error:", err);
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
        getIdToken,
        googleLogin,
        logout,
        updateAccount,
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
