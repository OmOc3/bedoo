"use client";

export default function ClientPortalError() {
  return (
    <main className="min-h-dvh bg-[var(--background)] px-4 py-8 text-right" dir="rtl">
      <div className="mx-auto max-w-7xl rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        حدث خطأ أثناء تحميل بيانات العميل. حاول مرة أخرى.
      </div>
    </main>
  );
}
