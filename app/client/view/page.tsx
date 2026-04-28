import type { Metadata } from "next";
import { StatusPills } from "@/components/reports/status-pills";
import { listReports } from "@/lib/db/repositories";
import type { AppTimestamp } from "@/types";

export const metadata: Metadata = {
  title: "متابعة العميل",
};

function formatTimestamp(timestamp?: AppTimestamp): string {
  if (!timestamp) {
    return "غير متاح";
  }

  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp.toDate());
}

export default async function ClientViewPage() {
  const reports = await listReports({ limit: 50 });

  return (
    <main className="min-h-dvh bg-slate-50 px-4 py-6 text-right sm:px-6 lg:px-8" dir="rtl">
      <section className="mx-auto max-w-6xl space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-control">
          <h1 className="text-2xl font-extrabold text-slate-900">متابعة الشغل المنفذ للعميل</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            هذه الشاشة للعرض فقط، وتوضح آخر الأعمال المرفوعة من الفريق بدون أي صلاحيات تعديل.
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-control">
          <table className="w-full min-w-[900px]">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">التاريخ</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">المحطة</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">الفني</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">حالة العمل</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">صور</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">الملاحظات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reports.map((report) => {
                return (
                  <tr className="align-top hover:bg-slate-50" key={report.reportId}>
                    <td className="px-4 py-3 text-sm text-slate-700">{formatTimestamp(report.submittedAt)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900">{report.stationLabel}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{report.technicianName}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <StatusPills status={report.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <div className="flex flex-wrap gap-2">
                        {report.photoPaths?.station ? (
                          <a
                            className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            href={report.photoPaths.station}
                            rel="noreferrer"
                            target="_blank"
                          >
                            المحطة
                          </a>
                        ) : null}
                        {report.photoPaths?.before ? (
                          <a
                            className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            href={report.photoPaths.before}
                            rel="noreferrer"
                            target="_blank"
                          >
                            قبل
                          </a>
                        ) : null}
                        {report.photoPaths?.after ? (
                          <a
                            className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            href={report.photoPaths.after}
                            rel="noreferrer"
                            target="_blank"
                          >
                            بعد
                          </a>
                        ) : null}
                        {!report.photoPaths?.station && !report.photoPaths?.before && !report.photoPaths?.after ? (
                          <span className="text-xs text-slate-500">لا توجد صور</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{report.notes ?? "لا توجد ملاحظات"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
