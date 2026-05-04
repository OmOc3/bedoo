import type { Metadata } from "next";
import { AIInsightsCard } from "@/components/analytics/ai-insights-card";
import { DashboardShell } from "@/components/layout/dashboard-page";
import { PageHeader } from "@/components/layout/page-header";
import { StatusPills } from "@/components/reports/status-pills";
import {
  buildPeriodComparison,
  buildReportTrend,
  buildStatusCounts,
  buildTechnicianStats,
  buildZoneStats,
  type PeriodComparisonMetric,
  type ReportTrendPoint,
} from "@/lib/analytics";
import { requireRole } from "@/lib/auth/server-session";
import { getIntlLocaleForApp, type I18nMessages } from "@/lib/i18n";
import { getI18nMessages, getRequestLocale } from "@/lib/i18n/server";
import { getBoundedReportStatsInput, resolveAnalyticsRange } from "@/lib/stats/report-stats";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const t = getI18nMessages(locale);

  return { title: t.analyticsPage.metaTitleSupervisor };
}

interface SupervisorAnalyticsPageProps {
  searchParams: Promise<{
    dateFrom?: string;
    dateTo?: string;
  }>;
}

function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(date: Date, intlLocale: string): string {
  return new Intl.DateTimeFormat(intlLocale, { dateStyle: "medium" }).format(date);
}

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? "");
}

function changeText(value: number | null, ap: I18nMessages["analyticsPage"]): string {
  if (value === null) {
    return ap.newPeriod;
  }

  if (value === 0) {
    return ap.noChange;
  }

  return `${value > 0 ? "+" : ""}${value}%`;
}

function changeClass(metric: PeriodComparisonMetric): string {
  if (metric.changePercent === null || metric.changePercent === 0) {
    return "text-[var(--muted)]";
  }

  if (metric.key === "pending") {
    return metric.changePercent > 0 ? "text-rose-700 dark:text-rose-300" : "text-emerald-700 dark:text-emerald-300";
  }

  return metric.changePercent > 0 ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300";
}

function RangeFilter({
  ap,
  dateFrom,
  dateTo,
}: {
  ap: I18nMessages["analyticsPage"];
  dateFrom: Date;
  dateTo: Date;
}) {
  return (
    <form
      className="grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-control md:grid-cols-[1fr_1fr_auto]"
      action="/dashboard/supervisor/analytics"
    >
      <label className="space-y-1">
        <span className="block text-sm font-semibold text-[var(--foreground)]">{ap.dateFrom}</span>
        <input
          className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-transparent focus:bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          defaultValue={formatDateInput(dateFrom)}
          name="dateFrom"
          type="date"
        />
      </label>
      <label className="space-y-1">
        <span className="block text-sm font-semibold text-[var(--foreground)]">{ap.dateTo}</span>
        <input
          className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-transparent focus:bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          defaultValue={formatDateInput(dateTo)}
          name="dateTo"
          type="date"
        />
      </label>
      <button
        className="inline-flex min-h-11 items-center justify-center self-end rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] transition-colors hover:bg-[var(--primary-hover)]"
        type="submit"
      >
        {ap.apply}
      </button>
    </form>
  );
}

function ComparisonCards({
  ap,
  metrics,
}: {
  ap: I18nMessages["analyticsPage"];
  metrics: PeriodComparisonMetric[];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-control" key={metric.key}>
          <p className="text-sm font-medium text-[var(--muted)]">{metric.label}</p>
          <p className="mt-1 text-3xl font-extrabold text-[var(--foreground)]">{metric.current}</p>
          <p className="mt-2 text-xs font-semibold text-[var(--muted)]">
            {ap.previousLabel} {metric.previous}{" "}
            <span className={changeClass(metric)}>{changeText(metric.changePercent, ap)}</span>
          </p>
        </div>
      ))}
    </div>
  );
}

function TrendChart({
  ap,
  reportsListing,
  trend,
}: {
  ap: I18nMessages["analyticsPage"];
  reportsListing: I18nMessages["reportsListing"];
  trend: ReportTrendPoint[];
}) {
  const visibleTrend = trend.slice(-24);
  const maxTotal = Math.max(...visibleTrend.map((point) => point.total), 1);

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-control">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">{ap.reportTrendTitle}</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">{interpolate(ap.reportTrendLead, { count: String(visibleTrend.length) })}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            {reportsListing.reviewReviewed}
          </span>
          <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            {reportsListing.reviewPending}
          </span>
          <span className="inline-flex items-center gap-1 text-rose-700 dark:text-rose-300">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            {reportsListing.reviewRejected}
          </span>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto">
        <div className="flex h-72 min-w-[760px] items-end gap-2 border-b border-[var(--border)] px-2 pb-8">
          {visibleTrend.map((point) => {
            const barHeight = Math.max((point.total / maxTotal) * 100, point.total > 0 ? 4 : 0);

            return (
              <div className="flex min-w-10 flex-1 flex-col items-center justify-end gap-2" key={point.key}>
                <span className="text-xs font-bold text-[var(--foreground)]">{point.total}</span>
                <div className="flex h-52 w-full items-end">
                  <div
                    className="flex w-full flex-col-reverse overflow-hidden rounded-t-lg bg-[var(--surface-subtle)]"
                    style={{ height: `${barHeight}%` }}
                    title={`${point.label}: ${point.total}`}
                  >
                    <span className="bg-green-500" style={{ height: `${point.total ? (point.reviewed / point.total) * 100 : 0}%` }} />
                    <span className="bg-amber-400" style={{ height: `${point.total ? (point.pending / point.total) * 100 : 0}%` }} />
                    <span className="bg-red-500" style={{ height: `${point.total ? (point.rejected / point.total) * 100 : 0}%` }} />
                  </div>
                </div>
                <span className="max-w-20 truncate text-xs text-[var(--muted)]">{point.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TrendTable({
  ap,
  reportsListing,
  trend,
}: {
  ap: I18nMessages["analyticsPage"];
  reportsListing: I18nMessages["reportsListing"];
  trend: ReportTrendPoint[];
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-control">
      <div className="border-b border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-3">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">{ap.trendTableTitle}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead className="bg-[var(--surface-subtle)]">
            <tr>
              <th className="px-4 py-3 text-start text-xs font-medium uppercase tracking-wide text-[var(--muted)]">{ap.colPeriod}</th>
              <th className="px-4 py-3 text-start text-xs font-medium uppercase tracking-wide text-[var(--muted)]">{ap.colTotal}</th>
              <th className="px-4 py-3 text-start text-xs font-medium uppercase tracking-wide text-[var(--muted)]">{ap.colPendingReview}</th>
              <th className="px-4 py-3 text-start text-xs font-medium uppercase tracking-wide text-[var(--muted)]">{ap.metricReviewed}</th>
              <th className="px-4 py-3 text-start text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                {reportsListing.reviewRejected}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {trend
              .slice()
              .reverse()
              .map((point) => (
                <tr className="hover:bg-[var(--surface-subtle)]" key={point.key}>
                  <td className="px-4 py-3 text-sm font-medium text-[var(--foreground)]">{point.label}</td>
                  <td className="px-4 py-3 text-sm text-[var(--foreground)]">{point.total}</td>
                  <td className="px-4 py-3 text-sm text-amber-700 dark:text-amber-300">{point.pending}</td>
                  <td className="px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">{point.reviewed}</td>
                  <td className="px-4 py-3 text-sm text-rose-700 dark:text-rose-300">{point.rejected}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function SupervisorAnalyticsPage({ searchParams }: SupervisorAnalyticsPageProps) {
  const params = await searchParams;
  await requireRole(["supervisor"]);
  const locale = await getRequestLocale();
  const t = getI18nMessages(locale);
  const intlLocale = getIntlLocaleForApp(locale);
  const ap = t.analyticsPage;

  const range = resolveAnalyticsRange({
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  });
  const {
    previousRangeFrom,
    previousRangeTo,
    previousReports,
    previousReportsTruncated,
    rangeDays,
    rangeFrom,
    rangeTo,
    reports,
    reportsTruncated,
    stations,
    stationsTruncated,
  } = await getBoundedReportStatsInput(range);
  const zones = buildZoneStats(stations, reports);
  const technicians = buildTechnicianStats(reports);
  const statusSummary = buildStatusCounts(reports);
  const trend = buildReportTrend(reports, rangeFrom, rangeTo, intlLocale);
  const comparisons = buildPeriodComparison(reports, previousReports, {
    activeTechnicians: ap.metricActiveTechnicians,
    pending: ap.metricPending,
    reviewed: ap.metricReviewed,
    totalReports: ap.metricTotalReports,
  });
  const hasTruncatedData = reportsTruncated || previousReportsTruncated || stationsTruncated;

  const pageDescription = interpolate(ap.descriptionRange, {
    from: formatDate(rangeFrom, intlLocale),
    prevFrom: formatDate(previousRangeFrom, intlLocale),
    prevTo: formatDate(previousRangeTo, intlLocale),
    to: formatDate(rangeTo, intlLocale),
  });

  return (
    <DashboardShell role="supervisor">
      <PageHeader backHref="/dashboard/supervisor" description={pageDescription} title={ap.pageTitle} />
      <RangeFilter ap={ap} dateFrom={rangeFrom} dateTo={rangeTo} />
      <AIInsightsCard />

      {hasTruncatedData ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
          {ap.truncationWarning}
        </div>
      ) : null}

      <ComparisonCards ap={ap} metrics={comparisons} />

      <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-800">
        {interpolate(ap.rangeCoversDays, { days: String(rangeDays) })}
      </div>

      <TrendChart ap={ap} reportsListing={t.reportsListing} trend={trend} />
      <TrendTable ap={ap} reportsListing={t.reportsListing} trend={trend} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <div className="border-b border-[var(--border)] px-4 py-3">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">{ap.zonePerformanceTitle}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px]">
              <thead className="bg-[var(--surface-subtle)]">
                <tr>
                  <th className="px-4 py-3 text-start text-xs font-medium uppercase tracking-wide text-[var(--muted)]">{ap.colZone}</th>
                  <th className="px-4 py-3 text-start text-xs font-medium uppercase tracking-wide text-[var(--muted)]">{ap.colStations}</th>
                  <th className="px-4 py-3 text-start text-xs font-medium uppercase tracking-wide text-[var(--muted)]">{ap.colActive}</th>
                  <th className="px-4 py-3 text-start text-xs font-medium uppercase tracking-wide text-[var(--muted)]">{ap.colReports}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {zones.map((zone) => (
                  <tr className="hover:bg-[var(--surface-subtle)]" key={zone.zone}>
                    <td className="px-4 py-3 text-sm font-medium text-[var(--foreground)]">{zone.zone}</td>
                    <td className="px-4 py-3 text-sm text-[var(--foreground)]">{zone.stations}</td>
                    <td className="px-4 py-3 text-sm text-[var(--foreground)]">{zone.activeStations}</td>
                    <td className="px-4 py-3 text-sm text-[var(--foreground)]">{zone.reports}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <div className="border-b border-[var(--border)] px-4 py-3">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">{ap.technicianPerformanceTitle}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px]">
              <thead className="bg-[var(--surface-subtle)]">
                <tr>
                  <th className="px-4 py-3 text-start text-xs font-medium uppercase tracking-wide text-[var(--muted)]">{ap.colTechnician}</th>
                  <th className="px-4 py-3 text-start text-xs font-medium uppercase tracking-wide text-[var(--muted)]">{ap.colReports}</th>
                  <th className="px-4 py-3 text-start text-xs font-medium uppercase tracking-wide text-[var(--muted)]">{ap.colPendingReview}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {technicians.map((technician) => (
                  <tr className="hover:bg-[var(--surface-subtle)]" key={technician.technicianUid || technician.technicianName}>
                    <td className="px-4 py-3 text-sm font-medium text-[var(--foreground)]">{technician.technicianName}</td>
                    <td className="px-4 py-3 text-sm text-[var(--foreground)]">{technician.reports}</td>
                    <td className="px-4 py-3 text-sm text-[var(--foreground)]">{technician.pending}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">{ap.topStatusesTitle}</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {statusSummary.map((item) => (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] p-4" key={item.status}>
              <StatusPills status={[item.status]} />
              <p className="mt-3 text-3xl font-bold text-[var(--foreground)]">{item.count}</p>
            </div>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}
