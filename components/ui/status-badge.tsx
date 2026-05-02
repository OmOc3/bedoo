import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface StatusBadgeProps {
  children: ReactNode;
  className?: string;
  tone?: "active" | "inactive" | "pending" | "rejected" | "reviewed";
}

const toneClasses: Record<NonNullable<StatusBadgeProps["tone"]>, { badge: string; dot: string }> = {
  active: {
    badge: "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
    dot: "bg-teal-400",
  },
  inactive: {
    badge: "bg-[var(--surface-subtle)] text-[var(--muted)] dark:bg-[var(--surface-elevated)]",
    dot: "bg-[var(--muted)]",
  },
  pending: {
    badge: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    dot: "bg-amber-400",
  },
  rejected: {
    badge: "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
    dot: "bg-rose-400",
  },
  reviewed: {
    badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    dot: "bg-emerald-400",
  },
};

export function StatusBadge({ children, className, tone = "active" }: StatusBadgeProps) {
  const classes = toneClasses[tone];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        classes.badge,
        className,
      )}
    >
      <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full", classes.dot)} />
      {children}
    </span>
  );
}
