"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/server-session";
import { clockInAttendanceSession, clockOutAttendanceSession } from "@/lib/db/repositories";

export interface AttendanceActionResult {
  error?: string;
  success?: boolean;
}

function optionalString(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export async function clockInAction(formData: FormData): Promise<AttendanceActionResult> {
  const session = await requireRole(["technician", "manager"]);

  try {
    await clockInAttendanceSession({
      actorRole: session.role,
      technicianUid: session.uid,
      technicianName: session.user.displayName,
      notes: optionalString(formData, "notes"),
    });
    revalidatePath("/scan");
    return { success: true };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : "تعذر تسجيل الحضور." };
  }
}

export async function clockOutAction(formData: FormData): Promise<AttendanceActionResult> {
  const session = await requireRole(["technician", "manager"]);

  try {
    await clockOutAttendanceSession({
      actorRole: session.role,
      technicianUid: session.uid,
      technicianName: session.user.displayName,
      notes: optionalString(formData, "notes"),
    });
    revalidatePath("/scan");
    return { success: true };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : "تعذر تسجيل الانصراف." };
  }
}
