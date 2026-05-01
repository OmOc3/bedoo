import type { Metadata } from "next";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-page";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { deleteStationAction, toggleStationStatusAction } from "@/app/actions/stations";
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
    <DashboardShell role="manager">
        <PageHeader
          action={
            <div className="flex flex-wrap gap-2">
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-sm font-semibold text-[var(--foreground)] shadow-sm transition-all duration-150 hover:bg-[var(--surface-subtle)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
                href="/dashboard/manager/stations/map"
              >
                خريطة المحطات
              </Link>
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] shadow-sm transition-all duration-150 hover:bg-[var(--primary-hover)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
                href="/dashboard/manager/stations/new"
              >
                إضافة محطة
              </Link>
            </div>
          }
          description="إدارة محطات الطعوم، حالة التشغيل، وعدد الزيارات المسجلة."
          title="المحطات"
        />

        <form
          action="/dashboard/manager/stations"
          className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-card sm:flex-row sm:items-end"
        >
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="station-search">
              البحث عن محطة
            </label>
            <input
              className="min-h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--foreground)] transition-colors placeholder:text-[var(--muted)] hover:border-[color-mix(in_srgb,var(--border)_50%,var(--foreground)_50%)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              defaultValue={query}
              id="station-search"
              name="q"
              placeholder="ابحث باسم المحطة أو الموقع أو الرقم..."
              type="search"
            />
          </div>
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] shadow-sm transition-all duration-150 hover:bg-[var(--primary-hover)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
            type="submit"
          >
            بحث
          </button>
          {query ? (
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-sm font-semibold text-[var(--foreground)] shadow-sm transition-all duration-150 hover:bg-[var(--surface-subtle)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
              href="/dashboard/manager/stations"
            >
              مسح
            </Link>
          ) : null}
        </form>

        {stations.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-card">
            <EmptyState
              action={
                <Link
                  className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] shadow-sm transition-all duration-150 hover:bg-[var(--primary-hover)] active:scale-[0.98]"
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
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-card">
            <EmptyState description="جرّب البحث باسم محطة أو موقع مختلف." title="لا توجد نتائج مطابقة" />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-3 lg:hidden">
              {visibleStations.map((station) => {
                const health = getStationHealth(station);

                return (
                  <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-card" key={station.stationId}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[var(--muted)]" dir="ltr">
                          #{station.stationId}
                        </p>
                        <h2 className="mt-1 truncate text-base font-bold text-[var(--foreground)]">{station.label}</h2>
                        <p className="mt-1 text-sm text-[var(--muted)]">{station.location}</p>
                      </div>
                      <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${health.toneClassName}`}>
                        {health.label}
                      </span>
                    </div>

                    <dl className="mt-4 grid gap-3 text-sm">
                      <div>
                        <dt className="font-medium text-[var(--muted)]">المنطقة</dt>
                        <dd className="mt-1 text-[var(--foreground)]">{station.zone ?? "غير محدد"}</dd>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <dt className="font-medium text-[var(--muted)]">الحالة</dt>
                          <dd className="mt-1">
                            <span
                              className={
                                station.isActive
                                  ? "inline-flex items-center rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-700 dark:bg-teal-900/30 dark:text-teal-300"
                                  : "inline-flex items-center rounded-full bg-[var(--surface-subtle)] px-2.5 py-0.5 text-xs font-semibold text-[var(--muted)] dark:bg-[var(--surface-elevated)]"
                              }
                            >
                              {station.isActive ? "نشطة" : "غير نشطة"}
                            </span>
                          </dd>
                        </div>
                        <div>
                          <dt className="font-medium text-[var(--muted)]">إشراف فوري</dt>
                          <dd className="mt-1">
                            <span
                              className={
                                station.requiresImmediateSupervision
                                  ? "inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                                  : "inline-flex items-center rounded-full bg-[var(--surface-subtle)] px-2.5 py-0.5 text-xs font-semibold text-[var(--muted)] dark:bg-[var(--surface-elevated)]"
                              }
                            >
                              {station.requiresImmediateSupervision ? "مطلوب" : "لا"}
                            </span>
                          </dd>
                        </div>
                      </div>
                      <div>
                        <dt className="font-medium text-[var(--muted)]">آخر زيارة</dt>
                        <dd className="mt-1 text-[var(--foreground)]">{formatTimestamp(station.lastVisitedAt)}</dd>
                      </div>
                    </dl>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Link
                        className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] shadow-sm"
                        href={`/dashboard/manager/stations/${station.stationId}`}
                      >
                        عرض
                      </Link>
                      <Link
                        className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] shadow-sm"
                        href={`/dashboard/manager/stations/${station.stationId}/edit`}
                      >
                        تعديل
                      </Link>
                      <form action={toggleStationStatusAction.bind(null, station.stationId, station.isActive)}>
                        <button
                          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] shadow-sm"
                          type="submit"
                        >
                          {station.isActive ? "تعطيل" : "تفعيل"}
                        </button>
                      </form>
                      <form action={deleteStationAction.bind(null, station.stationId)}>
                        <ConfirmSubmitButton
                          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700"
                          confirmMessage={`تأكيد حذف المحطة #${station.stationId} (${station.label})؟`}
                        >
                          حذف
                        </ConfirmSubmitButton>
                      </form>
                    </div>
                  </article>
                );
              })}
            </div>
          <div className="hidden overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-card lg:block">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead className="border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)]">
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    رقم المحطة
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    اسم المحطة
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    الموقع
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    المنطقة
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    الحالة
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    إشراف فوري
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    الصحة
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    آخر زيارة
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    تمت الزيارة بواسطة
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    التقارير
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {visibleStations.map((station) => {
                  const health = getStationHealth(station);

                  return (
                      <tr className="transition-colors even:bg-[var(--surface-subtle)] hover:bg-[var(--primary-soft)]" key={station.stationId}>
                        <td className="px-4 py-3 text-sm font-semibold text-[var(--foreground)]" dir="ltr">
                          #{station.stationId}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-[var(--foreground)]">{station.label}</td>
                        <td className="px-4 py-3 text-sm text-[var(--muted)]">{station.location}</td>
                        <td className="px-4 py-3 text-sm text-[var(--muted)]">{station.zone ?? "غير محدد"}</td>
                        <td className="px-4 py-3">
                          <span
                            className={
                              station.isActive
                                ? "inline-flex items-center rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-700 dark:bg-teal-900/30 dark:text-teal-300"
                                : "inline-flex items-center rounded-full bg-[var(--surface-subtle)] px-2.5 py-0.5 text-xs font-semibold text-[var(--muted)] dark:bg-[var(--surface-elevated)]"
                            }
                          >
                            {station.isActive ? "نشطة" : "غير نشطة"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={
                              station.requiresImmediateSupervision
                                ? "inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                                : "inline-flex items-center rounded-full bg-[var(--surface-subtle)] px-2.5 py-0.5 text-xs font-semibold text-[var(--muted)] dark:bg-[var(--surface-elevated)]"
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
                        <td className="px-4 py-3 text-sm text-[var(--muted)]">{formatTimestamp(station.lastVisitedAt)}</td>
                        <td className="px-4 py-3 text-sm font-medium text-teal-700">{station.lastVisitedBy ?? "-"}</td>
                        <td className="px-4 py-3 text-sm text-[var(--muted)]">{station.totalReports}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-3">
                            <Link
                              className="text-sm font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)] hover:underline"
                              href={`/dashboard/manager/stations/${station.stationId}`}
                            >
                              عرض
                            </Link>
                            <Link
                              className="text-sm font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)] hover:underline"
                              href={`/dashboard/manager/stations/${station.stationId}/edit`}
                            >
                              تعديل
                            </Link>
                            <form action={toggleStationStatusAction.bind(null, station.stationId, station.isActive)}>
                              <button
                                className="text-sm font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)] hover:underline"
                                type="submit"
                              >
                                {station.isActive ? "تعطيل" : "تفعيل"}
                              </button>
                            </form>
                            <form action={deleteStationAction.bind(null, station.stationId)}>
                              <ConfirmSubmitButton
                                className="text-sm font-semibold text-red-600 transition-colors hover:text-red-700 hover:underline"
                                confirmMessage={`تأكيد حذف المحطة #${station.stationId} (${station.label})؟`}
                              >
                                حذف
                              </ConfirmSubmitButton>
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
    </DashboardShell>
  );
}
