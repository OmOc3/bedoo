import { NextRequest, NextResponse } from "next/server";
import { mobileApiErrorResponse } from "@/lib/api/mobile";
import { mobileStationResponse, type MobileStationResponse } from "@/lib/api/mobile-serializers";
import { writeAuditLog } from "@/lib/audit";
import { requireBearerRole } from "@/lib/auth/bearer-session";
import { deleteStationIfSafe, getStationById, toggleStationStatusRecord, updateStationRecord } from "@/lib/db/repositories";
import { AppError } from "@/lib/errors";
import { buildStationReportUrl } from "@/lib/url/base-url";
import { updateStationSchema } from "@/lib/validation/stations";

export const runtime = "nodejs";

interface MobileStationRouteContext {
  params: Promise<{
    stationId: string;
  }>;
}

interface UpdateStationBody {
  action?: "toggleActive";
  coordinates?: {
    lat: number;
    lng: number;
  };
  description?: string;
  label?: string;
  location?: string;
  requiresImmediateSupervision?: boolean;
  zone?: string;
}

export async function GET(
  request: NextRequest,
  { params }: MobileStationRouteContext,
): Promise<NextResponse<MobileStationResponse | { code: string; message: string }>> {
  try {
    await requireBearerRole(request, ["technician", "supervisor", "manager"]);
    const { stationId } = await params;
    const station = await getStationById(stationId);

    if (!station) {
      throw new AppError("المحطة غير موجودة.", "STATION_NOT_FOUND", 404);
    }

    return NextResponse.json(mobileStationResponse(station.stationId, station));
  } catch (error: unknown) {
    return mobileApiErrorResponse(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: MobileStationRouteContext,
): Promise<NextResponse<MobileStationResponse | { code: string; message: string }>> {
  try {
    const session = await requireBearerRole(request, ["manager"]);
    const { stationId } = await params;
    const station = await getStationById(stationId);

    if (!station) {
      throw new AppError("المحطة غير موجودة.", "STATION_NOT_FOUND", 404);
    }

    const body = (await request.json()) as UpdateStationBody;

    if (body.action === "toggleActive") {
      const nextIsActive = !station.isActive;

      await toggleStationStatusRecord(stationId, nextIsActive, session.uid);
      await writeAuditLog({
        actorUid: session.uid,
        actorRole: session.role,
        action: nextIsActive ? "station.activate" : "station.deactivate",
        entityType: "station",
        entityId: stationId,
        metadata: { isActive: nextIsActive, source: "mobile" },
      });

      return NextResponse.json(mobileStationResponse(stationId, { ...station, isActive: nextIsActive }));
    }

    const parsed = updateStationSchema.safeParse({
      label: body.label ?? station.label,
      location: body.location ?? station.location,
      description: body.description,
      photoUrls: station.photoUrls,
      zone: body.zone,
      coordinates: body.coordinates,
      requiresImmediateSupervision: body.requiresImmediateSupervision ?? station.requiresImmediateSupervision,
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

    const qrCodeValue = await buildStationReportUrl(stationId);

    await updateStationRecord(stationId, {
      label: parsed.data.label,
      location: parsed.data.location,
      description: parsed.data.description,
      photoUrls: parsed.data.photoUrls,
      zone: parsed.data.zone,
      coordinates: parsed.data.coordinates,
      qrCodeValue,
      requiresImmediateSupervision: parsed.data.requiresImmediateSupervision,
      updatedBy: session.uid,
    });
    await writeAuditLog({
      actorUid: session.uid,
      actorRole: session.role,
      action: "station.update",
      entityType: "station",
      entityId: stationId,
      metadata: { ...parsed.data, source: "mobile" },
    });

    return NextResponse.json(
      mobileStationResponse(stationId, {
        ...station,
        ...parsed.data,
        qrCodeValue,
        updatedBy: session.uid,
      }),
    );
  } catch (error: unknown) {
    return mobileApiErrorResponse(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: MobileStationRouteContext,
): Promise<NextResponse<{ success: true } | { code: string; message: string }>> {
  try {
    const session = await requireBearerRole(request, ["manager"]);
    const { stationId } = await params;

    await deleteStationIfSafe({
      actorRole: session.role,
      actorUid: session.uid,
      stationId,
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return mobileApiErrorResponse(error);
  }
}
