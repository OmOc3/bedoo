import type { Metadata } from "next";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-page";
import { PageHeader } from "@/components/layout/page-header";
import { requireRole } from "@/lib/auth/server-session";
import { i18n } from "@/lib/i18n";
import { getSupervisorDashboardStats } from "@/lib/stats/dashboard-stats";

export const metadata: Metadata = {
  title: i18n.dashboard.supervisorTitle,
};

interface StatCardProps {
  href: string;
  label: string;
  tone: "amber" | "blue" | "green" | "teal";
  value: number;
}

const statToneClasses: Record<StatCardProps["tone"], string> = {
  amber: "border-t-amber-500 text-amber-500",
  blue: "border-t-blue-500 text-blue-500",
  green: "border-t-emerald-500 text-emerald-500",
  teal: "border-t-teal-500 text-teal-500",
};

function StatCard({ href, label, tone, value }: StatCardProps) {
  return (
    <Link
      className={`group relative min-h-32 overflow-hidden rounded-2xl border border-[var(--border)] border-t-[3px] bg-[var(--surface)] p-5 shadow-card transition-all duration-150 hover:-translate-y-0.5 hover:shadow-card-md ${statToneClasses[tone]}`}
      href={href}
    >
      <div className="absolute right-5 top-5 h-6 w-6 rounded-full border-2 border-current opacity-60 transition-opacity group-hover:opacity-100" aria-hidden="true" />
      <div className="relative pt-8">
        <p className="text-4xl font-bold tracking-tight text-[var(--foreground)]">{value}</p>
        <p className="mt-1 text-sm text-[var(--muted)]">{label}</p>
      </div>
    </Link>
  );
}

export default async function SupervisorDashboardPage() {
  await requireRole(["supervisor", "manager"]);
  const stats = await getSupervisorDashboardStats();

  return (
    <DashboardShell role="supervisor">
        <PageHeader
          action={
            <div className="flex flex-wrap gap-2">
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] shadow-sm transition-all duration-150 hover:bg-[var(--primary-hover)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
                href="/dashboard/supervisor/reports"
              >
                عرض التقارير
              </Link>
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-sm font-semibold text-[var(--foreground)] shadow-sm transition-all duration-150 hover:bg-[var(--surface-subtle)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
                href="/dashboard/supervisor/tasks"
              >
                مهام اليوم
              </Link>
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-sm font-semibold text-[var(--foreground)] shadow-sm transition-all duration-150 hover:bg-[var(--surface-subtle)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
                href="/dashboard/supervisor/shifts"
              >
                شيفتات الفنيين
              </Link>
            </div>
          }
          description="متابعة التقارير اليومية وحالات المراجعة للمحطات النشطة."
          title={i18n.dashboard.supervisorTitle}
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard href="/dashboard/supervisor/reports" label="إجمالي التقارير" tone="blue" value={stats.totalReports} />
          <StatCard
            href="/dashboard/supervisor/reports"
            label="تقارير اليوم"
            tone="teal"
            value={stats.reportsToday}
          />
          <StatCard
            href="/dashboard/supervisor/reports?reviewStatus=pending"
            label="بانتظار المراجعة"
            tone="amber"
            value={stats.pendingReviewReports}
          />
          <StatCard
            href="/dashboard/supervisor/reports"
            label="المحطات النشطة"
            tone="green"
            value={stats.activeStations}
          />
          <StatCard
            href="/dashboard/supervisor/tasks"
            label="مهام اليوم"
            tone="amber"
            value={stats.pendingReviewReports}
          />
        </div>
    </DashboardShell>
  );
}
