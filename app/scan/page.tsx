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
  listShiftsForTechnician,
  listReportsForTechnician,
} from "@/lib/db/repositories";
import { APP_TIME_ZONE } from "@/lib/datetime";
import { i18n } from "@/lib/i18n";
import type { Report, ShiftSalaryStatus, TechnicianShift } from "@/types";

export const metadata: Metadata = { title: i18n.scan.title };

function formatTs(ms: number) {
  return new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short", timeZone: APP_TIME_ZONE }).format(new Date(ms));
}

function minutesToDisplay(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} د`;
  if (m === 0) return `${h} س`;
  return `${h}س ${m}د`;
}

const salaryColors: Record<ShiftSalaryStatus, string> = {
  paid: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  unpaid: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

const salaryLabels: Record<ShiftSalaryStatus, string> = {
  paid: "مدفوع",
  pending: "قيد المراجعة",
  unpaid: "غير مدفوع",
};

function ShiftHistoryCard({ shift }: { shift: TechnicianShift }) {
  return (
    <li className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-[var(--foreground)]">{formatTs(shift.startedAt.toDate().getTime())}</p>
          {shift.startStationLabel && <p className="mt-0.5 text-xs text-[var(--muted)]">من: {shift.startStationLabel}</p>}
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${salaryColors[shift.salaryStatus]}`}>
          {salaryLabels[shift.salaryStatus]}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-[var(--surface-subtle)] p-2 text-center">
          <p className="text-xs text-[var(--muted)]">المدة</p>
          <p className="mt-0.5 text-sm font-bold text-[var(--foreground)]">{shift.totalMinutes != null ? minutesToDisplay(shift.totalMinutes) : "—"}</p>
        </div>
        <div className="rounded-xl bg-[var(--surface-subtle)] p-2 text-center">
          <p className="text-xs text-[var(--muted)]">الراتب</p>
          <p className="mt-0.5 text-sm font-bold text-[var(--foreground)]">{shift.salaryAmount != null ? `${shift.salaryAmount}` : "—"}</p>
        </div>
        <div className="rounded-xl bg-[var(--surface-subtle)] p-2 text-center">
          <p className="text-xs text-[var(--muted)]">الحالة</p>
          <p className={`mt-0.5 text-sm font-bold ${shift.earlyExit ? "text-amber-600" : "text-emerald-600"}`}>{shift.earlyExit ? "مبكر" : "مكتمل"}</p>
        </div>
      </div>
    </li>
  );
}

function SalaryRecordCard({ shift }: { shift: TechnicianShift }) {
  return (
    <li className="rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--foreground)]">{formatTs(shift.startedAt.toDate().getTime())}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            القيمة: {shift.salaryAmount != null ? `${shift.salaryAmount}` : "لم يحددها المدير بعد"}
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

function TechnicianNotifications({ reports, shifts }: { reports: Report[]; shifts: TechnicianShift[] }) {
  const items = [
    ...shifts
      .filter((shift) => shift.status === "completed" && shift.salaryStatus === "pending")
      .map((shift) => ({
        id: `salary-${shift.shiftId}`,
        title: "راتب بانتظار المراجعة",
        body: `${formatTs(shift.startedAt.toDate().getTime())} · ${shift.totalMinutes != null ? minutesToDisplay(shift.totalMinutes) : "مدة غير مسجلة"}`,
      })),
    ...shifts
      .filter((shift) => shift.status === "completed" && shift.earlyExit)
      .map((shift) => ({
        id: `early-${shift.shiftId}`,
        title: "تم تسجيل خروج مبكر",
        body: `${formatTs(shift.startedAt.toDate().getTime())} · سيظهر للمدير في سجل الشيفتات.`,
      })),
    ...reports
      .filter((report) => report.reviewStatus === "rejected")
      .map((report) => ({
        id: `report-${report.reportId}`,
        title: "تقرير مرفوض",
        body: `${report.stationLabel} · ${formatTs(report.submittedAt.toDate().getTime())}`,
      })),
  ].slice(0, 8);

  return (
    <div id="notifications" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
      <div className="border-b border-[var(--border)] p-5">
        <h2 className="text-lg font-bold text-[var(--foreground)]">الإشعارات</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">تنبيهات الشيفت والراتب والتقارير.</p>
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
        <p className="p-5 text-sm text-[var(--muted)]">لا توجد إشعارات جديدة.</p>
      )}
    </div>
  );
}

export default async function ScanPage() {
  const session = await getCurrentSession();

  // Only for technicians do we gate on shift
  const isTechnician = session?.role === "technician";

  const [openShift, schedule, pastShifts, recentReports] = await Promise.all([
    isTechnician ? getOpenShift(session.uid) : Promise.resolve(null),
    isTechnician ? getActiveWorkSchedule(session.uid) : Promise.resolve(null),
    isTechnician ? listShiftsForTechnician(session.uid, 20) : Promise.resolve([]),
    isTechnician ? listReportsForTechnician(session.uid, 5) : Promise.resolve([]),
  ]);

  const isShiftActive = Boolean(openShift);
  // After a completed shift (no open shift but has past shifts), show profile/records mode
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

  return (
    <main className="min-h-dvh bg-[var(--surface-subtle)] pb-12 text-right" dir="rtl">
      {session ? <RoleRedirectWatcher currentRole={session.role} /> : null}

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--surface)]/80 p-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <BrandLockup />
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {session ? <LogoutButton buttonClassName="min-h-10 rounded-xl px-4 text-sm shadow-sm" /> : null}
          </div>
        </div>
      </header>

      <div className="mx-auto mt-8 max-w-5xl px-4 sm:px-6">

        {/* ── TECHNICIAN GATE MODE ─────────────────────────────────── */}
        {isTechnician && (
          <>
            {/* Always show clock panel at top */}
            <div className="mb-8">
              <ShiftClockPanel
                openShift={serializedShift}
                schedule={serializedSchedule}
              />
            </div>

            {/* If no active shift, keep the technician in records mode. */}
            {!isShiftActive && (
              <div className="space-y-4">
                <div id="work-schedule" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
                  <h2 className="text-lg font-bold text-[var(--foreground)]">جدول العمل</h2>
                  {schedule ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="rounded-lg bg-[var(--surface-subtle)] p-3">
                        <p className="text-sm text-[var(--muted)]">بداية الشيفت</p>
                        <p className="mt-1 text-lg font-bold text-[var(--foreground)]" dir="ltr">{schedule.shiftStartTime}</p>
                      </div>
                      <div className="rounded-lg bg-[var(--surface-subtle)] p-3">
                        <p className="text-sm text-[var(--muted)]">نهاية الشيفت</p>
                        <p className="mt-1 text-lg font-bold text-[var(--foreground)]" dir="ltr">{schedule.shiftEndTime}</p>
                      </div>
                      <div className="rounded-lg bg-[var(--surface-subtle)] p-3">
                        <p className="text-sm text-[var(--muted)]">المدة المطلوبة</p>
                        <p className="mt-1 text-lg font-bold text-[var(--foreground)]">{minutesToDisplay(schedule.expectedDurationMinutes)}</p>
                      </div>
                      <div className="rounded-lg bg-[var(--surface-subtle)] p-3">
                        <p className="text-sm text-[var(--muted)]">أيام العمل</p>
                        <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">
                          {schedule.workDays.map((d) => ["أحد","إثنين","ثلاثاء","أربعاء","خميس","جمعة","سبت"][d]).join("، ")}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
                      لا يوجد جدول عمل نشط. لن تتمكن من بدء الشيفت حتى يحدد المدير جدولك.
                    </p>
                  )}
                </div>

                {hasCompletedShifts && (
                  <div id="shift-history" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
                    <div className="border-b border-[var(--border)] p-5">
                      <h2 className="text-lg font-bold text-[var(--foreground)]">سجل الشيفتات</h2>
                      <p className="mt-1 text-sm text-[var(--muted)]">آخر الشيفتات المكتملة ومدة كل شيفت.</p>
                    </div>
                    <ul className="space-y-3 p-5">
                      {completedShifts.slice(0, 10).map((shift) => (
                        <ShiftHistoryCard key={shift.shiftId} shift={shift} />
                      ))}
                    </ul>
                  </div>
                )}

                {hasCompletedShifts && (
                  <div id="salary-records" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
                    <div className="border-b border-[var(--border)] p-5">
                      <h2 className="text-lg font-bold text-[var(--foreground)]">سجل الرواتب</h2>
                      <p className="mt-1 text-sm text-[var(--muted)]">حالة مراجعة الرواتب اليدوية لكل شيفت مكتمل.</p>
                    </div>
                    <ul className="space-y-3 p-5">
                      {completedShifts.slice(0, 10).map((shift) => (
                        <SalaryRecordCard key={shift.shiftId} shift={shift} />
                      ))}
                    </ul>
                  </div>
                )}

                <TechnicianNotifications reports={recentReports} shifts={completedShifts} />
              </div>
            )}

            {/* If shift IS active → show full technician dashboard */}
            {isShiftActive && (
              <div className="space-y-8">
                <div className="mx-auto max-w-lg space-y-4">
                  <p className="text-center text-sm leading-6 text-[var(--muted)]">{i18n.scan.technicianQrOnlyNote}</p>
                  <div className="overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-2xl">
                    <h3 className="mb-4 text-lg font-bold text-[var(--foreground)]">الماسح الضوئي</h3>
                    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-black">
                      <WebQrScanner />
                    </div>
                  </div>
                </div>

                {/* Recent reports */}
                {recentReports.length > 0 && (
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
                    <div className="border-b border-[var(--border)] p-5">
                      <h2 className="text-lg font-bold text-[var(--foreground)]">آخر فحوصاتي في هذا الشيفت</h2>
                    </div>
                    <ul className="divide-y divide-[var(--border)]">
                      {recentReports.slice(0, 5).map((r) => (
                        <li key={r.reportId} className="flex items-center justify-between gap-3 p-4 text-sm">
                          <span className="font-semibold text-[var(--foreground)]">{r.stationLabel}</span>
                          <span className="text-[var(--muted)]">{formatTs(r.submittedAt.toDate().getTime())}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── NON-TECHNICIAN: original manager/supervisor view ──── */}
        {!isTechnician && (
          <div className="grid gap-8 lg:grid-cols-[1fr_420px] lg:gap-12">
            <div className="space-y-4">
              <h1 className="text-4xl font-black text-[var(--foreground)]">{i18n.scan.title}</h1>
              <p className="text-lg text-[var(--muted)]">وجّه الكاميرا نحو رمز QR أو ابحث يدوياً.</p>
              {!session && (
                <Link className="inline-flex min-h-[52px] items-center gap-2 rounded-2xl bg-[var(--foreground)] px-8 font-bold text-[var(--surface)] shadow-xl hover:scale-105" href="/login">
                  {i18n.scan.loginCta}
                </Link>
              )}
            </div>
            <div className="overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-2xl">
              <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-black">
                <WebQrScanner />
              </div>
            </div>
          </div>
        )}
      </div>

      <CopyrightFooter className="mx-auto mt-16 max-w-5xl border-t border-[var(--border)] pt-8" />
    </main>
  );
}
