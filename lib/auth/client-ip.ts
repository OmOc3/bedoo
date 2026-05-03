import type { NextRequest } from "next/server";

/** Vercel يضيف عنوان العميل الحقيقي كآخر قيمة في x-forwarded-for. */
export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    const ips = forwardedFor
      .split(",")
      .map((ip) => ip.trim())
      .filter(Boolean);
    return ips[ips.length - 1] ?? "unknown";
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}
