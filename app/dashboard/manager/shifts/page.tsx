import type { Metadata } from "next";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-page";
import { PageHeader } from "@/components/layout/page-header";
import { requireRole } from "@/lib/auth/server-session";
import { listShiftsForAdmin, listAppUsers } from "@/lib/db/repositories";
import { SalaryStatusButton } from "@/components/shifts/salary-status-button";
import { APP_TIME_ZONE } from "@/lib/datetime";
import type { TechnicianShift } from "@/types";

export const metadata: Metadata = { title: "إدارة الشيفتات والمرتبات" };

function fmt(ms: number) {
  return new Intl.DateTimeFormat("ar-EG", { dateStyle: "short", timeStyle: "short", timeZone: APP_TIME_ZONE }).format(new Date(ms));
}

function minutesToDisplay(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}س ${m > 0 ? `${m}د` : ""}` : `${m}د`;
}

function ShiftRow({ shift, techName }: { shift: TechnicianShift; techName: string }) {
  const isActive = shift.status === "active";
  return (
    <tr className="border-b border-[var(--border)] text-sm transition-colors hover:bg-[var(--surface-subtle)]">
      <td className="p-3 font-medium text-[var(--foreground)]">{techName}</td>
      <td className="p-3 text-[var(--muted)]">{fmt(shift.startedAt.toDate().getTime())}</td>
      <td className="p-3 text-[var(--muted)]">{shift.endedAt ? fmt(shift.endedAt.toDate().getTime()) : "—"}</td>
      <td className="p-3 text-[var(--muted)]">{shift.totalMinutes != null ? minutesToDisplay(shift.totalMinutes) : isActive ? <span className="font-bold text-emerald-600">نشط</span> : "—"}</td>
      <td className="p-3">
        {shift.earlyExit && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">انصراف مبكر</span>}
        {!shift.earlyExit && !isActive && <span className="text-[var(--muted)]">—</span>}
        {isActive && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">نشط</span>}
      </td>
      <td className="p-3 text-[var(--muted)]">{shift.salaryAmount != null ? `${shift.salaryAmount}` : "—"}</td>
      <td className="p-3">
        <SalaryStatusButton shiftId={shift.shiftId} current={shift.salaryStatus} readOnly />
      </td>
    </tr>
  );
}

export default async function ManagerShiftsPage() {
  await requireRole(["manager"]);
  const [shifts, allUsers] = await Promise.all([
    listShiftsForAdmin({}, 300),
    listAppUsers(),
  ]);

  const techMap = new Map(allUsers.filter((u) => u.role === "technician").map((u) => [u.uid, u.displayName]));

  const totalPaid = shifts.filter((s) => s.salaryStatus === "paid" && s.salaryAmount != null).reduce((sum, s) => sum + (s.salaryAmount ?? 0), 0);
  const pendingPayrollCount = shifts.filter((s) => s.status === "completed" && s.salaryStatus === "pending").length;
  const totalHours = shifts.filter((s) => s.totalMinutes != null).reduce((sum, s) => sum + (s.totalMinutes ?? 0), 0) / 60;
  const earlyExitCount = shifts.filter((s) => s.earlyExit).length;

  return (
    <DashboardShell role="manager">
      <PageHeader
        title="الشيفتات والمرتبات"
        description="سجل تشغيلي لشيفتات الفنيين. تعديلات الرواتب تتم من صفحة الرواتب."
        backHref="/dashboard/manager"
        action={
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] transition-colors hover:bg-[var(--primary-hover)]"
            href="/dashboard/manager/payroll"
          >
            فتح الرواتب
          </Link>
        }
      />

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
        {[
          { label: "إجمالي الشيفتات", value: shifts.length.toString(), color: "text-[var(--foreground)]" },
          { label: "ساعات العمل", value: `${totalHours.toFixed(1)}س`, color: "text-blue-600" },
          { label: "تم الدفع", value: `${totalPaid.toFixed(2)}`, color: "text-emerald-600" },
          { label: "رواتب قيد المراجعة", value: pendingPayrollCount.toString(), color: "text-amber-600" },
          { label: "انصراف مبكر", value: earlyExitCount.toString(), color: "text-red-600" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
            <p className="text-xs text-[var(--muted)]">{stat.label}</p>
            <p className={`mt-1 text-2xl font-black ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]" dir="rtl">
            <thead className="border-b border-[var(--border)] bg-[var(--surface-subtle)]">
              <tr className="text-right text-xs font-bold text-[var(--muted)]">
                <th className="p-3">الفني</th>
                <th className="p-3">بداية الشيفت</th>
                <th className="p-3">نهاية الشيفت</th>
                <th className="p-3">المدة</th>
                <th className="p-3">الحالة</th>
                <th className="p-3">الراتب</th>
                <th className="p-3">المدفوعات</th>
              </tr>
            </thead>
            <tbody>
              {shifts.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-sm text-[var(--muted)]">لا توجد شيفتات مسجلة بعد.</td></tr>
              ) : (
                shifts.map((shift) => (
                  <ShiftRow key={shift.shiftId} shift={shift} techName={techMap.get(shift.technicianUid) ?? shift.technicianName} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
  );
}
