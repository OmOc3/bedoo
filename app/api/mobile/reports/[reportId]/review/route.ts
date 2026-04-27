import { NextRequest, NextResponse } from "next/server";
import { mobileApiErrorResponse } from "@/lib/api/mobile";
import { requireBearerRole } from "@/lib/auth/bearer-session";
import { writeAuditLog } from "@/lib/audit";
import { updateReportReviewRecord } from "@/lib/db/repositories";
import { reviewReportSchema } from "@/lib/validation/reports";
import type { Report } from "@/types";

export const runtime = "nodejs";

interface MobileReviewBody {
  reviewNotes?: string;
  reviewStatus: Report["reviewStatus"];
}

interface MobileReviewContext {
  params: Promise<{ reportId: string }>;
}

export async function PATCH(
  request: NextRequest,
  { params }: MobileReviewContext,
): Promise<NextResponse<{ success: boolean } | { code: string; message: string }>> {
  try {
    const session = await requireBearerRole(request, ["manager", "supervisor"]);
    const body = (await request.json()) as MobileReviewBody;
    const parsed = reviewReportSchema.safeParse({
      reviewStatus: body.reviewStatus,
      reviewNotes: body.reviewNotes,
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          code: "MOBILE_REVIEW_INVALID",
          message: "تحقق من بيانات المراجعة وحاول مرة أخرى.",
        },
        { status: 400 },
      );
    }

    const { reportId } = await params;
    const report = await updateReportReviewRecord(reportId, {
      reviewStatus: parsed.data.reviewStatus,
      reviewNotes: parsed.data.reviewNotes,
      reviewedBy: session.uid,
    });

    if (!report) {
      return NextResponse.json(
        {
          code: "REPORT_NOT_FOUND",
          message: "التقرير غير موجود.",
        },
        { status: 404 },
      );
    }

    await writeAuditLog({
      actorUid: session.uid,
      actorRole: session.role,
      action: "report.review",
      entityType: "report",
      entityId: reportId,
      metadata: {
        stationId: report.stationId,
        reviewStatus: parsed.data.reviewStatus,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return mobileApiErrorResponse(error);
  }
}
