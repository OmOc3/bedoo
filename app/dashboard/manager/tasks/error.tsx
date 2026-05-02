"use client";

import { Button } from "@/components/ui/button";

export default function ManagerTasksError({ reset }: { reset: () => void }) {
  return (
    <main className="min-h-dvh bg-[var(--surface-subtle)] px-4 py-6 text-right" dir="rtl">
      <section className="mx-auto w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">تعذر تحميل مهام اليوم</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">حاول مرة أخرى بعد لحظات.</p>
        <Button className="mt-4" onClick={reset}>
          إعادة المحاولة
        </Button>
      </section>
    </main>
  );
}
