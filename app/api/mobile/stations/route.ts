import { NextRequest, NextResponse } from "next/server";
import { mobileApiErrorResponse } from "@/lib/api/mobile";
import { mobileStationResponse, type MobileStationResponse } from "@/lib/api/mobile-serializers";
import { requireBearerRole } from "@/lib/auth/bearer-session";
import { writeAuditLog } from "@/lib/audit";
import { createStationRecord, generateNextStationId, listStations } from "@/lib/db/repositories";
import { buildStationReportUrl } from "@/lib/url/base-url";
import { createStationSchema } from "@/lib/validation/stations";

export const runtime = "nodejs";

interface CreateStationBody {
  coordinates?: {
    lat: number;
    lng: number;
  };
  description?: string;
  label: string;
  location: string;
  requiresImmediateSupervision?: boolean;
  zone?: string;
}

interface MobileCreateStationResponse {
  label: string;
  qrCodeValue: string;
  stationId: string;
}

export async function GET(
  request: NextRequest,
): Promise<NextResponse<MobileStationResponse[] | { code: string; message: string }>> {
  try {
    const session = await requireBearerRole(request, ["technician", "supervisor", "manager"]);
    const { searchParams } = new URL(request.url);

    // Technicians use QR to open a station; do not return a nearby list without a scan.
    if (session.role === "technician") {
      return NextResponse.json([]);
    }

    const query = searchParams.get("q") ?? undefined;
    const stations = await listStations(query);

    return NextResponse.json(stations.map((station) => mobileStationResponse(station.stationId, station)));
  } catch (error: unknown) {
    return mobileApiErrorResponse(error);
  }
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<MobileCreateStationResponse | { code: string; message: string }>> {
  try {
    const session = await requireBearerRole(request, ["manager"]);
    const payload = (await request.json()) as CreateStationBody;
    const parsed = createStationSchema.safeParse({
      label: payload.label,
      location: payload.location,
      description: payload.description,
      zone: payload.zone,
      requiresImmediateSupervision: payload.requiresImmediateSupervision,
      coordinates: payload.coordinates,
      photoUrls: [],
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          code: "MOBILE_STATION_INVALID",
          message: "تحقق من بيانات المحطة وحاول مرة أخرى.",
        },
        { status: 400 },
      );
    }

    const stationId = await generateNextStationId();
    const qrCodeValue = await buildStationReportUrl(stationId);

    await createStationRecord({
      stationId,
      label: parsed.data.label,
      location: parsed.data.location,
      description: parsed.data.description,
      photoUrls: [],
      zone: parsed.data.zone,
      coordinates: parsed.data.coordinates,
      qrCodeValue,
      requiresImmediateSupervision: parsed.data.requiresImmediateSupervision,
      createdBy: session.uid,
    });

    await writeAuditLog({
      actorUid: session.uid,
      actorRole: session.role,
      action: "station.create",
      entityType: "station",
      entityId: stationId,
      metadata: {
        label: parsed.data.label,
        location: parsed.data.location,
        zone: parsed.data.zone,
        requiresImmediateSupervision: parsed.data.requiresImmediateSupervision,
      },
    });

    return NextResponse.json({
      stationId,
      label: parsed.data.label,
      qrCodeValue,
    });
  } catch (error: unknown) {
    return mobileApiErrorResponse(error);
  }
}
