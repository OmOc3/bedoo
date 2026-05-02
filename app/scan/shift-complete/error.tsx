"use client";

import Link from "next/link";

export default function ShiftCompleteError() {
  return (
    <main className="flex min-h-dvh items-center bg-[var(--surface-subtle)] px-4 py-6 text-right" dir="rtl">
      <section className="mx-auto w-full max-w-lg rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 text-center sm:p-6">
        <h1 className="text-xl font-bold text-[var(--foreground)]">تعذر تحميل ملخص الشيفت</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">ارجع إلى صفحة الفني وراجع سجل الشيفتات.</p>
        <Link
          className="mt-5 inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-[var(--primary)] px-4 py-3 text-base font-medium text-[var(--primary-foreground)] transition-colors hover:bg-[var(--primary-hover)]"
          href="/scan"
        >
          العودة للرئيسية
        </Link>
      </section>
    </main>
  );
}
