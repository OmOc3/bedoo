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
import { getBoundedReportStatsInput, resolveAnalyticsRange } from "@/lib/stats/report-stats";

export const metadata: Metadata = {
  title: "التحليلات",
};

interface ManagerAnalyticsPageProps {
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

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium" }).format(date);
}

function changeText(value: number | null): string {
  if (value === null) {
    return "فترة جديدة";
  }

  if (value === 0) {
    return "بدون تغيير";
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

function RangeFilter({ dateFrom, dateTo }: { dateFrom: Date; dateTo: Date }) {
  return (
    <form className="grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-control md:grid-cols-[1fr_1fr_auto]" action="/dashboard/manager/analytics">
      <label className="space-y-1">
        <span className="block text-sm font-semibold text-[var(--foreground)]">من تاريخ</span>
        <input
          className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-transparent focus:bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          defaultValue={formatDateInput(dateFrom)}
          name="dateFrom"
          type="date"
        />
      </label>
      <label className="space-y-1">
        <span className="block text-sm font-semibold text-[var(--foreground)]">إلى تاريخ</span>
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
        تحديث
      </button>
    </form>
  );
}

function ComparisonCards({ metrics }: { metrics: PeriodComparisonMetric[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-control" key={metric.key}>
          <p className="text-sm font-medium text-[var(--muted)]">{metric.label}</p>
          <p className="mt-1 text-3xl font-extrabold text-[var(--foreground)]">{metric.current}</p>
          <p className="mt-2 text-xs font-semibold text-[var(--muted)]">
            السابق: {metric.previous} <span className={changeClass(metric)}>{changeText(metric.changePercent)}</span>
          </p>
        </div>
      ))}
    </div>
  );
}

function TrendChart({ trend }: { trend: ReportTrendPoint[] }) {
  const visibleTrend = trend.slice(-24);
  const maxTotal = Math.max(...visibleTrend.map((point) => point.total), 1);

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-control">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">اتجاه التقارير</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">آخر {visibleTrend.length} نقطة زمنية ضمن النطاق المحدد.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            تمت المراجعة
          </span>
          <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            بانتظار المراجعة
          </span>
          <span className="inline-flex items-center gap-1 text-rose-700 dark:text-rose-300">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            مرفوض
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

function TrendTable({ trend }: { trend: ReportTrendPoint[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-control">
      <div className="border-b border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-3">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">جدول الاتجاهات</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead className="bg-[var(--surface-subtle)]">
            <tr>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-[var(--muted)]">الفترة</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-[var(--muted)]">الإجمالي</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-[var(--muted)]">بانتظار المراجعة</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-[var(--muted)]">تمت المراجعة</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-[var(--muted)]">مرفوض</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {trend.slice().reverse().map((point) => (
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

export default async function ManagerAnalyticsPage({ searchParams }: ManagerAnalyticsPageProps) {
  const params = await searchParams;
  await requireRole(["manager"]);
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
  const trend = buildReportTrend(reports, rangeFrom, rangeTo);
  const comparisons = buildPeriodComparison(reports, previousReports);
  const hasTruncatedData = reportsTruncated || previousReportsTruncated || stationsTruncated;

  return (
    <DashboardShell role="manager">
        <PageHeader
          backHref="/dashboard/manager"
          description={`ملخصات تشغيلية من ${formatDate(rangeFrom)} إلى ${formatDate(rangeTo)} مقارنة بالفترة السابقة من ${formatDate(previousRangeFrom)} إلى ${formatDate(previousRangeTo)}.`}
          title="التحليلات"
        />
        <RangeFilter dateFrom={rangeFrom} dateTo={rangeTo} />
        <AIInsightsCard />

        {hasTruncatedData ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
            تم الوصول للحد الآمن لبيانات التحليلات. قد تحتاج إلى نطاق زمني أضيق أو إحصاءات materialized للبيانات الكبيرة.
          </div>
        ) : null}

        <ComparisonCards metrics={comparisons} />

        <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-800">
          النطاق الحالي يغطي {rangeDays} يوم.
        </div>

        <TrendChart trend={trend} />
        <TrendTable trend={trend} />

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
            <div className="border-b border-[var(--border)] px-4 py-3">
              <h2 className="text-lg font-semibold text-[var(--foreground)]">الأداء حسب المنطقة</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px]">
                <thead className="bg-[var(--surface-subtle)]">
                  <tr>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                      المنطقة
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                      المحطات
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                      النشطة
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                      التقارير
                    </th>
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
              <h2 className="text-lg font-semibold text-[var(--foreground)]">أداء الفنيين</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px]">
                <thead className="bg-[var(--surface-subtle)]">
                  <tr>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                      الفني
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                      التقارير
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                      بانتظار المراجعة
                    </th>
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
          <h2 className="text-lg font-semibold text-[var(--foreground)]">أكثر حالات الفحص تكرارًا</h2>
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
