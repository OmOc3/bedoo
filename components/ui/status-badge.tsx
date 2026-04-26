import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface StatusBadgeProps {
  children: ReactNode;
  className?: string;
}

export function StatusBadge({ children, className }: StatusBadgeProps) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold", className)}>
      {children}
    </span>
  );
}
