"use client";

import { Button } from "@/components/ui/button";

export default function ManagerStationsError({ reset }: { reset: () => void }) {
  return (
    <main className="flex min-h-dvh items-center bg-[var(--surface-subtle)] px-4 py-6 text-right" dir="rtl">
      <section className="mx-auto w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">تعذر تحميل المحطات</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">حاول مرة أخرى أو تحقق من اتصال قاعدة البيانات.</p>
        <Button className="mt-5" onClick={reset} type="button">
          إعادة المحاولة
        </Button>
      </section>
    </main>
  );
}
