"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/server-session";
import { clockInAttendanceSession, clockOutAttendanceSession } from "@/lib/db/repositories";
import { getActionMessages } from "@/lib/i18n/action-locale";

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
  const t = await getActionMessages();
  const stationId = optionalString(formData, "stationId")?.trim();
  if (!stationId) {
    return { error: t.actionErrors.attendance_stationIdRequired };
  }

  const latRaw = optionalString(formData, "lat");
  const lngRaw = optionalString(formData, "lng");
  if (!latRaw || !lngRaw) {
    return { error: t.actionErrors.attendance_locationIncomplete };
  }
  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { error: t.actionErrors.attendance_locationInvalid };
  }

  try {
    await clockInAttendanceSession({
      actorRole: session.role,
      location: {
        accuracyMeters: optionalNumber(formData, "accuracyMeters"),
        lat,
        lng,
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
    return { error: error instanceof Error ? error.message : t.actionErrors.attendance_clockInFailed };
  }
}

export async function clockOutAction(formData: FormData): Promise<AttendanceActionResult> {
  const session = await requireRole(["technician", "manager"]);
  const t = await getActionMessages();
  const stationId = optionalString(formData, "stationId")?.trim();
  if (!stationId) {
    return { error: t.actionErrors.attendance_stationIdRequired };
  }

  const latRaw = optionalString(formData, "lat");
  const lngRaw = optionalString(formData, "lng");
  if (!latRaw || !lngRaw) {
    return { error: t.actionErrors.attendance_locationIncomplete };
  }
  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { error: t.actionErrors.attendance_locationInvalid };
  }

  try {
    await clockOutAttendanceSession({
      actorRole: session.role,
      location: {
        accuracyMeters: optionalNumber(formData, "accuracyMeters"),
        lat,
        lng,
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
    return { error: error instanceof Error ? error.message : t.actionErrors.attendance_clockOutFailed };
  }
}
