import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  isLoading?: boolean;
  variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--primary)] text-white shadow-control hover:bg-[var(--primary-strong)] active:translate-y-px disabled:bg-[oklch(0.72_0.025_155)]",
  secondary:
    "border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] shadow-control hover:bg-[var(--surface-subtle)] active:translate-y-px disabled:text-[var(--muted)]",
  danger:
    "bg-[var(--danger)] text-white shadow-control hover:bg-[oklch(0.46_0.15_28)] active:translate-y-px disabled:bg-[oklch(0.72_0.04_28)]",
};

export function Button({
  children,
  className,
  disabled,
  isLoading = false,
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-base font-bold transition disabled:cursor-not-allowed",
        variantClasses[variant],
        className,
      )}
      disabled={disabled || isLoading}
      type={type}
      {...props}
    >
      {isLoading ? (
        <span
          aria-hidden="true"
          className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : null}
      {children}
    </button>
  );
}
