import { NextRequest, NextResponse } from "next/server";
import { mobileApiErrorResponse } from "@/lib/api/mobile";
import { requireBearerRole } from "@/lib/auth/bearer-session";
import { writeAuditLog } from "@/lib/audit";
import { createStationRecord, generateNextStationId } from "@/lib/db/repositories";
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
  zone?: string;
}

interface MobileCreateStationResponse {
  label: string;
  qrCodeValue: string;
  stationId: string;
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
