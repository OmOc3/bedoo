import type { Metadata } from "next";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-page";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { deleteStationAction, toggleStationStatusAction } from "@/app/actions/stations";
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

  return { title: t.stationsListPage.metaTitleManager };
}

interface ManagerStationsPageProps {
  searchParams: Promise<{
    q?: string;
  }>;
}

export default async function ManagerStationsPage({ searchParams }: ManagerStationsPageProps) {
  const params = await searchParams;
  await requireRole(["manager"]);
  const locale = await getRequestLocale();
  const t = getI18nMessages(locale);
  const sl = t.stationsListPage;
  const sm = t.stationsManagerPage;
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
                {t.nav.stationCoordinates}
              </Link>
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] shadow-sm transition-all duration-150 hover:bg-[var(--primary-hover)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
                href="/dashboard/manager/stations/new"
              >
                {sm.addStation}
              </Link>
            </div>
          }
          description={sl.managerListDescription}
          title={sl.title}
        />

        <form
          action="/dashboard/manager/stations"
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
              href="/dashboard/manager/stations"
            >
              {sl.clear}
            </Link>
          ) : null}
        </form>

        {stations.length > 0 ? (
          <form
            action="/api/stations/qr-export"
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-card"
            id="station-qr-export-form"
            method="get"
          >
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-[var(--foreground)]">{sm.qrExportTitle}</h2>
                <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{sm.qrExportLead}</p>
              </div>
              <button
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] shadow-sm transition-all duration-150 hover:bg-[var(--primary-hover)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
                type="submit"
              >
                {sm.downloadPdf}
              </button>
            </div>
            <fieldset className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <legend className="sr-only">{sm.qrScopeLegend}</legend>
              {[
                { label: sm.qrScopeSelected, value: "selected" },
                { label: sm.qrScopeAll, value: "all" },
                { label: sm.qrScopeLastDay, value: "last-day" },
                { label: sm.qrScopeLast7, value: "last-7-days" },
              ].map((option) => (
                <label
                  className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-subtle)] has-[:checked]:border-[var(--primary)] has-[:checked]:bg-[var(--primary-soft)]"
                  key={option.value}
                >
                  <input
                    className="h-4 w-4 accent-[var(--primary)]"
                    defaultChecked={option.value === "selected"}
                    name="scope"
                    type="radio"
                    value={option.value}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </fieldset>
          </form>
        ) : null}

        {stations.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-card">
            <EmptyState
              action={
                <Link
                  className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] shadow-sm transition-all duration-150 hover:bg-[var(--primary-hover)] active:scale-[0.98]"
                  href="/dashboard/manager/stations/new"
                >
                  {sm.addFirstStation}
                </Link>
              }
              description={sm.firstStationEmptyDescription}
              title={sl.emptyNoStationsTitle}
            />
          </div>
        ) : visibleStations.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-card">
            <EmptyState description={sl.emptyNoMatchDescription} title={sl.emptyNoMatchTitle} />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-3 lg:hidden">
              {visibleStations.map((station) => {
                const health = getStationHealth(station, healthLabels);

                return (
                  <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-card" key={station.stationId}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 gap-3">
                        <input
                          aria-label={sl.selectForExportAria.replace("{label}", station.label)}
                          className="mt-1 h-5 w-5 shrink-0 accent-[var(--primary)]"
                          form="station-qr-export-form"
                          name="stationId"
                          type="checkbox"
                          value={station.stationId}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[var(--muted)]" dir="ltr">
                            #{station.stationId}
                          </p>
                          <h2 className="mt-1 truncate text-base font-bold text-[var(--foreground)]">{station.label}</h2>
                          <p className="mt-1 text-sm text-[var(--muted)]">{station.location}</p>
                        </div>
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
                      <div>
                        <dt className="font-medium text-[var(--muted)]">{sl.colLastVisit}</dt>
                        <dd className="mt-1 text-[var(--foreground)]">{formatTimestamp(station.lastVisitedAt)}</dd>
                      </div>
                    </dl>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Link
                        className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] shadow-sm"
                        href={`/dashboard/manager/stations/${station.stationId}`}
                      >
                        {sl.view}
                      </Link>
                      <Link
                        className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] shadow-sm"
                        href={`/dashboard/manager/stations/${station.stationId}/edit`}
                      >
                        {sl.edit}
                      </Link>
                      <form action={toggleStationStatusAction.bind(null, station.stationId, station.isActive)}>
                        <button
                          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] shadow-sm"
                          type="submit"
                        >
                          {station.isActive ? sl.deactivate : sl.activate}
                        </button>
                      </form>
                      <form action={deleteStationAction.bind(null, station.stationId)}>
                        <ConfirmSubmitButton
                          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700"
                          confirmMessage={sl.confirmDeleteStation
                            .replace("{id}", String(station.stationId))
                            .replace("{label}", station.label)}
                        >
                          {sl.delete}
                        </ConfirmSubmitButton>
                      </form>
                    </div>
                  </article>
                );
              })}
            </div>
          <div className="hidden overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-card lg:block">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[1060px]">
              <thead className="border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)]">
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    {sl.colSelect}
                  </th>
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
                    {sl.colVisitedBy}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    {sl.colReports}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    {sl.colActions}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {visibleStations.map((station) => {
                  const health = getStationHealth(station, healthLabels);

                  return (
                      <tr className="transition-colors even:bg-[var(--surface-subtle)] hover:bg-[var(--primary-soft)]" key={station.stationId}>
                        <td className="px-4 py-3">
                          <input
                            aria-label={sl.selectForExportAria.replace("{label}", station.label)}
                            className="h-4 w-4 accent-[var(--primary)]"
                            form="station-qr-export-form"
                            name="stationId"
                            type="checkbox"
                            value={station.stationId}
                          />
                        </td>
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
                        <td className="px-4 py-3 text-sm font-medium text-teal-700">{station.lastVisitedBy ?? "-"}</td>
                        <td className="px-4 py-3 text-sm text-[var(--muted)]">{station.totalReports}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-3">
                            <Link
                              className="text-sm font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)] hover:underline"
                              href={`/dashboard/manager/stations/${station.stationId}`}
                            >
                              {sl.view}
                            </Link>
                            <Link
                              className="text-sm font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)] hover:underline"
                              href={`/dashboard/manager/stations/${station.stationId}/edit`}
                            >
                              {sl.edit}
                            </Link>
                            <form action={toggleStationStatusAction.bind(null, station.stationId, station.isActive)}>
                              <button
                                className="text-sm font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)] hover:underline"
                                type="submit"
                              >
                                {station.isActive ? sl.deactivate : sl.activate}
                              </button>
                            </form>
                            <form action={deleteStationAction.bind(null, station.stationId)}>
                              <ConfirmSubmitButton
                                className="text-sm font-semibold text-red-600 transition-colors hover:text-red-700 hover:underline"
                                confirmMessage={sl.confirmDeleteStation
                                  .replace("{id}", String(station.stationId))
                                  .replace("{label}", station.label)}
                              >
                                {sl.delete}
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
