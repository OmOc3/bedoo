import { NextRequest, NextResponse } from "next/server";
import { mobileApiErrorResponse } from "@/lib/api/mobile";
import { mobileShiftResponse, type MobileTechnicianShiftResponse } from "@/lib/api/mobile-serializers";
import { requireBearerRole } from "@/lib/auth/bearer-session";
import { updateShiftPayroll } from "@/lib/db/repositories";
import { updateShiftPayrollSchema } from "@/lib/validation/shifts";
import type { ApiErrorResponse } from "@/types";

export const runtime = "nodejs";

interface MobileShiftRouteContext {
  params: Promise<{
    shiftId: string;
  }>;
}

export async function PATCH(
  request: NextRequest,
  { params }: MobileShiftRouteContext,
): Promise<NextResponse<MobileTechnicianShiftResponse | ApiErrorResponse>> {
  try {
    const session = await requireBearerRole(request, ["manager"]);
    const { shiftId } = await params;
    const body = (await request.json()) as unknown;
    const parsed = updateShiftPayrollSchema.safeParse({
      ...(typeof body === "object" && body !== null ? body : {}),
      shiftId,
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          code: "MOBILE_PAYROLL_INVALID",
          message: parsed.error.issues[0]?.message ?? "طھط­ظ‚ظ‚ ظ…ظ† ط¨ظٹط§ظ†ط§طھ ط§ظ„ط±ط§طھط¨.",
        },
        { status: 400 },
      );
    }

    const shift = await updateShiftPayroll({
      actorRole: session.role,
      actorUid: session.uid,
      notes: parsed.data.notes,
      salaryAmount: parsed.data.salaryAmount,
      salaryStatus: parsed.data.salaryStatus,
      shiftId: parsed.data.shiftId,
    });

    return NextResponse.json(mobileShiftResponse(shift));
  } catch (error: unknown) {
    return mobileApiErrorResponse(error);
  }
}
