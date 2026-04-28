import { NextRequest, NextResponse } from "next/server";
import { mobileApiErrorResponse } from "@/lib/api/mobile";
import { requireBearerRole } from "@/lib/auth/bearer-session";
import { uploadReportImageToCloudinary } from "@/lib/cloudinary/report-images";
import { getStationById } from "@/lib/db/repositories";
import { AppError } from "@/lib/errors";
import { submitReportWithAdmin } from "@/lib/reports/submit-report";
import { mobileReportSyncSchema } from "@/lib/validation/mobile";

export const runtime = "nodejs";

interface MobileReportSyncResponse {
  duplicate: boolean;
  reportId: string;
  stationLabel: string;
  submittedAt: string;
}

interface MobileReportRequestBody {
  body: unknown;
  inspectionPhoto?: File;
}

function optionalText(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);

  return typeof value === "string" ? value : undefined;
}

function statusFromFormData(formData: FormData): unknown {
  const values = formData.getAll("status").filter((value): value is string => typeof value === "string");

  if (values.length === 1) {
    try {
      return JSON.parse(values[0]) as unknown;
    } catch {
      return values;
    }
  }

  return values;
}

function uploadedFile(formData: FormData, key: string): File | undefined {
  const value = formData.get(key);

  return typeof File !== "undefined" && value instanceof File && value.size > 0 ? value : undefined;
}

async function readMobileReportRequest(request: NextRequest): Promise<MobileReportRequestBody> {
  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    return { body: (await request.json()) as unknown };
  }

  const formData = await request.formData();

  return {
    body: {
      clientReportId: optionalText(formData, "clientReportId"),
      notes: optionalText(formData, "notes"),
      stationId: optionalText(formData, "stationId"),
      status: statusFromFormData(formData),
    },
    inspectionPhoto: uploadedFile(formData, "inspectionPhoto"),
  };
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<MobileReportSyncResponse | { code: string; message: string }>> {
  try {
    const session = await requireBearerRole(request, ["technician", "manager"]);
    const { body, inspectionPhoto } = await readMobileReportRequest(request);
    const parsed = mobileReportSyncSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "تحقق من بيانات التقرير وحاول مرة أخرى.",
          code: "MOBILE_REPORT_INVALID",
        },
        { status: 400 },
      );
    }

    const station = await getStationById(parsed.data.stationId);

    if (!station) {
      throw new AppError("المحطة غير موجودة.", "STATION_NOT_FOUND", 404);
    }

    if (!station.isActive) {
      throw new AppError("هذه المحطة غير نشطة.", "STATION_INACTIVE", 409);
    }

    const stationPhotoUrl = inspectionPhoto
      ? await uploadReportImageToCloudinary(inspectionPhoto, parsed.data.stationId, parsed.data.clientReportId)
      : undefined;

    const result = await submitReportWithAdmin({
      actorUid: session.uid,
      actorRole: session.role,
      clientReportId: parsed.data.clientReportId,
      stationId: parsed.data.stationId,
      technicianName: session.user.displayName,
      status: parsed.data.status,
      notes: parsed.data.notes,
      ...(stationPhotoUrl ? { photoPaths: { station: stationPhotoUrl } } : {}),
    });

    return NextResponse.json({
      duplicate: result.duplicate,
      reportId: result.reportId,
      stationLabel: result.stationLabel,
      submittedAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    return mobileApiErrorResponse(error);
  }
}
