"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/server-session";
import { getOpenAttendanceSession, getReportById, getStationById, requireOpenTechnicianShift, submitReportRecord, updateReportReviewRecord, updateReportSubmissionByReviewer } from "@/lib/db/repositories";
import { AppError } from "@/lib/errors";
import { editSubmittedReportSchema, reviewReportSchema, submitReportSchema } from "@/lib/validation/reports";
import { storeReportImage } from "@/lib/reports/store-report-image";
import { assertStationAccessLocation, type StationAccessLocation } from "@/lib/stations/location-access";
import { writeAuditLog } from "@/lib/audit";

export interface SubmitReportActionResult {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  reportId?: string;
  success?: boolean;
}

export interface ReviewReportActionResult {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  success?: boolean;
}

export interface EditSubmittedReportActionResult {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
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

function stringArray(formData: FormData, key: string): string[] {
  return formData.getAll(key).filter((value): value is string => typeof value === "string");
}

function getImageFile(formData: FormData, key: string): File | undefined {
  const value = formData.get(key);
  return value instanceof File && value.size > 0 ? value : undefined;
}

function getImageFiles(formData: FormData, key: string): File[] {
  return formData.getAll(key).filter((value): value is File => value instanceof File && value.size > 0);
}

function optionalNumber(formData: FormData, key: string): number | undefined {
  const value = optionalString(formData, key);

  if (!value) {
    return undefined;
  }

  return Number(value);
}

function reportLocationFromFormData(formData: FormData): StationAccessLocation | null {
  const lat = optionalNumber(formData, "lat");
  const lng = optionalNumber(formData, "lng");

  if (lat === undefined && lng === undefined) {
    return null;
  }

  return {
    accuracyMeters: optionalNumber(formData, "accuracyMeters"),
    lat: lat ?? Number.NaN,
    lng: lng ?? Number.NaN,
  };
}

export async function submitStationReportAction(
  stationId: string,
  formData: FormData,
): Promise<SubmitReportActionResult> {
  const session = await requireRole(["technician", "manager"]);
  const parsed = submitReportSchema.safeParse({
    stationId,
    status: stringArray(formData, "status"),
    pestTypes: stringArray(formData, "pestTypes"),
    notes: optionalString(formData, "notes"),
    beforePhoto: getImageFile(formData, "beforePhoto"),
    afterPhoto: getImageFile(formData, "afterPhoto"),
    duringPhotos: getImageFiles(formData, "duringPhotos"),
    otherPhotos: getImageFiles(formData, "otherPhotos"),
    stationPhoto: getImageFile(formData, "stationPhoto"),
  });

  if (!parsed.success) {
    return {
      error: "تحقق من بيانات التقرير وحاول مرة أخرى.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const station = await getStationById(parsed.data.stationId);

  if (!station) {
    return { error: "المحطة غير موجودة" };
  }

  if (!station.isActive) {
    return { error: "هذه المحطة غير نشطة" };
  }

  if (session.role === "technician") {
    try {
      const openShift = await requireOpenTechnicianShift(session.uid);
      const openAttendance = await getOpenAttendanceSession(session.uid);

      if (openAttendance?.clockInLocation?.stationId !== parsed.data.stationId || openAttendance.shiftId !== openShift.shiftId) {
        return { error: "يجب تسجيل الحضور في هذه المحطة قبل حفظ التقرير." };
      }
    } catch {
      return { error: "يجب تسجيل الحضور في هذه المحطة قبل حفظ التقرير." };
    }

    const reportLocation = reportLocationFromFormData(formData);

    if (!reportLocation) {
      const message = "يجب السماح بقراءة موقعك الحالي قبل حفظ التقرير.";

      await writeAuditLog({
        actorUid: session.uid,
        actorRole: session.role,
        action: "report.submit_rejected",
        entityType: "station",
        entityId: parsed.data.stationId,
        metadata: {
          code: "REPORT_LOCATION_REQUIRED",
          message,
          stationId: parsed.data.stationId,
        },
      });

      return { error: message };
    }

    try {
      assertStationAccessLocation(station, reportLocation);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "المحطة دي خارج النطاق ولا يمكن حفظ التقرير.";

      await writeAuditLog({
        actorUid: session.uid,
        actorRole: session.role,
        action: "report.submit_rejected",
        entityType: "station",
        entityId: parsed.data.stationId,
        metadata: {
          accuracyMeters: reportLocation.accuracyMeters,
          code: error instanceof AppError ? error.code : "REPORT_LOCATION_REJECTED",
          lat: reportLocation.lat,
          lng: reportLocation.lng,
          message,
          stationId: parsed.data.stationId,
        },
      });

      return { error: message };
    }
  }

  try {
    const clientReportId = crypto.randomUUID();
    const duringPhotoFiles = parsed.data.duringPhotos ?? [];
    const otherPhotoFiles = parsed.data.otherPhotos ?? [];
    const [beforePhotoUrl, afterPhotoUrl, stationPhotoUrl, duringPhotoUrls, otherPhotoUrls] = await Promise.all([
      parsed.data.beforePhoto
        ? storeReportImage(parsed.data.beforePhoto, parsed.data.stationId, `${clientReportId}-before`)
        : Promise.resolve(undefined),
      parsed.data.afterPhoto
        ? storeReportImage(parsed.data.afterPhoto, parsed.data.stationId, `${clientReportId}-after`)
        : Promise.resolve(undefined),
      parsed.data.stationPhoto
        ? storeReportImage(parsed.data.stationPhoto, parsed.data.stationId, `${clientReportId}-station`)
        : Promise.resolve(undefined),
      Promise.all(
        duringPhotoFiles.map((file, index) =>
          storeReportImage(file, parsed.data.stationId, `${clientReportId}-during-${index + 1}`),
        ),
      ),
      Promise.all(
        otherPhotoFiles.map((file, index) =>
          storeReportImage(file, parsed.data.stationId, `${clientReportId}-other-${index + 1}`),
        ),
      ),
    ]);
    const photos = [
      ...(stationPhotoUrl ? [{ category: "station" as const, url: stationPhotoUrl, sortOrder: 0 }] : []),
      ...(beforePhotoUrl ? [{ category: "before" as const, url: beforePhotoUrl, sortOrder: 1 }] : []),
      ...(afterPhotoUrl ? [{ category: "after" as const, url: afterPhotoUrl, sortOrder: 2 }] : []),
      ...duringPhotoUrls.map((url, index) => ({ category: "during" as const, url, sortOrder: 10 + index })),
      ...otherPhotoUrls.map((url, index) => ({ category: "other" as const, url, sortOrder: 30 + index })),
    ];

    const result = await submitReportRecord({
      actorUid: session.uid,
      actorRole: session.role,
      reportId: crypto.randomUUID(),
      clientReportId,
      stationId: parsed.data.stationId,
      technicianName: session.user.displayName,
      status: parsed.data.status,
      pestTypes: parsed.data.pestTypes,
      notes: parsed.data.notes,
      photos,
      photoPaths: {
        before: beforePhotoUrl,
        after: afterPhotoUrl,
        station: stationPhotoUrl,
      },
    });

    revalidatePath("/dashboard/manager");
    revalidatePath("/dashboard/manager/reports");
    revalidatePath("/dashboard/manager/tasks");
    revalidatePath("/dashboard/supervisor");
    revalidatePath("/dashboard/supervisor/reports");
    revalidatePath("/dashboard/supervisor/tasks");

    return {
      success: true,
      reportId: result.reportId,
    };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : "تعذر حفظ التقرير." };
  }
}

export async function addReviewReportAction(
  reportId: string,
  formData: FormData,
): Promise<ReviewReportActionResult> {
  const session = await requireRole(["manager", "supervisor"]);
  const reviewStatusRaw = formData.get("reviewStatus");
  const parsed = reviewReportSchema.safeParse({
    reviewStatus: typeof reviewStatusRaw === "string" ? reviewStatusRaw : undefined,
    reviewNotes: optionalString(formData, "reviewNotes"),
  });

  if (!parsed.success) {
    return {
      error: "تحقق من بيانات المراجعة وحاول مرة أخرى.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const report = await updateReportReviewRecord(reportId, {
    reviewStatus: parsed.data.reviewStatus,
    reviewNotes: parsed.data.reviewNotes,
    reviewedBy: session.uid,
  });

  if (!report) {
    return { error: "التقرير غير موجود." };
  }

  await writeAuditLog({
    actorUid: session.uid,
    actorRole: session.role,
    action: "report.review",
    entityType: "report",
    entityId: reportId,
    metadata: {
      stationId: report.stationId,
      reviewStatus: parsed.data.reviewStatus,
    },
  });

  revalidatePath("/dashboard/manager/reports");
  revalidatePath("/dashboard/supervisor/reports");
  revalidatePath("/dashboard/manager/tasks");
  revalidatePath("/dashboard/supervisor/tasks");

  return { success: true };
}

export async function editSubmittedReportAction(
  reportId: string,
  formData: FormData,
): Promise<EditSubmittedReportActionResult> {
  const session = await requireRole(["manager", "supervisor"]);
  const parsed = editSubmittedReportSchema.safeParse({
    notes: optionalString(formData, "notes"),
    status: stringArray(formData, "status"),
    pestTypes: stringArray(formData, "pestTypes"),
  });

  if (!parsed.success) {
    return {
      error: "تحقق من بيانات التعديل وحاول مرة أخرى.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const existing = await getReportById(reportId);

  if (!existing) {
    return { error: "التقرير غير موجود." };
  }

  const canSupervisorEdit = session.role === "supervisor" && existing.reviewStatus === "pending";
  const canManagerEdit = session.role === "manager";

  if (!canSupervisorEdit && !canManagerEdit) {
    return { error: "لا يمكن تعديل التقرير بعد اعتماد المراجعة." };
  }

  const updated = await updateReportSubmissionByReviewer(reportId, {
    actorUid: session.uid,
    actorRole: session.role,
    notes: parsed.data.notes,
    status: parsed.data.status,
    pestTypes: parsed.data.pestTypes,
  });

  if (!updated) {
    return { error: "تعذر حفظ التعديلات." };
  }

  revalidatePath("/dashboard/manager/reports");
  revalidatePath("/dashboard/supervisor/reports");
  revalidatePath("/dashboard/manager/tasks");
  revalidatePath("/dashboard/supervisor/tasks");

  return { success: true };
}
