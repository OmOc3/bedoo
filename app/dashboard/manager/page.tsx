import type { Metadata } from "next";
import Link from "next/link";
import { DashboardNav } from "@/components/layout/nav";
import { PageHeader } from "@/components/layout/page-header";
import { StatusPills } from "@/components/reports/status-pills";
import { requireRole } from "@/lib/auth/server-session";
import { i18n } from "@/lib/i18n";
import { getLatestReports, getManagerDashboardStats } from "@/lib/stats/dashboard-stats";
import type { AppTimestamp } from "@/types";

export const metadata: Metadata = {
  title: i18n.dashboard.managerTitle,
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

function formatTimestamp(timestamp?: AppTimestamp): string {
  if (!timestamp) {
    return "غير متاح";
  }

  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp.toDate());
}

export default async function ManagerDashboardPage() {
  await requireRole(["manager"]);
  const [stats, latestReports] = await Promise.all([getManagerDashboardStats(), getLatestReports(5)]);

  return (
    <main className="min-h-dvh bg-slate-50 px-4 py-6 text-right sm:px-6 lg:px-8" dir="rtl">
      <section className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          description="نظرة تشغيلية على المحطات والتقارير والفنيين."
          title={i18n.dashboard.managerTitle}
        />
        <DashboardNav role="manager" />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard href="/dashboard/manager/stations" label="إجمالي المحطات" tone="teal" value={stats.totalStations} />
          <StatCard href="/dashboard/manager/stations" label="المحطات النشطة" tone="green" value={stats.activeStations} />
          <StatCard href="/dashboard/manager/reports" label="إجمالي التقارير" tone="blue" value={stats.totalReports} />
          <StatCard href="/dashboard/manager/reports" label="تقارير آخر 7 أيام" tone="teal" value={stats.reportsThisWeek} />
          <StatCard
            href="/dashboard/manager/reports?reviewStatus=pending"
            label="بانتظار المراجعة"
            tone="amber"
            value={stats.pendingReviewReports}
          />
          <StatCard href="/dashboard/manager/users" label="الفنيون" tone="blue" value={stats.technicians} />
          <StatCard href="/dashboard/manager/tasks" label="مهام اليوم" tone="amber" value={stats.pendingReviewReports} />
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-control">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-4">
            <h2 className="text-lg font-bold text-slate-900">آخر التقارير</h2>
            <Link className="text-sm font-medium text-teal-700 hover:text-teal-600" href="/dashboard/manager/reports">
              عرض الكل
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                    الوقت
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                    المحطة
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                    الفني
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                    الحالة
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {latestReports.map((report) => (
                  <tr className="hover:bg-slate-50" key={report.reportId}>
                    <td className="px-4 py-3 text-sm text-slate-700">{formatTimestamp(report.submittedAt)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{report.stationLabel}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{report.technicianName}</td>
                    <td className="px-4 py-3">
                      <StatusPills status={report.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
