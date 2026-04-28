"use client";

import { Button } from "@/components/ui/button";

export default function SupervisorDashboardError({ reset }: { reset: () => void }) {
  return (
    <main className="flex min-h-dvh items-center bg-slate-50 px-4 py-6 text-right" dir="rtl">
      <section className="mx-auto w-full max-w-md rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-slate-900">تعذر تحميل لوحة المشرف</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">حاول مرة أخرى بعد لحظات.</p>
        <Button className="mt-5" onClick={reset} type="button">
          إعادة المحاولة
        </Button>
      </section>
    </main>
  );
}
