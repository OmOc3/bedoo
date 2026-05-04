"use client";

import { DashboardShell } from "@/components/layout/dashboard-page";
import { useLanguage } from "@/components/i18n/language-provider";

export default function ManagerPayrollError() {
  const { direction, messages } = useLanguage();

  return (
    <DashboardShell role="manager">
      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-start" dir={direction}>
        <h1 className="text-xl font-bold text-[var(--foreground)]">{messages.pageErrors.payroll}</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">{messages.pageErrors.payrollHint}</p>
      </section>
    </DashboardShell>
  );
}
