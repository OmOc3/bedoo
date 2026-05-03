import { NextRequest, NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { auth } from "@/lib/auth/better-auth";
import { getClientIp } from "@/lib/auth/client-ip";
import { toAuthenticatedUserResponse } from "@/lib/auth/public-user";
import {
  checkClientSignupRateLimit,
  recordFailedClientSignupAttempt,
  resetClientSignupRateLimit,
} from "@/lib/auth/rate-limit";
import { createSignedRoleCookie } from "@/lib/auth/role-cookie";
import { setRoleCookie } from "@/lib/auth/session";
import { getSessionMaxAgeMs } from "@/lib/auth/session-config";
import {
  attachClientSignupDeviceToClient,
  getAppSettings,
  getAppUser,
  getUserByEmail,
  getClientByPhone,
  releaseClientSignupDeviceReservation,
  reserveClientSignupDevice,
  upsertClientProfile,
} from "@/lib/db/repositories";
import { i18n } from "@/lib/i18n";
import { clientAddressLinesFromText } from "@/lib/validation/client-orders";
import { clientSignupRequestSchema } from "@/lib/validation/auth";
import { isRecord } from "@/lib/utils";
import type { ApiErrorResponse, LoginSuccessResponse } from "@/types";

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

async function clientSignupDeviceBlockedResponse(): Promise<NextResponse<ApiErrorResponse>> {
  const settings = await getAppSettings();

  return NextResponse.json(
    {
      message: "تم إنشاء حساب عميل من هذا الجهاز من قبل. لإنشاء حساب آخر تواصل مع الدعم.",
      code: "CLIENT_SIGNUP_DEVICE_EXISTS",
      ...(settings.supportContact && { supportContact: settings.supportContact }),
    },
    { status: 409 },
  );
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiErrorResponse | LoginSuccessResponse>> {
  try {
    const body = (await request.json()) as unknown;
    const signupEmailGuess =
      isRecord(body) && typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const ipAddress = getClientIp(request);
    const rateLimit = await checkClientSignupRateLimit(signupEmailGuess, ipAddress);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          message: "تم تجاوز الحدّ المسموح لتسجيل حساب من هذا الطرف. انتظر ثم حاول مرة أخرى.",
          code: "CLIENT_SIGNUP_RATE_LIMITED",
          ...(rateLimit.retryAfterSeconds !== undefined && { retryAfterSeconds: rateLimit.retryAfterSeconds }),
        },
        {
          status: 429,
          headers: rateLimit.retryAfterSeconds ? { "Retry-After": String(rateLimit.retryAfterSeconds) } : undefined,
        },
      );
    }

    const parsed = clientSignupRequestSchema.safeParse(body);

    if (!parsed.success) {
      await recordFailedClientSignupAttempt(signupEmailGuess, ipAddress);
      return NextResponse.json(
        {
          message: "تحقق من بيانات حساب العميل وحاول مرة أخرى.",
          code: "CLIENT_SIGNUP_INVALID",
        },
        { status: 400 },
      );
    }

    const email = parsed.data.email.trim().toLowerCase();
    const phone = parsed.data.phone.trim();
    const [existingUser, phoneExists] = await Promise.all([
      getUserByEmail(email),
      phone ? getClientByPhone(phone) : Promise.resolve(false),
    ]);

    if (existingUser) {
      await recordFailedClientSignupAttempt(signupEmailGuess, ipAddress);
      return NextResponse.json(
        {
          message: "هذا البريد الإلكتروني مستخدم بالفعل. الرجاء استخدام بريد مختلف.",
          code: "CLIENT_SIGNUP_EMAIL_EXISTS",
        },
        { status: 409 },
      );
    }

    if (phoneExists) {
      await recordFailedClientSignupAttempt(signupEmailGuess, ipAddress);
      return NextResponse.json(
        {
          message: "رقم الهاتف هذا مسجل بالفعل لحساب آخر. الرجاء استخدام رقم مختلف.",
          code: "CLIENT_SIGNUP_PHONE_EXISTS",
        },
        { status: 409 },
      );
    }

    const deviceReservation = await reserveClientSignupDevice(parsed.data.deviceId);

    if (!deviceReservation.reserved) {
      await recordFailedClientSignupAttempt(signupEmailGuess, ipAddress);
      return clientSignupDeviceBlockedResponse();
    }

    let createdUid: string;

    try {
      const created = await auth.api.createUser({
        body: {
          email,
          name: parsed.data.displayName.trim(),
          password: parsed.data.accessCode.trim(),
          role: "client",
        },
      });

      createdUid = created.user.id;
    } catch (error: unknown) {
      await releaseClientSignupDeviceReservation(deviceReservation.deviceHash);
      throw error;
    }

    await attachClientSignupDeviceToClient({
      clientUid: createdUid,
      deviceHash: deviceReservation.deviceHash,
    });

    await writeAuditLog({
      actorUid: createdUid,
      actorRole: "client",
      action: "client.signup",
      entityType: "user",
      entityId: createdUid,
      metadata: {
        email,
        source: "client_portal",
      },
    });

    await upsertClientProfile({
      actorUid: createdUid,
      actorRole: "client",
      addresses: clientAddressLinesFromText(parsed.data.addressesText),
      clientUid: createdUid,
      phone: parsed.data.phone,
    });

    const signIn = await auth.api.signInEmail({
      body: {
        email,
        password: parsed.data.accessCode.trim(),
        rememberMe: true,
      },
      headers: request.headers,
      returnHeaders: true,
      returnStatus: true,
    });
    const appUser = await getAppUser(createdUid);

    if (!appUser || appUser.role !== "client" || !appUser.isActive) {
      return NextResponse.json(
        {
          message: i18n.errors.unexpected,
          code: "CLIENT_SIGNUP_SESSION_FAILED",
        },
        { status: 500 },
      );
    }

    const response = NextResponse.json<LoginSuccessResponse>({
      redirectTo: "/client/portal",
      user: toAuthenticatedUserResponse(appUser),
    });
    const roleCookie = await createSignedRoleCookie({
      uid: appUser.uid,
      role: appUser.role,
      expiresAt: Date.now() + getSessionMaxAgeMs(),
    });

    appendAuthCookies(response, signIn.headers);
    setRoleCookie(response, roleCookie);
    response.cookies.set("ecopest_client_signup_device_id", parsed.data.deviceId, {
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    await resetClientSignupRateLimit(signupEmailGuess, ipAddress);

    return response;
  } catch (error: unknown) {
    console.error("[client-signup] Unexpected error:", error);

    const isDev = process.env.NODE_ENV !== "production" && process.env.VERCEL_ENV !== "production";

    return NextResponse.json(
      {
        message: i18n.errors.unexpected,
        code: "CLIENT_SIGNUP_FAILED",
        ...(isDev && { debug: error instanceof Error ? error.message : String(error) }),
      },
      { status: 500 },
    );
  }
}
