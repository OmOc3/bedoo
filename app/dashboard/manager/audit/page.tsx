import type { Metadata } from "next";
import { DashboardShell } from "@/components/layout/dashboard-page";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { requireRole } from "@/lib/auth/server-session";
import { listAuditLogs } from "@/lib/db/repositories";
import { APP_TIME_ZONE } from "@/lib/datetime";
import type { AppTimestamp } from "@/types";

interface AuditPageProps {
  searchParams: Promise<{
    action?: string;
    actorUid?: string;
    dateFrom?: string;
    dateTo?: string;
    entityType?: string;
  }>;
}

export const metadata: Metadata = {
  title: "سجل العمليات",
};

const pageSize = 75;

function parseDate(value: string | undefined, endOfDay = false): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  }

  return date;
}

function formatTimestamp(timestamp?: AppTimestamp): string {
  if (!timestamp) {
    return "غير متاح";
  }

  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: APP_TIME_ZONE,
  }).format(timestamp.toDate());
}

function metadataSummary(metadata: Record<string, unknown> | undefined): string {
  if (!metadata) {
    return "لا توجد بيانات إضافية";
  }

  return Object.entries(metadata)
    .slice(0, 4)
    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : String(value)}`)
    .join("، ");
}

export default async function ManagerAuditPage({ searchParams }: AuditPageProps) {
  const params = await searchParams;
  await requireRole(["manager"]);

  const dateFrom = parseDate(params.dateFrom);
  const dateTo = parseDate(params.dateTo, true);
  const logs = await listAuditLogs({
    action: params.action,
    actorUid: params.actorUid,
    entityType: params.entityType,
    dateFrom,
    dateTo,
    limit: pageSize,
  });

  return (
    <DashboardShell role="manager">
        <PageHeader
          backHref="/dashboard/manager"
          description="قراءة أثر العمليات الحساسة حسب المستخدم، الإجراء، ونوع الكيان."
          title="سجل العمليات"
        />

        <form className="grid gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-control sm:grid-cols-2 sm:p-6 xl:grid-cols-5" dir="rtl">
          <div className="space-y-1.5 sm:col-span-2 xl:col-span-1">
            <label className="block text-sm font-medium text-[var(--foreground)]" htmlFor="audit-action">
              الإجراء
            </label>
            <input
              className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]"
              defaultValue={params.action ?? ""}
              id="audit-action"
              name="action"
              placeholder="الإجراء"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[var(--foreground)]" htmlFor="audit-entity-type">
              نوع الكيان
            </label>
            <input
              className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]"
              defaultValue={params.entityType ?? ""}
              id="audit-entity-type"
              name="entityType"
              placeholder="نوع الكيان"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[var(--foreground)]" htmlFor="audit-actor-uid">
              UID المستخدم
            </label>
            <input
              className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]"
              defaultValue={params.actorUid ?? ""}
              id="audit-actor-uid"
              name="actorUid"
              placeholder="UID المستخدم"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[var(--foreground)]" htmlFor="audit-date-from">
              من تاريخ
            </label>
            <input
              className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]"
              defaultValue={params.dateFrom ?? ""}
              id="audit-date-from"
              name="dateFrom"
              type="date"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[var(--foreground)]" htmlFor="audit-date-to">
              إلى تاريخ
            </label>
            <div className="flex gap-3">
              <input
                className="min-h-11 min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]"
                defaultValue={params.dateTo ?? ""}
                id="audit-date-to"
                name="dateTo"
                type="date"
              />
              <button className="min-h-11 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-bold text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)]" type="submit">
                فلترة
              </button>
            </div>
          </div>
        </form>

        {logs.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-control">
            <EmptyState description="لا توجد عمليات مطابقة للفلاتر الحالية." title="لا توجد سجلات" />
          </div>
        ) : (
          <div className="-mx-4 overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-control sm:mx-0">
            <table className="w-full min-w-[980px]">
              <thead className="border-b border-[var(--border)] bg-[var(--surface-subtle)]">
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-[var(--muted)]">الوقت</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-[var(--muted)]">الإجراء</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-[var(--muted)]">الفاعل</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-[var(--muted)]">الكيان</th>
                  <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-[var(--muted)]">بيانات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {logs.map((log) => (
                  <tr className="hover:bg-[var(--surface-subtle)]" key={log.logId}>
                    <td className="px-4 py-3 text-sm text-[var(--foreground)]">{formatTimestamp(log.createdAt)}</td>
                    <td className="px-4 py-3 text-sm font-bold text-[var(--foreground)]">{log.action}</td>
                    <td className="px-4 py-3 text-sm text-[var(--foreground)]" dir="ltr">
                      {log.actorUid}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--foreground)]">
                      {log.entityType}: <span dir="ltr">{log.entityId}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--muted)]">{metadataSummary(log.metadata)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </DashboardShell>
  );
}
