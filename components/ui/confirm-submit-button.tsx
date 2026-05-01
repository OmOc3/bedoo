"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ConfirmSubmitButtonProps {
  children: ReactNode;
  className?: string;
  confirmMessage: string;
  disabled?: boolean;
}

export function ConfirmSubmitButton({ children, className, confirmMessage, disabled }: ConfirmSubmitButtonProps) {
  return (
    <button
      className={cn(className)}
      disabled={disabled}
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
      type="submit"
    >
      {children}
    </button>
  );
}

