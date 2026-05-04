"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/server-session";
import { uploadClientAnalysisDocumentToCloudinary } from "@/lib/cloudinary/client-documents";
import {
  approveDailyAreaTask,
  cancelDailyAreaTask,
  completeDailyAreaTask,
  createClientAnalysisDocument,
  createClientServiceArea,
  createDailyAreaTask,
  getDailyAreaTaskById,
  getOpenShift,
  setClientAnalysisDocumentVisibility,
  setClientServiceAreaStatus,
  setDailyAreaTaskClientVisibility,
  updateClientServiceAreaQrCode,
  updateClientStationVisibility,
} from "@/lib/db/repositories";
import { buildServiceAreaScanUrl } from "@/lib/url/base-url";
import { getActionMessages } from "@/lib/i18n/action-locale";
import {
  completeDailyAreaTaskSchema,
  createClientServiceAreaSchema,
  createDailyAreaTaskSchema,
  updateClientStationVisibilitySchema,
  uploadClientAnalysisDocumentSchema,
} from "@/lib/validation/client-visibility";

export interface ClientVisibilityActionResult {
  error?: string;
  success?: boolean;
}

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
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

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : Number.NaN;
}

function booleanFromFormData(formData: FormData, key: string): boolean {
  const value = formData.get(key);
  return value === "on" || value === "true" || value === "1";
}

function revalidateClientVisibility(clientUid?: string): void {
  revalidatePath("/client/portal");
  revalidatePath("/dashboard/manager/client-orders");
  revalidatePath("/dashboard/supervisor/client-orders");
  revalidatePath("/dashboard/manager/area-tasks");
  revalidatePath("/dashboard/supervisor/area-tasks");

  if (clientUid) {
    revalidatePath(`/dashboard/manager/client-orders/${clientUid}`);
    revalidatePath(`/dashboard/supervisor/client-orders/${clientUid}`);
  }
}

export async function uploadClientAnalysisDocumentAction(formData: FormData): Promise<ClientVisibilityActionResult> {
  const session = await requireRole(["manager", "supervisor"]);
  const t = await getActionMessages();
  const parsed = uploadClientAnalysisDocumentSchema.safeParse({
    clientUid: formData.get("clientUid"),
    title: formData.get("title"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t.actionErrors.clientVisibility_fileDataInvalid };
  }

  const file = formData.get("file");

  if (!(file instanceof File) || file.size <= 0) {
    return { error: t.actionErrors.clientVisibility_pdfWordOnly };
  }

  try {
    const uploaded = await uploadClientAnalysisDocumentToCloudinary(file, parsed.data.clientUid);
    await createClientAnalysisDocument({
      actorRole: session.role,
      actorUid: session.uid,
      clientUid: parsed.data.clientUid,
      fileName: uploaded.fileName,
      fileType: uploaded.fileType,
      fileUrl: uploaded.fileUrl,
      isVisibleToClient: true,
      title: parsed.data.title,
    });

    revalidateClientVisibility(parsed.data.clientUid);
    return { success: true };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : t.actionErrors.clientVisibility_uploadAnalysisFailed };
  }
}

export async function toggleClientAnalysisDocumentVisibilityAction(
  formData: FormData,
): Promise<ClientVisibilityActionResult> {
  const session = await requireRole(["manager", "supervisor"]);
  const t = await getActionMessages();
  const documentId = formString(formData, "documentId");
  const isVisibleToClient = booleanFromFormData(formData, "isVisibleToClient");

  if (!documentId) {
    return { error: t.actionErrors.clientVisibility_analysisFileMissing };
  }

  try {
    const clientUid = await setClientAnalysisDocumentVisibility({
      actorRole: session.role,
      actorUid: session.uid,
      documentId,
      isVisibleToClient,
    });

    revalidateClientVisibility(clientUid);
    return { success: true };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : t.actionErrors.clientVisibility_fileVisibilityUpdateFailed };
  }
}

export async function toggleClientAnalysisDocumentVisibilityFormAction(formData: FormData): Promise<void> {
  await toggleClientAnalysisDocumentVisibilityAction(formData);
}

export async function createClientServiceAreaAction(formData: FormData): Promise<ClientVisibilityActionResult> {
  const session = await requireRole(["manager", "supervisor"]);
  const t = await getActionMessages();
  const lat = optionalNumber(formData, "lat");
  const lng = optionalNumber(formData, "lng");
  const parsed = createClientServiceAreaSchema.safeParse({
    clientUid: formData.get("clientUid"),
    description: optionalString(formData, "description"),
    lat: lat !== undefined && !Number.isNaN(lat) ? lat : undefined,
    lng: lng !== undefined && !Number.isNaN(lng) ? lng : undefined,
    location: formData.get("location"),
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t.actionErrors.clientVisibility_areaDataInvalid };
  }

  const areaId = crypto.randomUUID();

  try {
    const area = await createClientServiceArea({
      actorRole: session.role,
      actorUid: session.uid,
      areaId,
      clientUid: parsed.data.clientUid,
      coordinates:
        typeof parsed.data.lat === "number" && typeof parsed.data.lng === "number"
          ? { lat: parsed.data.lat, lng: parsed.data.lng }
          : undefined,
      description: parsed.data.description,
      location: parsed.data.location,
      name: parsed.data.name,
      qrCodeValue: await buildServiceAreaScanUrl(areaId),
    });

    if (!area.qrCodeValue.includes(area.areaId)) {
      await updateClientServiceAreaQrCode(area.areaId, await buildServiceAreaScanUrl(area.areaId), session.uid);
    }

    revalidateClientVisibility(parsed.data.clientUid);
    return { success: true };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : t.actionErrors.clientVisibility_createAreaFailed };
  }
}

export async function toggleClientServiceAreaStatusAction(formData: FormData): Promise<ClientVisibilityActionResult> {
  const session = await requireRole(["manager", "supervisor"]);
  const t = await getActionMessages();
  const areaId = formString(formData, "areaId");
  const isActive = booleanFromFormData(formData, "isActive");

  if (!areaId) {
    return { error: t.actionErrors.clientVisibility_areaMissing };
  }

  try {
    const clientUid = await setClientServiceAreaStatus({
      actorRole: session.role,
      actorUid: session.uid,
      areaId,
      isActive,
    });

    revalidateClientVisibility(clientUid);
    return { success: true };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : t.actionErrors.clientVisibility_areaStatusUpdateFailed };
  }
}

export async function toggleClientServiceAreaStatusFormAction(formData: FormData): Promise<void> {
  await toggleClientServiceAreaStatusAction(formData);
}

export async function updateClientStationVisibilityAction(formData: FormData): Promise<ClientVisibilityActionResult> {
  const session = await requireRole(["manager", "supervisor"]);
  const t = await getActionMessages();
  const parsed = updateClientStationVisibilitySchema.safeParse({
    clientUid: formData.get("clientUid"),
    reportsVisibleToClient: booleanFromFormData(formData, "reportsVisibleToClient"),
    stationId: formData.get("stationId"),
    stationVisibleToClient: booleanFromFormData(formData, "stationVisibleToClient"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t.actionErrors.clientVisibility_stationVisibilityInvalid };
  }

  try {
    await updateClientStationVisibility({
      actorRole: session.role,
      actorUid: session.uid,
      clientUid: parsed.data.clientUid,
      reportsVisibleToClient: parsed.data.reportsVisibleToClient,
      stationId: parsed.data.stationId,
      stationVisibleToClient: parsed.data.stationVisibleToClient,
    });

    revalidateClientVisibility(parsed.data.clientUid);
    return { success: true };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : t.actionErrors.clientVisibility_stationVisibilityUpdateFailed };
  }
}

export async function updateClientStationVisibilityFormAction(formData: FormData): Promise<void> {
  await updateClientStationVisibilityAction(formData);
}

export async function createDailyAreaTaskAction(formData: FormData): Promise<ClientVisibilityActionResult> {
  const session = await requireRole(["manager", "supervisor"]);
  const t = await getActionMessages();
  const parsed = createDailyAreaTaskSchema.safeParse({
    areaId: formData.get("areaId"),
    notes: optionalString(formData, "notes"),
    scheduledDate: formData.get("scheduledDate"),
    technicianUid: formData.get("technicianUid"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t.actionErrors.clientVisibility_taskDataInvalid };
  }

  try {
    await createDailyAreaTask({
      actorRole: session.role,
      actorUid: session.uid,
      areaId: parsed.data.areaId,
      notes: parsed.data.notes,
      scheduledDate: parsed.data.scheduledDate,
      technicianUid: parsed.data.technicianUid,
    });

    revalidateClientVisibility();
    revalidatePath("/scan");
    return { success: true };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : t.actionErrors.clientVisibility_createTaskFailed };
  }
}

export async function approveDailyAreaTaskAction(formData: FormData): Promise<void> {
  const session = await requireRole(["manager"]);
  const taskId = formString(formData, "taskId");

  if (!taskId) {
    return;
  }

  await approveDailyAreaTask({ actorRole: session.role, actorUid: session.uid, taskId });
  revalidateClientVisibility();
  revalidatePath("/scan");
}

export async function cancelDailyAreaTaskAction(formData: FormData): Promise<void> {
  const session = await requireRole(["manager", "supervisor"]);
  const taskId = formString(formData, "taskId");

  if (!taskId) {
    return;
  }

  await cancelDailyAreaTask({ actorRole: session.role, actorUid: session.uid, taskId });
  revalidateClientVisibility();
  revalidatePath("/scan");
}

export async function toggleDailyAreaTaskClientVisibilityAction(formData: FormData): Promise<void> {
  const session = await requireRole(["manager", "supervisor"]);
  const taskId = formString(formData, "taskId");
  const clientVisible = booleanFromFormData(formData, "clientVisible");

  if (!taskId) {
    return;
  }

  await setDailyAreaTaskClientVisibility({
    actorRole: session.role,
    actorUid: session.uid,
    clientVisible,
    taskId,
  });
  revalidateClientVisibility();
}

export async function completeDailyAreaTaskScanAction(formData: FormData): Promise<ClientVisibilityActionResult> {
  const session = await requireRole(["technician", "manager"]);
  const t = await getActionMessages();
  const parsed = completeDailyAreaTaskSchema.safeParse({
    notes: optionalString(formData, "notes"),
    sprayStatus: formData.get("sprayStatus"),
    taskId: formData.get("taskId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t.actionErrors.clientVisibility_sprayResultInvalid };
  }

  if (session.role === "technician") {
    const openShift = await getOpenShift(session.uid);

    if (!openShift) {
      return { error: t.actionErrors.clientVisibility_startShiftBeforeSpray };
    }
  }

  try {
    const task = await completeDailyAreaTask({
      actorRole: session.role,
      actorUid: session.uid,
      notes: parsed.data.notes,
      sprayStatus: parsed.data.sprayStatus,
      taskId: parsed.data.taskId,
      technicianName: session.user.displayName,
    });

    revalidateClientVisibility(task.clientUid);
    revalidatePath("/scan");
    return { success: true };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : t.actionErrors.clientVisibility_sprayResultSaveFailed };
  }
}

export async function loadDailyAreaTaskForAction(taskId: string) {
  return getDailyAreaTaskById(taskId);
}
