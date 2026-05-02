import type { Metadata } from "next";
import { DashboardShell } from "@/components/layout/dashboard-page";
import { PageHeader } from "@/components/layout/page-header";
import { PayrollUpdateForm } from "@/components/shifts/payroll-update-form";
import { requireRole } from "@/lib/auth/server-session";
import { listAppUsers, listPayrollShifts } from "@/lib/db/repositories";
import { APP_TIME_ZONE } from "@/lib/datetime";
import { isShiftSalaryStatus } from "@/lib/shifts/schedule";
import type { ShiftSalaryStatus, TechnicianShift } from "@/types";

interface PayrollPageProps {
  searchParams: Promise<{
    dateFrom?: string;
    dateTo?: string;
    salaryStatus?: string;
    technicianUid?: string;
  }>;
}

export const metadata: Metadata = { title: "الرواتب" };

const salaryLabels: Record<ShiftSalaryStatus, string> = {
  paid: "تم الدفع",
  pending: "قيد المراجعة",
  unpaid: "غير مدفوع",
};

const salaryClasses: Record<ShiftSalaryStatus, string> = {
  paid: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  unpaid: "bg-red-100 text-red-800",
};

function parseDate(value: string | undefined, endOfDay = false): Date | null {
  if (!value) return null;

  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: APP_TIME_ZONE,
  }).format(value);
}

function formatDuration(minutes?: number): string {
  if (minutes === undefined) return "غير مسجل";

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) return `${remainingMinutes}د`;
  return `${hours}س${remainingMinutes > 0 ? ` ${remainingMinutes}د` : ""}`;
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-2xl font-bold text-[var(--foreground)]">{value}</p>
    </div>
  );
}

function PayrollCard({ shift, techName }: { shift: TechnicianShift; techName: string }) {
  return (
    <article className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="flex flex-col gap-3 border-b border-[var(--border)] pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-[var(--foreground)]">{techName}</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {formatDateTime(shift.startedAt.toDate())} · {formatDuration(shift.totalMinutes)}
          </p>
          {shift.earlyExit ? <p className="mt-2 text-sm font-semibold text-amber-700">انصراف مبكر</p> : null}
        </div>
        <span className={`inline-flex w-fit rounded-lg px-3 py-1 text-sm font-semibold ${salaryClasses[shift.salaryStatus]}`}>
          {salaryLabels[shift.salaryStatus]}
        </span>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,1.4fr)]">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <div className="rounded-lg bg-[var(--surface-subtle)] p-3">
            <p className="text-sm text-[var(--muted)]">وقت الانتهاء</p>
            <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">
              {shift.endedAt ? formatDateTime(shift.endedAt.toDate()) : "غير مسجل"}
            </p>
          </div>
          <div className="rounded-lg bg-[var(--surface-subtle)] p-3">
            <p className="text-sm text-[var(--muted)]">قيمة الراتب الحالية</p>
            <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">
              {shift.salaryAmount != null ? `${shift.salaryAmount}` : "لم تحدد بعد"}
            </p>
          </div>
        </div>
        <PayrollUpdateForm
          notes={shift.notes}
          salaryAmount={shift.salaryAmount}
          salaryStatus={shift.salaryStatus}
          shiftId={shift.shiftId}
        />
      </div>
    </article>
  );
}

export default async function ManagerPayrollPage({ searchParams }: PayrollPageProps) {
  await requireRole(["manager"]);
  const params = await searchParams;
  const salaryStatus = isShiftSalaryStatus(params.salaryStatus) ? params.salaryStatus : undefined;
  const [shifts, allUsers] = await Promise.all([
    listPayrollShifts(
      {
        dateFrom: parseDate(params.dateFrom),
        dateTo: parseDate(params.dateTo, true),
        salaryStatus,
        technicianUid: params.technicianUid,
      },
      250,
    ),
    listAppUsers(),
  ]);
  const technicians = allUsers.filter((user) => user.role === "technician");
  const techMap = new Map(technicians.map((user) => [user.uid, user.displayName]));
  const paidTotal = shifts
    .filter((shift) => shift.salaryStatus === "paid" && shift.salaryAmount != null)
    .reduce((sum, shift) => sum + (shift.salaryAmount ?? 0), 0);
  const pendingCount = shifts.filter((shift) => shift.salaryStatus === "pending").length;
  const unpaidCount = shifts.filter((shift) => shift.salaryStatus === "unpaid").length;

  return (
    <DashboardShell role="manager">
      <PageHeader
        backHref="/dashboard/manager"
        description="مراجعة رواتب الشيفتات المكتملة يدويًا وتسجيل قرارات الدفع."
        title="الرواتب"
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="الشيفتات المكتملة" value={shifts.length.toString()} />
        <StatCard label="قيد المراجعة" value={pendingCount.toString()} />
        <StatCard label="غير مدفوع" value={unpaidCount.toString()} />
        <StatCard label="إجمالي المدفوع" value={paidTotal.toFixed(2)} />
      </div>

      <form className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4" dir="rtl">
        <div className="grid gap-3 sm:grid-cols-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-[var(--muted)]">الفني</span>
            <select
              className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]"
              defaultValue={params.technicianUid ?? ""}
              name="technicianUid"
            >
              <option value="">كل الفنيين</option>
              {technicians.map((technician) => (
                <option key={technician.uid} value={technician.uid}>
                  {technician.displayName}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-[var(--muted)]">من تاريخ</span>
            <input
              className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]"
              defaultValue={params.dateFrom ?? ""}
              name="dateFrom"
              type="date"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-[var(--muted)]">إلى تاريخ</span>
            <input
              className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]"
              defaultValue={params.dateTo ?? ""}
              name="dateTo"
              type="date"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-[var(--muted)]">حالة الراتب</span>
            <select
              className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]"
              defaultValue={params.salaryStatus ?? ""}
              name="salaryStatus"
            >
              <option value="">كل الحالات</option>
              <option value="pending">قيد المراجعة</option>
              <option value="paid">تم الدفع</option>
              <option value="unpaid">غير مدفوع</option>
            </select>
          </label>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] transition-colors hover:bg-[var(--primary-hover)]"
            type="submit"
          >
            تطبيق الفلاتر
          </button>
        </div>
      </form>

      <section className="space-y-4">
        {shifts.length > 0 ? (
          shifts.map((shift) => (
            <PayrollCard key={shift.shiftId} shift={shift} techName={techMap.get(shift.technicianUid) ?? shift.technicianName} />
          ))
        ) : (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-sm text-[var(--muted)]">
            لا توجد شيفتات مكتملة مطابقة للفلاتر الحالية.
          </div>
        )}
      </section>
    </DashboardShell>
  );
}
