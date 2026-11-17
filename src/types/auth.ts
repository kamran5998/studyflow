export type UserRole = "student" | "researcher" | "educator";

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  passwordHash?: string; // Never exposed by server API
  institution: string;
  major: string;
  semester: string;
  studentId: string;
  avatarUrl?: string;
  avatarColor: string;
  role: UserRole;
  createdAt: string;
  lastLoginAt: string;
  twoFactorEnabled: boolean;
  dailyGoalHours: number;
  focusScore: number;
  streakDays: number;
}

export interface UserSession {
  id: string;
  userId: string;
  device: string;
  browser: string;
  location: string;
  lastActive: string;
  ip: string;
  isCurrent: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
  institution?: string;
  major?: string;
  semester?: string;
  avatarColor?: string;
  role?: UserRole;
}
