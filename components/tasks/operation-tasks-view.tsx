import Link from "next/link";
import { StatusPills } from "@/components/reports/status-pills";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTimeRome } from "@/lib/datetime";
import { getStationHealth, stationHealthLabelsFromMessages } from "@/lib/station-health";
import type { OperationTasks } from "@/lib/operations-tasks";
import type { AppTimestamp } from "@/types";
import type { I18nMessages } from "@/lib/i18n";

interface OperationTasksViewProps {
  baseReportsHref: string;
  canEditStations?: boolean;
  copy: I18nMessages["operationTasksPage"];
  intlLocale: string;
  stationHealthMessages: I18nMessages["stationHealth"];
  tasks: OperationTasks;
  unavailableLabel: string;
}

function formatTaskTime(
  timestamp: AppTimestamp | undefined,
  intlLocale: string,
  unavailableLabel: string,
): string {
  if (!timestamp) {
    return unavailableLabel;
  }

  return formatDateTimeRome(timestamp.toDate(), {
    locale: intlLocale,
    unavailableLabel,
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function TaskMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-card">
      <p className="text-sm font-bold text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-3xl font-extrabold text-[var(--foreground)]">{value}</p>
    </div>
  );
}

export function OperationTasksView({
  baseReportsHref,
  canEditStations = false,
  copy,
  intlLocale,
  stationHealthMessages,
  tasks,
  unavailableLabel,
}: OperationTasksViewProps) {
  const healthLabels = stationHealthLabelsFromMessages(stationHealthMessages);
  const listSep = intlLocale.startsWith("en") ? ", " : "، ";

  const hasTasks =
    tasks.pendingReports.length > 0 || tasks.staleStations.length > 0 || tasks.inactiveStations.length > 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <TaskMetric label={copy.metricPendingReports} value={tasks.totals.pendingReports} />
        <TaskMetric label={copy.metricStaleStations} value={tasks.totals.staleStations} />
        <TaskMetric label={copy.metricInactiveStations} value={tasks.totals.inactiveStations} />
      </div>

      {tasks.truncatedStationScan ? (
        <div className="rounded-2xl border border-[var(--warning)] bg-[var(--warning-soft)] px-4 py-3 text-sm leading-6 text-[var(--warning)]">
          {copy.truncationWarning}
        </div>
      ) : null}

      {!hasTasks ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-card">
          <EmptyState description={copy.emptyStableDescription} title={copy.emptyStableTitle} />
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-card">
          <div className="border-b border-[var(--border-subtle)] px-5 py-4">
            <h2 className="section-heading text-base">{copy.urgentReviewsTitle}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">{copy.urgentReviewsLead}</p>
          </div>
          <div className="divide-y divide-[var(--border-subtle)]">
            {tasks.pendingReports.length === 0 ? (
              <EmptyState description={copy.noReviewsDescription} title={copy.noReviewsTitle} />
            ) : (
              tasks.pendingReports.map((report) => (
                <div className="space-y-3 px-5 py-4" key={report.reportId}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-[var(--foreground)]">{report.stationLabel}</p>
                      <p className="text-xs text-[var(--muted)]">
                        {report.technicianName}
                        {listSep}
                        {formatTaskTime(report.submittedAt, intlLocale, unavailableLabel)}
                      </p>
                    </div>
                    <Link
                      className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--primary)] px-3 py-2 text-sm font-bold text-[var(--primary-foreground)] shadow-sm transition-all duration-150 hover:bg-[var(--primary-hover)] active:scale-[0.98]"
                      href={`${baseReportsHref}?reviewStatus=pending`}
                    >
                      {copy.openReports}
                    </Link>
                  </div>
                  <StatusPills status={report.status} />
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-card">
          <div className="border-b border-[var(--border-subtle)] px-5 py-4">
            <h2 className="section-heading text-base">{copy.stationsFollowupTitle}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">{copy.stationsFollowupLead}</p>
          </div>
          <div className="divide-y divide-[var(--border-subtle)]">
            {[...tasks.staleStations, ...tasks.inactiveStations].length === 0 ? (
              <EmptyState description={copy.stationsStableDescription} title={copy.stationsStableTitle} />
            ) : (
              [...tasks.staleStations, ...tasks.inactiveStations].map((station) => {
                const health = getStationHealth(station, healthLabels);

                return (
                  <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4" key={station.stationId}>
                    <div>
                      <p className="text-sm font-bold text-[var(--foreground)]">{station.label}</p>
                      <p className="text-xs text-[var(--muted)]">
                        {station.location}
                        {listSep}
                        {copy.lastVisitPrefix}{" "}
                        {formatTaskTime(station.lastVisitedAt, intlLocale, unavailableLabel)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${health.toneClassName}`}>
                        {health.label}
                      </span>
                      {canEditStations ? (
                        <Link
                          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-bold text-[var(--foreground)] shadow-sm transition-colors hover:bg-[var(--surface-subtle)]"
                          href={`/dashboard/manager/stations/${station.stationId}`}
                        >
                          {copy.openStation}
                        </Link>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
