import type { Metadata } from "next";
import { DashboardShell } from "@/components/layout/dashboard-page";
import { PageHeader } from "@/components/layout/page-header";
import { requireRole } from "@/lib/auth/server-session";
import { listShiftsForAdmin, listAppUsers } from "@/lib/db/repositories";
import { SalaryStatusButton } from "@/components/shifts/salary-status-button";
import { APP_TIME_ZONE } from "@/lib/datetime";


export const metadata: Metadata = { title: "سجل شيفتات الفنيين" };

function fmt(ms: number) {
  return new Intl.DateTimeFormat("ar-EG", { dateStyle: "short", timeStyle: "short", timeZone: APP_TIME_ZONE }).format(new Date(ms));
}

function minutesToDisplay(m: number) {
  const h = Math.floor(m / 60); const min = m % 60;
  return h > 0 ? `${h}س ${min > 0 ? `${min}د` : ""}` : `${min}د`;
}

export default async function SupervisorShiftsPage() {
  await requireRole(["supervisor", "manager"]);
  const [shifts, allUsers] = await Promise.all([listShiftsForAdmin({}, 200), listAppUsers()]);
  const techMap = new Map(allUsers.filter((u) => u.role === "technician").map((u) => [u.uid, u.displayName]));

  return (
    <DashboardShell role="supervisor">
      <PageHeader title="شيفتات الفنيين" description="عرض سجل حضور وانصراف الفنيين." backHref="/dashboard/supervisor" />
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]" dir="rtl">
            <thead className="border-b border-[var(--border)] bg-[var(--surface-subtle)]">
              <tr className="text-right text-xs font-bold text-[var(--muted)]">
                <th className="p-3">الفني</th>
                <th className="p-3">البداية</th>
                <th className="p-3">النهاية</th>
                <th className="p-3">المدة</th>
                <th className="p-3">الراتب</th>
                <th className="p-3">حالة الدفع</th>
              </tr>
            </thead>
            <tbody>
              {shifts.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-sm text-[var(--muted)]">لا توجد شيفتات.</td></tr>
              ) : shifts.map((s) => (
                <tr key={s.shiftId} className="border-b border-[var(--border)] text-sm hover:bg-[var(--surface-subtle)]">
                  <td className="p-3 font-medium text-[var(--foreground)]">{techMap.get(s.technicianUid) ?? s.technicianName}</td>
                  <td className="p-3 text-[var(--muted)]">{fmt(s.startedAt.toDate().getTime())}</td>
                  <td className="p-3 text-[var(--muted)]">{s.endedAt ? fmt(s.endedAt.toDate().getTime()) : <span className="font-bold text-emerald-600">نشط</span>}</td>
                  <td className="p-3 text-[var(--muted)]">{s.totalMinutes ? minutesToDisplay(s.totalMinutes) : "—"}</td>
                  <td className="p-3 text-[var(--muted)]">{s.salaryAmount != null ? s.salaryAmount : "—"}</td>
                  <td className="p-3"><SalaryStatusButton shiftId={s.shiftId} current={s.salaryStatus} readOnly /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
  );
}
