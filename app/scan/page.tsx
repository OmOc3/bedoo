import type { Metadata } from "next";
import Link from "next/link";
import { LogoutButton } from "@/components/auth/logout-button";
import { RoleRedirectWatcher } from "@/components/auth/role-redirect-watcher";
import { BrandLockup } from "@/components/layout/brand";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { CopyrightFooter } from "@/components/legal/copyright-footer";
import { WebQrScanner } from "@/components/station/web-qr-scanner";
import { NearbyStations } from "@/components/station/nearby-stations";
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
import type { TechnicianShift } from "@/types";

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

function ShiftHistoryCard({ shift }: { shift: TechnicianShift }) {
  const salaryColors = { pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300", paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300", unpaid: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" };
  const salaryLabels = { pending: "قيد الانتظار", paid: "مدفوع", unpaid: "غير مدفوع" };

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
          <p className="mt-0.5 text-sm font-bold text-[var(--foreground)]">{shift.totalMinutes ? minutesToDisplay(shift.totalMinutes) : "—"}</p>
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
  const hasCompletedShifts = pastShifts.length > 0;

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

            {/* If no active shift → show ONLY the clock panel + schedule info, nothing else */}
            {!isShiftActive && (
              <div className="space-y-4">
                {/* Schedule card */}
                {schedule && (
                  <div className="rounded-2xl border border-blue-100 bg-blue-50/80 p-5 dark:border-blue-900/30 dark:bg-blue-900/10">
                    <h2 className="mb-3 text-base font-bold text-blue-800 dark:text-blue-300">جدول عملك</h2>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="rounded-xl bg-white/80 p-3 dark:bg-blue-950/40">
                        <p className="text-xs text-blue-600 dark:text-blue-400">بداية الشيفت</p>
                        <p className="mt-1 text-lg font-black text-blue-900 dark:text-blue-200" dir="ltr">{schedule.shiftStartTime}</p>
                      </div>
                      <div className="rounded-xl bg-white/80 p-3 dark:bg-blue-950/40">
                        <p className="text-xs text-blue-600 dark:text-blue-400">نهاية الشيفت</p>
                        <p className="mt-1 text-lg font-black text-blue-900 dark:text-blue-200" dir="ltr">{schedule.shiftEndTime}</p>
                      </div>
                      <div className="rounded-xl bg-white/80 p-3 dark:bg-blue-950/40">
                        <p className="text-xs text-blue-600 dark:text-blue-400">المدة المطلوبة</p>
                        <p className="mt-1 text-lg font-black text-blue-900 dark:text-blue-200">{minutesToDisplay(schedule.expectedDurationMinutes)}</p>
                      </div>
                      <div className="rounded-xl bg-white/80 p-3 dark:bg-blue-950/40">
                        <p className="text-xs text-blue-600 dark:text-blue-400">أيام العمل</p>
                        <p className="mt-1 text-xs font-bold text-blue-900 dark:text-blue-200">
                          {schedule.workDays.map((d) => ["أحد","إثنين","ثلاثاء","أربعاء","خميس","جمعة","سبت"][d]).join("، ")}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Past shifts & salary – show when clocked out */}
                {hasCompletedShifts && (
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
                    <div className="border-b border-[var(--border)] p-5">
                      <h2 className="text-lg font-bold text-[var(--foreground)]">سجل الشيفتات والمرتبات</h2>
                      <p className="mt-1 text-xs text-[var(--muted)]">شيفتاتك السابقة وحالة المدفوعات.</p>
                    </div>
                    <ul className="space-y-3 p-5">
                      {pastShifts.filter((s) => s.status === "completed").slice(0, 10).map((shift) => (
                        <ShiftHistoryCard key={shift.shiftId} shift={shift} />
                      ))}
                    </ul>
                  </div>
                )}

                {/* Login hint if no session */}
                {!session && (
                  <div className="flex justify-center">
                    <Link className="inline-flex min-h-[52px] items-center gap-2 rounded-2xl bg-[var(--foreground)] px-8 text-base font-bold text-[var(--surface)] shadow-xl hover:scale-105" href="/login">
                      تسجيل الدخول
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* If shift IS active → show full technician dashboard */}
            {isShiftActive && (
              <div className="space-y-8">
                {/* QR + Nearby */}
                <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
                  <div className="space-y-4">
                    <h2 className="text-xl font-black text-[var(--foreground)]">المحطات القريبة</h2>
                    <NearbyStations />
                  </div>
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
