import { NextRequest, NextResponse } from "next/server";
import { mobileApiErrorResponse } from "@/lib/api/mobile";
import { requireBearerRole } from "@/lib/auth/bearer-session";
import { listReports } from "@/lib/db/repositories";
import type { AppTimestamp, Report, StatusOption } from "@/types";

export const runtime = "nodejs";

interface MobileReviewReport {
  notes?: string;
  reportId: string;
  reviewNotes?: string;
  reviewStatus: Report["reviewStatus"];
  stationId: string;
  stationLabel: string;
  status: StatusOption[];
  submittedAt?: string;
  technicianName: string;
  technicianUid: string;
}

function timestampToIso(value: unknown): string | undefined {
  const timestamp = value as Partial<AppTimestamp>;
  if (typeof timestamp?.toDate !== "function") {
    return undefined;
  }
  return timestamp.toDate().toISOString();
}

function mapReport(report: Report): MobileReviewReport {
  return {
    reportId: report.reportId,
    stationId: report.stationId,
    stationLabel: report.stationLabel,
    technicianUid: report.technicianUid,
    technicianName: report.technicianName,
    status: report.status,
    reviewStatus: report.reviewStatus,
    ...(report.notes ? { notes: report.notes } : {}),
    ...(report.reviewNotes ? { reviewNotes: report.reviewNotes } : {}),
    ...(timestampToIso(report.submittedAt) ? { submittedAt: timestampToIso(report.submittedAt) } : {}),
  };
}

export async function GET(
  request: NextRequest,
): Promise<NextResponse<MobileReviewReport[] | { code: string; message: string }>> {
  try {
    await requireBearerRole(request, ["manager", "supervisor"]);
    const { searchParams } = new URL(request.url);
    const reviewStatus = searchParams.get("reviewStatus");
    const parsedReviewStatus =
      reviewStatus === "pending" || reviewStatus === "reviewed" || reviewStatus === "rejected" ? reviewStatus : undefined;

    const reports = await listReports({
      filters: {
        reviewStatus: parsedReviewStatus,
      },
      cursor: null,
      limit: 100,
    });

    return NextResponse.json(reports.map(mapReport));
  } catch (error: unknown) {
    return mobileApiErrorResponse(error);
  }
}
