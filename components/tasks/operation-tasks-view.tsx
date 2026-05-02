import Link from "next/link";
import { StatusPills } from "@/components/reports/status-pills";
import { EmptyState } from "@/components/ui/empty-state";
import { getStationHealth } from "@/lib/station-health";
import type { AppTimestamp } from "@/types";
import type { OperationTasks } from "@/lib/operations-tasks";

interface OperationTasksViewProps {
  baseReportsHref: string;
  canEditStations?: boolean;
  tasks: OperationTasks;
}

function formatTimestamp(timestamp?: AppTimestamp): string {
  if (!timestamp) {
    return "غير متاح";
  }

  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp.toDate());
}

function TaskMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-card">
      <p className="text-sm font-bold text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-3xl font-extrabold text-[var(--foreground)]">{value}</p>
    </div>
  );
}

export function OperationTasksView({ baseReportsHref, canEditStations = false, tasks }: OperationTasksViewProps) {
  const hasTasks =
    tasks.pendingReports.length > 0 || tasks.staleStations.length > 0 || tasks.inactiveStations.length > 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <TaskMetric label="تقارير بانتظار المراجعة" value={tasks.totals.pendingReports} />
        <TaskMetric label="محطات تحتاج زيارة" value={tasks.totals.staleStations} />
        <TaskMetric label="محطات غير نشطة" value={tasks.totals.inactiveStations} />
      </div>

      {tasks.truncatedStationScan ? (
        <div className="rounded-2xl border border-[var(--warning)] bg-[var(--warning-soft)] px-4 py-3 text-sm leading-6 text-[var(--warning)]">
          قائمة المحطات التي تحتاج متابعة مبنية على آخر 500 محطة لتفادي قراءة غير محدودة. استخدم صفحة المحطات للبحث
          التفصيلي عند الحاجة.
        </div>
      ) : null}

      {!hasTasks ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-card">
          <EmptyState description="لا توجد مهام تشغيلية مفتوحة حاليًا." title="اليوم مستقر" />
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-card">
          <div className="border-b border-[var(--border-subtle)] px-5 py-4">
            <h2 className="section-heading text-base">مراجعات عاجلة</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">أقدم التقارير المفتوحة تحتاج قرار مراجعة.</p>
          </div>
          <div className="divide-y divide-[var(--border-subtle)]">
            {tasks.pendingReports.length === 0 ? (
              <EmptyState description="لا توجد تقارير تنتظر المراجعة." title="لا توجد مراجعات" />
            ) : (
              tasks.pendingReports.map((report) => (
                <div className="space-y-3 px-5 py-4" key={report.reportId}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-[var(--foreground)]">{report.stationLabel}</p>
                      <p className="text-xs text-[var(--muted)]">
                        {report.technicianName}، {formatTimestamp(report.submittedAt)}
                      </p>
                    </div>
                    <Link
                      className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--primary)] px-3 py-2 text-sm font-bold text-[var(--primary-foreground)] shadow-sm transition-all duration-150 hover:bg-[var(--primary-hover)] active:scale-[0.98]"
                      href={`${baseReportsHref}?reviewStatus=pending`}
                    >
                      فتح التقارير
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
            <h2 className="section-heading text-base">محطات تحتاج متابعة</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">محطات لم تزر مؤخرًا أو خرجت من الخدمة.</p>
          </div>
          <div className="divide-y divide-[var(--border-subtle)]">
            {[...tasks.staleStations, ...tasks.inactiveStations].length === 0 ? (
              <EmptyState description="كل المحطات النشطة تمت متابعتها ضمن الفترة المحددة." title="المحطات مستقرة" />
            ) : (
              [...tasks.staleStations, ...tasks.inactiveStations].map((station) => {
                const health = getStationHealth(station);

                return (
                  <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4" key={station.stationId}>
                    <div>
                      <p className="text-sm font-bold text-[var(--foreground)]">{station.label}</p>
                      <p className="text-xs text-[var(--muted)]">
                        {station.location}، آخر زيارة: {formatTimestamp(station.lastVisitedAt)}
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
                          فتح
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
