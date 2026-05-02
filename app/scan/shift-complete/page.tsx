import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/server-session";
import { getShiftById } from "@/lib/db/repositories";
import { APP_TIME_ZONE } from "@/lib/datetime";
import type { ShiftSalaryStatus, TechnicianShift } from "@/types";

interface ShiftCompletePageProps {
  searchParams: Promise<{
    shiftId?: string;
  }>;
}

export const metadata: Metadata = { title: "ملخص نهاية الشيفت" };

const salaryLabels: Record<ShiftSalaryStatus, string> = {
  paid: "تم الدفع",
  pending: "بانتظار مراجعة المدير",
  unpaid: "غير مدفوع",
};

const salaryClasses: Record<ShiftSalaryStatus, string> = {
  paid: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  unpaid: "bg-red-100 text-red-800",
};

function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: APP_TIME_ZONE,
  }).format(value);
}

function formatDuration(minutes?: number): string {
  if (minutes === undefined) {
    return "غير متاح";
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) return `${remainingMinutes} دقيقة`;
  if (remainingMinutes === 0) return `${hours} ساعة`;
  return `${hours} ساعة و${remainingMinutes} دقيقة`;
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] p-4">
      <p className="text-sm font-medium text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-base font-semibold text-[var(--foreground)]">{value}</p>
    </div>
  );
}

function CompleteSummary({ shift }: { shift: TechnicianShift }) {
  return (
    <main className="min-h-dvh bg-[var(--surface-subtle)] px-4 py-6 text-right" dir="rtl">
      <section className="mx-auto w-full max-w-lg rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
        <p className="text-sm font-semibold text-green-700">تم إنهاء الشيفت</p>
        <h1 className="mt-2 text-2xl font-bold text-[var(--foreground)]">ملخص الشيفت</h1>
        <div className="mt-5 grid gap-3">
          <SummaryItem label="وقت البدء" value={formatDateTime(shift.startedAt.toDate())} />
          <SummaryItem label="وقت الانتهاء" value={shift.endedAt ? formatDateTime(shift.endedAt.toDate()) : "غير مسجل"} />
          <SummaryItem label="مدة الشيفت" value={formatDuration(shift.totalMinutes)} />
          <SummaryItem label="الخروج المبكر" value={shift.earlyExit ? "نعم، يحتاج مراجعة تشغيلية" : "لا"} />
        </div>

        <div className="mt-5 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] p-4">
          <p className="text-sm font-medium text-[var(--muted)]">حالة مراجعة الراتب</p>
          <span className={`mt-2 inline-flex rounded-lg px-3 py-1 text-sm font-semibold ${salaryClasses[shift.salaryStatus]}`}>
            {salaryLabels[shift.salaryStatus]}
          </span>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] transition-colors hover:bg-[var(--primary-hover)]"
            href="/scan"
          >
            العودة للرئيسية
          </Link>
          <Link
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-subtle)]"
            href="/scan#salary-records"
          >
            سجل الرواتب
          </Link>
        </div>
      </section>
    </main>
  );
}

export default async function ShiftCompletePage({ searchParams }: ShiftCompletePageProps) {
  const session = await requireRole(["technician", "manager"]);
  const { shiftId } = await searchParams;

  if (!shiftId) {
    notFound();
  }

  const shift = await getShiftById(shiftId);

  if (!shift || (session.role === "technician" && shift.technicianUid !== session.uid)) {
    notFound();
  }

  return <CompleteSummary shift={shift} />;
}
