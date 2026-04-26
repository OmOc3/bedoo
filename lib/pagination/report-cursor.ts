import { z } from "zod";

export interface ReportCursor {
  id: string;
  submittedAtMs: number;
}

const cursorSchema = z.object({
  id: z.string().min(1),
  submittedAtMs: z.number().int().nonnegative(),
});

function encodeBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

export function encodeReportCursor(cursor: ReportCursor): string {
  return encodeBase64Url(JSON.stringify(cursorSchema.parse(cursor)));
}

export function decodeReportCursor(value: string | undefined): ReportCursor | null {
  if (!value) {
    return null;
  }

  try {
    return cursorSchema.parse(JSON.parse(decodeBase64Url(value)));
  } catch {
    return null;
  }
}
