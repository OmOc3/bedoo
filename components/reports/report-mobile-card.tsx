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
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-control">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">المحطة</p>
          <h2 className="mt-1 truncate text-base font-bold text-slate-950">{report.stationLabel}</h2>
        </div>
        <div className="shrink-0">{reviewBadge}</div>
      </div>

      <dl className="mt-4 grid gap-3 text-sm">
        <div>
          <dt className="font-medium text-slate-500">وقت الإرسال</dt>
          <dd className="mt-1 text-slate-800">{timestamp}</dd>
        </div>
        <div>
          <dt className="font-medium text-slate-500">الفني</dt>
          <dd className="mt-1 text-slate-800">{report.technicianName}</dd>
        </div>
        <div>
          <dt className="font-medium text-slate-500">الحالة</dt>
          <dd className="mt-2">
            <StatusPills status={report.status} />
          </dd>
        </div>
      </dl>

      <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-600">
        <p className="font-medium text-slate-900">ملاحظات الفني</p>
        <p className="mt-1">{report.notes ?? "لا توجد ملاحظات."}</p>
        <ReportPhotoLinks photoCount={photoCount} reportId={report.reportId} />
      </div>

      {action ? <div className="mt-4">{action}</div> : null}
    </article>
  );
}
