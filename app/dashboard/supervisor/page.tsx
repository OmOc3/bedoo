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
  tone: "amber" | "blue" | "green" | "teal";
  value: number;
}

const statToneClasses: Record<StatCardProps["tone"], string> = {
  amber: "bg-amber-50 text-amber-700",
  blue: "bg-blue-50 text-blue-700",
  green: "bg-green-50 text-green-700",
  teal: "bg-teal-50 text-teal-700",
};

function StatCard({ href, label, tone, value }: StatCardProps) {
  return (
    <Link
      className="group flex min-h-28 items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-control transition-colors hover:bg-slate-50"
      href={href}
    >
      <div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="mt-1 text-3xl font-extrabold text-slate-950">{value}</p>
      </div>
      <span
        aria-hidden="true"
        className={`grid h-12 w-12 place-items-center rounded-2xl ${statToneClasses[tone]} transition-transform group-hover:-translate-y-0.5`}
      >
        <span className="h-3 w-3 rounded-full bg-current" />
      </span>
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
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white shadow-control transition-colors hover:bg-teal-600"
                href="/dashboard/supervisor/reports"
              >
                عرض التقارير
              </Link>
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-control transition-colors hover:bg-slate-50"
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
      </section>
    </main>
  );
}
