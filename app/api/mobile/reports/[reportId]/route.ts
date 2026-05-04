import { NextRequest, NextResponse } from "next/server";
import { mobileApiErrorResponse } from "@/lib/api/mobile";
import { mobileReportResponse, type MobileReportResponse } from "@/lib/api/mobile-serializers";
import { requireBearerRole } from "@/lib/auth/bearer-session";
import { getReportById, hasClientStationAccess, updateReportSubmissionByReviewer } from "@/lib/db/repositories";
import { AppError } from "@/lib/errors";
import { editSubmittedReportSchema } from "@/lib/validation/reports";
import type { ApiErrorResponse } from "@/types";

export const runtime = "nodejs";

interface MobileReportRouteContext {
  params: Promise<{
    reportId: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: MobileReportRouteContext,
): Promise<NextResponse<MobileReportResponse | ApiErrorResponse>> {
  try {
    const session = await requireBearerRole(request, ["client", "technician", "supervisor", "manager"]);
    const { reportId } = await params;
    const report = await getReportById(reportId);

    if (!report) {
      throw new AppError("التقرير غير موجود.", "REPORT_NOT_FOUND", 404);
    }

    const allowed =
      session.role === "manager" ||
      session.role === "supervisor" ||
      report.technicianUid === session.uid ||
      (session.role === "client" && (await hasClientStationAccess(session.uid, report.stationId)));

    if (!allowed) {
      throw new AppError("غير مصرح.", "REPORT_FORBIDDEN", 403);
    }

    return NextResponse.json(mobileReportResponse(report));
  } catch (error: unknown) {
    return mobileApiErrorResponse(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: MobileReportRouteContext,
): Promise<NextResponse<MobileReportResponse | ApiErrorResponse>> {
  try {
    const session = await requireBearerRole(request, ["manager", "supervisor"]);
    const { reportId } = await params;
    const body = (await request.json()) as unknown;
    const parsed = editSubmittedReportSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          code: "MOBILE_REPORT_EDIT_INVALID",
          message: parsed.error.issues[0]?.message ?? "تحقق من بيانات تعديل التقرير.",
        },
        { status: 400 },
      );
    }

    const existing = await getReportById(reportId);

    if (!existing) {
      throw new AppError("التقرير غير موجود.", "REPORT_NOT_FOUND", 404);
    }

    if (session.role === "supervisor" && existing.reviewStatus !== "pending") {
      throw new AppError("لا يمكن تعديل التقرير بعد اعتماد المراجعة.", "REPORT_EDIT_FORBIDDEN", 403);
    }

    const updated = await updateReportSubmissionByReviewer(reportId, {
      actorRole: session.role,
      actorUid: session.uid,
      notes: parsed.data.notes,
      pestTypes: parsed.data.pestTypes,
      status: parsed.data.status,
    });

    if (!updated) {
      throw new AppError("تعذر حفظ التعديلات.", "REPORT_EDIT_FAILED", 500);
    }

    return NextResponse.json(mobileReportResponse(updated));
  } catch (error: unknown) {
    return mobileApiErrorResponse(error);
  }
}
