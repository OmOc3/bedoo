import type { Metadata } from "next";
import Link from "next/link";
import { LogoutButton } from "@/components/auth/logout-button";
import { RoleRedirectWatcher } from "@/components/auth/role-redirect-watcher";
import { BrandLockup } from "@/components/layout/brand";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { CopyrightFooter } from "@/components/legal/copyright-footer";
import { WebQrScanner } from "@/components/station/web-qr-scanner";
import { ShiftClockPanel } from "@/components/shifts/shift-clock-panel";
import { getCurrentSession } from "@/lib/auth/server-session";
import {
  getOpenShift,
  getActiveWorkSchedule,
  listDailyAreaTasks,
  listShiftsForTechnician,
  listReportsForTechnician,
} from "@/lib/db/repositories";
import { APP_TIME_ZONE, formatIsoDateRome } from "@/lib/datetime";
import { getIntlLocaleForApp, getLocaleDirection, type I18nMessages, type Locale } from "@/lib/i18n";
import { getI18nMessages, getRequestLocale } from "@/lib/i18n/server";
import type { Report, ShiftSalaryStatus, TechnicianShift } from "@/types";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const t = getI18nMessages(locale);
  return { title: t.scan.title };
}

function formatTs(ms: number, intlLocale: string): string {
  return new Intl.DateTimeFormat(intlLocale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: APP_TIME_ZONE,
  }).format(new Date(ms));
}

function minutesToDisplay(minutes: number, locale: Locale): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (locale === "en") {
    if (h === 0) {
      return `${m}m`;
    }
    if (m === 0) {
      return `${h}h`;
    }
    return `${h}h ${m}m`;
  }
  if (h === 0) {
    return `${m} د`;
  }
  if (m === 0) {
    return `${h} س`;
  }
  return `${h}س ${m}د`;
}

const salaryColors: Record<ShiftSalaryStatus, string> = {
  paid: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  unpaid: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

function salaryLabelsFor(t: I18nMessages): Record<ShiftSalaryStatus, string> {
  return {
    paid: t.scan.salaryPaid,
    pending: t.scan.salaryPendingReview,
    unpaid: t.scan.salaryUnpaid,
  };
}

function ShiftHistoryCard({
  intlLocale,
  locale,
  shift,
  t,
}: {
  intlLocale: string;
  locale: Locale;
  shift: TechnicianShift;
  t: I18nMessages;
}) {
  const salaryLabels = salaryLabelsFor(t);
  return (
    <li className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-[var(--foreground)]">{formatTs(shift.startedAt.toDate().getTime(), intlLocale)}</p>
          {shift.startStationLabel ? (
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              {t.scan.fromStation} {shift.startStationLabel}
            </p>
          ) : null}
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${salaryColors[shift.salaryStatus]}`}>
          {salaryLabels[shift.salaryStatus]}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-[var(--surface-subtle)] p-2 text-center">
          <p className="text-xs text-[var(--muted)]">{t.scan.labelDuration}</p>
          <p className="mt-0.5 text-sm font-bold text-[var(--foreground)]">
            {shift.totalMinutes != null ? minutesToDisplay(shift.totalMinutes, locale) : "—"}
          </p>
        </div>
        <div className="rounded-xl bg-[var(--surface-subtle)] p-2 text-center">
          <p className="text-xs text-[var(--muted)]">{t.scan.labelSalary}</p>
          <p className="mt-0.5 text-sm font-bold text-[var(--foreground)]">{shift.salaryAmount != null ? `${shift.salaryAmount}` : "—"}</p>
        </div>
        <div className="rounded-xl bg-[var(--surface-subtle)] p-2 text-center">
          <p className="text-xs text-[var(--muted)]">{t.scan.labelStatus}</p>
          <p className={`mt-0.5 text-sm font-bold ${shift.earlyExit ? "text-amber-600" : "text-emerald-600"}`}>
            {shift.earlyExit ? t.scan.shiftEarly : t.scan.shiftCompleted}
          </p>
        </div>
      </div>
    </li>
  );
}

function SalaryRecordCard({ intlLocale, shift, t }: { intlLocale: string; shift: TechnicianShift; t: I18nMessages }) {
  const salaryLabels = salaryLabelsFor(t);
  return (
    <li className="rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--foreground)]">{formatTs(shift.startedAt.toDate().getTime(), intlLocale)}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {t.scan.salaryAmountLabel}{" "}
            {shift.salaryAmount != null ? `${shift.salaryAmount}` : t.scan.salaryNotSetYet}
          </p>
        </div>
        <span className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold ${salaryColors[shift.salaryStatus]}`}>
          {salaryLabels[shift.salaryStatus]}
        </span>
      </div>
      {shift.notes ? <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{shift.notes}</p> : null}
    </li>
  );
}

function TechnicianNotifications({
  intlLocale,
  locale,
  reports,
  shifts,
  t,
}: {
  intlLocale: string;
  locale: Locale;
  reports: Report[];
  shifts: TechnicianShift[];
  t: I18nMessages;
}) {
  const items = [
    ...shifts
      .filter((shift) => shift.status === "completed" && shift.salaryStatus === "pending")
      .map((shift) => ({
        id: `salary-${shift.shiftId}`,
        title: t.scan.notifySalaryPending,
        body: `${formatTs(shift.startedAt.toDate().getTime(), intlLocale)} · ${
          shift.totalMinutes != null ? minutesToDisplay(shift.totalMinutes, locale) : t.scan.durationUnknown
        }`,
      })),
    ...shifts
      .filter((shift) => shift.status === "completed" && shift.earlyExit)
      .map((shift) => ({
        id: `early-${shift.shiftId}`,
        title: t.scan.notifyEarlyCheckout,
        body: `${formatTs(shift.startedAt.toDate().getTime(), intlLocale)} · ${t.scan.notifyEarlyCheckoutDetail}`,
      })),
    ...reports
      .filter((report) => report.reviewStatus === "rejected")
      .map((report) => ({
        id: `report-${report.reportId}`,
        title: t.scan.notifyReportRejected,
        body: `${report.stationLabel} · ${formatTs(report.submittedAt.toDate().getTime(), intlLocale)}`,
      })),
  ].slice(0, 8);

  return (
    <div id="notifications" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
      <div className="border-b border-[var(--border)] p-5">
        <h2 className="text-lg font-bold text-[var(--foreground)]">{t.scan.notifications}</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">{t.scan.notificationsLead}</p>
      </div>
      {items.length > 0 ? (
        <ul className="divide-y divide-[var(--border)]">
          {items.map((item) => (
            <li className="p-4" key={item.id}>
              <p className="text-sm font-semibold text-[var(--foreground)]">{item.title}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">{item.body}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="p-5 text-sm text-[var(--muted)]">{t.scan.noNewNotifications}</p>
      )}
    </div>
  );
}

export default async function ScanPage() {
  const locale = await getRequestLocale();
  const t = getI18nMessages(locale);
  const intlLocale = getIntlLocaleForApp(locale);
  const pageDir = getLocaleDirection(locale);

  const session = await getCurrentSession();

  const isTechnician = session?.role === "technician";

  const technicianUid = session?.uid;

  const [openShift, schedule, pastShifts, recentReports] = await Promise.all([
    isTechnician && technicianUid ? getOpenShift(technicianUid) : Promise.resolve(null),
    isTechnician && technicianUid ? getActiveWorkSchedule(technicianUid) : Promise.resolve(null),
    isTechnician && technicianUid ? listShiftsForTechnician(technicianUid, 20) : Promise.resolve([]),
    isTechnician && technicianUid ? listReportsForTechnician(technicianUid, 5) : Promise.resolve([]),
  ]);
  const today = formatIsoDateRome(new Date()) ?? new Date().toISOString().slice(0, 10);
  const dailyAreaTasks =
    isTechnician && technicianUid
      ? (await listDailyAreaTasks({ dateFrom: today, dateTo: today, technicianUid }, 50)).filter(
          (task) => task.status === "approved" || task.status === "completed",
        )
      : [];

  const isShiftActive = Boolean(openShift);
  const completedShifts = pastShifts.filter((shift) => shift.status === "completed");
  const hasCompletedShifts = completedShifts.length > 0;

  const serializedShift = openShift
    ? {
        shiftId: openShift.shiftId,
        startedAtMs: openShift.startedAt.toDate().getTime(),
        startStationLabel: openShift.startStationLabel,
        expectedDurationMinutes: openShift.expectedDurationMinutes,
        status: openShift.status,
      }
    : null;

  const serializedSchedule = schedule
    ? {
        workDays: schedule.workDays,
        shiftStartTime: schedule.shiftStartTime,
        shiftEndTime: schedule.shiftEndTime,
        expectedDurationMinutes: schedule.expectedDurationMinutes,
        hourlyRate: schedule.hourlyRate,
      }
    : null;

  const weekdayNames = t.scan.weekdayNames;

  return (
    <main className="min-h-dvh bg-[var(--surface-subtle)] pb-12 text-right" dir={pageDir}>
      {session ? <RoleRedirectWatcher currentRole={session.role} /> : null}

      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--surface)]/80 p-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <BrandLockup />
          {/* Reserve inline-end space for fixed LanguageSwitcher (same row as Sign out) */}
          <div className="flex shrink-0 items-center gap-3 pe-[8.75rem] sm:pe-36">
            <ThemeToggle />
            {session ? <LogoutButton buttonClassName="min-h-10 rounded-xl px-4 text-sm shadow-sm" /> : null}
          </div>
        </div>
      </header>

      <div className="mx-auto mt-8 max-w-5xl px-4 sm:px-6">
        {isTechnician ? (
          <>
            <div className="mb-8">
              <ShiftClockPanel openShift={serializedShift} schedule={serializedSchedule} />
            </div>

            {!isShiftActive ? (
              <div className="space-y-4">
                <div id="work-schedule" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
                  <h2 className="text-lg font-bold text-[var(--foreground)]">{t.scan.workSchedule}</h2>
                  {schedule ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="rounded-lg bg-[var(--surface-subtle)] p-3">
                        <p className="text-sm text-[var(--muted)]">{t.scan.shiftStart}</p>
                        <p className="mt-1 text-lg font-bold text-[var(--foreground)]" dir="ltr">
                          {schedule.shiftStartTime}
                        </p>
                      </div>
                      <div className="rounded-lg bg-[var(--surface-subtle)] p-3">
                        <p className="text-sm text-[var(--muted)]">{t.scan.shiftEnd}</p>
                        <p className="mt-1 text-lg font-bold text-[var(--foreground)]" dir="ltr">
                          {schedule.shiftEndTime}
                        </p>
                      </div>
                      <div className="rounded-lg bg-[var(--surface-subtle)] p-3">
                        <p className="text-sm text-[var(--muted)]">{t.scan.requiredDuration}</p>
                        <p className="mt-1 text-lg font-bold text-[var(--foreground)]">
                          {minutesToDisplay(schedule.expectedDurationMinutes, locale)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-[var(--surface-subtle)] p-3">
                        <p className="text-sm text-[var(--muted)]">{t.scan.workDays}</p>
                        <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">
                          {schedule.workDays.map((d) => weekdayNames[d] ?? "").join(locale === "en" ? ", " : "، ")}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
                      {t.scan.noActiveSchedule}
                    </p>
                  )}
                </div>

                {hasCompletedShifts ? (
                  <div id="shift-history" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
                    <div className="border-b border-[var(--border)] p-5">
                      <h2 className="text-lg font-bold text-[var(--foreground)]">{t.scan.shiftHistory}</h2>
                      <p className="mt-1 text-sm text-[var(--muted)]">{t.scan.shiftHistoryLead}</p>
                    </div>
                    <ul className="space-y-3 p-5">
                      {completedShifts.slice(0, 10).map((shift) => (
                        <ShiftHistoryCard intlLocale={intlLocale} key={shift.shiftId} locale={locale} shift={shift} t={t} />
                      ))}
                    </ul>
                  </div>
                ) : null}

                {hasCompletedShifts ? (
                  <div id="salary-records" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
                    <div className="border-b border-[var(--border)] p-5">
                      <h2 className="text-lg font-bold text-[var(--foreground)]">{t.scan.payrollLog}</h2>
                      <p className="mt-1 text-sm text-[var(--muted)]">{t.scan.payrollLogLead}</p>
                    </div>
                    <ul className="space-y-3 p-5">
                      {completedShifts.slice(0, 10).map((shift) => (
                        <SalaryRecordCard intlLocale={intlLocale} key={shift.shiftId} shift={shift} t={t} />
                      ))}
                    </ul>
                  </div>
                ) : null}

                <TechnicianNotifications intlLocale={intlLocale} locale={locale} reports={recentReports} shifts={completedShifts} t={t} />
              </div>
            ) : null}

            {isShiftActive ? (
              <div className="space-y-8">
                <div className="mx-auto max-w-lg space-y-4">
                  <p className="text-center text-sm leading-6 text-[var(--muted)]">{t.scan.technicianQrOnlyNote}</p>
                  {dailyAreaTasks.length > 0 ? (
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-card">
                      <h2 className="text-base font-bold text-[var(--foreground)]">{t.scan.areaTasksTitle}</h2>
                      <ul className="mt-3 space-y-2">
                        {dailyAreaTasks.map((task) => (
                          <li className="rounded-lg bg-[var(--surface-subtle)] p-3 text-sm" key={task.taskId}>
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold text-[var(--foreground)]">{task.areaName ?? t.scan.areaFallbackName}</p>
                                <p className="mt-1 text-xs text-[var(--muted)]">{task.areaLocation}</p>
                              </div>
                              <span
                                className={
                                  task.status === "completed" ? "text-xs font-bold text-green-700" : "text-xs font-bold text-amber-700"
                                }
                              >
                                {task.status === "completed" ? t.scan.taskCompleted : t.scan.taskPendingScan}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <div className="overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-2xl">
                    <h3 className="mb-4 text-lg font-bold text-[var(--foreground)]">{t.scan.scannerTitle}</h3>
                    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-black">
                      <WebQrScanner />
                    </div>
                  </div>
                </div>

                {recentReports.length > 0 ? (
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
                    <div className="border-b border-[var(--border)] p-5">
                      <h2 className="text-lg font-bold text-[var(--foreground)]">{t.scan.recentShiftInspections}</h2>
                    </div>
                    <ul className="divide-y divide-[var(--border)]">
                      {recentReports.slice(0, 5).map((r) => (
                        <li className="flex items-center justify-between gap-3 p-4 text-sm" key={r.reportId}>
                          <span className="font-semibold text-[var(--foreground)]">{r.stationLabel}</span>
                          <span className="text-[var(--muted)]">{formatTs(r.submittedAt.toDate().getTime(), intlLocale)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}
          </>
        ) : null}

        {!isTechnician ? (
          <div className="grid gap-8 lg:grid-cols-[1fr_420px] lg:gap-12">
            <div className="space-y-4">
              <h1 className="text-4xl font-black text-[var(--foreground)]">{t.scan.title}</h1>
              <p className="text-lg text-[var(--muted)]">{t.scan.cameraHint}</p>
              {!session ? (
                <Link
                  className="inline-flex min-h-[52px] items-center gap-2 rounded-2xl bg-[var(--foreground)] px-8 font-bold text-[var(--surface)] shadow-xl hover:scale-105"
                  href="/login"
                >
                  {t.scan.loginCta}
                </Link>
              ) : null}
            </div>
            <div className="overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-2xl">
              <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-black">
                <WebQrScanner />
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <CopyrightFooter className="mx-auto mt-16 max-w-5xl border-t border-[var(--border)] pt-8" />
    </main>
  );
}
