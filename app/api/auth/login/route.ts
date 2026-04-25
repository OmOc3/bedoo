import { NextRequest, NextResponse } from "next/server";
import { SESSION_MAX_AGE_MS } from "@/lib/auth/constants";
import { checkLoginRateLimit, recordFailedLogin, resetLoginRateLimit } from "@/lib/auth/rate-limit";
import { getRoleRedirect } from "@/lib/auth/redirects";
import { createSignedRoleCookie } from "@/lib/auth/role-cookie";
import { setAuthCookies } from "@/lib/auth/session";
import { getActiveAppUser } from "@/lib/auth/user-profile";
import { adminAuth } from "@/lib/firebase-admin";
import { i18n } from "@/lib/i18n";
import { isRecord } from "@/lib/utils";
import { loginFormSchema } from "@/lib/validation/auth";
import type { ApiErrorResponse, LoginSuccessResponse } from "@/types";

export const runtime = "nodejs";

interface FirebasePasswordSuccess {
  idToken: string;
  localId: string;
}

interface FirebasePasswordResult {
  ok: boolean;
  data?: FirebasePasswordSuccess;
}

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}

function getFirebaseApiKey(): string {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  if (!apiKey) {
    throw new Error("Missing environment variable: NEXT_PUBLIC_FIREBASE_API_KEY");
  }

  return apiKey;
}

function isFirebasePasswordSuccess(value: unknown): value is FirebasePasswordSuccess {
  return isRecord(value) && typeof value.idToken === "string" && typeof value.localId === "string";
}

async function signInWithFirebasePassword(email: string, password: string): Promise<FirebasePasswordResult> {
  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${getFirebaseApiKey()}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true,
        }),
        cache: "no-store",
      },
    );
    const payload = (await response.json()) as unknown;

    if (!response.ok || !isFirebasePasswordSuccess(payload)) {
      return { ok: false };
    }

    return {
      ok: true,
      data: payload,
    };
  } catch (error: unknown) {
    throw new Error(error instanceof Error ? error.message : "Failed to verify Firebase password.");
  }
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

export async function POST(request: NextRequest): Promise<NextResponse<ApiErrorResponse | LoginSuccessResponse>> {
  try {
    const body = (await request.json()) as unknown;
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

    const passwordResult = await signInWithFirebasePassword(email, parsed.data.password);

    if (!passwordResult.ok || !passwordResult.data) {
      await recordFailedLogin(email, ipAddress);
      return unauthorizedResponse();
    }

    const decodedToken = await adminAuth().verifyIdToken(passwordResult.data.idToken, true);

    if (decodedToken.uid !== passwordResult.data.localId) {
      await recordFailedLogin(email, ipAddress);
      return unauthorizedResponse();
    }

    const appUser = await getActiveAppUser(decodedToken.uid);

    if (!appUser) {
      await recordFailedLogin(email, ipAddress);
      return unauthorizedResponse();
    }

    const [sessionCookie, customToken, roleCookie] = await Promise.all([
      adminAuth().createSessionCookie(passwordResult.data.idToken, { expiresIn: SESSION_MAX_AGE_MS }),
      adminAuth().createCustomToken(appUser.uid),
      createSignedRoleCookie({
        uid: appUser.uid,
        role: appUser.role,
        expiresAt: Date.now() + SESSION_MAX_AGE_MS,
      }),
    ]);

    await resetLoginRateLimit(email, ipAddress);

    const response = NextResponse.json<LoginSuccessResponse>({
      redirectTo: getRoleRedirect(appUser.role),
      customToken,
    });

    setAuthCookies(response, sessionCookie, roleCookie);

    return response;
  } catch (_error: unknown) {
    return NextResponse.json(
      {
        message: i18n.errors.unexpected,
        code: "AUTH_LOGIN_FAILED",
      },
      { status: 500 },
    );
  }
}
