import { validateReportImageFile } from "@/lib/reports/image-validation";

/** Store image bytes as a data URL (SQLite / report_photos). */
export async function fileToInlineReportImageDataUrl(file: File): Promise<string> {
  const validated = await validateReportImageFile(file);

  return `data:${validated.contentType};base64,${validated.buffer.toString("base64")}`;
}
