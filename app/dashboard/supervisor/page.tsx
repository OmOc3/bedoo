import type { Metadata } from "next";
import Link from "next/link";
import { DashboardNav } from "@/components/layout/nav";
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
  value: number;
}

function StatCard({ href, label, value }: StatCardProps) {
  return (
    <Link
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-control transition-colors hover:bg-slate-50"
      href={href}
    >
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-slate-900">{value}</p>
    </Link>
  );
}

export default async function SupervisorDashboardPage() {
  await requireRole(["supervisor", "manager"]);
  const stats = await getSupervisorDashboardStats();

  return (
    <main className="min-h-dvh bg-slate-50 px-4 py-6 text-right sm:px-6 lg:px-8" dir="rtl">
      <section className="mx-auto max-w-7xl">
        <PageHeader
          action={
            <div className="flex flex-wrap gap-2">
              <Link
                className="inline-flex items-center justify-center rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-600"
                href="/dashboard/supervisor/reports"
              >
                عرض التقارير
              </Link>
              <Link
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                href="/dashboard/supervisor/tasks"
              >
                مهام اليوم
              </Link>
            </div>
          }
          description="متابعة التقارير اليومية وحالات المراجعة للمحطات النشطة."
          title={i18n.dashboard.supervisorTitle}
        />
        <DashboardNav role="supervisor" />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard href="/dashboard/supervisor/reports" label="إجمالي التقارير" value={stats.totalReports} />
          <StatCard
            href="/dashboard/supervisor/reports"
            label="تقارير اليوم"
            value={stats.reportsToday}
          />
          <StatCard
            href="/dashboard/supervisor/reports?reviewStatus=pending"
            label="بانتظار المراجعة"
            value={stats.pendingReviewReports}
          />
          <StatCard
            href="/dashboard/supervisor/reports"
            label="المحطات النشطة"
            value={stats.activeStations}
          />
          <StatCard
            href="/dashboard/supervisor/tasks"
            label="مهام اليوم"
            value={stats.pendingReviewReports}
          />
        </div>
      </section>
    </main>
  );
}
