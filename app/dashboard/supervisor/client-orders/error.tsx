"use client";

export default function SupervisorClientOrdersError() {
  return (
    <main className="min-h-dvh bg-[var(--background)] px-4 py-8 text-right" dir="rtl">
      <div className="mx-auto max-w-7xl rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        تعذر تحميل طلبات العملاء في لوحة المشرف.
      </div>
    </main>
  );
}
