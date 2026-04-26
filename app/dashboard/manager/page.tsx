import type { Metadata } from "next";
import Link from "next/link";
import { DashboardNav } from "@/components/layout/nav";
import { PageHeader } from "@/components/layout/page-header";
import { StatusPills } from "@/components/reports/status-pills";
import { requireRole } from "@/lib/auth/server-session";
import { REPORTS_COL, STATIONS_COL, USERS_COL } from "@/lib/collections";
import { adminDb } from "@/lib/firebase-admin";
import { i18n } from "@/lib/i18n";
import type { FirestoreTimestamp, Report, StatusOption } from "@/types";

export const metadata: Metadata = {
  title: i18n.dashboard.managerTitle,
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

function formatTimestamp(timestamp?: FirestoreTimestamp): string {
  if (!timestamp) {
    return "غير متاح";
  }

  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp.toDate());
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
    submittedAt: data.submittedAt as FirestoreTimestamp,
    reviewStatus: data.reviewStatus ?? "pending",
    editedAt: data.editedAt,
    editedBy: data.editedBy,
    reviewedAt: data.reviewedAt,
    reviewedBy: data.reviewedBy,
    reviewNotes: data.reviewNotes,
  };
}

export default async function ManagerDashboardPage() {
  await requireRole(["manager"]);
  const startOfWeek = new Date();

  startOfWeek.setDate(startOfWeek.getDate() - 7);
  startOfWeek.setHours(0, 0, 0, 0);

  const [
    totalStationsSnapshot,
    activeStationsSnapshot,
    totalReportsSnapshot,
    reportsThisWeekSnapshot,
    pendingReviewSnapshot,
    techniciansSnapshot,
    latestReportsSnapshot,
  ] = await Promise.all([
    adminDb().collection(STATIONS_COL).get(),
    adminDb().collection(STATIONS_COL).where("isActive", "==", true).get(),
    adminDb().collection(REPORTS_COL).get(),
    adminDb().collection(REPORTS_COL).where("submittedAt", ">=", startOfWeek).get(),
    adminDb().collection(REPORTS_COL).where("reviewStatus", "==", "pending").get(),
    adminDb().collection(USERS_COL).where("role", "==", "technician").get(),
    adminDb().collection(REPORTS_COL).orderBy("submittedAt", "desc").limit(5).get(),
  ]);
  const latestReports = latestReportsSnapshot.docs.map((doc) => reportFromData(doc.id, doc.data() as Partial<Report>));

  return (
    <main className="min-h-dvh bg-slate-50 px-4 py-6 text-right sm:px-6 lg:px-8" dir="rtl">
      <section className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          action={
            <div className="flex flex-wrap gap-2">
              <Link
                className="inline-flex items-center justify-center rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-600"
                href="/dashboard/manager/stations"
              >
                المحطات
              </Link>
              <Link
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                href="/dashboard/manager/reports"
              >
                التقارير
              </Link>
              <Link
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                href="/dashboard/manager/tasks"
              >
                مهام اليوم
              </Link>
              <Link
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                href="/dashboard/manager/analytics"
              >
                التحليلات
              </Link>
              <Link
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                href="/dashboard/manager/users"
              >
                المستخدمون
              </Link>
              <Link
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                href="/dashboard/manager/audit"
              >
                السجل
              </Link>
            </div>
          }
          description="نظرة تشغيلية على المحطات والتقارير والفنيين."
          title={i18n.dashboard.managerTitle}
        />
        <DashboardNav role="manager" />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard href="/dashboard/manager/stations" label="إجمالي المحطات" value={totalStationsSnapshot.size} />
          <StatCard href="/dashboard/manager/stations" label="المحطات النشطة" value={activeStationsSnapshot.size} />
          <StatCard href="/dashboard/manager/reports" label="إجمالي التقارير" value={totalReportsSnapshot.size} />
          <StatCard href="/dashboard/manager/reports" label="تقارير آخر 7 أيام" value={reportsThisWeekSnapshot.size} />
          <StatCard
            href="/dashboard/manager/reports?reviewStatus=pending"
            label="بانتظار المراجعة"
            value={pendingReviewSnapshot.size}
          />
          <StatCard href="/dashboard/manager/users" label="الفنيون" value={techniciansSnapshot.size} />
          <StatCard href="/dashboard/manager/tasks" label="مهام اليوم" value={pendingReviewSnapshot.size} />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h2 className="text-lg font-semibold text-slate-800">آخر التقارير</h2>
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
