"use server";

import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/server-session";
import { USERS_COL } from "@/lib/collections";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { createUserSchema, updateUserAccessCodeSchema, updateUserRoleSchema } from "@/lib/validation/users";
import { writeAuditLog } from "@/lib/audit";
import type { AppUser } from "@/types";

export interface UserActionResult {
  createdUid?: string;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  success?: boolean;
}

function optionalAuthErrorCode(error: unknown): string | null {
  if (typeof error === "object" && error !== null && "code" in error && typeof error.code === "string") {
    return error.code;
  }

  return null;
}

function requiredString(formData: FormData, key: string): string {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

async function getAuthUserByEmail(email: string) {
  try {
    return await adminAuth().getUserByEmail(email);
  } catch (error: unknown) {
    if (optionalAuthErrorCode(error) === "auth/user-not-found") {
      return null;
    }

    throw error;
  }
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
  const existingAuthUser = await getAuthUserByEmail(email);

  if (existingAuthUser) {
    return { error: "هذا البريد مستخدم بالفعل." };
  }

  let createdUid: string | null = null;

  try {
    const authUser = await adminAuth().createUser({
      email,
      password: parsed.data.password,
      displayName: parsed.data.displayName,
      emailVerified: true,
      disabled: false,
    });

    createdUid = authUser.uid;

    await adminDb().collection(USERS_COL).doc(authUser.uid).set({
      uid: authUser.uid,
      email,
      displayName: parsed.data.displayName,
      role: parsed.data.role,
      createdAt: FieldValue.serverTimestamp(),
      isActive: true,
    });

    await writeAuditLog({
      actorUid: session.uid,
      actorRole: session.role,
      action: "user.create",
      entityType: "user",
      entityId: authUser.uid,
      metadata: {
        email,
        role: parsed.data.role,
      },
    });

    revalidatePath("/dashboard/manager/users");

    return {
      createdUid: authUser.uid,
      success: true,
    };
  } catch (error: unknown) {
    if (createdUid) {
      await adminAuth().deleteUser(createdUid).catch(() => undefined);
    }

    const errorCode = optionalAuthErrorCode(error);

    if (errorCode === "auth/email-already-exists") {
      return { error: "هذا البريد مستخدم بالفعل." };
    }

    if (errorCode === "auth/invalid-password") {
      return { error: "كود الدخول لا يحقق متطلبات Firebase." };
    }

    return { error: "تعذر إنشاء المستخدم. تحقق من إعدادات Firebase وحاول مرة أخرى." };
  }
}

export async function toggleUserActiveAction(targetUid: string): Promise<UserActionResult> {
  const session = await requireRole(["manager"]);

  if (targetUid === session.uid) {
    return { error: "لا يمكنك تعطيل حسابك" };
  }

  const userRef = adminDb().collection(USERS_COL).doc(targetUid);
  const snapshot = await userRef.get();

  if (!snapshot.exists) {
    return { error: "المستخدم غير موجود" };
  }

  const user = snapshot.data() as Partial<AppUser>;
  const nextIsActive = !user.isActive;

  await adminAuth().updateUser(targetUid, {
    disabled: !nextIsActive,
  });

  await userRef.update({
    isActive: nextIsActive,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: session.uid,
  });

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

  const userRef = adminDb().collection(USERS_COL).doc(targetUid);
  const snapshot = await userRef.get();

  if (!snapshot.exists) {
    return { error: "المستخدم غير موجود" };
  }

  const user = snapshot.data() as Partial<AppUser>;

  await userRef.update({
    role: parsed.data.role,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: session.uid,
  });

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

  const userRef = adminDb().collection(USERS_COL).doc(targetUid);
  const snapshot = await userRef.get();

  if (!snapshot.exists) {
    return { error: "المستخدم غير موجود" };
  }

  const user = snapshot.data() as Partial<AppUser>;

  try {
    await adminAuth().updateUser(targetUid, {
      password: parsed.data.password,
    });
  } catch (error: unknown) {
    if (optionalAuthErrorCode(error) === "auth/invalid-password") {
      return { error: "كود الدخول لا يحقق متطلبات Firebase." };
    }

    return { error: "تعذر تحديث كود الدخول. تحقق من إعدادات Firebase وحاول مرة أخرى." };
  }

  await userRef.update({
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: session.uid,
  });

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
