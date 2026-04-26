"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/server-session";
import { createStationRecord, toggleStationStatusRecord, updateStationRecord } from "@/lib/db/repositories";
import { buildStationReportUrl } from "@/lib/url/base-url";
import { createStationSchema, updateStationSchema } from "@/lib/validation/stations";
import { writeAuditLog } from "@/lib/audit";

export interface StationActionResult {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
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
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

function optionalNumber(formData: FormData, key: string): number | undefined {
  const value = optionalString(formData, key);

  if (!value) {
    return undefined;
  }

  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : Number.NaN;
}

function optionalCoordinates(formData: FormData): { lat: number; lng: number } | undefined {
  const lat = optionalNumber(formData, "lat");
  const lng = optionalNumber(formData, "lng");

  if (lat === undefined && lng === undefined) {
    return undefined;
  }

  return {
    lat: lat ?? Number.NaN,
    lng: lng ?? Number.NaN,
  };
}

export async function createStationAction(formData: FormData): Promise<StationActionResult> {
  const session = await requireRole(["manager"]);
  const parsed = createStationSchema.safeParse({
    label: requiredString(formData, "label"),
    location: requiredString(formData, "location"),
    zone: optionalString(formData, "zone"),
    coordinates: optionalCoordinates(formData),
  });

  if (!parsed.success) {
    return {
      error: "تحقق من بيانات المحطة وحاول مرة أخرى.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const stationId = crypto.randomUUID();
  const qrCodeValue = await buildStationReportUrl(stationId);

  await createStationRecord({
    stationId,
    label: parsed.data.label,
    location: parsed.data.location,
    zone: parsed.data.zone,
    coordinates: parsed.data.coordinates,
    qrCodeValue,
    createdBy: session.uid,
  });
  await writeAuditLog({
    actorUid: session.uid,
    actorRole: session.role,
    action: "station.create",
    entityType: "station",
    entityId: stationId,
    metadata: {
      label: parsed.data.label,
      location: parsed.data.location,
      zone: parsed.data.zone,
      coordinates: parsed.data.coordinates,
    },
  });

  revalidatePath("/dashboard/manager/stations");
  redirect("/dashboard/manager/stations");
}

export async function updateStationAction(stationId: string, formData: FormData): Promise<StationActionResult> {
  const session = await requireRole(["manager"]);
  const parsed = updateStationSchema.safeParse({
    label: requiredString(formData, "label"),
    location: requiredString(formData, "location"),
    zone: optionalString(formData, "zone"),
    coordinates: optionalCoordinates(formData),
  });

  if (!parsed.success) {
    return {
      error: "تحقق من بيانات المحطة وحاول مرة أخرى.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const qrCodeValue = await buildStationReportUrl(stationId);

  await updateStationRecord(stationId, {
    label: parsed.data.label,
    location: parsed.data.location,
    zone: parsed.data.zone,
    coordinates: parsed.data.coordinates,
    qrCodeValue,
    updatedBy: session.uid,
  });
  await writeAuditLog({
    actorUid: session.uid,
    actorRole: session.role,
    action: "station.update",
    entityType: "station",
    entityId: stationId,
    metadata: parsed.data,
  });

  revalidatePath("/dashboard/manager/stations");
  revalidatePath(`/dashboard/manager/stations/${stationId}`);
  redirect(`/dashboard/manager/stations/${stationId}`);
}

export async function toggleStationStatusAction(
  stationId: string,
  currentIsActive: boolean,
): Promise<void> {
  const session = await requireRole(["manager"]);
  const nextIsActive = !currentIsActive;

  await toggleStationStatusRecord(stationId, nextIsActive, session.uid);

  await writeAuditLog({
    actorUid: session.uid,
    actorRole: session.role,
    action: nextIsActive ? "station.activate" : "station.deactivate",
    entityType: "station",
    entityId: stationId,
    metadata: { isActive: nextIsActive },
  });

  revalidatePath("/dashboard/manager/stations");
  revalidatePath(`/dashboard/manager/stations/${stationId}`);
}
