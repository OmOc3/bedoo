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

function requiredString(formData: FormData, key: string): string {
  const value = optionalString(formData, key);

  if (!value) {
    throw new Error("بيانات الموقع غير مكتملة.");
  }

  return value;
}

function requiredNumber(formData: FormData, key: string): number {
  const value = Number(requiredString(formData, key));

  if (!Number.isFinite(value)) {
    throw new Error("بيانات الموقع غير صالحة.");
  }

  return value;
}

function optionalNumber(formData: FormData, key: string): number | undefined {
  const value = optionalString(formData, key);

  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function clockInAction(formData: FormData): Promise<AttendanceActionResult> {
  const session = await requireRole(["technician", "manager"]);
  const stationId = requiredString(formData, "stationId");

  try {
    await clockInAttendanceSession({
      actorRole: session.role,
      location: {
        accuracyMeters: optionalNumber(formData, "accuracyMeters"),
        lat: requiredNumber(formData, "lat"),
        lng: requiredNumber(formData, "lng"),
      },
      stationId,
      technicianUid: session.uid,
      technicianName: session.user.displayName,
      notes: optionalString(formData, "notes"),
    });
    revalidatePath("/scan");
    revalidatePath(`/station/${stationId}/report`);
    return { success: true };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : "تعذر تسجيل الحضور." };
  }
}

export async function clockOutAction(formData: FormData): Promise<AttendanceActionResult> {
  const session = await requireRole(["technician", "manager"]);
  const stationId = requiredString(formData, "stationId");

  try {
    await clockOutAttendanceSession({
      actorRole: session.role,
      location: {
        accuracyMeters: optionalNumber(formData, "accuracyMeters"),
        lat: requiredNumber(formData, "lat"),
        lng: requiredNumber(formData, "lng"),
      },
      stationId,
      technicianUid: session.uid,
      technicianName: session.user.displayName,
      notes: optionalString(formData, "notes"),
    });
    revalidatePath("/scan");
    revalidatePath(`/station/${stationId}/report`);
    return { success: true };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : "تعذر تسجيل الانصراف." };
  }
}
