import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/server-session";
import { getStationLocations, listReports } from "@/lib/db/repositories";
import {
  csvRow,
  defaultExportDateFrom,
  REPORT_EXPORT_MAX_ROWS,
  statusLabelsForCsv,
} from "@/lib/reports/export";

export const runtime = "nodejs";

function parseDate(value: string | null, endOfDay = false): Date | null {
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

export async function GET(request: NextRequest): Promise<Response> {
  await requireRole(["manager", "supervisor"]);

  const params = request.nextUrl.searchParams;
  const dateFrom = parseDate(params.get("from") ?? params.get("dateFrom")) ?? defaultExportDateFrom();
  const dateTo = parseDate(params.get("to") ?? params.get("dateTo"), true);
  const reviewStatus = params.get("reviewStatus");
  const reports = await listReports({
    filters: {
      stationId: params.get("stationId") ?? undefined,
      technicianUid: params.get("technicianUid") ?? undefined,
      reviewStatus:
        reviewStatus === "pending" || reviewStatus === "reviewed" || reviewStatus === "rejected"
          ? reviewStatus
          : "",
      dateFrom,
      dateTo,
    },
    limit: REPORT_EXPORT_MAX_ROWS + 1,
  });

  if (reports.length > REPORT_EXPORT_MAX_ROWS) {
    return NextResponse.json(
      {
        message: `نتيجة التصدير أكبر من الحد الآمن (${REPORT_EXPORT_MAX_ROWS} صف). ضيّق نطاق التاريخ أو الفلاتر ثم حاول مرة أخرى.`,
        code: "EXPORT_TOO_LARGE",
      },
      { status: 400 },
    );
  }

  const stationLocations = await getStationLocations(reports.map((report) => report.stationId));
  const header = ["رقم التقرير", "المحطة", "الموقع", "الفني", "الحالة", "ملاحظات", "التاريخ", "وقت الإرسال"];
  const rows = reports.map((report) => {
    const submittedAt = report.submittedAt?.toDate();

    return [
      report.reportId,
      report.stationLabel,
      stationLocations.get(report.stationId) ?? "",
      report.technicianName,
      statusLabelsForCsv(report.status),
      report.notes ?? "",
      submittedAt ? new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium" }).format(submittedAt) : "",
      submittedAt ? new Intl.DateTimeFormat("ar-EG", { timeStyle: "short" }).format(submittedAt) : "",
    ];
  });
  const csv = [header, ...rows].map(csvRow).join("\n");
  const filenameDate = new Intl.DateTimeFormat("en-CA").format(new Date());

  return new Response(`\uFEFF${csv}`, {
    headers: {
      "Content-Disposition": `attachment; filename="reports-${filenameDate}.csv"`,
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}
