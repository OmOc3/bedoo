"use client";

import Link from "next/link";
import { useLanguage } from "@/components/i18n/language-provider";

export default function ShiftCompleteError() {
  const { direction, messages } = useLanguage();

  return (
    <main className="flex min-h-dvh items-center bg-[var(--surface-subtle)] px-4 py-6 text-start" dir={direction}>
      <section className="mx-auto w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h1 className="text-xl font-bold text-[var(--foreground)]">{messages.pageErrors.shiftSummary}</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{messages.pageErrors.shiftSummaryHint}</p>
        <Link
          className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] transition-colors hover:bg-[var(--primary-hover)]"
          href="/"
        >
          {messages.pageErrors.backToHome}
        </Link>
      </section>
    </main>
  );
}
