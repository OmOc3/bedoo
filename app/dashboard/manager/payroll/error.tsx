"use client";

import { DashboardShell } from "@/components/layout/dashboard-page";

export default function ManagerPayrollError() {
  return (
    <DashboardShell role="manager">
      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-right">
        <h1 className="text-xl font-bold text-[var(--foreground)]">تعذر تحميل الرواتب</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">حدّث الصفحة أو راجع اتصال قاعدة البيانات.</p>
      </section>
    </DashboardShell>
  );
}
