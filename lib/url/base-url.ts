import "server-only";

import { headers } from "next/headers";
import { getServerEnv } from "@/lib/env/server";

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

export function validateBaseUrl(value: string, requireHttps: boolean): string {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error("NEXT_PUBLIC_BASE_URL must be a valid http/https URL.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("NEXT_PUBLIC_BASE_URL must use http or https.");
  }

  if (requireHttps && url.protocol !== "https:") {
    throw new Error("NEXT_PUBLIC_BASE_URL must use https in production.");
  }

  return normalizeBaseUrl(url.toString());
}

export async function getAppBaseUrl(): Promise<string> {
  const env = getServerEnv();

  if (env.NEXT_PUBLIC_BASE_URL) {
    return validateBaseUrl(env.NEXT_PUBLIC_BASE_URL, env.NODE_ENV === "production");
  }

  if (env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_BASE_URL is required in production.");
  }

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");

  if (!host) {
    throw new Error("Unable to determine development application origin.");
  }

  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";

  return validateBaseUrl(`${protocol}://${host}`, false);
}

export async function buildStationReportUrl(stationId: string): Promise<string> {
  const baseUrl = await getAppBaseUrl();

  return `${baseUrl}/station/${encodeURIComponent(stationId)}/report`;
}
