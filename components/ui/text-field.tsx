import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { className, error, id, label, ...props },
  ref,
) {
  return (
    <div className="group">
      <label
        className="mb-1.5 block text-sm font-medium text-[var(--muted)] transition-colors duration-200 group-hover:text-[var(--foreground)]"
        htmlFor={id}
      >
        {label}
      </label>
      <div className="relative">
        {/* Glow ring on hover */}
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute -inset-px rounded-lg opacity-0 transition-opacity duration-300 group-hover:opacity-100",
            error
              ? "shadow-[0_0_0_3px_color-mix(in_srgb,var(--danger)_15%,transparent)]"
              : "shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_12%,transparent)]",
          )}
        />
        <input
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(
            "relative min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--foreground)] shadow-control transition-all duration-200 placeholder:text-[var(--muted)] hover:border-[var(--primary)]/50 hover:bg-[color-mix(in_srgb,var(--surface)_97%,var(--primary)_3%)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-0 disabled:cursor-not-allowed disabled:bg-[var(--surface-subtle)] disabled:opacity-60",
            error ? "border-[var(--danger)] hover:border-[var(--danger)]/70 focus:border-[var(--danger)] focus:ring-[var(--danger)]" : null,
            className,
          )}
          id={id}
          ref={ref}
          {...props}
        />
      </div>
      {error ? (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-[var(--danger)]" id={`${id}-error`} role="alert">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[var(--danger)]" />
          {error}
        </p>
      ) : null}
    </div>
  );
});
