import { NextRequest, NextResponse } from "next/server";
import { mobileApiErrorResponse } from "@/lib/api/mobile";
import { requireBearerRole } from "@/lib/auth/bearer-session";
import { listReportsForTechnician } from "@/lib/db/repositories";
import type { AppTimestamp, Report, StatusOption } from "@/types";

export const runtime = "nodejs";

interface MobileReportResponse {
  clientReportId?: string;
  notes?: string;
  reportId: string;
  reviewNotes?: string;
  reviewStatus: Report["reviewStatus"];
  stationId: string;
  stationLabel: string;
  status: StatusOption[];
  submittedAt?: string;
}

function timestampToIso(value: unknown): string | undefined {
  const timestamp = value as Partial<AppTimestamp>;

  if (typeof timestamp?.toDate !== "function") {
    return undefined;
  }

  return timestamp.toDate().toISOString();
}

function reportResponse(report: Report): MobileReportResponse {
  return {
    reportId: report.reportId,
    stationId: report.stationId,
    stationLabel: report.stationLabel,
    status: report.status,
    reviewStatus: report.reviewStatus,
    ...(report.clientReportId ? { clientReportId: report.clientReportId } : {}),
    ...(report.notes ? { notes: report.notes } : {}),
    ...(report.reviewNotes ? { reviewNotes: report.reviewNotes } : {}),
    ...(timestampToIso(report.submittedAt) ? { submittedAt: timestampToIso(report.submittedAt) } : {}),
  };
}

export async function GET(
  request: NextRequest,
): Promise<NextResponse<MobileReportResponse[] | { code: string; message: string }>> {
  try {
    const session = await requireBearerRole(request, ["technician", "manager"]);
    const reports = await listReportsForTechnician(session.uid, 50);

    return NextResponse.json(reports.map(reportResponse));
  } catch (error: unknown) {
    return mobileApiErrorResponse(error);
  }
}
