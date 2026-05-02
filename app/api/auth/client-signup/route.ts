import { NextRequest, NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { auth } from "@/lib/auth/better-auth";
import { toAuthenticatedUserResponse } from "@/lib/auth/public-user";
import { createSignedRoleCookie } from "@/lib/auth/role-cookie";
import { setRoleCookie } from "@/lib/auth/session";
import { getSessionMaxAgeMs } from "@/lib/auth/session-config";
import { getAppUser, getUserByEmail, getClientByPhone, upsertClientProfile } from "@/lib/db/repositories";
import { i18n } from "@/lib/i18n";
import { clientAddressLinesFromText } from "@/lib/validation/client-orders";
import { clientSignupSchema } from "@/lib/validation/auth";
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

export async function POST(request: NextRequest): Promise<NextResponse<ApiErrorResponse | LoginSuccessResponse>> {
  try {
    const body = (await request.json()) as unknown;
    const parsed = clientSignupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "تحقق من بيانات حساب العميل وحاول مرة أخرى.",
          code: "CLIENT_SIGNUP_INVALID",
        },
        { status: 400 },
      );
    }

    const email = parsed.data.email.trim().toLowerCase();
    const phone = parsed.data.phone?.trim();
    const [existingUser, phoneExists] = await Promise.all([
      getUserByEmail(email),
      phone ? getClientByPhone(phone) : Promise.resolve(false),
    ]);

    if (existingUser) {
      return NextResponse.json(
        {
          message: "هذا البريد الإلكتروني مستخدم بالفعل. الرجاء استخدام بريد مختلف.",
          code: "CLIENT_SIGNUP_EMAIL_EXISTS",
        },
        { status: 409 },
      );
    }

    if (phoneExists) {
      return NextResponse.json(
        {
          message: "رقم الهاتف هذا مسجل بالفعل لحساب آخر. الرجاء استخدام رقم مختلف.",
          code: "CLIENT_SIGNUP_PHONE_EXISTS",
        },
        { status: 409 },
      );
    }

    const created = await auth.api.createUser({
      body: {
        email,
        name: parsed.data.displayName.trim(),
        password: parsed.data.accessCode.trim(),
        role: "client",
      },
    });
    const createdUid = created.user.id;

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
