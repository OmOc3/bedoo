import type { Metadata } from "next";
import Link from "next/link";
import { DashboardNav } from "@/components/layout/nav";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { toggleStationStatusAction } from "@/app/actions/stations";
import { requireRole } from "@/lib/auth/server-session";
import { STATIONS_COL } from "@/lib/collections";
import { adminDb } from "@/lib/firebase-admin";
import { getStationHealth } from "@/lib/station-health";
import type { FirestoreTimestamp, Station } from "@/types";

export const metadata: Metadata = {
  title: "المحطات",
};

function formatTimestamp(timestamp?: FirestoreTimestamp): string {
  if (!timestamp) {
    return "لم تتم الزيارة";
  }

  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp.toDate());
}

function stationFromData(stationId: string, data: Partial<Station>): Station {
  return {
    stationId: data.stationId ?? stationId,
    label: data.label ?? "محطة بدون اسم",
    location: data.location ?? "غير محدد",
    zone: data.zone,
    coordinates: data.coordinates,
    qrCodeValue: data.qrCodeValue ?? "",
    isActive: data.isActive ?? false,
    createdAt: data.createdAt as FirestoreTimestamp,
    createdBy: data.createdBy ?? "",
    updatedAt: data.updatedAt,
    updatedBy: data.updatedBy,
    lastVisitedAt: data.lastVisitedAt,
    totalReports: data.totalReports ?? 0,
  };
}

export default async function ManagerStationsPage() {
  await requireRole(["manager"]);
  const snapshot = await adminDb().collection(STATIONS_COL).orderBy("createdAt", "desc").get();
  const stations = snapshot.docs.map((doc) => stationFromData(doc.id, doc.data() as Partial<Station>));

  return (
    <main className="min-h-dvh bg-slate-50 px-4 py-6 text-right sm:px-6 lg:px-8" dir="rtl">
      <section className="mx-auto max-w-7xl">
        <PageHeader
          action={
            <Link
              className="inline-flex items-center justify-center rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-600"
              href="/dashboard/manager/stations/new"
            >
              إضافة محطة
            </Link>
          }
          description="إدارة محطات الطعوم، حالة التشغيل، وعدد الزيارات المسجلة."
          title="المحطات"
        />
        <DashboardNav role="manager" />

        {stations.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white">
            <EmptyState
              action={
                <Link
                  className="inline-flex items-center justify-center rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-600"
                  href="/dashboard/manager/stations/new"
                >
                  إضافة أول محطة
                </Link>
              }
              description="ابدأ بإضافة محطة طعوم ليتاح للفنيين إرسال تقارير الفحص من رمز QR."
              title="لا توجد محطات"
            />
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-[900px]">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                    اسم المحطة
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                    الموقع
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                    المنطقة
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                    الحالة
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                    الصحة
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                    آخر زيارة
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                    التقارير
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stations.map((station) => {
                  const health = getStationHealth(station);

                  return (
                      <tr className="transition-colors hover:bg-slate-50" key={station.stationId}>
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">{station.label}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{station.location}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{station.zone ?? "غير محدد"}</td>
                        <td className="px-4 py-3">
                          <span
                            className={
                              station.isActive
                                ? "inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700"
                                : "inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600"
                            }
                          >
                            {station.isActive ? "نشطة" : "غير نشطة"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${health.toneClassName}`}>
                            {health.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">{formatTimestamp(station.lastVisitedAt)}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{station.totalReports}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-3">
                            <Link
                              className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 hover:underline"
                              href={`/dashboard/manager/stations/${station.stationId}`}
                            >
                              عرض
                            </Link>
                            <Link
                              className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 hover:underline"
                              href={`/dashboard/manager/stations/${station.stationId}/edit`}
                            >
                              تعديل
                            </Link>
                            <form action={toggleStationStatusAction.bind(null, station.stationId, station.isActive)}>
                              <button
                                className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 hover:underline"
                                type="submit"
                              >
                                {station.isActive ? "تعطيل" : "تفعيل"}
                              </button>
                            </form>
                          </div>
                        </td>
                      </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
