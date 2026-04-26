"use client";

import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

interface SubmitButtonProps {
  children: string;
  className?: string;
  pendingLabel?: string;
}

export function SubmitButton({ children, className, pendingLabel = "جار الحفظ..." }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      disabled={pending}
      type="submit"
    >
      {pending ? (
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : null}
      {pending ? pendingLabel : children}
    </button>
  );
}
