import "server-only";

import { uploadReportImageToCloudinary } from "@/lib/cloudinary/report-images";
import { AppError } from "@/lib/errors";
import { fileToInlineReportImageDataUrl } from "@/lib/reports/inline-report-image-url";

/** Prefer Cloudinary when configured; otherwise persist as data URL in DB. */
export async function storeReportImage(file: File, stationId: string, label: string): Promise<string> {
  try {
    return await uploadReportImageToCloudinary(file, stationId, label);
  } catch {
    try {
      return await fileToInlineReportImageDataUrl(file);
    } catch (error: unknown) {
      throw new AppError(
        error instanceof Error ? error.message : "الصورة المرفقة غير صالحة.",
        "REPORT_IMAGE_INVALID",
        400,
      );
    }
  }
}
