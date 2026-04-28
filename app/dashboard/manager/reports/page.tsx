import type { Metadata } from "next";
import Link from "next/link";
import { DashboardNav } from "@/components/layout/nav";
import { PageHeader } from "@/components/layout/page-header";
import { ReportMobileCard } from "@/components/reports/report-mobile-card";
import { ReportPhotoLinks } from "@/components/reports/report-photo-links";
import { ReportsFilterForm, type ReportsFilterValues } from "@/components/reports/reports-filter-form";
import { ReviewReportForm } from "@/components/reports/review-report-form";
import { StatusPills } from "@/components/reports/status-pills";
import { EmptyState } from "@/components/ui/empty-state";
import { requireRole } from "@/lib/auth/server-session";
import { listReports } from "@/lib/db/repositories";
import { decodeReportCursor, encodeReportCursor } from "@/lib/pagination/report-cursor";
import type { AppTimestamp, Report } from "@/types";

interface ManagerReportsPageProps {
  searchParams: Promise<{
    cursor?: string;
    dateFrom?: string;
    dateTo?: string;
    reviewStatus?: string;
    stationId?: string;
    technicianUid?: string;
  }>;
}

export const metadata: Metadata = {
  title: "تقارير المدير",
};

const pageSize = 25;

function formatTimestamp(timestamp?: AppTimestamp): string {
  if (!timestamp) {
    return "غير متاح";
  }

  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp.toDate());
}

function reviewStatusBadge(status: Report["reviewStatus"]) {
  const classes = {
    pending: "bg-amber-100 text-amber-700",
    reviewed: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
  }[status];
  const label = {
    pending: "بانتظار المراجعة",
    reviewed: "تمت المراجعة",
    rejected: "مرفوض",
  }[status];

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${classes}`}>
      {label}
    </span>
  );
}

function parseDate(value: string | undefined, endOfDay = false): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  }

  return date;
}

function timestampToMillis(timestamp?: AppTimestamp): number | null {
  if (!timestamp) {
    return null;
  }

  const value = timestamp.toDate().getTime();

  return Number.isFinite(value) ? value : null;
}

function photoCount(report: Report): number {
  return (
    Number(Boolean(report.photoPaths?.before)) +
    Number(Boolean(report.photoPaths?.after)) +
    Number(Boolean(report.photoPaths?.station))
  );
}

function buildNextHref(filters: ReportsFilterValues, cursor: string): string {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });
  params.set("cursor", cursor);

  return `/dashboard/manager/reports?${params.toString()}`;
}

function buildExportHref(filters: ReportsFilterValues): string {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  return `/api/reports/export${params.size > 0 ? `?${params.toString()}` : ""}`;
}

export default async function ManagerReportsPage({ searchParams }: ManagerReportsPageProps) {
  const params = await searchParams;
  await requireRole(["manager"]);

  const filters: ReportsFilterValues = {
    stationId: params.stationId ?? "",
    technicianUid: params.technicianUid ?? "",
    dateFrom: params.dateFrom ?? "",
    dateTo: params.dateTo ?? "",
    reviewStatus:
      params.reviewStatus === "pending" || params.reviewStatus === "reviewed" || params.reviewStatus === "rejected"
        ? params.reviewStatus
        : "",
  };
  const dateFrom = parseDate(filters.dateFrom);
  const dateTo = parseDate(filters.dateTo, true);
  const cursor = params.cursor ? decodeReportCursor(params.cursor) : null;

  const pageReports = await listReports({
    filters: {
      stationId: filters.stationId,
      technicianUid: filters.technicianUid,
      reviewStatus: filters.reviewStatus,
      dateFrom,
      dateTo,
    },
    cursor,
    limit: pageSize + 1,
  });
  const reports = pageReports.slice(0, pageSize);
  const hasNextPage = pageReports.length > pageSize;
  const lastReport = reports.at(-1);
  const lastReportSubmittedAt = timestampToMillis(reports.at(-1)?.submittedAt);
  const nextCursor =
    lastReport && lastReportSubmittedAt !== null
      ? encodeReportCursor({ id: lastReport.reportId, submittedAtMs: lastReportSubmittedAt })
      : null;

  return (
    <main className="min-h-dvh bg-slate-50 px-4 py-6 text-right sm:px-6 lg:px-8" dir="rtl">
      <section className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          action={
            <div className="flex flex-wrap gap-2">
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white shadow-control transition-colors hover:bg-teal-600"
                href={buildExportHref(filters)}
              >
                تصدير CSV
              </Link>
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-control transition-colors hover:bg-slate-50"
                href="/dashboard/manager"
              >
                لوحة المدير
              </Link>
            </div>
          }
          backHref="/dashboard/manager"
          description="مراجعة تقارير الفنيين وتحديث حالة الاعتماد."
          title="تقارير المدير"
        />
        <DashboardNav role="manager" />

        <ReportsFilterForm basePath="/dashboard/manager/reports" defaultValues={filters} />

        {reports.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-control">
            <EmptyState description="لا توجد تقارير مطابقة للفلاتر الحالية." title="لا توجد تقارير" />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-3 md:hidden">
              {reports.map((report) => (
                <ReportMobileCard
                  action={
                    <ReviewReportForm
                      instanceId="mobile"
                      reportId={report.reportId}
                      reviewNotes={report.reviewNotes}
                      reviewStatus={report.reviewStatus}
                    />
                  }
                  key={report.reportId}
                  photoCount={photoCount(report)}
                  report={report}
                  reviewBadge={reviewStatusBadge(report.reviewStatus)}
                  timestamp={formatTimestamp(report.submittedAt)}
                />
              ))}
            </div>
          <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-control md:block">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px]">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                    وقت الإرسال
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
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                    المراجعة
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                    الإجراء
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reports.map((report) => (
                  <tr className="align-top transition-colors hover:bg-slate-50" key={report.reportId}>
                    <td className="px-4 py-3 text-sm text-slate-700">{formatTimestamp(report.submittedAt)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{report.stationLabel}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{report.technicianName}</td>
                    <td className="px-4 py-3">
                      <StatusPills status={report.status} />
                    </td>
                    <td className="px-4 py-3">{reviewStatusBadge(report.reviewStatus)}</td>
                    <td className="px-4 py-3">
                      <details>
                        <summary className="cursor-pointer text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 hover:underline">
                          عرض وتحديث
                        </summary>
                        <div className="mt-2 max-w-md rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-600">
                          <p className="font-medium text-slate-900">ملاحظات الفني</p>
                          <p className="mt-1">{report.notes ?? "لا توجد ملاحظات."}</p>
                          <ReportPhotoLinks photoCount={photoCount(report)} reportId={report.reportId} />
                          <ReviewReportForm
                            reportId={report.reportId}
                            reviewNotes={report.reviewNotes}
                            reviewStatus={report.reviewStatus}
                          />
                        </div>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
          </div>
        )}

        {hasNextPage && nextCursor ? (
          <div className="flex justify-end">
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-control transition-colors hover:bg-slate-50"
              href={buildNextHref(filters, nextCursor)}
            >
              الصفحة التالية
            </Link>
          </div>
        ) : null}
      </section>
    </main>
  );
}
