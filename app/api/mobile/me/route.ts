import { NextRequest, NextResponse } from "next/server";
import { mobileApiErrorResponse } from "@/lib/api/mobile";
import { requireBearerRole } from "@/lib/auth/bearer-session";
import { toAuthenticatedUserResponse } from "@/lib/auth/public-user";
import type { ApiErrorResponse, AuthenticatedUserResponse } from "@/types";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
): Promise<NextResponse<AuthenticatedUserResponse | ApiErrorResponse>> {
  try {
    const session = await requireBearerRole(request, ["technician", "supervisor", "manager"]);

    return NextResponse.json(toAuthenticatedUserResponse(session.user));
  } catch (error: unknown) {
    return mobileApiErrorResponse(error);
  }
}
