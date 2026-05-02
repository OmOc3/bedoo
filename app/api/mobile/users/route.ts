import { NextRequest, NextResponse } from "next/server";
import { mobileApiErrorResponse } from "@/lib/api/mobile";
import { mobileUserResponse, type MobileUserResponse } from "@/lib/api/mobile-serializers";
import { auth } from "@/lib/auth/better-auth";
import { requireBearerRole } from "@/lib/auth/bearer-session";
import { writeAuditLog } from "@/lib/audit";
import { getAppUser, getUserByEmail, listAppUsers } from "@/lib/db/repositories";
import { createUserSchema } from "@/lib/validation/users";
import type { ApiErrorResponse } from "@/types";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
): Promise<NextResponse<MobileUserResponse[] | ApiErrorResponse>> {
  try {
    await requireBearerRole(request, ["technician", "supervisor", "manager"]);
    const users = await listAppUsers();

    return NextResponse.json(users.map(mobileUserResponse));
  } catch (error: unknown) {
    return mobileApiErrorResponse(error);
  }
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<MobileUserResponse | ApiErrorResponse>> {
  try {
    const session = await requireBearerRole(request, ["manager"]);
    const body = (await request.json()) as unknown;
    const parsed = createUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          code: "MOBILE_USER_INVALID",
          message: "تحقق من بيانات المستخدم وحاول مرة أخرى.",
        },
        { status: 400 },
      );
    }

    const email = parsed.data.email.trim().toLowerCase();
    const existingUser = await getUserByEmail(email);

    if (existingUser) {
      return NextResponse.json(
        {
          code: "MOBILE_USER_EMAIL_EXISTS",
          message: "هذا البريد مستخدم بالفعل.",
        },
        { status: 409 },
      );
    }

    const result = await auth.api.createUser({
      body: {
        email,
        password: parsed.data.password,
        name: parsed.data.displayName,
        role: parsed.data.role,
      },
    });
    const createdUid = result.user.id;
    const createdUser = await getAppUser(createdUid);

    await writeAuditLog({
      actorUid: session.uid,
      actorRole: session.role,
      action: "user.create",
      entityType: "user",
      entityId: createdUid,
      metadata: {
        email,
        role: parsed.data.role,
        source: "mobile",
      },
    });

    return NextResponse.json(
      mobileUserResponse(
        createdUser ?? {
          uid: createdUid,
          email,
          displayName: parsed.data.displayName,
          role: parsed.data.role,
          createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0, toDate: () => new Date() },
          isActive: true,
        },
      ),
    );
  } catch (error: unknown) {
    return mobileApiErrorResponse(error);
  }
}
