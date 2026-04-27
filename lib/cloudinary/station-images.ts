import "server-only";

import { createHash } from "node:crypto";
import { validateReportImageFile } from "@/lib/reports/image-validation";
import { isRecord } from "@/lib/utils";

interface CloudinaryConfig {
  apiKey: string;
  apiSecret: string;
  cloudName: string;
  folder: string;
}

function getCloudinaryConfig(): CloudinaryConfig | null {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  if (!cloudName || !apiKey || !apiSecret) {
    return null;
  }

  return {
    apiKey,
    apiSecret,
    cloudName,
    folder: process.env.CLOUDINARY_STATION_FOLDER?.trim() || "ecopest/stations",
  };
}

function signUploadParams(params: Record<string, string>, apiSecret: string): string {
  const payload = Object.entries(params)
    .filter(([, value]) => value.length > 0)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return createHash("sha1").update(`${payload}${apiSecret}`).digest("hex");
}

function isCloudinaryUploadResponse(value: unknown): value is { secure_url: string } {
  return isRecord(value) && typeof value.secure_url === "string";
}

export function hasCloudinaryStationUploadConfig(): boolean {
  return getCloudinaryConfig() !== null;
}

export async function uploadStationImageToCloudinary(file: File, stationId: string): Promise<string> {
  const config = getCloudinaryConfig();

  if (!config) {
    throw new Error("إعدادات Cloudinary غير مكتملة. أضف CLOUDINARY_CLOUD_NAME و CLOUDINARY_API_KEY و CLOUDINARY_API_SECRET.");
  }

  const image = await validateReportImageFile(file);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const publicId = `${stationId}-${crypto.randomUUID()}`;
  const params = {
    folder: config.folder,
    public_id: publicId,
    timestamp,
  };
  const bytes = new Uint8Array(image.buffer.byteLength);
  const body = new FormData();

  bytes.set(image.buffer);
  body.set("api_key", config.apiKey);
  body.set("folder", params.folder);
  body.set("public_id", params.public_id);
  body.set("timestamp", params.timestamp);
  body.set("signature", signUploadParams(params, config.apiSecret));
  body.set("file", new Blob([bytes.buffer], { type: image.contentType }), `station.${image.extension}`);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`, {
    method: "POST",
    body,
  });
  const payload = (await response.json()) as unknown;

  if (!response.ok || !isCloudinaryUploadResponse(payload)) {
    throw new Error("تعذر رفع صورة المحطة إلى Cloudinary.");
  }

  return payload.secure_url;
}
