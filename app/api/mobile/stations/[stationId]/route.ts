import { NextRequest, NextResponse } from "next/server";
import { mobileApiErrorResponse } from "@/lib/api/mobile";
import { requireBearerRole } from "@/lib/auth/bearer-session";
import { getStationById } from "@/lib/db/repositories";
import { AppError } from "@/lib/errors";
import type { AppTimestamp, Station } from "@/types";

export const runtime = "nodejs";

interface MobileStationResponse {
  createdAt?: string;
  description?: string;
  isActive: boolean;
  label: string;
  lastVisitedAt?: string;
  location: string;
  photoUrls?: string[];
  stationId: string;
  totalReports: number;
  updatedAt?: string;
  zone?: string;
}

interface MobileStationRouteContext {
  params: Promise<{
    stationId: string;
  }>;
}

function timestampToIso(value: unknown): string | undefined {
  const timestamp = value as Partial<AppTimestamp>;

  if (typeof timestamp?.toDate !== "function") {
    return undefined;
  }

  return timestamp.toDate().toISOString();
}

function stationResponse(stationId: string, data: Partial<Station>): MobileStationResponse {
  return {
    stationId: data.stationId ?? stationId,
    label: data.label ?? "محطة بدون اسم",
    location: data.location ?? "غير محدد",
    ...(data.description ? { description: data.description } : {}),
    ...(data.zone ? { zone: data.zone } : {}),
    ...(data.photoUrls?.length ? { photoUrls: data.photoUrls } : {}),
    isActive: data.isActive ?? false,
    totalReports: data.totalReports ?? 0,
    ...(timestampToIso(data.createdAt) ? { createdAt: timestampToIso(data.createdAt) } : {}),
    ...(timestampToIso(data.updatedAt) ? { updatedAt: timestampToIso(data.updatedAt) } : {}),
    ...(timestampToIso(data.lastVisitedAt) ? { lastVisitedAt: timestampToIso(data.lastVisitedAt) } : {}),
  };
}

export async function GET(
  request: NextRequest,
  { params }: MobileStationRouteContext,
): Promise<NextResponse<MobileStationResponse | { code: string; message: string }>> {
  try {
    await requireBearerRole(request, ["technician", "manager"]);
    const { stationId } = await params;
    const station = await getStationById(stationId);

    if (!station) {
      throw new AppError("المحطة غير موجودة.", "STATION_NOT_FOUND", 404);
    }

    return NextResponse.json(stationResponse(station.stationId, station));
  } catch (error: unknown) {
    return mobileApiErrorResponse(error);
  }
}
