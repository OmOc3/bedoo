import type { Metadata } from "next";
import { AIInsightsCard } from "@/components/analytics/ai-insights-card";
import { DashboardNav } from "@/components/layout/nav";
import { PageHeader } from "@/components/layout/page-header";
import { StatusPills } from "@/components/reports/status-pills";
import { buildStatusCounts, buildTechnicianStats, buildZoneStats, reportFromData, stationFromData } from "@/lib/analytics";
import { requireRole } from "@/lib/auth/server-session";
import { REPORTS_COL, STATIONS_COL } from "@/lib/collections";
import { adminDb } from "@/lib/firebase-admin";
import type { Report, Station } from "@/types";

export const metadata: Metadata = {
  title: "التحليلات",
};

export default async function ManagerAnalyticsPage() {
  await requireRole(["manager"]);
  const [stationsSnapshot, reportsSnapshot] = await Promise.all([
    adminDb().collection(STATIONS_COL).get(),
    adminDb().collection(REPORTS_COL).get(),
  ]);
  const stations = stationsSnapshot.docs.map((doc) => stationFromData(doc.id, doc.data() as Partial<Station>));
  const reports = reportsSnapshot.docs.map((doc) => reportFromData(doc.id, doc.data() as Partial<Report>));
  const zones = buildZoneStats(stations, reports);
  const technicians = buildTechnicianStats(reports);
  const statusSummary = buildStatusCounts(reports);

  return (
    <main className="min-h-dvh bg-slate-50 px-4 py-6 text-right sm:px-6 lg:px-8" dir="rtl">
      <section className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          backHref="/dashboard/manager"
          description="ملخصات تشغيلية حسب المنطقة والفني وحالات الفحص، مع موجز ذكي للمتابعة اليومية."
          title="التحليلات"
        />
        <DashboardNav role="manager" />
        <AIInsightsCard />

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-lg font-semibold text-slate-800">الأداء حسب المنطقة</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px]">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                      المنطقة
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                      المحطات
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                      النشطة
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                      التقارير
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {zones.map((zone) => (
                    <tr className="hover:bg-slate-50" key={zone.zone}>
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">{zone.zone}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{zone.stations}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{zone.activeStations}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{zone.reports}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-lg font-semibold text-slate-800">أداء الفنيين</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px]">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                      الفني
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                      التقارير
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                      بانتظار المراجعة
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {technicians.map((technician) => (
                    <tr className="hover:bg-slate-50" key={technician.technicianUid || technician.technicianName}>
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">{technician.technicianName}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{technician.reports}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{technician.pending}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-800">أكثر حالات الفحص تكرارًا</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {statusSummary.map((item) => (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4" key={item.status}>
                <StatusPills status={[item.status]} />
                <p className="mt-3 text-3xl font-bold text-slate-900">{item.count}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
