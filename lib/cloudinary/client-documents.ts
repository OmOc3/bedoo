import "server-only";

import { createHash } from "node:crypto";
import { AppError } from "@/lib/errors";
import { isRecord } from "@/lib/utils";
import type { ClientAnalysisDocumentFileType } from "@/types";

interface CloudinaryConfig {
  apiKey: string;
  apiSecret: string;
  cloudName: string;
  folder: string;
}

interface ValidatedClientDocument {
  bytes: Uint8Array;
  extension: ClientAnalysisDocumentFileType;
  fileName: string;
  type: string;
}

const maxClientDocumentBytes = 15 * 1024 * 1024;

const documentTypes: Record<string, { extension: ClientAnalysisDocumentFileType; mimeTypes: readonly string[] }> = {
  doc: { extension: "doc", mimeTypes: ["application/msword"] },
  docx: {
    extension: "docx",
    mimeTypes: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  },
  pdf: { extension: "pdf", mimeTypes: ["application/pdf"] },
  xls: { extension: "xls", mimeTypes: ["application/vnd.ms-excel", "application/octet-stream"] },
  xlsx: {
    extension: "xlsx",
    mimeTypes: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/octet-stream"],
  },
};

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
    folder: process.env.CLOUDINARY_CLIENT_DOCUMENT_FOLDER?.trim() || "ecopest/client-documents",
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

function extensionFromName(fileName: string): ClientAnalysisDocumentFileType | null {
  const extension = fileName.split(".").at(-1)?.toLowerCase();

  return extension === "pdf" || extension === "doc" || extension === "docx" || extension === "xls" || extension === "xlsx"
    ? extension
    : null;
}

function isCloudinaryUploadResponse(value: unknown): value is { secure_url: string } {
  return isRecord(value) && typeof value.secure_url === "string";
}

export async function validateClientAnalysisDocumentFile(file: File): Promise<ValidatedClientDocument> {
  if (file.size <= 0) {
    throw new AppError("الملف المرفق فارغ.", "CLIENT_DOCUMENT_EMPTY", 400);
  }

  if (file.size > maxClientDocumentBytes) {
    throw new AppError("حجم الملف أكبر من الحد المسموح 15MB.", "CLIENT_DOCUMENT_TOO_LARGE", 400);
  }

  const extension = extensionFromName(file.name);

  if (!extension) {
    throw new AppError("ارفع ملف PDF أو Word أو Excel فقط.", "CLIENT_DOCUMENT_EXTENSION_INVALID", 400);
  }

  const allowed = documentTypes[extension];
  const type = file.type || (allowed.mimeTypes[0] ?? "application/octet-stream");

  if (file.type && !allowed.mimeTypes.includes(file.type)) {
    throw new AppError("نوع الملف لا يطابق PDF أو Word أو Excel.", "CLIENT_DOCUMENT_MIME_INVALID", 400);
  }

  return {
    bytes: new Uint8Array(await file.arrayBuffer()),
    extension,
    fileName: file.name,
    type,
  };
}

export async function uploadClientAnalysisDocumentToCloudinary(file: File, clientUid: string): Promise<{
  fileName: string;
  fileType: ClientAnalysisDocumentFileType;
  fileUrl: string;
}> {
  const config = getCloudinaryConfig();

  if (!config) {
    throw new AppError(
      "إعدادات Cloudinary غير مكتملة. أضف CLOUDINARY_CLOUD_NAME و CLOUDINARY_API_KEY و CLOUDINARY_API_SECRET.",
      "CLOUDINARY_CONFIG_MISSING",
      500,
    );
  }

  const document = await validateClientAnalysisDocumentFile(file);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const publicId = `${clientUid}-${crypto.randomUUID()}`;
  const params = {
    folder: config.folder,
    public_id: publicId,
    timestamp,
  };
  const body = new FormData();

  body.set("api_key", config.apiKey);
  body.set("folder", params.folder);
  body.set("public_id", params.public_id);
  body.set("timestamp", params.timestamp);
  body.set("signature", signUploadParams(params, config.apiSecret));
  const fileBuffer = new ArrayBuffer(document.bytes.byteLength);
  new Uint8Array(fileBuffer).set(document.bytes);
  body.set("file", new Blob([fileBuffer], { type: document.type }), document.fileName);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/raw/upload`, {
    method: "POST",
    body,
  });
  const payload = (await response.json()) as unknown;

  if (!response.ok || !isCloudinaryUploadResponse(payload)) {
    throw new AppError("تعذر رفع ملف التحليل إلى Cloudinary.", "CLIENT_DOCUMENT_UPLOAD_FAILED", 502);
  }

  return {
    fileName: document.fileName,
    fileType: document.extension,
    fileUrl: payload.secure_url,
  };
}
