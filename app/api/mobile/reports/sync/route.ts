import { NextRequest, NextResponse } from "next/server";
import { mobileApiErrorResponse } from "@/lib/api/mobile";
import { requireBearerRole } from "@/lib/auth/bearer-session";
import { submitReportWithAdmin } from "@/lib/reports/submit-report";
import { mobileReportSyncSchema } from "@/lib/validation/mobile";

export const runtime = "nodejs";

interface MobileReportSyncResponse {
  duplicate: boolean;
  reportId: string;
  stationLabel: string;
  submittedAt: string;
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<MobileReportSyncResponse | { code: string; message: string }>> {
  try {
    const session = await requireBearerRole(request, ["technician", "manager"]);
    const body = (await request.json()) as unknown;
    const parsed = mobileReportSyncSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "تحقق من بيانات التقرير وحاول مرة أخرى.",
          code: "MOBILE_REPORT_INVALID",
        },
        { status: 400 },
      );
    }

    const result = await submitReportWithAdmin({
      actorUid: session.uid,
      actorRole: session.role,
      clientReportId: parsed.data.clientReportId,
      stationId: parsed.data.stationId,
      technicianName: session.user.displayName,
      status: parsed.data.status,
      notes: parsed.data.notes,
    });

    return NextResponse.json({
      duplicate: result.duplicate,
      reportId: result.reportId,
      stationLabel: result.stationLabel,
      submittedAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    return mobileApiErrorResponse(error);
  }
}
