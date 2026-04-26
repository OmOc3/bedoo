export const allowedReportImageTypes = ["image/jpeg", "image/png", "image/webp"] as const;
export type AllowedReportImageType = (typeof allowedReportImageTypes)[number];

export const maxReportImageSizeBytes = 5 * 1024 * 1024;

export interface ValidReportImage {
  buffer: Buffer;
  contentType: AllowedReportImageType;
  extension: "jpg" | "png" | "webp";
}

function sniffImage(buffer: Buffer): Omit<ValidReportImage, "buffer"> | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { contentType: "image/jpeg", extension: "jpg" };
  }

  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { contentType: "image/png", extension: "png" };
  }

  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { contentType: "image/webp", extension: "webp" };
  }

  return null;
}

export async function validateReportImageFile(file: File): Promise<ValidReportImage> {
  if (file.size > maxReportImageSizeBytes) {
    throw new Error("حجم الصورة يجب ألا يتجاوز 5 ميجابايت.");
  }

  if (!allowedReportImageTypes.includes(file.type as AllowedReportImageType)) {
    throw new Error("ارفع صورة فقط بصيغة JPG أو PNG أو WebP.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const sniffed = sniffImage(buffer);

  if (!sniffed || sniffed.contentType !== file.type) {
    throw new Error("محتوى الصورة لا يطابق الصيغة المرسلة.");
  }

  return { buffer, ...sniffed };
}
