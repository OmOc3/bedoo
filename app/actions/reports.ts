"use server";

import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/server-session";
import { REPORTS_COL, STATIONS_COL } from "@/lib/collections";
import { adminDb, adminStorage } from "@/lib/firebase-admin";
import { validateReportImageFile, type ValidReportImage } from "@/lib/reports/image-validation";
import { submitReportWithAdmin } from "@/lib/reports/submit-report";
import { reviewReportSchema, submitReportSchema } from "@/lib/validation/reports";
import { writeAuditLog } from "@/lib/audit";
import type { Report, ReportPhotoPaths, Station } from "@/types";

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

function optionalImageFile(formData: FormData, key: string): File | undefined {
  const value = formData.get(key);

  if (!(value instanceof File) || value.size === 0) {
    return undefined;
  }

  return value;
}

async function uploadReportPhoto(
  reportId: string,
  kind: keyof ReportPhotoPaths,
  image: ValidReportImage,
  originalName: string,
): Promise<string> {
  const path = `reports/${reportId}/${kind}.${image.extension}`;
  await adminStorage().bucket().file(path).save(image.buffer, {
    contentType: image.contentType,
    metadata: {
      metadata: {
        originalName,
      },
    },
  });

  return path;
}

async function cleanupUploadedPhotos(paths: string[]): Promise<void> {
  await Promise.all(
    paths.map(async (path) => {
      await adminStorage().bucket().file(path).delete().catch(() => undefined);
    }),
  );
}

export async function submitStationReportAction(
  stationId: string,
  formData: FormData,
): Promise<SubmitReportActionResult> {
  const session = await requireRole(["technician", "manager"]);
  const parsed = submitReportSchema.safeParse({
    stationId,
    status: stringArray(formData, "status"),
    notes: optionalString(formData, "notes"),
  });

  if (!parsed.success) {
    return {
      error: "تحقق من بيانات التقرير وحاول مرة أخرى.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const stationRef = adminDb().collection(STATIONS_COL).doc(parsed.data.stationId);
  const stationSnapshot = await stationRef.get();

  if (!stationSnapshot.exists) {
    return { error: "المحطة غير موجودة" };
  }

  const station = stationSnapshot.data() as Partial<Station>;

  if (!station.isActive) {
    return { error: "هذه المحطة غير نشطة" };
  }

  const reportRef = adminDb().collection(REPORTS_COL).doc();
  const beforePhoto = optionalImageFile(formData, "beforePhoto");
  const afterPhoto = optionalImageFile(formData, "afterPhoto");

  let beforeImage: ValidReportImage | undefined;
  let afterImage: ValidReportImage | undefined;

  try {
    [beforeImage, afterImage] = await Promise.all([
      beforePhoto ? validateReportImageFile(beforePhoto) : Promise.resolve(undefined),
      afterPhoto ? validateReportImageFile(afterPhoto) : Promise.resolve(undefined),
    ]);
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : "ارفع صورة فقط بصيغة مدعومة." };
  }

  const uploadedPaths: string[] = [];
  let beforePhotoPath: string | undefined;
  let afterPhotoPath: string | undefined;

  try {
    if (beforeImage && beforePhoto) {
      beforePhotoPath = await uploadReportPhoto(reportRef.id, "before", beforeImage, beforePhoto.name);
      uploadedPaths.push(beforePhotoPath);
    }

    if (afterImage && afterPhoto) {
      afterPhotoPath = await uploadReportPhoto(reportRef.id, "after", afterImage, afterPhoto.name);
      uploadedPaths.push(afterPhotoPath);
    }
  } catch (_error: unknown) {
    await cleanupUploadedPhotos(uploadedPaths);
    return { error: "تعذر رفع الصور. حاول مرة أخرى." };
  }

  const photoPaths: ReportPhotoPaths = {
    ...(beforePhotoPath ? { before: beforePhotoPath } : {}),
    ...(afterPhotoPath ? { after: afterPhotoPath } : {}),
  };

  try {
    const result = await submitReportWithAdmin({
      actorUid: session.uid,
      actorRole: session.role,
      reportId: reportRef.id,
      stationId: parsed.data.stationId,
      technicianName: session.user.displayName,
      status: parsed.data.status,
      notes: parsed.data.notes,
      photoPaths,
    });

    return {
      success: true,
      reportId: result.reportId,
    };
  } catch (error: unknown) {
    const reportExists = await reportRef.get().then((snapshot) => snapshot.exists).catch(() => false);

    if (!reportExists) {
      await cleanupUploadedPhotos(uploadedPaths);
    }

    return { error: error instanceof Error ? error.message : "تعذر حفظ التقرير." };
  }
}

export async function addReviewReportAction(
  reportId: string,
  formData: FormData,
): Promise<ReviewReportActionResult> {
  const session = await requireRole(["manager", "supervisor"]);
  const parsed = reviewReportSchema.safeParse({
    reviewStatus: optionalString(formData, "reviewStatus"),
    reviewNotes: optionalString(formData, "reviewNotes"),
  });

  if (!parsed.success) {
    return {
      error: "تحقق من بيانات المراجعة وحاول مرة أخرى.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const reportRef = adminDb().collection(REPORTS_COL).doc(reportId);
  const reportSnapshot = await reportRef.get();

  if (!reportSnapshot.exists) {
    return { error: "التقرير غير موجود." };
  }

  const report = reportSnapshot.data() as Partial<Report>;

  await reportRef.update({
    reviewStatus: parsed.data.reviewStatus,
    reviewedAt: FieldValue.serverTimestamp(),
    reviewedBy: session.uid,
    reviewNotes: parsed.data.reviewNotes ?? FieldValue.delete(),
  });

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

  return { success: true };
}
