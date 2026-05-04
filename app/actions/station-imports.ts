"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/server-session";
import {
  applyStationImport,
  listStationImportExistingKeys,
  type ApplyStationImportResult,
} from "@/lib/db/repositories";
import { previewStationImportCsv, type StationImportPreview } from "@/lib/stations/import-csv";
import { stationImportFormSchema } from "@/lib/validation/station-imports";

export interface StationImportActionResult {
  applyResult?: ApplyStationImportResult;
  error?: string;
  preview?: StationImportPreview;
  success?: boolean;
}

function optionalString(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

async function buildPreview(formData: FormData): Promise<{
  clientUid: string;
  csvText: string;
  preview: StationImportPreview;
  sourceDocumentId?: string;
  sourceName: string;
}> {
  const parsed = stationImportFormSchema.safeParse({
    clientUid: formData.get("clientUid"),
    csvText: formData.get("csvText"),
    sourceDocumentId: optionalString(formData, "sourceDocumentId"),
    sourceName: formData.get("sourceName"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "بيانات الاستيراد غير صالحة.");
  }

  const existingKeys = await listStationImportExistingKeys(parsed.data.clientUid);
  const preview = previewStationImportCsv(parsed.data.csvText, existingKeys);

  return {
    clientUid: parsed.data.clientUid,
    csvText: parsed.data.csvText,
    preview,
    sourceDocumentId: parsed.data.sourceDocumentId,
    sourceName: parsed.data.sourceName,
  };
}

export async function previewStationImportAction(formData: FormData): Promise<StationImportActionResult> {
  await requireRole(["manager"]);

  try {
    const result = await buildPreview(formData);
    return { preview: result.preview };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : "تعذر تحليل ملف الاستيراد." };
  }
}

export async function applyStationImportAction(formData: FormData): Promise<StationImportActionResult> {
  const session = await requireRole(["manager"]);

  try {
    const result = await buildPreview(formData);
    const applyResult = await applyStationImport({
      actorRole: session.role,
      actorUid: session.uid,
      clientUid: result.clientUid,
      preview: result.preview,
      sourceDocumentId: result.sourceDocumentId,
      sourceName: result.sourceName,
    });

    revalidatePath("/dashboard/manager/stations");
    revalidatePath("/dashboard/manager/stations/import");
    revalidatePath(`/dashboard/manager/client-orders/${result.clientUid}`);
    revalidatePath("/client/portal");

    return { applyResult, preview: result.preview, success: true };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : "تعذر تطبيق الاستيراد." };
  }
}
