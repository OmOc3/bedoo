import type { ReactNode } from "react";
import type { Report } from "@/types";
import { ReportPhotoLinks } from "@/components/reports/report-photo-links";
import { StatusPills } from "@/components/reports/status-pills";

interface ReportMobileCardProps {
  action?: ReactNode;
  photoCount: number;
  report: Report;
  reviewBadge: ReactNode;
  timestamp: string;
}

export function ReportMobileCard({ action, photoCount, report, reviewBadge, timestamp }: ReportMobileCardProps) {
  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-[var(--muted)]">المحطة</p>
          <h2 className="mt-1 truncate text-base font-bold text-[var(--foreground)]">{report.stationLabel}</h2>
        </div>
        <div className="shrink-0">{reviewBadge}</div>
      </div>

      <dl className="mt-4 grid gap-3 text-sm">
        <div>
          <dt className="font-medium text-[var(--muted)]">وقت الإرسال</dt>
          <dd className="mt-1 text-[var(--foreground)]">{timestamp}</dd>
        </div>
        <div>
          <dt className="font-medium text-[var(--muted)]">الفني</dt>
          <dd className="mt-1 text-[var(--foreground)]">{report.technicianName}</dd>
        </div>
        <div>
          <dt className="font-medium text-[var(--muted)]">الحالة</dt>
          <dd className="mt-2">
            <StatusPills status={report.status} />
          </dd>
        </div>
      </dl>

      <div className="mt-4 rounded-lg bg-[var(--surface-subtle)] p-3 text-sm leading-6 text-[var(--muted)]">
        <p className="font-medium text-[var(--foreground)]">ملاحظات الفني</p>
        <p className="mt-1">{report.notes ?? "لا توجد ملاحظات."}</p>
        <ReportPhotoLinks photoCount={photoCount} reportId={report.reportId} />
      </div>

      {action ? <div className="mt-4">{action}</div> : null}
    </article>
  );
}
