import type { Metadata } from "next";
import Link from "next/link";
import type { ReactElement, SVGProps } from "react";
import { DashboardShell } from "@/components/layout/dashboard-page";
import { PageHeader } from "@/components/layout/page-header";
import { StatusPills } from "@/components/reports/status-pills";
import { ThemeIconToggle } from "@/components/theme/theme-icon-toggle";
import { requireRole } from "@/lib/auth/server-session";
import { formatDateTimeRome } from "@/lib/datetime";
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
  amber: "border-t-amber-500 text-amber-500",
  blue: "border-t-blue-500 text-blue-500",
  green: "border-t-emerald-500 text-emerald-500",
  teal: "border-t-teal-500 text-teal-500",
};

function IconFrame({ children, className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      {...props}
    >
      {children}
    </svg>
  );
}

function StationIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconFrame {...props}>
      <path d="M8 8.5a4 4 0 0 1 8 0v5a4 4 0 0 1-8 0z" />
      <path d="M12 4V2" />
      <path d="M12 22v-2" />
      <path d="M4 13h4" />
      <path d="M16 13h4" />
    </IconFrame>
  );
}

function ActiveIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconFrame {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.5 2.25 2.25L15.5 9.5" />
    </IconFrame>
  );
}

function ReportIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconFrame {...props}>
      <path d="M6 3h9l3 3v15H6z" />
      <path d="M14 3v4h4" />
      <path d="M9 12h6" />
      <path d="M9 16h4" />
    </IconFrame>
  );
}

function PendingIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconFrame {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </IconFrame>
  );
}

function TeamIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconFrame {...props}>
      <path d="M16 19a4 4 0 0 0-8 0" />
      <circle cx="12" cy="8" r="3" />
      <path d="M21 19a3.5 3.5 0 0 0-4-3.45" />
      <path d="M3 19a3.5 3.5 0 0 1 4-3.45" />
    </IconFrame>
  );
}

const statIcons: Record<StatCardProps["tone"], (props: SVGProps<SVGSVGElement>) => ReactElement> = {
  amber: PendingIcon,
  blue: ReportIcon,
  green: ActiveIcon,
  teal: StationIcon,
};

function StatCard({ href, label, tone, value }: StatCardProps) {
  const Icon = href.includes("/users") ? TeamIcon : statIcons[tone];

  return (
    <Link
      className={`group relative min-h-32 overflow-hidden rounded-2xl border border-[var(--border)] border-t-[3px] bg-[var(--surface)] p-5 shadow-card transition-all duration-150 hover:-translate-y-0.5 hover:shadow-card-md ${statToneClasses[tone]}`}
      href={href}
    >
      <Icon className="absolute right-5 top-5 h-6 w-6 opacity-60 transition-opacity group-hover:opacity-100" />
      <div className="relative pt-8">
        <p className="text-4xl font-bold tracking-tight text-[var(--foreground)]">{value}</p>
        <p className="mt-1 text-sm text-[var(--muted)]">{label}</p>
      </div>
    </Link>
  );
}

function formatTimestamp(timestamp?: AppTimestamp): string {
  if (!timestamp) {
    return "غير متاح";
  }

  return formatDateTimeRome(timestamp.toDate(), { locale: "ar-EG" });
}

export default async function ManagerDashboardPage() {
  await requireRole(["manager"]);
  const [stats, latestReports] = await Promise.all([getManagerDashboardStats(), getLatestReports(5)]);

  return (
    <DashboardShell role="manager">
        <PageHeader
          action={
            <>
              <ThemeIconToggle />
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-subtle)]"
                href="/dashboard/manager/shifts"
              >
                إدارة الشيفتات
              </Link>
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-subtle)]"
                href="/dashboard/manager/client-orders"
              >
                إدارة العملاء
              </Link>
            </>
          }
          description="نظرة تشغيلية على المحطات والتقارير والفنيين."
          title={i18n.dashboard.managerTitle}
        />

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

        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-card">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface)] px-5 py-4">
            <h2 className="section-heading text-base">آخر التقارير</h2>
            <Link className="text-sm font-semibold text-[var(--primary)] transition-colors hover:text-[var(--primary-hover)]" href="/dashboard/manager/reports">
              عرض الكل
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="bg-[var(--surface-subtle)]">
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    الوقت
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    المحطة
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    الفني
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    الحالة
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {latestReports.map((report) => (
                  <tr className="transition-colors even:bg-[var(--surface-subtle)] hover:bg-[var(--primary-soft)]" key={report.reportId}>
                    <td className="px-4 py-3 text-sm text-[var(--muted)]">{formatTimestamp(report.submittedAt)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-[var(--foreground)]">{report.stationLabel}</td>
                    <td className="px-4 py-3 text-sm text-[var(--muted)]">{report.technicianName}</td>
                    <td className="px-4 py-3">
                      <StatusPills status={report.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
    </DashboardShell>
  );
}
