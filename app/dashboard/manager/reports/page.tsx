import type { Metadata } from "next";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-page";
import { PageHeader } from "@/components/layout/page-header";
import { ReportMobileCard } from "@/components/reports/report-mobile-card";
import { ReportPhotoLinks } from "@/components/reports/report-photo-links";
import { ReportsFilterForm } from "@/components/reports/reports-filter-form";
import { EditSubmittedReportForm } from "@/components/reports/edit-submitted-report-form";
import { editableSubmittedReportFields } from "@/lib/reports/editable-submitted-fields";
import { ReviewReportForm } from "@/components/reports/review-report-form";
import { StatusPills } from "@/components/reports/status-pills";
import { EmptyState } from "@/components/ui/empty-state";
import { requireRole } from "@/lib/auth/server-session";
import { formatDateTimeRome } from "@/lib/datetime";
import type { I18nMessages } from "@/lib/i18n";
import { getIntlLocaleForApp } from "@/lib/i18n";
import { getI18nMessages, getRequestLocale } from "@/lib/i18n/server";
import { formatPestTypesLine } from "@/lib/reports/report-display";
import { buildReportsListingHref, type ReportsFilterValues } from "@/lib/reports/report-filters";
import { listReports, listStations } from "@/lib/db/repositories";
import { decodeReportCursor, encodeReportCursor } from "@/lib/pagination/report-cursor";
import type { AppTimestamp, Report, UserRole } from "@/types";

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

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const t = getI18nMessages(locale);

  return { title: t.reportsPage.metaTitleManager };
}

const pageSize = 25;

function formatTimestamp(timestamp: AppTimestamp | undefined, t: I18nMessages, intlLocale: string): string {
  if (!timestamp) {
    return t.common.unavailable;
  }

  return formatDateTimeRome(timestamp.toDate(), {
    locale: intlLocale,
    unavailableLabel: t.common.unavailable,
  });
}

function reviewStatusBadge(status: Report["reviewStatus"], t: I18nMessages) {
  const classes = {
    pending: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    reviewed: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    rejected: "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  }[status];
  const dotClasses = {
    pending: "bg-amber-400",
    reviewed: "bg-emerald-400",
    rejected: "bg-rose-400",
  }[status];
  const label = {
    pending: t.reportsListing.reviewPending,
    reviewed: t.reportsListing.reviewReviewed,
    rejected: t.reportsListing.reviewRejected,
  }[status];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${classes}`}>
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${dotClasses}`} />
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
  const galleryCount = report.photos?.length ?? 0;
  return (
    galleryCount ||
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

function canEditReportSubmission(role: UserRole, report: Report): boolean {
  return role === "manager" || (role === "supervisor" && report.reviewStatus === "pending");
}

const reviewShortcutClasses =
  "inline-flex min-h-10 items-center justify-center rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2";
const reviewShortcutInactive =
  "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-subtle)]";
const reviewShortcutActive = "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--foreground)]";

export default async function ManagerReportsPage({ searchParams }: ManagerReportsPageProps) {
  const locale = await getRequestLocale();
  const t = getI18nMessages(locale);
  const rp = t.reportsPage;
  const intlLocale = getIntlLocaleForApp(locale);
  const params = await searchParams;
  const session = await requireRole(["manager"]);

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

  const [stationRows, pageReports] = await Promise.all([
    listStations(),
    listReports({
      filters: {
        stationId: filters.stationId,
        technicianUid: filters.technicianUid,
        reviewStatus: filters.reviewStatus,
        dateFrom,
        dateTo,
      },
      cursor,
      limit: pageSize + 1,
    }),
  ]);
  const stationFilterOptions = [...stationRows]
    .map((station) => ({ stationId: station.stationId, label: station.label }))
    .sort((a, b) => a.label.localeCompare(b.label, locale === "en" ? "en" : "ar"));
  const reports = pageReports.slice(0, pageSize);
  const hasNextPage = pageReports.length > pageSize;
  const lastReport = reports.at(-1);
  const lastReportSubmittedAt = timestampToMillis(reports.at(-1)?.submittedAt);
  const nextCursor =
    lastReport && lastReportSubmittedAt !== null
      ? encodeReportCursor({ id: lastReport.reportId, submittedAtMs: lastReportSubmittedAt })
      : null;

  return (
    <DashboardShell role="manager">
        <PageHeader
          action={
            <div className="flex flex-wrap gap-2">
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] shadow-sm transition-all duration-150 hover:bg-[var(--primary-hover)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
                href={buildExportHref(filters)}
              >
                {rp.exportCsv}
              </Link>
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-sm font-semibold text-[var(--foreground)] shadow-sm transition-all duration-150 hover:bg-[var(--surface-subtle)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
                href="/dashboard/manager"
              >
                {rp.managerBoardLink}
              </Link>
            </div>
          }
          backHref="/dashboard/manager"
          description={rp.managerDescription}
          title={rp.managerTitle}
        />

        <div className="mb-3 flex flex-wrap gap-2">
          <Link
            className={`${reviewShortcutClasses} ${filters.reviewStatus === "" ? reviewShortcutActive : reviewShortcutInactive}`}
            href={buildReportsListingHref("/dashboard/manager/reports", filters, "")}
          >
            {rp.filterAllReview}
          </Link>
          <Link
            className={`${reviewShortcutClasses} ${filters.reviewStatus === "pending" ? reviewShortcutActive : reviewShortcutInactive}`}
            href={buildReportsListingHref("/dashboard/manager/reports", filters, "pending")}
          >
            {rp.filterPending}
          </Link>
        </div>

        <ReportsFilterForm
          basePath="/dashboard/manager/reports"
          defaultValues={filters}
          stations={stationFilterOptions}
        />

        {reports.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-card">
            <EmptyState description={rp.emptyManagerDescription} title={rp.emptyManagerTitle} />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-3 lg:hidden">
              {reports.map((report) => (
                <ReportMobileCard
                  action={
                    <div className="space-y-5">
                      <EditSubmittedReportForm
                        canEdit={canEditReportSubmission(session.role, report)}
                        instanceId="mobile"
                        report={editableSubmittedReportFields(report)}
                      />
                      <ReviewReportForm
                        instanceId="mobile"
                        reportId={report.reportId}
                        reviewNotes={report.reviewNotes}
                        reviewStatus={report.reviewStatus}
                      />
                    </div>
                  }
                  key={report.reportId}
                  photoCount={photoCount(report)}
                  report={report}
                  reviewBadge={reviewStatusBadge(report.reviewStatus, t)}
                  timestamp={formatTimestamp(report.submittedAt, t, intlLocale)}
                />
              ))}
            </div>
          <div className="hidden overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-card lg:block">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px]">
              <thead className="border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)]">
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    {rp.colSubmittedAt}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    {rp.colStation}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    {rp.colLocation}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    {rp.colProgram}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    {rp.colTechnician}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    {rp.colStatus}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    {rp.colReview}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    {rp.colAction}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {reports.map((report) => (
                  <tr className="align-top transition-colors even:bg-[var(--surface-subtle)] hover:bg-[var(--primary-soft)]" key={report.reportId}>
                    <td className="px-4 py-3 text-sm text-[var(--muted)]">{formatTimestamp(report.submittedAt, t, intlLocale)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-[var(--foreground)]">{report.stationLabel}</td>
                    <td className="max-w-[200px] px-4 py-3 text-sm text-[var(--muted)]">
                      <span className="line-clamp-2">{report.stationLocation ?? "—"}</span>
                    </td>
                    <td className="max-w-[220px] px-4 py-3 text-sm text-[var(--foreground)]">
                      <span className="line-clamp-2" title={formatPestTypesLine(report)}>
                        {formatPestTypesLine(report)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--muted)]">{report.technicianName}</td>
                    <td className="px-4 py-3">
                      <StatusPills status={report.status} />
                    </td>
                    <td className="px-4 py-3">{reviewStatusBadge(report.reviewStatus, t)}</td>
                    <td className="px-4 py-3">
                      <details>
                        <summary className="cursor-pointer text-sm font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)] hover:underline">
                          {rp.viewUpdate}
                        </summary>
                        <div className="mt-2 max-w-md rounded-lg bg-[var(--surface-subtle)] p-3 text-sm leading-6 text-[var(--muted)]">
                          <p className="font-medium text-[var(--foreground)]">{rp.technicianNotes}</p>
                          <p className="mt-1">{report.notes ?? rp.noNotes}</p>
                          <ReportPhotoLinks photoCount={photoCount(report)} reportId={report.reportId} />
                          <EditSubmittedReportForm
                            canEdit={canEditReportSubmission(session.role, report)}
                            report={editableSubmittedReportFields(report)}
                          />
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
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-sm font-semibold text-[var(--foreground)] shadow-sm transition-all duration-150 hover:bg-[var(--surface-subtle)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
              href={buildNextHref(filters, nextCursor)}
            >
              {rp.nextPage}
            </Link>
          </div>
        ) : null}
    </DashboardShell>
  );
}
