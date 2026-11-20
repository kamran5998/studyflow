import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function getDaysRemaining(targetDateStr: string): {
  days: number;
  label: string;
  isUrgent: boolean;
  isPast: boolean;
} {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const targetDate = new Date(targetDateStr);
  targetDate.setHours(0, 0, 0, 0);

  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      days: diffDays,
      label: `${Math.abs(diffDays)}d ago`,
      isUrgent: false,
      isPast: true,
    };
  }
  if (diffDays === 0) {
    return {
      days: 0,
      label: "Today",
      isUrgent: true,
      isPast: false,
    };
  }
  if (diffDays === 1) {
    return {
      days: 1,
      label: "Tomorrow",
      isUrgent: true,
      isPast: false,
    };
  }
  return {
    days: diffDays,
    label: `in ${diffDays} days`,
    isUrgent: diffDays <= 4,
    isPast: false,
  };
}

export function formatDateDisplay(dateStr: string): string {
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      return date.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
      });
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

export function generateId(): string {
  return "sf_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}
