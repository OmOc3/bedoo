"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, useEffect } from "react";
import { startShiftAction, endShiftAction } from "@/app/actions/shifts";

interface ShiftClockPanelProps {
  openShift: SerializedShift | null;
  schedule: SerializedSchedule | null;
}

export interface SerializedShift {
  shiftId: string;
  startedAtMs: number;
  startStationLabel?: string;
  expectedDurationMinutes?: number;
  status: string;
}

export interface SerializedSchedule {
  workDays: number[];
  shiftStartTime: string;
  shiftEndTime: string;
  expectedDurationMinutes: number;
  hourlyRate?: number;
}

function IconClock(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" {...props}>
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
function IconMapPin(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" {...props}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
    </svg>
  );
}
function IconCheckCircle(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" {...props}>
      <circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" />
    </svg>
  );
}
function IconAlertTriangle(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" {...props}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
function IconLogOut(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
function IconLogIn(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" {...props}>
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" />
    </svg>
  );
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} دقيقة`;
  if (m === 0) return `${h} ساعة`;
  return `${h} ساعة و${m} دقيقة`;
}

function formatTime(ms: number): string {
  return new Intl.DateTimeFormat("ar-EG", { timeStyle: "short" }).format(new Date(ms));
}

function useElapsed(startMs: number | null): string {
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    if (!startMs) {
      setElapsed("");
      return;
    }
    const currentStartMs = startMs;
    function update() {
      const diff = Date.now() - currentStartMs;
      const mins = Math.floor(diff / 60_000);
      const secs = Math.floor((diff % 60_000) / 1000);
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      setElapsed(h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(secs).padStart(2, "0")}` : `${m}:${String(secs).padStart(2, "0")}`);
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [startMs]);

  return elapsed;
}

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error("المتصفح لا يدعم تحديد الموقع.")); return; }
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 });
  });
}

interface EarlyExitWarningProps {
  minutesWorked: number;
  expectedMinutes: number;
  earlyExitMinutes: number;
  onConfirm: () => void;
  onCancel: () => void;
}

function EarlyExitWarning({ minutesWorked, expectedMinutes, earlyExitMinutes, onConfirm, onCancel }: EarlyExitWarningProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" dir="rtl">
      <div className="w-full max-w-sm rounded-3xl border border-amber-200 bg-white p-6 shadow-2xl dark:border-amber-800/50 dark:bg-gray-900">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <IconAlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">تحذير: انصراف مبكر</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">قبل انتهاء الشيفت المحدد</p>
          </div>
        </div>

        <div className="mb-5 space-y-2 rounded-2xl bg-amber-50 p-4 dark:bg-amber-900/20">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">الوقت المعمول به</span>
            <span className="font-bold text-gray-900 dark:text-white">{formatDuration(minutesWorked)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">المدة المطلوبة</span>
            <span className="font-bold text-gray-900 dark:text-white">{formatDuration(expectedMinutes)}</span>
          </div>
          <div className="mt-2 border-t border-amber-200 pt-2 dark:border-amber-800/50">
            <div className="flex justify-between text-sm">
              <span className="font-semibold text-amber-700 dark:text-amber-400">الوقت الناقص</span>
              <span className="font-bold text-amber-700 dark:text-amber-400">{formatDuration(earlyExitMinutes)}</span>
            </div>
          </div>
        </div>

        <p className="mb-5 text-sm leading-7 text-gray-600 dark:text-gray-400">
          أنت تنصرف قبل انتهاء مدة شيفتك. سيتم تسجيل ذلك وإبلاغ المشرف. هل تريد المتابعة؟
        </p>

        <div className="flex gap-3">
          <button
            className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            onClick={onCancel}
            type="button"
          >
            تراجع
          </button>
          <button
            className="flex-1 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-500"
            onClick={onConfirm}
            type="button"
          >
            تأكيد الانصراف
          </button>
        </div>
      </div>
    </div>
  );
}

export function ShiftClockPanel({ openShift, schedule }: ShiftClockPanelProps) {
  const router = useRouter();
  const elapsed = useElapsed(openShift ? openShift.startedAtMs : null);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [notes, setNotes] = useState("");

  // Early exit confirmation state
  const [earlyExitPending, setEarlyExitPending] = useState<{
    minutesWorked: number;
    expectedMinutes: number;
    earlyExitMinutes: number;
    formData: FormData;
  } | null>(null);

  async function buildFormData(): Promise<FormData | null> {
    try {
      const pos = await getCurrentPosition();
      const fd = new FormData();
      fd.set("lat", String(pos.coords.latitude));
      fd.set("lng", String(pos.coords.longitude));
      if (Number.isFinite(pos.coords.accuracy)) fd.set("accuracyMeters", String(pos.coords.accuracy));
      if (notes.trim()) fd.set("notes", notes.trim());
      return fd;
    } catch (err: unknown) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "تعذر تحديد موقعك." });
      return null;
    }
  }

  function handleStartShift(): void {
    startTransition(async () => {
      setMessage(null);
      const fd = await buildFormData();
      if (!fd) return;
      const result = await startShiftAction(fd);
      setMessage({ type: result.success ? "success" : "error", text: result.error ?? "✅ تم تسجيل الحضور بنجاح. يمكنك الآن فحص المحطات." });
      if (result.success) {
        setNotes("");
        router.refresh();
      }
    });
  }

  function handleEndShift(): void {
    startTransition(async () => {
      setMessage(null);
      const fd = await buildFormData();
      if (!fd) return;

      // Check for early exit locally before submitting
      const expectedMinutes = openShift?.expectedDurationMinutes ?? 0;
      if (expectedMinutes > 0 && openShift?.startedAtMs) {
        const minutesWorked = Math.round((Date.now() - openShift.startedAtMs) / 60_000);
        if (minutesWorked < expectedMinutes) {
          setEarlyExitPending({
            minutesWorked,
            expectedMinutes,
            earlyExitMinutes: expectedMinutes - minutesWorked,
            formData: fd,
          });
          return;
        }
      }

      await submitEndShift(fd);
    });
  }

  function confirmEarlyExit() {
    if (!earlyExitPending) return;
    const fd = earlyExitPending.formData;
    setEarlyExitPending(null);
    startTransition(async () => {
      await submitEndShift(fd);
    });
  }

  async function submitEndShift(fd: FormData) {
    const result = await endShiftAction(fd);

    if (result.success) {
      const completionUrl = result.shiftId ? `/scan/shift-complete?shiftId=${encodeURIComponent(result.shiftId)}` : "/scan";
      setMessage({
        type: "success",
        text: result.earlyExit && result.minutesWorked !== undefined
          ? `تم تسجيل الانصراف المبكر. عملت ${formatDuration(result.minutesWorked)} من أصل ${formatDuration(openShift?.expectedDurationMinutes ?? 0)} المطلوبة.`
          : `تم تسجيل الانصراف. عملت ${formatDuration(result.minutesWorked ?? 0)}.`,
      });
      setNotes("");
      router.push(completionUrl);
    } else {
      setMessage({ type: "error", text: result.error ?? "تعذر تسجيل الانصراف." });
    }
  }

  const scheduleInfo = schedule
    ? `أيام العمل: ${schedule.workDays.map((d) => ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"][d]).join("، ")} | ${schedule.shiftStartTime} – ${schedule.shiftEndTime}`
    : null;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-xl" dir="rtl">
      {earlyExitPending && (
        <EarlyExitWarning
          earlyExitMinutes={earlyExitPending.earlyExitMinutes}
          expectedMinutes={earlyExitPending.expectedMinutes}
          minutesWorked={earlyExitPending.minutesWorked}
          onCancel={() => setEarlyExitPending(null)}
          onConfirm={confirmEarlyExit}
        />
      )}

      <div className={`h-1.5 w-full ${openShift ? "bg-emerald-500" : "bg-[var(--border)]"}`} />

      <div className="p-6">
        {/* Header */}
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className={`relative flex h-3 w-3 ${openShift ? "block" : "hidden"}`}>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
              </span>
              <h2 className="text-xl font-black text-[var(--foreground)]">
                {openShift ? "شيفت نشط" : "تسجيل الحضور"}
              </h2>
            </div>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {openShift
                ? `بدأ الشيفت عند ${formatTime(openShift.startedAtMs)}${openShift.startStationLabel ? ` — ${openShift.startStationLabel}` : ""}`
                : "سجّل حضورك لبدء الشيفت والوصول لنظام المحطات."}
            </p>
          </div>
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${openShift ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-gray-100 dark:bg-gray-800"}`}>
            <IconClock className={`h-6 w-6 ${openShift ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400"}`} />
          </div>
        </div>

        {/* Active shift timer */}
        {openShift && (
          <div className="mb-5 rounded-2xl bg-emerald-50/80 p-4 dark:bg-emerald-900/20">
            <div className="text-center">
              <div className="font-mono text-4xl font-black tabular-nums text-emerald-700 dark:text-emerald-400" dir="ltr">
                {elapsed || "0:00"}
              </div>
              <p className="mt-1 text-sm text-emerald-600 dark:text-emerald-500">وقت الشيفت الجاري</p>
            </div>
            {openShift.expectedDurationMinutes && (
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-xs text-emerald-700 dark:text-emerald-500">
                  <span>التقدم</span>
                  <span>{formatDuration(openShift.expectedDurationMinutes)} المطلوبة</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-emerald-200 dark:bg-emerald-900/50">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-1000"
                    style={{
                      width: `${Math.min(100, ((Date.now() - openShift.startedAtMs) / (openShift.expectedDurationMinutes * 60_000)) * 100).toFixed(1)}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Schedule info */}
        {scheduleInfo && !openShift && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5 text-xs text-blue-800 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-300">
            <IconClock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{scheduleInfo}</span>
          </div>
        )}

        {/* Geo requirement notice */}
        {!openShift && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-2.5 text-xs text-[var(--muted)]">
            <IconMapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-600" />
            <span>يجب أن تكون على بُعد 100 متر أو أقل من إحدى محطات العمل لتسجيل الحضور.</span>
          </div>
        )}

        {!openShift && !schedule && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
            <IconAlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>لا يوجد جدول عمل نشط لحسابك. تواصل مع المدير قبل بدء الشيفت.</span>
          </div>
        )}

        {/* Notes (only for clock out) */}
        {openShift && (
          <textarea
            className="mb-4 min-h-16 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            dir="rtl"
            onChange={(e) => setNotes(e.target.value)}
            placeholder="ملاحظة للشيفت (اختياري)"
            value={notes}
          />
        )}

        {/* Action buttons */}
        <div className="flex flex-col gap-3">
          {!openShift ? (
            <button
              className="inline-flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-2xl bg-emerald-600 px-6 text-base font-bold text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-500 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isPending || !schedule}
              id="btn-start-shift"
              onClick={handleStartShift}
              type="button"
            >
              {isPending ? (
                <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" />
                </svg>
              ) : <IconLogIn className="h-5 w-5" />}
              {isPending ? "جاري تحديد الموقع..." : schedule ? "تسجيل الحضور" : "لا يوجد جدول عمل"}
            </button>
          ) : (
            <button
              className="inline-flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-2xl bg-amber-600 px-6 text-base font-bold text-white shadow-lg shadow-amber-600/20 transition-all hover:bg-amber-500 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isPending}
              id="btn-end-shift"
              onClick={handleEndShift}
              type="button"
            >
              {isPending ? (
                <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" />
                </svg>
              ) : <IconLogOut className="h-5 w-5" />}
              {isPending ? "جاري تحديد الموقع..." : "تسجيل الانصراف"}
            </button>
          )}
        </div>

        {/* Feedback message */}
        {message && (
          <div className={`mt-4 flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm font-medium ${
            message.type === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-900/20 dark:text-emerald-300"
              : "border border-red-200 bg-red-50 text-red-800 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-300"
          }`}>
            {message.type === "success"
              ? <IconCheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
              : <IconAlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
            <span>{message.text}</span>
          </div>
        )}
      </div>
    </div>
  );
}
