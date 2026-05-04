"use client";

import { useLanguage } from "@/components/i18n/language-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function ScanError({ reset }: { reset: () => void }) {
  const { direction, messages } = useLanguage();

  return (
    <main
      className={cn(
        "flex min-h-dvh items-center bg-[var(--surface-subtle)] px-4 py-6",
        direction === "rtl" ? "text-right" : "text-start",
      )}
      dir={direction}
    >
      <section className="mx-auto w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">{messages.scan.pageErrorTitle}</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{messages.scan.pageErrorHint}</p>
        <Button className="mt-5" onClick={reset} type="button">
          {messages.actions.retry}
        </Button>
      </section>
    </main>
  );
}
