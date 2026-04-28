import { NextRequest, NextResponse } from "next/server";
import { mobileApiErrorResponse } from "@/lib/api/mobile";
import { mobileUserResponse, type MobileUserResponse } from "@/lib/api/mobile-serializers";
import { auth } from "@/lib/auth/better-auth";
import { requireBearerRole } from "@/lib/auth/bearer-session";
import { writeAuditLog } from "@/lib/audit";
import { getAppUser } from "@/lib/db/repositories";
import { db } from "@/lib/db/client";
import { user as usersTable } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { updateUserAccessCodeSchema, updateUserActiveSchema, updateUserRoleSchema } from "@/lib/validation/users";
import type { ApiErrorResponse, UserRole } from "@/types";

export const runtime = "nodejs";

interface MobileUserRouteContext {
  params: Promise<{
    uid: string;
  }>;
}

interface UpdateMobileUserBody {
  isActive?: boolean;
  password?: string;
  role?: UserRole;
  displayName?: string;
  image?: string;
}

export async function PATCH(
  request: NextRequest,
  { params }: MobileUserRouteContext,
): Promise<NextResponse<MobileUserResponse | ApiErrorResponse>> {
  try {
    const session = await requireBearerRole(request, ["manager", "supervisor", "technician"]);
    const { uid } = await params;
    const body = (await request.json()) as UpdateMobileUserBody;
    const targetUser = await getAppUser(uid);

    if (!targetUser) {
      return NextResponse.json(
        {
          code: "MOBILE_USER_NOT_FOUND",
          message: "المستخدم غير موجود.",
        },
        { status: 404 },
      );
    }

    if ((body.isActive !== undefined || body.role !== undefined) && uid === session.uid) {
      return NextResponse.json(
        {
          code: "MOBILE_USER_SELF_UPDATE_BLOCKED",
          message: "لا يمكنك تعطيل حسابك أو تغيير دورك الحالي.",
        },
        { status: 409 },
      );
    }

    // Only managers can change role, isActive, password
    if ((body.isActive !== undefined || body.role !== undefined || body.password !== undefined) && session.role !== "manager") {
      return NextResponse.json({ code: "UNAUTHORIZED", message: "غير مصرح" }, { status: 403 });
    }

    // Only managers/supervisors can edit OTHER users
    if (uid !== session.uid && session.role !== "manager" && session.role !== "supervisor") {
      return NextResponse.json({ code: "UNAUTHORIZED", message: "غير مصرح" }, { status: 403 });
    }

    // Prevent supervisors from editing users with equal or higher role
    const roleRank: Record<string, number> = { technician: 1, supervisor: 2, manager: 3 };
    const actorRank = roleRank[session.role] ?? 0;
    const targetRank = roleRank[targetUser.role] ?? 0;

    if (uid !== session.uid && actorRank <= targetRank && session.role !== "manager") {
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "لا يمكنك تعديل بيانات مستخدم بنفس مستواك أو أعلى منك." },
        { status: 403 },
      );
    }

    if (body.displayName !== undefined || body.image !== undefined) {
      await db.update(usersTable).set({
        name: body.displayName !== undefined ? body.displayName : targetUser.displayName,
        image: body.image !== undefined ? body.image : targetUser.image,
      }).where(eq(usersTable.id, uid));

      await writeAuditLog({
        actorUid: session.uid,
        actorRole: session.role,
        action: "user.profile_update",
        entityType: "user",
        entityId: uid,
        metadata: { source: "mobile" },
      });
    }

    if (body.role !== undefined) {
      const parsedRole = updateUserRoleSchema.safeParse({ role: body.role });

      if (!parsedRole.success) {
        return NextResponse.json(
          {
            code: "MOBILE_USER_ROLE_INVALID",
            message: "تحقق من الدور المختار وحاول مرة أخرى.",
          },
          { status: 400 },
        );
      }

      await auth.api.setRole({
        body: {
          userId: uid,
          role: parsedRole.data.role,
        },
        headers: request.headers,
      });
      await writeAuditLog({
        actorUid: session.uid,
        actorRole: session.role,
        action: "user.role_change",
        entityType: "user",
        entityId: uid,
        metadata: {
          previousRole: targetUser.role,
          nextRole: parsedRole.data.role,
          source: "mobile",
        },
      });
    }

    if (body.isActive !== undefined) {
      const parsedActive = updateUserActiveSchema.safeParse({ isActive: body.isActive });

      if (!parsedActive.success) {
        return NextResponse.json(
          {
            code: "MOBILE_USER_ACTIVE_INVALID",
            message: "تحقق من حالة المستخدم وحاول مرة أخرى.",
          },
          { status: 400 },
        );
      }

      if (parsedActive.data.isActive) {
        await auth.api.unbanUser({
          body: { userId: uid },
          headers: request.headers,
        });
      } else {
        await auth.api.banUser({
          body: {
            userId: uid,
            banReason: "deactivated",
          },
          headers: request.headers,
        });
      }

      await writeAuditLog({
        actorUid: session.uid,
        actorRole: session.role,
        action: parsedActive.data.isActive ? "user.activate" : "user.deactivate",
        entityType: "user",
        entityId: uid,
        metadata: {
          isActive: parsedActive.data.isActive,
          previousRole: targetUser.role,
          source: "mobile",
        },
      });
    }

    if (body.password !== undefined) {
      const parsedPassword = updateUserAccessCodeSchema.safeParse({ password: body.password });

      if (!parsedPassword.success) {
        return NextResponse.json(
          {
            code: "MOBILE_USER_PASSWORD_INVALID",
            message: "كود الدخول يجب أن يتكون من 8 إلى 32 حرفا أو رقما.",
          },
          { status: 400 },
        );
      }

      await auth.api.setUserPassword({
        body: {
          userId: uid,
          newPassword: parsedPassword.data.password,
        },
        headers: request.headers,
      });
      await writeAuditLog({
        actorUid: session.uid,
        actorRole: session.role,
        action: "user.access_code_change",
        entityType: "user",
        entityId: uid,
        metadata: {
          email: targetUser.email,
          role: targetUser.role,
          source: "mobile",
        },
      });
    }

    const updatedUser = await getAppUser(uid);

    return NextResponse.json(mobileUserResponse(updatedUser ?? targetUser));
  } catch (error: unknown) {
    return mobileApiErrorResponse(error);
  }
}
