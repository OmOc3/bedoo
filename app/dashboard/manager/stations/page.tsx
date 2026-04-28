import type { Metadata } from "next";
import Link from "next/link";
import { DashboardNav } from "@/components/layout/nav";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { toggleStationStatusAction } from "@/app/actions/stations";
import { requireRole } from "@/lib/auth/server-session";
import { listStations } from "@/lib/db/repositories";
import { getStationHealth } from "@/lib/station-health";
import type { AppTimestamp } from "@/types";

export const metadata: Metadata = {
  title: "المحطات",
};

interface ManagerStationsPageProps {
  searchParams: Promise<{
    q?: string;
  }>;
}

function formatTimestamp(timestamp?: AppTimestamp): string {
  if (!timestamp) {
    return "لم تتم الزيارة";
  }

  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp.toDate());
}

export default async function ManagerStationsPage({ searchParams }: ManagerStationsPageProps) {
  const params = await searchParams;
  await requireRole(["manager"]);
  const query = (params.q ?? "").trim();
  const visibleStations = await listStations(query);
  const stations = query ? await listStations() : visibleStations;

  return (
    <main className="min-h-dvh bg-slate-50 px-4 py-6 text-right sm:px-6 lg:px-8" dir="rtl">
      <section className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          action={
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white shadow-control transition-colors hover:bg-teal-600"
              href="/dashboard/manager/stations/new"
            >
              إضافة محطة
            </Link>
          }
          description="إدارة محطات الطعوم، حالة التشغيل، وعدد الزيارات المسجلة."
          title="المحطات"
        />
        <DashboardNav role="manager" />

        <form
          action="/dashboard/manager/stations"
          className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-control sm:flex-row"
        >
          <input
            className="min-h-11 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-900 transition placeholder:text-slate-400 focus:border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            defaultValue={query}
            name="q"
            placeholder="ابحث باسم المحطة أو الموقع أو الرقم..."
            type="search"
          />
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-600"
            type="submit"
          >
            بحث
          </button>
          {query ? (
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              href="/dashboard/manager/stations"
            >
              مسح
            </Link>
          ) : null}
        </form>

        {stations.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-control">
            <EmptyState
              action={
                <Link
                  className="inline-flex min-h-11 items-center justify-center rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-600"
                  href="/dashboard/manager/stations/new"
                >
                  إضافة أول محطة
                </Link>
              }
              description="ابدأ بإضافة محطة طعوم ليتاح للفنيين إرسال تقارير الفحص من رمز QR."
              title="لا توجد محطات"
            />
          </div>
        ) : visibleStations.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-control">
            <EmptyState description="جرّب البحث باسم محطة أو موقع مختلف." title="لا توجد نتائج مطابقة" />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-3 md:hidden">
              {visibleStations.map((station) => {
                const health = getStationHealth(station);

                return (
                  <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-control" key={station.stationId}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-500" dir="ltr">
                          #{station.stationId}
                        </p>
                        <h2 className="mt-1 truncate text-base font-bold text-slate-950">{station.label}</h2>
                        <p className="mt-1 text-sm text-slate-600">{station.location}</p>
                      </div>
                      <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${health.toneClassName}`}>
                        {health.label}
                      </span>
                    </div>

                    <dl className="mt-4 grid gap-3 text-sm">
                      <div>
                        <dt className="font-medium text-slate-500">المنطقة</dt>
                        <dd className="mt-1 text-slate-800">{station.zone ?? "غير محدد"}</dd>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <dt className="font-medium text-slate-500">الحالة</dt>
                          <dd className="mt-1">
                            <span
                              className={
                                station.isActive
                                  ? "inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700"
                                  : "inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600"
                              }
                            >
                              {station.isActive ? "نشطة" : "غير نشطة"}
                            </span>
                          </dd>
                        </div>
                        <div>
                          <dt className="font-medium text-slate-500">إشراف فوري</dt>
                          <dd className="mt-1">
                            <span
                              className={
                                station.requiresImmediateSupervision
                                  ? "inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700"
                                  : "inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600"
                              }
                            >
                              {station.requiresImmediateSupervision ? "مطلوب" : "لا"}
                            </span>
                          </dd>
                        </div>
                      </div>
                      <div>
                        <dt className="font-medium text-slate-500">آخر زيارة</dt>
                        <dd className="mt-1 text-slate-800">{formatTimestamp(station.lastVisitedAt)}</dd>
                      </div>
                    </dl>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Link
                        className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                        href={`/dashboard/manager/stations/${station.stationId}`}
                      >
                        عرض
                      </Link>
                      <Link
                        className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                        href={`/dashboard/manager/stations/${station.stationId}/edit`}
                      >
                        تعديل
                      </Link>
                      <form action={toggleStationStatusAction.bind(null, station.stationId, station.isActive)}>
                        <button
                          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                          type="submit"
                        >
                          {station.isActive ? "تعطيل" : "تفعيل"}
                        </button>
                      </form>
                    </div>
                  </article>
                );
              })}
            </div>
          <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-control md:block">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                    رقم المحطة
                  </th>
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
                    إشراف فوري
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                    الصحة
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                    آخر زيارة
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                    تمت الزيارة بواسطة
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
                {visibleStations.map((station) => {
                  const health = getStationHealth(station);

                  return (
                      <tr className="transition-colors hover:bg-slate-50" key={station.stationId}>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-900" dir="ltr">
                          #{station.stationId}
                        </td>
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
                          <span
                            className={
                              station.requiresImmediateSupervision
                                ? "inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700"
                                : "inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600"
                            }
                          >
                            {station.requiresImmediateSupervision ? "مطلوب" : "لا"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${health.toneClassName}`}>
                            {health.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">{formatTimestamp(station.lastVisitedAt)}</td>
                        <td className="px-4 py-3 text-sm font-medium text-teal-700">{station.lastVisitedBy ?? "-"}</td>
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
          </div>
          </div>
        )}
      </section>
    </main>
  );
}
