import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/better-auth";
import { toAuthenticatedUserResponse } from "@/lib/auth/public-user";
import { checkLoginRateLimit, recordFailedLogin, resetLoginRateLimit } from "@/lib/auth/rate-limit";
import { getRoleRedirect } from "@/lib/auth/redirects";
import { createSignedRoleCookie } from "@/lib/auth/role-cookie";
import { clearAuthCookies, setRoleCookie } from "@/lib/auth/session";
import { getSessionMaxAgeMs } from "@/lib/auth/session-config";
import { requiredTimestamp } from "@/lib/db/mappers";
import { i18n } from "@/lib/i18n";
import { isRecord } from "@/lib/utils";
import { loginFormSchema } from "@/lib/validation/auth";
import type { ApiErrorResponse, AppUser, LoginSuccessResponse, UserRole } from "@/types";

export const runtime = "nodejs";

const validRoles = new Set<UserRole>(["client", "technician", "supervisor", "manager"]);

interface AuthClassification {
  blocked: boolean;
  profile: AppUser | null;
}

// Vercel appends the real client IP as the last x-forwarded-for entry, while attackers may prepend spoofed values.
function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    const ips = forwardedFor.split(",").map((ip) => ip.trim()).filter(Boolean);
    // Use the last IP - on Vercel this is the real client IP appended by the edge
    return ips[ips.length - 1] ?? "unknown";
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}

function unauthorizedResponse(): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      message: i18n.auth.genericLoginError,
      code: "AUTH_INVALID_CREDENTIALS",
    },
    { status: 401 },
  );
}

function disabledAccountResponse(): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      message: i18n.auth.inactiveAccount,
      code: "AUTH_ACCOUNT_DISABLED",
    },
    { status: 403 },
  );
}

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

async function roleMismatchResponse(request: NextRequest): Promise<NextResponse<ApiErrorResponse>> {
  const response = NextResponse.json(
    {
      message: "هذا الحساب غير مسموح له بالدخول من هذه الصفحة. تم إنهاء الجلسة الحالية، سجل الدخول بالحساب الصحيح.",
      code: "AUTH_ROLE_MISMATCH",
    },
    { status: 403 },
  );

  try {
    const signOut = await auth.api.signOut({
      headers: request.headers,
      returnHeaders: true,
    });

    appendAuthCookies(response, signOut.headers);
  } catch (_error: unknown) {
    // The app role cookie still needs to be cleared even if the auth session is already gone.
  }

  clearAuthCookies(response);

  return response;
}

function authUserToAppUser(value: unknown): AuthClassification {
  if (!isRecord(value)) {
    return { blocked: false, profile: null };
  }

  const role = value.role;
  const banned = value.banned;
  const id = value.id;
  const email = value.email;
  const name = value.name;

  if (banned === true) {
    return { blocked: true, profile: null };
  }

  if (typeof id !== "string" || typeof email !== "string" || typeof name !== "string" || typeof role !== "string" || !validRoles.has(role as UserRole)) {
    return { blocked: false, profile: null };
  }

  return {
    blocked: false,
    profile: {
      uid: id,
      email,
      displayName: name,
      role: role as UserRole,
      createdAt: requiredTimestamp(value.createdAt instanceof Date ? value.createdAt : null),
      isActive: true,
    },
  };
}

function errorStatus(error: unknown): number | null {
  return isRecord(error) && typeof error.status === "number" ? error.status : null;
}

function isDisabledAuthError(error: unknown): boolean {
  if (!isRecord(error)) {
    return false;
  }

  const errorCode = typeof error.code === "string" ? error.code : "";
  const errorMessage = typeof error.message === "string" ? error.message.toLowerCase() : "";

  return errorCode === "USER_DISABLED" || errorCode === "ACCOUNT_DISABLED" || errorMessage.includes("banned");
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiErrorResponse | LoginSuccessResponse>> {
  try {
    const body = (await request.json()) as unknown;
    const expectedRole =
      isRecord(body) && typeof body.expectedRole === "string" && validRoles.has(body.expectedRole as UserRole)
        ? body.expectedRole
        : undefined;
    const parsed = loginFormSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: i18n.auth.genericLoginError,
          code: "AUTH_INVALID_REQUEST",
        },
        { status: 400 },
      );
    }

    const email = parsed.data.email.trim().toLowerCase();
    const ipAddress = getClientIp(request);
    const rateLimit = await checkLoginRateLimit(email, ipAddress);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          message: i18n.auth.rateLimited,
          code: "AUTH_RATE_LIMITED",
          retryAfterSeconds: rateLimit.retryAfterSeconds,
        },
        {
          status: 429,
          headers: rateLimit.retryAfterSeconds
            ? { "Retry-After": String(rateLimit.retryAfterSeconds) }
            : undefined,
        },
      );
    }

    try {
      const signIn = await auth.api.signInEmail({
        body: {
          email,
          password: parsed.data.password,
          rememberMe: true,
        },
        headers: request.headers,
        returnHeaders: true,
        returnStatus: true,
      });
      const authClassification = authUserToAppUser(signIn.response.user);

      if (authClassification.blocked) {
        await recordFailedLogin(email, ipAddress);
        return disabledAccountResponse();
      }

      if (!authClassification.profile) {
        await recordFailedLogin(email, ipAddress);
        return unauthorizedResponse();
      }

      if (expectedRole && authClassification.profile.role !== expectedRole) {
        await recordFailedLogin(email, ipAddress);
        return roleMismatchResponse(request);
      }

      await resetLoginRateLimit(email, ipAddress);

      const response = NextResponse.json<LoginSuccessResponse>({
        redirectTo: getRoleRedirect(authClassification.profile.role),
        user: toAuthenticatedUserResponse(authClassification.profile),
      });
      const roleCookie = await createSignedRoleCookie({
        uid: authClassification.profile.uid,
        role: authClassification.profile.role,
        expiresAt: Date.now() + getSessionMaxAgeMs(),
      });

      appendAuthCookies(response, signIn.headers);
      setRoleCookie(response, roleCookie);

      return response;
    } catch (error: unknown) {
      if (isDisabledAuthError(error)) {
        await recordFailedLogin(email, ipAddress);
        return disabledAccountResponse();
      }

      if (errorStatus(error) === 401 || errorStatus(error) === 403) {
        await recordFailedLogin(email, ipAddress);
        return unauthorizedResponse();
      }

      throw error;
    }
  } catch (error: unknown) {
    console.error("[login] Unexpected error:", error);

    const isDev = process.env.NODE_ENV !== "production" && process.env.VERCEL_ENV !== "production";

    return NextResponse.json(
      {
        message: i18n.errors.unexpected,
        code: "AUTH_LOGIN_FAILED",
        ...(isDev && { debug: error instanceof Error ? error.message : String(error) }),
      },
      { status: 500 },
    );
  }
}
