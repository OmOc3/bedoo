"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/server-session";
import { getStationById, submitReportRecord, updateReportReviewRecord } from "@/lib/db/repositories";
import { reviewReportSchema, submitReportSchema } from "@/lib/validation/reports";
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

function hasImageFile(formData: FormData, key: string): boolean {
  const value = formData.get(key);

  return value instanceof File && value.size > 0;
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

  const station = await getStationById(parsed.data.stationId);

  if (!station) {
    return { error: "المحطة غير موجودة" };
  }

  if (!station.isActive) {
    return { error: "هذه المحطة غير نشطة" };
  }

  if (hasImageFile(formData, "beforePhoto") || hasImageFile(formData, "afterPhoto")) {
    return { error: "رفع الصور غير متاح في هذه المرحلة بعد إزالة التخزين الخارجي." };
  }

  try {
    const result = await submitReportRecord({
      actorUid: session.uid,
      actorRole: session.role,
      reportId: crypto.randomUUID(),
      stationId: parsed.data.stationId,
      technicianName: session.user.displayName,
      status: parsed.data.status,
      notes: parsed.data.notes,
    });

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

  return { success: true };
}
