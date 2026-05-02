import "server-only";

import { uploadReportImageToCloudinary } from "@/lib/cloudinary/report-images";
import { fileToInlineReportImageDataUrl } from "@/lib/reports/inline-report-image-url";

/** Prefer Cloudinary when configured; otherwise persist as data URL in DB. */
export async function storeReportImage(file: File, stationId: string, label: string): Promise<string> {
  try {
    return await uploadReportImageToCloudinary(file, stationId, label);
  } catch {
    return fileToInlineReportImageDataUrl(file);
  }
}
