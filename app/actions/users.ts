"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/better-auth";
import { requireRole } from "@/lib/auth/server-session";
import { deleteClientIfSafe, getAppUser, getUserByEmail } from "@/lib/db/repositories";
import { db } from "@/lib/db/client";
import { user as usersTable } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createUserSchema, updateUserAccessCodeSchema, updateUserRoleSchema, updateUserProfileSchema } from "@/lib/validation/users";
import { writeAuditLog } from "@/lib/audit";
import { getActionMessages } from "@/lib/i18n/action-locale";
import { recordUserLifecycleAfterActiveChange } from "@/lib/users/user-lifecycle";
import type { UserRole } from "@/types";

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

function canSupervisorManageRole(role: UserRole): boolean {
  return role === "client" || role === "technician";
}

export async function createUserAccountAction(formData: FormData): Promise<UserActionResult> {
  const session = await requireRole(["manager", "supervisor"]);
  const t = await getActionMessages();
  const parsed = createUserSchema.safeParse({
    displayName: requiredString(formData, "displayName"),
    email: requiredString(formData, "email"),
    password: requiredString(formData, "password"),
    role: formData.get("role"),
    image: formData.get("image") || undefined,
  });

  if (!parsed.success) {
    return {
      error: t.actionErrors.users_validationFailed,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  if (session.role === "supervisor" && !canSupervisorManageRole(parsed.data.role)) {
    return {
      error: t.actionErrors.users_supervisorCannotCreateElevated,
      fieldErrors: {
        role: [t.actionErrors.users_pickClientOrTechnician],
      },
    };
  }

  const email = parsed.data.email.trim().toLowerCase();
  const existingUser = await getUserByEmail(email);

  if (existingUser) {
    return { error: t.actionErrors.users_emailTaken };
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

    if (parsed.data.image) {
      await db.update(usersTable).set({ image: parsed.data.image }).where(eq(usersTable.id, createdUid));
    }

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

    revalidatePath("/dashboard/manager/team");
    revalidatePath("/dashboard/manager/client-orders");
    revalidatePath("/dashboard/manager");
    revalidatePath("/dashboard/supervisor/client-orders");
    revalidatePath("/dashboard/supervisor/team");

    return {
      createdUid,
      success: true,
    };
  } catch (_error: unknown) {
    return { error: t.actionErrors.users_createFailed };
  }
}

export async function toggleUserActiveAction(
  targetUid: string,
  intent: "activate" | "deactivate",
): Promise<UserActionResult> {
  const session = await requireRole(["manager"]);
  const t = await getActionMessages();

  if (targetUid === session.uid) {
    return { error: t.actionErrors.users_cannotDeactivateSelf };
  }

  const user = await getAppUser(targetUid);

  if (!user) {
    return { error: t.actionErrors.users_notFound };
  }

  const nextIsActive = intent === "activate";

  if (nextIsActive && user.isActive) {
    return { success: true };
  }

  if (!nextIsActive && !user.isActive) {
    return { success: true };
  }

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
    return { error: t.actionErrors.users_statusUpdateFailed };
  }

  await recordUserLifecycleAfterActiveChange(targetUid, session.uid, nextIsActive);

  await writeAuditLog({
    actorUid: session.uid,
    actorRole: session.role,
    action: nextIsActive ? "user.activate" : "user.deactivate",
    entityType: "user",
    entityId: targetUid,
    metadata: {
      isActive: nextIsActive,
      previousIsActive: user.isActive,
      previousRole: user.role,
      source: "web",
    },
  });

  revalidatePath("/dashboard/manager/team");
  revalidatePath("/dashboard/manager");
  revalidatePath("/dashboard/supervisor/team");

  return { success: true };
}

export async function updateUserRoleAction(targetUid: string, formData: FormData): Promise<UserActionResult> {
  const session = await requireRole(["manager"]);
  const t = await getActionMessages();

  if (targetUid === session.uid) {
    return { error: t.actionErrors.users_cannotChangeOwnRole };
  }

  const parsed = updateUserRoleSchema.safeParse({
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return {
      error: t.actionErrors.users_roleValidationFailed,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const user = await getAppUser(targetUid);

  if (!user) {
    return { error: t.actionErrors.users_notFound };
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
    return { error: t.actionErrors.users_roleUpdateFailed };
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

  revalidatePath("/dashboard/manager/team");
  revalidatePath("/dashboard/manager");
  revalidatePath("/dashboard/supervisor/team");

  return { success: true };
}

export async function updateUserAccessCodeAction(targetUid: string, formData: FormData): Promise<UserActionResult> {
  const session = await requireRole(["manager"]);
  const t = await getActionMessages();
  const parsed = updateUserAccessCodeSchema.safeParse({
    password: requiredString(formData, "password"),
  });

  if (!parsed.success) {
    return {
      error: t.actionErrors.users_accessCodeValidationFailed,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const user = await getAppUser(targetUid);

  if (!user) {
    return { error: t.actionErrors.users_notFound };
  }

  try {
    await auth.api.setUserPassword({
      body: {
        userId: targetUid,
        newPassword: parsed.data.password,
      },
      headers: await headers(),
    });

    await db.update(usersTable).set({
      passwordChangedAt: new Date(),
    }).where(eq(usersTable.id, targetUid));
  } catch (_error: unknown) {
    return { error: t.actionErrors.users_accessCodeUpdateFailed };
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

  revalidatePath("/dashboard/manager/team");
  revalidatePath("/dashboard/manager");
  revalidatePath("/dashboard/supervisor/team");

  return { success: true };
}

export async function updateUserProfileAction(targetUid: string, formData: FormData): Promise<UserActionResult> {
  const session = await requireRole(["manager", "supervisor", "technician", "client"]);
  const t = await getActionMessages();

  // Only manager/supervisor can update OTHER users
  if (targetUid !== session.uid && session.role !== "manager" && session.role !== "supervisor") {
    return { error: t.actionErrors.users_cannotEditOtherProfile };
  }

  const parsed = updateUserProfileSchema.safeParse({
    displayName: requiredString(formData, "displayName"),
    image: formData.get("image") || undefined,
  });

  if (!parsed.success) {
    return {
      error: t.actionErrors.users_profileValidationFailed,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const targetAppUser = await getAppUser(targetUid);

  if (!targetAppUser) {
    return { error: t.actionErrors.users_notFound };
  }

  if (targetUid !== session.uid && session.role === "supervisor" && !canSupervisorManageRole(targetAppUser.role)) {
    return { error: t.actionErrors.users_supervisorCannotEditElevated };
  }

  try {
    await db.update(usersTable).set({
      name: parsed.data.displayName,
      image: parsed.data.image,
    }).where(eq(usersTable.id, targetUid));
  } catch (_error: unknown) {
    return { error: t.actionErrors.users_profileUpdateFailed };
  }

  await writeAuditLog({
    actorUid: session.uid,
    actorRole: session.role,
    action: "user.profile_update",
    entityType: "user",
    entityId: targetUid,
    metadata: {
      previousName: targetAppUser.displayName,
      nextName: parsed.data.displayName,
    },
  });

  revalidatePath("/dashboard/manager/team");
  revalidatePath("/dashboard/supervisor/team");
  revalidatePath("/(tabs)/settings");

  return { success: true };
}

export async function deleteClientAccountAction(targetUid: string): Promise<void> {
  const session = await requireRole(["manager"]);
  const t = await getActionMessages();

  try {
    await deleteClientIfSafe({
      actorUid: session.uid,
      actorRole: session.role,
      clientUid: targetUid,
    });
  } catch (error: unknown) {
    redirect(
      `/dashboard/manager/team?error=${encodeURIComponent(error instanceof Error ? error.message : t.actionErrors.users_deleteClientFailed)}`,
    );
  }

  revalidatePath("/dashboard/manager/team");
  revalidatePath("/dashboard/manager/client-orders");
  revalidatePath("/dashboard/manager");

  redirect("/dashboard/manager/team?success=1");
}
