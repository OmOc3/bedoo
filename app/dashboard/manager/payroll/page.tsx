import type { Metadata } from "next";
import { DashboardShell } from "@/components/layout/dashboard-page";
import { PageHeader } from "@/components/layout/page-header";
import { PayrollUpdateForm } from "@/components/shifts/payroll-update-form";
import { requireRole } from "@/lib/auth/server-session";
import { listAppUsers, listPayrollShifts, listStationCompletionsDuringShift } from "@/lib/db/repositories";
import { APP_TIME_ZONE } from "@/lib/datetime";
import { isShiftSalaryStatus } from "@/lib/shifts/schedule";
import type { ShiftSalaryStatus, ShiftStationCompletion, TechnicianShift } from "@/types";

interface PayrollPageProps {
  searchParams: Promise<{
    dateFrom?: string;
    dateTo?: string;
    salaryStatus?: string;
    technicianUid?: string;
  }>;
}

interface TechnicianPayrollGroup {
  shifts: TechnicianShift[];
  technicianName: string;
  technicianUid: string;
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

const numberFormatter = new Intl.NumberFormat("ar-EG");
const amountFormatter = new Intl.NumberFormat("ar-EG", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

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

function formatAmount(value: number): string {
  return amountFormatter.format(value);
}

function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

function countStationScans(completions: ShiftStationCompletion[]): number {
  return completions.reduce((sum, completion) => sum + completion.reportCount, 0);
}

function buildPayrollGroups(shifts: TechnicianShift[], techMap: Map<string, string>): TechnicianPayrollGroup[] {
  const groups = new Map<string, TechnicianPayrollGroup>();

  shifts.forEach((shift) => {
    const existing = groups.get(shift.technicianUid);

    if (existing) {
      existing.shifts.push(shift);
      return;
    }

    groups.set(shift.technicianUid, {
      shifts: [shift],
      technicianName: techMap.get(shift.technicianUid) ?? shift.technicianName,
      technicianUid: shift.technicianUid,
    });
  });

  return Array.from(groups.values());
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-2xl font-bold text-[var(--foreground)]">{value}</p>
    </div>
  );
}

function CompactMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[var(--surface-subtle)] p-3">
      <dt className="text-xs font-medium text-[var(--muted)]">{label}</dt>
      <dd className="mt-1 text-sm font-bold text-[var(--foreground)]">{value}</dd>
    </div>
  );
}

function DetailItem({ helper, label, value }: { helper?: string; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[var(--surface-subtle)] p-3">
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">{value}</p>
      {helper ? <p className="mt-1 text-xs text-[var(--muted)]">{helper}</p> : null}
    </div>
  );
}

function StationTimeline({ completions }: { completions: ShiftStationCompletion[] }) {
  const scanCount = countStationScans(completions);

  return (
    <div>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-bold text-[var(--foreground)]">المحطات الممسوحة داخل الشيفت</h3>
        <span className="text-xs font-semibold text-[var(--muted)]">
          {formatNumber(completions.length)} محطة، {formatNumber(scanCount)} مسح
        </span>
      </div>

      {completions.length === 0 ? (
        <p className="mt-3 rounded-lg border border-dashed border-[var(--border)] p-3 text-sm text-[var(--muted)]">
          لا توجد تقارير محطات مسجلة بين بداية الشيفت ونهايته.
        </p>
      ) : (
        <ol className="mt-3 divide-y divide-[var(--border-subtle)] rounded-lg border border-[var(--border)]">
          {completions.map((completion) => (
            <li className="grid gap-3 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(14rem,auto)]" key={completion.stationId}>
              <div className="min-w-0">
                <p className="font-semibold text-[var(--foreground)]">{completion.stationLabel}</p>
                <p className="mt-1 text-xs text-[var(--muted)]" dir="ltr">
                  {completion.stationId}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 sm:justify-end">
                {completion.scans.map((scan) => {
                  const submittedAt = scan.submittedAt.toDate();
                  return (
                    <time
                      className="rounded-full bg-[var(--surface-subtle)] px-2.5 py-1 text-xs font-semibold text-[var(--foreground)]"
                      dateTime={submittedAt.toISOString()}
                      key={scan.reportId}
                    >
                      {formatDateTime(submittedAt)}
                    </time>
                  );
                })}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function ShiftPayrollDetails({
  completions,
  defaultOpen,
  shift,
}: {
  completions: ShiftStationCompletion[];
  defaultOpen: boolean;
  shift: TechnicianShift;
}) {
  const scanCount = countStationScans(completions);

  return (
    <details className="group" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none flex-col gap-3 py-4 text-right sm:flex-row sm:items-start sm:justify-between [&::-webkit-details-marker]:hidden">
        <div className="flex min-w-0 gap-3">
          <span
            aria-hidden="true"
            className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--surface-subtle)] text-sm font-bold text-[var(--muted)] transition-transform group-open:-rotate-90"
          >
            ‹
          </span>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-[var(--foreground)]">شيفت {formatDateTime(shift.startedAt.toDate())}</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {shift.endedAt ? `انتهى ${formatDateTime(shift.endedAt.toDate())}` : "بدون وقت انتهاء"} · {formatDuration(shift.totalMinutes)}
            </p>
            {shift.earlyExit ? <p className="mt-2 text-sm font-semibold text-amber-700">انصراف مبكر</p> : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 sm:justify-end">
          <span className={`inline-flex w-fit rounded-lg px-3 py-1 text-sm font-semibold ${salaryClasses[shift.salaryStatus]}`}>
            {salaryLabels[shift.salaryStatus]}
          </span>
          <span className="inline-flex w-fit rounded-lg bg-[var(--surface-subtle)] px-3 py-1 text-sm font-semibold text-[var(--foreground)]">
            {formatNumber(scanCount)} مسح
          </span>
          <span className="inline-flex w-fit rounded-lg bg-[var(--surface-subtle)] px-3 py-1 text-sm font-semibold text-[var(--foreground)]">
            {shift.salaryAmount != null ? `راتب ${formatAmount(shift.salaryAmount)}` : "بدون قيمة راتب"}
          </span>
        </div>
      </summary>

      <div className="pb-5">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(22rem,0.8fr)]">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <DetailItem helper={shift.startStationLabel} label="بداية الشيفت" value={formatDateTime(shift.startedAt.toDate())} />
              <DetailItem
                helper={shift.endStationLabel}
                label="نهاية الشيفت"
                value={shift.endedAt ? formatDateTime(shift.endedAt.toDate()) : "غير مسجل"}
              />
              <DetailItem label="مدة الشيفت" value={formatDuration(shift.totalMinutes)} />
            </div>
            <StationTimeline completions={completions} />
          </div>

          <div className="border-t border-[var(--border)] pt-4 lg:border-s lg:border-t-0 lg:ps-5 lg:pt-0">
            <h3 className="mb-3 text-sm font-bold text-[var(--foreground)]">مراجعة الراتب</h3>
            <PayrollUpdateForm
              notes={shift.notes}
              salaryAmount={shift.salaryAmount}
              salaryStatus={shift.salaryStatus}
              shiftId={shift.shiftId}
            />
          </div>
        </div>
      </div>
    </details>
  );
}

function TechnicianPayrollCard({
  completionsByShift,
  group,
}: {
  completionsByShift: Map<string, ShiftStationCompletion[]>;
  group: TechnicianPayrollGroup;
}) {
  const totalMinutes = group.shifts.reduce((sum, shift) => sum + (shift.totalMinutes ?? 0), 0);
  const paidTotal = group.shifts
    .filter((shift) => shift.salaryStatus === "paid" && shift.salaryAmount != null)
    .reduce((sum, shift) => sum + (shift.salaryAmount ?? 0), 0);
  const scanCount = group.shifts.reduce((sum, shift) => sum + countStationScans(completionsByShift.get(shift.shiftId) ?? []), 0);
  const pendingCount = group.shifts.filter((shift) => shift.salaryStatus === "pending").length;

  return (
    <article className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <header className="border-b border-[var(--border)] pb-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--muted)]">الفني</p>
            <h2 className="mt-1 text-xl font-bold text-[var(--foreground)]">{group.technicianName}</h2>
          </div>

          <dl className="grid gap-3 sm:grid-cols-2 lg:min-w-[32rem] lg:grid-cols-4">
            <CompactMetric label="الشيفتات" value={formatNumber(group.shifts.length)} />
            <CompactMetric label="مدة العمل" value={formatDuration(totalMinutes)} />
            <CompactMetric label="مسحات المحطات" value={formatNumber(scanCount)} />
            <CompactMetric label="مدفوع" value={formatAmount(paidTotal)} />
          </dl>
        </div>

        {pendingCount > 0 ? (
          <p className="mt-3 text-sm font-semibold text-amber-700">
            {formatNumber(pendingCount)} شيفت لهذا الفني ما زال قيد مراجعة الراتب.
          </p>
        ) : null}
      </header>

      <div className="divide-y divide-[var(--border)]">
        {group.shifts.map((shift, index) => (
          <ShiftPayrollDetails
            completions={completionsByShift.get(shift.shiftId) ?? []}
            defaultOpen={index === 0}
            key={shift.shiftId}
            shift={shift}
          />
        ))}
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
  const payrollGroups = buildPayrollGroups(shifts, techMap);
  const completionsByShift = new Map<string, ShiftStationCompletion[]>();

  await Promise.all(
    shifts.map(async (shift) => {
      const completions = await listStationCompletionsDuringShift(shift);
      completionsByShift.set(shift.shiftId, completions);
    }),
  );

  const paidTotal = shifts
    .filter((shift) => shift.salaryStatus === "paid" && shift.salaryAmount != null)
    .reduce((sum, shift) => sum + (shift.salaryAmount ?? 0), 0);
  const pendingCount = shifts.filter((shift) => shift.salaryStatus === "pending").length;
  const unpaidCount = shifts.filter((shift) => shift.salaryStatus === "unpaid").length;

  return (
    <DashboardShell role="manager">
      <PageHeader
        backHref="/dashboard/manager"
        description="مراجعة رواتب الشيفتات المكتملة مجمعة حسب الفني، مع محطات كل شيفت وتوقيتات مسحها."
        title="الرواتب"
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="الشيفتات المكتملة" value={formatNumber(shifts.length)} />
        <StatCard label="قيد المراجعة" value={formatNumber(pendingCount)} />
        <StatCard label="غير مدفوع" value={formatNumber(unpaidCount)} />
        <StatCard label="إجمالي المدفوع" value={formatAmount(paidTotal)} />
      </div>

      <form action="/dashboard/manager/payroll" className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4" dir="rtl">
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

      <section className="space-y-5">
        {payrollGroups.length > 0 ? (
          payrollGroups.map((group) => (
            <TechnicianPayrollCard completionsByShift={completionsByShift} group={group} key={group.technicianUid} />
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
