"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/server-session";
import { deleteStationImageFromCloudinary, uploadStationImageToCloudinary } from "@/lib/cloudinary/station-images";
import {
  createStationRecord,
  deleteStationIfSafe,
  generateNextStationId,
  getStationById,
  toggleStationStatusRecord,
  updateStationRecord,
} from "@/lib/db/repositories";
import { buildStationReportUrl } from "@/lib/url/base-url";
import { createStationSchema, updateStationSchema } from "@/lib/validation/stations";
import { writeAuditLog } from "@/lib/audit";
import { getActionMessages } from "@/lib/i18n/action-locale";
import type { I18nMessages } from "@/lib/i18n";

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

function stationPhotoFiles(formData: FormData): File[] {
  return formData
    .getAll("photos")
    .filter((value): value is File => value instanceof File && value.size > 0);
}

async function uploadStationPhotos(stationId: string, files: File[], t: I18nMessages): Promise<string[]> {
  if (files.length === 0) {
    return [];
  }

  if (files.length > 4) {
    throw new Error(t.actionErrors.stations_photoLimit);
  }

  return Promise.all(files.map((file) => uploadStationImageToCloudinary(file, stationId)));
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

function booleanFromFormData(formData: FormData, key: string): boolean {
  const value = formData.get(key);
  return value === "on" || value === "true" || value === "1";
}

export async function createStationAction(formData: FormData): Promise<StationActionResult> {
  const session = await requireRole(["manager", "supervisor"]);
  const t = await getActionMessages();
  const stationId = await generateNextStationId();
  let uploadedPhotoUrls: string[];

  try {
    uploadedPhotoUrls = await uploadStationPhotos(stationId, stationPhotoFiles(formData), t);
  } catch (error: unknown) {
    return {
      error: error instanceof Error ? error.message : t.actionErrors.stations_uploadPhotosFailed,
    };
  }

  const parsed = createStationSchema.safeParse({
    label: requiredString(formData, "label"),
    location: requiredString(formData, "location"),
    description: optionalString(formData, "description"),
    externalCode: optionalString(formData, "externalCode"),
    installationStatus: optionalString(formData, "installationStatus"),
    photoUrls: uploadedPhotoUrls,
    stationType: optionalString(formData, "stationType"),
    zone: optionalString(formData, "zone"),
    requiresImmediateSupervision: booleanFromFormData(formData, "requiresImmediateSupervision"),
    coordinates: optionalCoordinates(formData),
  });

  if (!parsed.success) {
    return {
      error: t.actionErrors.stations_validationFailed,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const qrCodeValue = await buildStationReportUrl(stationId);

  await createStationRecord({
    stationId,
    label: parsed.data.label,
    location: parsed.data.location,
    description: parsed.data.description,
    externalCode: parsed.data.externalCode,
    installationStatus: parsed.data.installationStatus,
    photoUrls: parsed.data.photoUrls,
    stationType: parsed.data.stationType,
    zone: parsed.data.zone,
    coordinates: parsed.data.coordinates,
    qrCodeValue,
    requiresImmediateSupervision: parsed.data.requiresImmediateSupervision,
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
      description: parsed.data.description,
      externalCode: parsed.data.externalCode,
      installationStatus: parsed.data.installationStatus,
      photoUrls: parsed.data.photoUrls,
      stationType: parsed.data.stationType,
      zone: parsed.data.zone,
      requiresImmediateSupervision: parsed.data.requiresImmediateSupervision,
      coordinates: parsed.data.coordinates,
    },
  });

  revalidatePath("/dashboard/manager/stations");
  revalidatePath("/dashboard/supervisor/stations");
  redirect(session.role === "supervisor" ? "/dashboard/supervisor/stations" : "/dashboard/manager/stations");
}

export async function updateStationAction(stationId: string, formData: FormData): Promise<StationActionResult> {
  const session = await requireRole(["manager"]);
  const t = await getActionMessages();
  const station = await getStationById(stationId);

  if (!station) {
    return { error: t.actionErrors.stations_notFound };
  }

  let uploadedPhotoUrls: string[];

  try {
    uploadedPhotoUrls = await uploadStationPhotos(stationId, stationPhotoFiles(formData), t);
  } catch (error: unknown) {
    return {
      error: error instanceof Error ? error.message : t.actionErrors.stations_uploadPhotosFailed,
    };
  }

  const photoUrls = [...(station.photoUrls ?? []), ...uploadedPhotoUrls].slice(0, 8);
  const parsed = updateStationSchema.safeParse({
    label: requiredString(formData, "label"),
    location: requiredString(formData, "location"),
    description: optionalString(formData, "description"),
    externalCode: optionalString(formData, "externalCode"),
    installationStatus: optionalString(formData, "installationStatus"),
    photoUrls,
    stationType: optionalString(formData, "stationType"),
    zone: optionalString(formData, "zone"),
    requiresImmediateSupervision: booleanFromFormData(formData, "requiresImmediateSupervision"),
    coordinates: optionalCoordinates(formData),
  });

  if (!parsed.success) {
    return {
      error: t.actionErrors.stations_validationFailed,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const qrCodeValue = await buildStationReportUrl(stationId);

  await updateStationRecord(stationId, {
    label: parsed.data.label,
    location: parsed.data.location,
    description: parsed.data.description,
    externalCode: parsed.data.externalCode,
    installationStatus: parsed.data.installationStatus,
    photoUrls: parsed.data.photoUrls,
    stationType: parsed.data.stationType,
    zone: parsed.data.zone,
    coordinates: parsed.data.coordinates,
    qrCodeValue,
    requiresImmediateSupervision: parsed.data.requiresImmediateSupervision,
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

export interface DeleteStationImageResult {
  error?: string;
  success?: boolean;
}

export async function deleteStationImageAction(
  stationId: string,
  imageUrl: string,
): Promise<DeleteStationImageResult> {
  const session = await requireRole(["manager"]);
  const t = await getActionMessages();
  const station = await getStationById(stationId);

  if (!station) {
    return { error: t.actionErrors.stations_notFound };
  }

  const currentPhotoUrls = station.photoUrls ?? [];

  if (!currentPhotoUrls.includes(imageUrl)) {
    return { error: t.actionErrors.stations_imageNotFound };
  }

  try {
    await deleteStationImageFromCloudinary(imageUrl);
  } catch {
    // Continue to update DB even if Cloudinary delete fails
  }

  const updatedPhotoUrls = currentPhotoUrls.filter((url) => url !== imageUrl);

  await updateStationRecord(stationId, {
    label: station.label,
    location: station.location,
    description: station.description,
    photoUrls: updatedPhotoUrls,
    zone: station.zone,
    coordinates: station.coordinates,
    qrCodeValue: station.qrCodeValue,
    requiresImmediateSupervision: station.requiresImmediateSupervision,
    updatedBy: session.uid,
  });

  await writeAuditLog({
    actorUid: session.uid,
    actorRole: session.role,
    action: "station.image.delete",
    entityType: "station",
    entityId: stationId,
    metadata: { deletedImageUrl: imageUrl, remainingImages: updatedPhotoUrls.length },
  });

  revalidatePath("/dashboard/manager/stations");
  revalidatePath(`/dashboard/manager/stations/${stationId}`);

  return { success: true };
}

export async function deleteStationAction(stationId: string): Promise<void> {
  const session = await requireRole(["manager"]);
  const t = await getActionMessages();

  try {
    await deleteStationIfSafe({ actorUid: session.uid, actorRole: session.role, stationId });
  } catch (error: unknown) {
    redirect(
      `/dashboard/manager/stations?error=${encodeURIComponent(error instanceof Error ? error.message : t.actionErrors.stations_deleteFailed)}`,
    );
  }

  revalidatePath("/dashboard/manager/stations");
  revalidatePath("/dashboard/manager");
  redirect("/dashboard/manager/stations?success=1");
}
