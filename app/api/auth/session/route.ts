import { NextRequest, NextResponse } from "next/server";
import { getRoleRedirect } from "@/lib/auth/redirects";
import { createSignedRoleCookie } from "@/lib/auth/role-cookie";
import { clearAuthCookies, setAuthCookies } from "@/lib/auth/session";
import { getSessionMaxAgeMs } from "@/lib/auth/session-config";
import { getActiveAppUser } from "@/lib/auth/user-profile";
import { adminAuth } from "@/lib/firebase-admin";
import { i18n } from "@/lib/i18n";
import { sessionRequestSchema } from "@/lib/validation/auth";
import type { ApiErrorResponse, SessionSuccessResponse } from "@/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<NextResponse<ApiErrorResponse | SessionSuccessResponse>> {
  try {
    const sessionMaxAgeMs = getSessionMaxAgeMs();
    const body = (await request.json()) as unknown;
    const parsed = sessionRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: i18n.auth.sessionExpired,
          code: "AUTH_INVALID_SESSION_REQUEST",
        },
        { status: 400 },
      );
    }

    const decodedToken = await adminAuth().verifyIdToken(parsed.data.idToken, true);
    const appUser = await getActiveAppUser(decodedToken.uid);

    if (!appUser) {
      return NextResponse.json(
        {
          message: i18n.auth.genericLoginError,
          code: "AUTH_INACTIVE_OR_MISSING_PROFILE",
        },
        { status: 401 },
      );
    }

    const [sessionCookie, roleCookie] = await Promise.all([
      adminAuth().createSessionCookie(parsed.data.idToken, { expiresIn: sessionMaxAgeMs }),
      createSignedRoleCookie({
        uid: appUser.uid,
        role: appUser.role,
        expiresAt: Date.now() + sessionMaxAgeMs,
      }),
    ]);
    const response = NextResponse.json<SessionSuccessResponse>({
      redirectTo: getRoleRedirect(appUser.role),
    });

    setAuthCookies(response, sessionCookie, roleCookie);

    return response;
  } catch (_error: unknown) {
    return NextResponse.json(
      {
        message: i18n.auth.sessionExpired,
        code: "AUTH_SESSION_FAILED",
      },
      { status: 401 },
    );
  }
}

export async function DELETE(): Promise<NextResponse<{ ok: true }>> {
  try {
    const response = NextResponse.json({ ok: true as const });

    clearAuthCookies(response);

    return response;
  } catch (_error: unknown) {
    const response = NextResponse.json({ ok: true as const });

    clearAuthCookies(response);

    return response;
  }
}
