import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-page";
import { PageHeader } from "@/components/layout/page-header";
import { requireRole } from "@/lib/auth/server-session";
import { getAppUser, getActiveWorkSchedule } from "@/lib/db/repositories";
import { upsertWorkScheduleAction } from "@/app/actions/schedule";

export const metadata: Metadata = { title: "جدول عمل الفني" };

const DAYS = [
  { value: 0, label: "الأحد" },
  { value: 1, label: "الإثنين" },
  { value: 2, label: "الثلاثاء" },
  { value: 3, label: "الأربعاء" },
  { value: 4, label: "الخميس" },
  { value: 5, label: "الجمعة" },
  { value: 6, label: "السبت" },
];

interface Props {
  params: Promise<{ uid: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
}

export default async function TechnicianSchedulePage({ params, searchParams }: Props) {
  await requireRole(["manager"]);
  const { uid } = await params;
  const sp = await searchParams;

  const [tech, schedule] = await Promise.all([
    getAppUser(uid),
    getActiveWorkSchedule(uid),
  ]);

  if (!tech || tech.role !== "technician") notFound();

  const currentDays = schedule?.workDays ?? [0, 1, 2, 3, 4, 5, 6];

  return (
    <DashboardShell role="manager">
      <PageHeader
        title={`جدول عمل: ${tech.displayName}`}
        description="تحديد أيام وساعات العمل المسموح للفني بتسجيل حضوره فيها."
        backHref={`/dashboard/manager/users/${uid}`}
      />

      {sp.error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-800 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-300">
          {sp.error}
        </div>
      )}
      {sp.success === "1" && (
        <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-900/20 dark:text-emerald-300">
          ✅ تم حفظ جدول العمل بنجاح.
        </div>
      )}

      {/* Current schedule summary */}
      {schedule && (
        <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50/80 p-5 dark:border-blue-900/30 dark:bg-blue-900/10">
          <h2 className="mb-2 text-sm font-bold text-blue-800 dark:text-blue-300">الجدول الحالي</h2>
          <p className="text-sm text-blue-700 dark:text-blue-400">
            {schedule.workDays.map((d) => DAYS.find((x) => x.value === d)?.label).join("، ")} —{" "}
            <span dir="ltr">{schedule.shiftStartTime} – {schedule.shiftEndTime}</span> —{" "}
            {Math.floor(schedule.expectedDurationMinutes / 60)}س {schedule.expectedDurationMinutes % 60}د
            {schedule.hourlyRate ? ` — ${schedule.hourlyRate} / ساعة` : ""}
          </p>
        </div>
      )}

      <form
        action={async (formData) => {
          "use server";
          const result = await upsertWorkScheduleAction(formData);
          const { redirect } = await import("next/navigation");
          if (result.success) {
            redirect(`/dashboard/manager/users/${uid}/schedule?success=1`);
          } else {
            redirect(`/dashboard/manager/users/${uid}/schedule?error=${encodeURIComponent(result.error ?? "خطأ")}`);
          }
        }}
        className="space-y-6"
        dir="rtl"
      >
        <input type="hidden" name="technicianUid" value={uid} />

        {/* Days */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <h3 className="mb-4 text-base font-bold text-[var(--foreground)]">أيام العمل</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {DAYS.map((day) => (
              <label
                key={day.value}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-3 transition hover:border-[var(--primary)]"
              >
                <input
                  className="h-4 w-4 accent-[var(--primary)]"
                  defaultChecked={currentDays.includes(day.value)}
                  name="workDays"
                  type="checkbox"
                  value={day.value}
                />
                <span className="text-sm font-medium text-[var(--foreground)]">{day.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Times */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <h3 className="mb-4 text-base font-bold text-[var(--foreground)]">أوقات الشيفت</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold text-[var(--foreground)]">وقت البداية</span>
              <input
                className="min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                defaultValue={schedule?.shiftStartTime ?? "08:00"}
                dir="ltr"
                name="shiftStartTime"
                required
                type="time"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold text-[var(--foreground)]">وقت الانتهاء</span>
              <input
                className="min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                defaultValue={schedule?.shiftEndTime ?? "17:00"}
                dir="ltr"
                name="shiftEndTime"
                required
                type="time"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold text-[var(--foreground)]">مدة الشيفت (دقيقة)</span>
              <input
                className="min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                defaultValue={schedule?.expectedDurationMinutes ?? 480}
                min={15}
                max={720}
                name="expectedDurationMinutes"
                required
                step={15}
                type="number"
              />
              <p className="text-xs text-[var(--muted)]">مثال: 480 = 8 ساعات. تستخدم لتحذير الانصراف المبكر.</p>
            </label>
          </div>
        </div>

        {/* Salary */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <h3 className="mb-4 text-base font-bold text-[var(--foreground)]">الراتب (اختياري)</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold text-[var(--foreground)]">سعر الساعة</span>
              <input
                className="min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                defaultValue={schedule?.hourlyRate ?? ""}
                min={0}
                name="hourlyRate"
                placeholder="مثال: 25"
                step={0.01}
                type="number"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold text-[var(--foreground)]">ملاحظات</span>
              <input
                className="min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                defaultValue={schedule?.notes ?? ""}
                name="notes"
                placeholder="ملاحظة اختيارية"
                type="text"
              />
            </label>
          </div>
        </div>

        <button
          className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-[var(--primary)] px-6 text-base font-bold text-[var(--primary-foreground)] shadow-lg transition hover:bg-[var(--primary-hover)] hover:-translate-y-0.5"
          type="submit"
        >
          حفظ جدول العمل
        </button>
      </form>
    </DashboardShell>
  );
}
