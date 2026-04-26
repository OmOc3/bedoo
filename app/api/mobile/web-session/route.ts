import { randomBytes, createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { mobileApiErrorResponse } from "@/lib/api/mobile";
import { requireBearerRole } from "@/lib/auth/bearer-session";
import { getRoleRedirect } from "@/lib/auth/redirects";
import { createMobileWebSessionRecord } from "@/lib/db/repositories";
import { AppError } from "@/lib/errors";
import type { ApiErrorResponse, MobileWebSessionResponse } from "@/types";

export const runtime = "nodejs";

const MOBILE_WEB_SESSION_TTL_MS = 2 * 60 * 1000;

function hashHandoffToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<MobileWebSessionResponse | ApiErrorResponse>> {
  try {
    const cookieHeader = request.headers.get("cookie");

    if (!cookieHeader) {
      throw new AppError("سجل الدخول قبل فتح بوابة الإدارة.", "AUTH_REQUIRED", 401);
    }

    const session = await requireBearerRole(request, ["manager", "supervisor"]);
    const expiresAtMs = Date.now() + MOBILE_WEB_SESSION_TTL_MS;
    const redirectTo = getRoleRedirect(session.role);
    const handoffToken = randomBytes(32).toString("base64url");
    const handoffTokenHash = hashHandoffToken(handoffToken);

    await createMobileWebSessionRecord({
      tokenHash: handoffTokenHash,
      uid: session.uid,
      role: session.role,
      redirectTo,
      cookieHeader,
      expiresAt: new Date(expiresAtMs),
    });

    const consumeUrl = new URL("/api/mobile/web-session/consume", request.nextUrl.origin);

    consumeUrl.searchParams.set("token", handoffToken);

    return NextResponse.json({
      expiresAt: new Date(expiresAtMs).toISOString(),
      redirectTo,
      url: consumeUrl.toString(),
    });
  } catch (error: unknown) {
    return mobileApiErrorResponse(error, "تعذر فتح بوابة الإدارة. سجل الدخول وحاول مرة أخرى.", "MOBILE_WEB_SESSION_FAILED");
  }
}
