"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/better-auth";
import { requireRole } from "@/lib/auth/server-session";
import { getAppUser, getUserByEmail } from "@/lib/db/repositories";
import { createUserSchema, updateUserAccessCodeSchema, updateUserRoleSchema } from "@/lib/validation/users";
import { writeAuditLog } from "@/lib/audit";

export interface UserActionResult {
  createdUid?: string;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  success?: boolean;
}

function requiredString(formData: FormData, key: string): string {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

export async function createUserAccountAction(formData: FormData): Promise<UserActionResult> {
  const session = await requireRole(["manager"]);
  const parsed = createUserSchema.safeParse({
    displayName: requiredString(formData, "displayName"),
    email: requiredString(formData, "email"),
    password: requiredString(formData, "password"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return {
      error: "تحقق من بيانات المستخدم وحاول مرة أخرى.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const email = parsed.data.email.trim().toLowerCase();
  const existingUser = await getUserByEmail(email);

  if (existingUser) {
    return { error: "هذا البريد مستخدم بالفعل." };
  }

  try {
    const result = await auth.api.createUser({
      body: {
        email,
        password: parsed.data.password,
        name: parsed.data.displayName,
        role: parsed.data.role,
      },
    });
    const createdUid = result.user.id;

    await writeAuditLog({
      actorUid: session.uid,
      actorRole: session.role,
      action: "user.create",
      entityType: "user",
      entityId: createdUid,
      metadata: {
        email,
        role: parsed.data.role,
      },
    });

    revalidatePath("/dashboard/manager/users");

    return {
      createdUid,
      success: true,
    };
  } catch (_error: unknown) {
    return { error: "تعذر إنشاء المستخدم. تحقق من البيانات وحاول مرة أخرى." };
  }
}

export async function toggleUserActiveAction(targetUid: string): Promise<UserActionResult> {
  const session = await requireRole(["manager"]);

  if (targetUid === session.uid) {
    return { error: "لا يمكنك تعطيل حسابك" };
  }

  const user = await getAppUser(targetUid);

  if (!user) {
    return { error: "المستخدم غير موجود" };
  }

  const nextIsActive = !user.isActive;
  const requestHeaders = await headers();

  try {
    if (nextIsActive) {
      await auth.api.unbanUser({
        body: { userId: targetUid },
        headers: requestHeaders,
      });
    } else {
      await auth.api.banUser({
        body: {
          userId: targetUid,
          banReason: "deactivated",
        },
        headers: requestHeaders,
      });
    }
  } catch (_error: unknown) {
    return { error: "تعذر تحديث حالة المستخدم." };
  }

  await writeAuditLog({
    actorUid: session.uid,
    actorRole: session.role,
    action: nextIsActive ? "user.activate" : "user.deactivate",
    entityType: "user",
    entityId: targetUid,
    metadata: {
      isActive: nextIsActive,
      previousRole: user.role,
    },
  });

  revalidatePath("/dashboard/manager/users");

  return { success: true };
}

export async function updateUserRoleAction(targetUid: string, formData: FormData): Promise<UserActionResult> {
  const session = await requireRole(["manager"]);

  if (targetUid === session.uid) {
    return { error: "لا يمكنك تغيير دورك" };
  }

  const parsed = updateUserRoleSchema.safeParse({
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return {
      error: "تحقق من الدور المختار وحاول مرة أخرى.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const user = await getAppUser(targetUid);

  if (!user) {
    return { error: "المستخدم غير موجود" };
  }

  try {
    await auth.api.setRole({
      body: {
        userId: targetUid,
        role: parsed.data.role,
      },
      headers: await headers(),
    });
  } catch (_error: unknown) {
    return { error: "تعذر تحديث دور المستخدم." };
  }

  await writeAuditLog({
    actorUid: session.uid,
    actorRole: session.role,
    action: "user.role_change",
    entityType: "user",
    entityId: targetUid,
    metadata: {
      previousRole: user.role,
      nextRole: parsed.data.role,
    },
  });

  revalidatePath("/dashboard/manager/users");

  return { success: true };
}

export async function updateUserAccessCodeAction(targetUid: string, formData: FormData): Promise<UserActionResult> {
  const session = await requireRole(["manager"]);
  const parsed = updateUserAccessCodeSchema.safeParse({
    password: requiredString(formData, "password"),
  });

  if (!parsed.success) {
    return {
      error: "تحقق من كود الدخول وحاول مرة أخرى.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const user = await getAppUser(targetUid);

  if (!user) {
    return { error: "المستخدم غير موجود" };
  }

  try {
    await auth.api.setUserPassword({
      body: {
        userId: targetUid,
        newPassword: parsed.data.password,
      },
      headers: await headers(),
    });
  } catch (_error: unknown) {
    return { error: "تعذر تحديث كود الدخول. تحقق من البيانات وحاول مرة أخرى." };
  }

  await writeAuditLog({
    actorUid: session.uid,
    actorRole: session.role,
    action: "user.access_code_change",
    entityType: "user",
    entityId: targetUid,
    metadata: {
      email: user.email,
      role: user.role,
    },
  });

  revalidatePath("/dashboard/manager/users");

  return { success: true };
}
