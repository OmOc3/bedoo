import { FieldPath, Timestamp, type DocumentData, type Query } from "firebase-admin/firestore";
import type { Metadata } from "next";
import Link from "next/link";
import { DashboardNav } from "@/components/layout/nav";
import { PageHeader } from "@/components/layout/page-header";
import { ReportPhotoLinks } from "@/components/reports/report-photo-links";
import { ReportsFilterForm, type ReportsFilterValues } from "@/components/reports/reports-filter-form";
import { ReviewReportForm } from "@/components/reports/review-report-form";
import { StatusPills } from "@/components/reports/status-pills";
import { EmptyState } from "@/components/ui/empty-state";
import { requireRole } from "@/lib/auth/server-session";
import { REPORTS_COL } from "@/lib/collections";
import { adminDb } from "@/lib/firebase-admin";
import { decodeReportCursor, encodeReportCursor } from "@/lib/pagination/report-cursor";
import type { FirestoreTimestamp, Report, StatusOption } from "@/types";

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

function formatTimestamp(timestamp?: FirestoreTimestamp): string {
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

function reportFromData(reportId: string, data: Partial<Report>): Report {
  return {
    reportId: data.reportId ?? reportId,
    stationId: data.stationId ?? "",
    stationLabel: data.stationLabel ?? "محطة بدون اسم",
    technicianUid: data.technicianUid ?? "",
    technicianName: data.technicianName ?? "فني غير محدد",
    status: (data.status ?? []) as StatusOption[],
    notes: data.notes,
    photoPaths: data.photoPaths,
    submittedAt: data.submittedAt as FirestoreTimestamp,
    reviewStatus: data.reviewStatus ?? "pending",
    editedAt: data.editedAt,
    editedBy: data.editedBy,
    reviewedAt: data.reviewedAt,
    reviewedBy: data.reviewedBy,
    reviewNotes: data.reviewNotes,
  };
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

function timestampToMillis(timestamp?: FirestoreTimestamp): number | null {
  if (!timestamp) {
    return null;
  }

  const value = timestamp.toDate().getTime();

  return Number.isFinite(value) ? value : null;
}

function photoCount(report: Report): number {
  return Number(Boolean(report.photoPaths?.before)) + Number(Boolean(report.photoPaths?.after));
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
  let query: Query<DocumentData> = adminDb().collection(REPORTS_COL);

  if (filters.stationId) {
    query = query.where("stationId", "==", filters.stationId);
  }

  if (filters.technicianUid) {
    query = query.where("technicianUid", "==", filters.technicianUid);
  }

  if (filters.reviewStatus) {
    query = query.where("reviewStatus", "==", filters.reviewStatus);
  }

  if (dateFrom) {
    query = query.where("submittedAt", ">=", dateFrom);
  }

  if (dateTo) {
    query = query.where("submittedAt", "<=", dateTo);
  }

  query = query.orderBy("submittedAt", "desc").orderBy(FieldPath.documentId(), "desc");

  if (params.cursor) {
    const cursor = decodeReportCursor(params.cursor);

    if (cursor) {
      query = query.startAfter(Timestamp.fromMillis(cursor.submittedAtMs), cursor.id);
    }
  }

  const snapshot = await query.limit(pageSize + 1).get();
  const pageDocs = snapshot.docs.slice(0, pageSize);
  const reports = pageDocs.map((doc) => reportFromData(doc.id, doc.data() as Partial<Report>));
  const hasNextPage = snapshot.docs.length > pageSize;
  const lastDoc = pageDocs.at(-1);
  const lastReportSubmittedAt = timestampToMillis(reports.at(-1)?.submittedAt);
  const nextCursor =
    lastDoc && lastReportSubmittedAt !== null
      ? encodeReportCursor({ id: lastDoc.id, submittedAtMs: lastReportSubmittedAt })
      : null;

  return (
    <main className="min-h-dvh bg-slate-50 px-4 py-6 text-right sm:px-6 lg:px-8" dir="rtl">
      <section className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          action={
            <div className="flex flex-wrap gap-2">
              <Link
                className="inline-flex items-center justify-center rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-600"
                href={buildExportHref(filters)}
              >
                تصدير CSV
              </Link>
              <Link
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
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
          <div className="rounded-xl border border-slate-200 bg-white">
            <EmptyState description="لا توجد تقارير مطابقة للفلاتر الحالية." title="لا توجد تقارير" />
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
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
        )}

        {hasNextPage && nextCursor ? (
          <div className="flex justify-end">
            <Link
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
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
