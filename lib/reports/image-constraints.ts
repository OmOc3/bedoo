export const allowedReportImageTypes = ["image/jpeg", "image/png", "image/webp"] as const;
export type AllowedReportImageType = (typeof allowedReportImageTypes)[number];

export const maxReportImageSizeBytes = 5 * 1024 * 1024;

export function normalizeReportImageType(value: string): AllowedReportImageType | null {
  const normalized = value.trim().toLowerCase();

  if (normalized === "image/jpg" || normalized === "image/pjpeg") {
    return "image/jpeg";
  }

  return allowedReportImageTypes.includes(normalized as AllowedReportImageType)
    ? (normalized as AllowedReportImageType)
    : null;
}

export function isAllowedReportImageType(value: string): boolean {
  return normalizeReportImageType(value) !== null;
}
