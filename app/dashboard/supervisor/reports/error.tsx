"use client";

import { useLanguage } from "@/components/i18n/language-provider";
import { Button } from "@/components/ui/button";

interface SupervisorReportsErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function SupervisorReportsError({ error, reset }: SupervisorReportsErrorProps) {
  const isDevelopment = process.env.NODE_ENV === "development";
  const { direction, messages } = useLanguage();

  return (
    <main className="flex min-h-dvh items-center bg-[var(--surface-subtle)] px-4 py-6 text-start" dir={direction}>
      <section className="mx-auto w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">{messages.pageErrors.reports}</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{messages.pageErrors.reportsFilterHint}</p>
        {isDevelopment ? (
          <pre
            className="mt-4 max-h-40 overflow-auto rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-3 text-left text-xs text-[var(--foreground)]"
            dir="ltr"
          >
            {error.message}
            {error.digest ? `\ndigest: ${error.digest}` : ""}
          </pre>
        ) : null}
        <Button className="mt-5" onClick={reset} type="button">
          {messages.actions.retry}
        </Button>
      </section>
    </main>
  );
}
