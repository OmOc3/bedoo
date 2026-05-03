import { NextRequest, NextResponse } from "next/server";
import { mobileApiErrorResponse } from "@/lib/api/mobile";
import { mobileDailyWorkReportResponse, type MobileDailyWorkReportResponse } from "@/lib/api/mobile-serializers";
import { requireBearerRole } from "@/lib/auth/bearer-session";
import { uploadReportImageToCloudinary } from "@/lib/cloudinary/report-images";
import { createDailyWorkReport, listDailyWorkReports } from "@/lib/db/repositories";
import { AppError } from "@/lib/errors";
import { createDailyWorkReportSchema } from "@/lib/validation/daily-reports";
import type { ApiErrorResponse } from "@/types";

export const runtime = "nodejs";

interface DailyReportRequest {
  notes?: string;
  reportDate?: string;
  stationIds?: string[];
  summary?: string;
}

function optionalDate(value: string | null): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new AppError("التاريخ غير صالح.", "DAILY_REPORT_DATE_INVALID", 400);
  }

  return date;
}

function parseReportDate(value: string): Date {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new AppError("تاريخ التقرير غير صالح.", "DAILY_REPORT_DATE_INVALID", 400);
  }

  date.setHours(12, 0, 0, 0);
  return date;
}

function textValue(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);

  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function stationIdsFromFormData(formData: FormData): string[] {
  const values = formData.getAll("stationIds").filter((value): value is string => typeof value === "string");

  if (values.length === 1) {
    try {
      const parsed = JSON.parse(values[0]) as unknown;
      return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : values;
    } catch {
      return values;
    }
  }

  return values;
}

function imageFiles(formData: FormData): File[] {
  return formData.getAll("photos").filter((value): value is File => value instanceof File && value.size > 0).slice(0, 8);
}

async function readRequest(request: NextRequest): Promise<{ body: DailyReportRequest; photos: File[] }> {
  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    const body = (await request.json()) as DailyReportRequest;
    return { body, photos: [] };
  }

  const formData = await request.formData();

  return {
    body: {
      notes: textValue(formData, "notes"),
      reportDate: textValue(formData, "reportDate"),
      stationIds: stationIdsFromFormData(formData),
      summary: textValue(formData, "summary"),
    },
    photos: imageFiles(formData),
  };
}

export async function GET(request: NextRequest): Promise<NextResponse<MobileDailyWorkReportResponse[] | ApiErrorResponse>> {
  try {
    const session = await requireBearerRole(request, ["client", "technician", "supervisor", "manager"]);
    const { searchParams } = new URL(request.url);
    const requestedTechnicianUid = searchParams.get("technicianUid") ?? undefined;
    const technicianUid = session.role === "technician" ? session.uid : requestedTechnicianUid;
    const clientUid = session.role === "client" ? session.uid : searchParams.get("clientUid") ?? undefined;

    if (session.role !== "manager" && session.role !== "supervisor" && requestedTechnicianUid && requestedTechnicianUid !== session.uid) {
      throw new AppError("غير مسموح.", "DAILY_REPORT_FORBIDDEN", 403);
    }

    const reports = await listDailyWorkReports(
      {
        clientUid,
        technicianUid,
        stationId: searchParams.get("stationId") ?? undefined,
        dateFrom: optionalDate(searchParams.get("dateFrom")),
        dateTo: optionalDate(searchParams.get("dateTo")),
      },
      200,
    );

    return NextResponse.json(reports.map(mobileDailyWorkReportResponse));
  } catch (error: unknown) {
    return mobileApiErrorResponse(error);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<MobileDailyWorkReportResponse | ApiErrorResponse>> {
  try {
    const session = await requireBearerRole(request, ["technician", "manager"]);
    const { body, photos } = await readRequest(request);
    const parsed = createDailyWorkReportSchema.safeParse({
      notes: body.notes,
      reportDate: body.reportDate,
      stationIds: body.stationIds ?? [],
      summary: body.summary,
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          code: "MOBILE_DAILY_REPORT_INVALID",
          message: parsed.error.issues[0]?.message ?? "تحقق من بيانات التقرير اليومي.",
        },
        { status: 400 },
      );
    }

    const dailyReportId = crypto.randomUUID();
    const photoUrls = await Promise.all(
      photos.map((file, index) => uploadReportImageToCloudinary(file, "daily-work", `${dailyReportId}-${index + 1}`)),
    );
    const report = await createDailyWorkReport({
      actorRole: session.role,
      notes: parsed.data.notes,
      photos: photoUrls,
      reportDate: parseReportDate(parsed.data.reportDate),
      stationIds: parsed.data.stationIds,
      summary: parsed.data.summary,
      technicianName: session.user.displayName,
      technicianUid: session.uid,
    });

    return NextResponse.json(mobileDailyWorkReportResponse(report));
  } catch (error: unknown) {
    return mobileApiErrorResponse(error);
  }
}
