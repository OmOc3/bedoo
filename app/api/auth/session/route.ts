import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/better-auth";
import { clearAuthCookies } from "@/lib/auth/session";
import { i18n } from "@/lib/i18n";
import type { ApiErrorResponse } from "@/types";

export const runtime = "nodejs";

function getSetCookieHeaders(headers: Headers): string[] {
  const withGetSetCookie = headers as Headers & { getSetCookie?: () => string[] };

  if (typeof withGetSetCookie.getSetCookie === "function") {
    return withGetSetCookie.getSetCookie();
  }

  const value = headers.get("set-cookie");

  return value ? [value] : [];
}

function appendAuthCookies(response: NextResponse, headers: Headers): void {
  getSetCookieHeaders(headers).forEach((cookie) => {
    response.headers.append("Set-Cookie", cookie);
  });
}

export async function POST(): Promise<NextResponse<ApiErrorResponse>> {
  return NextResponse.json(
    {
      message: i18n.auth.sessionExpired,
      code: "AUTH_LEGACY_SESSION_DISABLED",
    },
    { status: 410 },
  );
}

export async function DELETE(request: NextRequest): Promise<NextResponse<{ ok: true }>> {
  const response = NextResponse.json({ ok: true as const });

  try {
    const signOut = await auth.api.signOut({
      headers: request.headers,
      returnHeaders: true,
    });

    appendAuthCookies(response, signOut.headers);
  } catch (_error: unknown) {
    // Clearing the app role cookie is still safe if the auth session already expired.
  }

  clearAuthCookies(response);

  return response;
}
