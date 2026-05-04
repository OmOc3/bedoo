import type { Metadata } from "next";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-page";
import { PageHeader } from "@/components/layout/page-header";
import { requireRole } from "@/lib/auth/server-session";
import { getI18nMessages, getRequestLocale } from "@/lib/i18n/server";
import { getOperationTasks } from "@/lib/operations-tasks";
import { getSupervisorDashboardStats } from "@/lib/stats/dashboard-stats";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const t = getI18nMessages(locale);
  return { title: t.dashboard.supervisorTitle };
}

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

const quickPanelClass =
  "flex min-h-24 flex-col justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm font-semibold text-[var(--foreground)] shadow-card transition-colors hover:bg-[var(--surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2";

export default async function SupervisorDashboardPage() {
  await requireRole(["supervisor", "manager"]);
  const locale = await getRequestLocale();
  const t = getI18nMessages(locale);
  const [stats, operations] = await Promise.all([getSupervisorDashboardStats(), getOperationTasks()]);
  const backlogQueueTotal = operations.totals.pendingReports + operations.totals.staleStations;

  return (
    <DashboardShell role="supervisor" contentClassName="max-w-7xl pb-28">
      <PageHeader
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] shadow-sm transition-all duration-150 hover:bg-[var(--primary-hover)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
              href="/dashboard/supervisor/reports"
            >
              {t.supervisorHome.viewReports}
            </Link>
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-sm font-semibold text-[var(--foreground)] shadow-sm transition-all duration-150 hover:bg-[var(--surface-subtle)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
              href="/dashboard/supervisor/tasks"
            >
              {t.supervisorHome.todayTasks}
            </Link>
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-sm font-semibold text-[var(--foreground)] shadow-sm transition-all duration-150 hover:bg-[var(--surface-subtle)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
              href="/dashboard/supervisor/shifts"
            >
              {t.supervisorHome.technicianShifts}
            </Link>
          </div>
        }
        description={t.supervisorHome.pageDescription}
        title={t.dashboard.supervisorTitle}
      />

      <section className="mt-8 space-y-4">
        <div>
          <h2 className="section-heading text-lg">{t.supervisorHome.sectionOpsTitle}</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">{t.supervisorHome.sectionOpsLead}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard href="/dashboard/supervisor/reports" label={t.supervisorHome.statTotalReports} tone="blue" value={stats.totalReports} />
          <StatCard
            href="/dashboard/supervisor/reports"
            label={t.supervisorHome.statTodayReports}
            tone="teal"
            value={stats.reportsToday}
          />
          <StatCard
            href="/dashboard/supervisor/reports?reviewStatus=pending"
            label={t.supervisorHome.statPendingReview}
            tone="amber"
            value={stats.pendingReviewReports}
          />
          <StatCard
            href="/dashboard/supervisor/reports"
            label={t.supervisorHome.statActiveStations}
            tone="green"
            value={stats.activeStations}
          />
          <StatCard
            href="/dashboard/supervisor/tasks"
            label={t.supervisorHome.statFollowUp}
            tone="amber"
            value={backlogQueueTotal}
          />
        </div>
      </section>

      <section className="mt-10 space-y-4">
        <div>
          <h2 className="section-heading text-lg">{t.supervisorHome.quickSectionTitle}</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">{t.supervisorHome.quickSectionLead}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link className={quickPanelClass} href="/dashboard/supervisor/attendance">
            {t.supervisorHome.quickAttendance}
          </Link>
          <Link className={quickPanelClass} href="/dashboard/supervisor/daily-reports">
            {t.supervisorHome.quickDailyReports}
          </Link>
          <Link className={quickPanelClass} href="/dashboard/supervisor/client-orders">
            {t.supervisorHome.quickClientsOrders}
          </Link>
          <Link className={quickPanelClass} href="/dashboard/supervisor/reports?reviewStatus=pending">
            {t.supervisorHome.quickPendingOnly}
          </Link>
          <Link className={quickPanelClass} href="/dashboard/supervisor/stations">
            {t.supervisorHome.quickStations}
          </Link>
          <Link className={quickPanelClass} href="/dashboard/supervisor/analytics">
            {t.supervisorHome.quickAnalytics}
          </Link>
          <Link className={quickPanelClass} href="/dashboard/supervisor/team">
            {t.supervisorHome.quickTeam}
          </Link>
        </div>
      </section>
    </DashboardShell>
  );
}
