import { NextRequest, NextResponse } from "next/server";
import { mobileApiErrorResponse } from "@/lib/api/mobile";
import { mobileReportResponse, type MobileReportResponse } from "@/lib/api/mobile-serializers";
import { requireBearerRole } from "@/lib/auth/bearer-session";
import { listReports } from "@/lib/db/repositories";

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

export async function GET(
  request: NextRequest,
): Promise<NextResponse<MobileReportResponse[] | { code: string; message: string }>> {
  try {
    await requireBearerRole(request, ["manager", "supervisor"]);
    const { searchParams } = new URL(request.url);
    const reviewStatus = searchParams.get("reviewStatus");
    const parsedReviewStatus =
      reviewStatus === "pending" || reviewStatus === "reviewed" || reviewStatus === "rejected" ? reviewStatus : undefined;

    const reports = await listReports({
      filters: {
        dateFrom: parseDate(searchParams.get("dateFrom")),
        dateTo: parseDate(searchParams.get("dateTo"), true),
        reviewStatus: parsedReviewStatus,
        stationId: searchParams.get("stationId") ?? undefined,
        technicianUid: searchParams.get("technicianUid") ?? undefined,
      },
      cursor: null,
      limit: 100,
    });

    return NextResponse.json(reports.map(mobileReportResponse));
  } catch (error: unknown) {
    return mobileApiErrorResponse(error);
  }
}
