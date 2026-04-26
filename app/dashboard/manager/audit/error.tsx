"use client";

import { Button } from "@/components/ui/button";

export default function ManagerAuditError({ reset }: { reset: () => void }) {
  return (
    <main className="min-h-dvh bg-slate-50 px-4 py-6 text-right" dir="rtl">
      <section className="mx-auto w-full max-w-md rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-slate-900">تعذر تحميل سجل العمليات</h2>
        <p className="mt-2 text-sm text-slate-500">قد تحتاج الفلاتر المركبة إلى فهرس Firestore.</p>
        <Button className="mt-4" onClick={reset}>
          إعادة المحاولة
        </Button>
      </section>
    </main>
  );
}
