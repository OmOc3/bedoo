import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

function getStationQrSecret(): string {
  const fromEnv =
    process.env.ECOPEST_QR_SECRET?.trim() ||
    process.env.BETTER_AUTH_SECRET?.trim() ||
    process.env.AUTH_ROLE_COOKIE_SECRET?.trim();

  if (fromEnv && fromEnv.length >= 8) {
    return fromEnv;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("BETTER_AUTH_SECRET (or ECOPEST_QR_SECRET) is required to sign station QR links in production.");
  }

  return "ecopest-dev-only-qr-secret-change-me";
}

/** Deterministic token bound to a station (HMAC). */
export function signStationQrToken(stationId: string): string {
  return createHmac("sha256", getStationQrSecret())
    .update(`ecopest:qr:v1:${stationId}`)
    .digest("base64url")
    .slice(0, 48);
}

/** Legacy URLs without `qr` still work. If `qr` is present it must match. */
export function verifyStationQrToken(stationId: string, token: string | undefined): boolean {
  if (token === undefined || token === "") {
    return true;
  }

  const expected = signStationQrToken(stationId);

  try {
    const a = Buffer.from(token, "utf8");
    const b = Buffer.from(expected, "utf8");

    if (a.length !== b.length) {
      return false;
    }

    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
