import type { Metadata } from "next";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-page";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { requireRole } from "@/lib/auth/server-session";
import { formatDateTimeRome } from "@/lib/datetime";
import { getIntlLocaleForApp } from "@/lib/i18n";
import { getI18nMessages, getRequestLocale } from "@/lib/i18n/server";
import { listStations } from "@/lib/db/repositories";
import { getStationHealth, stationHealthLabelsFromMessages } from "@/lib/station-health";
import type { AppTimestamp } from "@/types";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const t = getI18nMessages(locale);

  return { title: t.stationsListPage.metaTitleSupervisor };
}

interface SupervisorStationsPageProps {
  searchParams: Promise<{
    q?: string;
  }>;
}

export default async function SupervisorStationsPage({ searchParams }: SupervisorStationsPageProps) {
  const params = await searchParams;
  await requireRole(["supervisor", "manager"]);
  const locale = await getRequestLocale();
  const t = getI18nMessages(locale);
  const sl = t.stationsListPage;
  const healthLabels = stationHealthLabelsFromMessages(t.stationHealth);
  const intlLocale = getIntlLocaleForApp(locale);

  function formatTimestamp(timestamp?: AppTimestamp): string {
    if (!timestamp) {
      return t.stations.neverVisited;
    }

    return formatDateTimeRome(timestamp.toDate(), {
      locale: intlLocale,
      unavailableLabel: t.common.unavailable,
    });
  }

  const query = (params.q ?? "").trim();
  const visibleStations = await listStations(query);
  const allStations = query ? await listStations() : visibleStations;
  const activeStations = allStations.filter((station) => station.isActive).length;
  const inactiveStations = allStations.length - activeStations;

  return (
    <DashboardShell role="supervisor">
      <PageHeader
        action={
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-sm font-semibold text-[var(--foreground)] shadow-sm transition-all duration-150 hover:bg-[var(--surface-subtle)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
            href="/dashboard/supervisor"
          >
            {sl.supervisorBoardLink}
          </Link>
        }
        backHref="/dashboard/supervisor"
        description={sl.description}
        title={sl.title}
      />

      <div className="flex justify-end">
        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] shadow-sm transition-all duration-150 hover:bg-[var(--primary-hover)] active:scale-[0.98]"
          href="/dashboard/supervisor/stations/new"
        >
          {sl.createStation}
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-card">
          <p className="text-xs font-medium text-[var(--muted)]">{sl.statTotal}</p>
          <p className="mt-2 text-2xl font-extrabold text-[var(--foreground)]">{allStations.length}</p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-card">
          <p className="text-xs font-medium text-[var(--muted)]">{sl.statActive}</p>
          <p className="mt-2 text-2xl font-extrabold text-emerald-600">{activeStations}</p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-card">
          <p className="text-xs font-medium text-[var(--muted)]">{sl.statInactive}</p>
          <p className="mt-2 text-2xl font-extrabold text-rose-600">{inactiveStations}</p>
        </div>
      </div>

      <form
        action="/dashboard/supervisor/stations"
        className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-card sm:flex-row sm:items-end"
      >
        <div className="flex flex-1 flex-col gap-1">
          <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="station-search">
            {sl.searchLabel}
          </label>
          <input
            className="min-h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--foreground)] transition-colors placeholder:text-[var(--muted)] hover:border-[color-mix(in_srgb,var(--border)_50%,var(--foreground)_50%)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            defaultValue={query}
            id="station-search"
            name="q"
            placeholder={sl.searchPlaceholder}
            type="search"
          />
        </div>
        <button
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] shadow-sm transition-all duration-150 hover:bg-[var(--primary-hover)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
          type="submit"
        >
          {sl.search}
        </button>
        {query ? (
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-sm font-semibold text-[var(--foreground)] shadow-sm transition-all duration-150 hover:bg-[var(--surface-subtle)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
            href="/dashboard/supervisor/stations"
          >
            {sl.clear}
          </Link>
        ) : null}
      </form>

      {allStations.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-card">
          <EmptyState description={sl.emptyNoStationsDescription} title={sl.emptyNoStationsTitle} />
        </div>
      ) : visibleStations.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-card">
          <EmptyState description={sl.emptyNoMatchDescription} title={sl.emptyNoMatchTitle} />
        </div>
      ) : (
        <>
          <div className="grid gap-3 lg:hidden">
            {visibleStations.map((station) => {
              const health = getStationHealth(station, healthLabels);

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
                      <dt className="font-medium text-[var(--muted)]">{sl.zone}</dt>
                      <dd className="mt-1 text-[var(--foreground)]">{station.zone ?? sl.zoneUndefined}</dd>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <dt className="font-medium text-[var(--muted)]">{sl.colStatus}</dt>
                        <dd className="mt-1">
                          <span
                            className={
                              station.isActive
                                ? "inline-flex items-center rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-700 dark:bg-teal-900/30 dark:text-teal-300"
                                : "inline-flex items-center rounded-full bg-[var(--surface-subtle)] px-2.5 py-0.5 text-xs font-semibold text-[var(--muted)] dark:bg-[var(--surface-elevated)]"
                            }
                          >
                            {station.isActive ? sl.statusActive : sl.statusInactive}
                          </span>
                        </dd>
                      </div>
                      <div>
                        <dt className="font-medium text-[var(--muted)]">{sl.colImmediateSupervision}</dt>
                        <dd className="mt-1">
                          <span
                            className={
                              station.requiresImmediateSupervision
                                ? "inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                                : "inline-flex items-center rounded-full bg-[var(--surface-subtle)] px-2.5 py-0.5 text-xs font-semibold text-[var(--muted)] dark:bg-[var(--surface-elevated)]"
                            }
                          >
                            {station.requiresImmediateSupervision ? sl.supervisionRequired : sl.supervisionNo}
                          </span>
                        </dd>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <dt className="font-medium text-[var(--muted)]">{sl.colLastVisit}</dt>
                        <dd className="mt-1 text-[var(--foreground)]">{formatTimestamp(station.lastVisitedAt)}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-[var(--muted)]">{sl.colReports}</dt>
                        <dd className="mt-1 text-[var(--foreground)]">{station.totalReports}</dd>
                      </div>
                    </div>
                  </dl>
                </article>
              );
            })}
          </div>

          <div className="hidden overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-card lg:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)]">
                  <tr>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                      {sl.colStationId}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                      {sl.colStationName}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                      {sl.colLocation}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                      {sl.zone}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                      {sl.colStatus}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                      {sl.colImmediateSupervision}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                      {sl.colHealth}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                      {sl.colLastVisit}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                      {sl.colReports}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {visibleStations.map((station) => {
                    const health = getStationHealth(station, healthLabels);

                    return (
                      <tr className="transition-colors even:bg-[var(--surface-subtle)] hover:bg-[var(--primary-soft)]" key={station.stationId}>
                        <td className="px-4 py-3 text-sm font-semibold text-[var(--foreground)]" dir="ltr">
                          #{station.stationId}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-[var(--foreground)]">{station.label}</td>
                        <td className="px-4 py-3 text-sm text-[var(--muted)]">{station.location}</td>
                        <td className="px-4 py-3 text-sm text-[var(--muted)]">{station.zone ?? sl.zoneUndefined}</td>
                        <td className="px-4 py-3">
                          <span
                            className={
                              station.isActive
                                ? "inline-flex items-center rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-700 dark:bg-teal-900/30 dark:text-teal-300"
                                : "inline-flex items-center rounded-full bg-[var(--surface-subtle)] px-2.5 py-0.5 text-xs font-semibold text-[var(--muted)] dark:bg-[var(--surface-elevated)]"
                            }
                          >
                            {station.isActive ? sl.statusActive : sl.statusInactive}
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
                            {station.requiresImmediateSupervision ? sl.supervisionRequired : sl.supervisionNo}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${health.toneClassName}`}>
                            {health.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-[var(--muted)]">{formatTimestamp(station.lastVisitedAt)}</td>
                        <td className="px-4 py-3 text-sm text-[var(--muted)]">{station.totalReports}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </DashboardShell>
  );
}
