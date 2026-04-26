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
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-[var(--foreground)]" htmlFor={id}>
        {label}
      </label>
      <input
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(
          "min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--foreground)] shadow-control transition placeholder:text-[oklch(0.64_0.014_165)] focus:border-[var(--focus)] disabled:bg-[var(--surface-subtle)]",
          error ? "border-[var(--danger)] bg-[var(--danger-soft)]" : null,
          className,
        )}
        id={id}
        ref={ref}
        {...props}
      />
      {error ? (
        <p className="text-sm font-medium text-[var(--danger)]" id={`${id}-error`} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
});
