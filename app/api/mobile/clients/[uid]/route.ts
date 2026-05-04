import { NextRequest, NextResponse } from "next/server";
import { mobileApiErrorResponse } from "@/lib/api/mobile";
import {
  mobileClientAccountDetailResponse,
  mobileClientProfileResponse,
  type MobileClientAccountDetailResponse,
  type MobileClientProfileResponse,
} from "@/lib/api/mobile-serializers";
import { requireBearerRole } from "@/lib/auth/bearer-session";
import {
  deleteClientIfSafe,
  getClientAccountDetail,
  replaceClientStationAccess,
  upsertClientProfile,
} from "@/lib/db/repositories";
import { AppError } from "@/lib/errors";
import { clientAddressLinesFromText, updateClientProfileSchema, updateClientStationAccessSchema } from "@/lib/validation/client-orders";
import type { ApiErrorResponse } from "@/types";

export const runtime = "nodejs";

interface MobileClientRouteContext {
  params: Promise<{
    uid: string;
  }>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function GET(
  request: NextRequest,
  { params }: MobileClientRouteContext,
): Promise<NextResponse<MobileClientAccountDetailResponse | ApiErrorResponse>> {
  try {
    const session = await requireBearerRole(request, ["client", "manager"]);
    const { uid } = await params;

    if (session.role !== "manager" && session.uid !== uid) {
      throw new AppError("غير مصرح.", "CLIENT_DETAIL_FORBIDDEN", 403);
    }

    const detail = await getClientAccountDetail(uid);

    if (!detail) {
      throw new AppError("العميل غير موجود.", "CLIENT_NOT_FOUND", 404);
    }

    return NextResponse.json(mobileClientAccountDetailResponse(detail));
  } catch (error: unknown) {
    return mobileApiErrorResponse(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: MobileClientRouteContext,
): Promise<NextResponse<MobileClientAccountDetailResponse | MobileClientProfileResponse | ApiErrorResponse>> {
  try {
    const session = await requireBearerRole(request, ["manager"]);
    const { uid } = await params;
    const body = (await request.json()) as unknown;

    if (!isRecord(body)) {
      throw new AppError("طلب العميل غير صالح.", "CLIENT_REQUEST_INVALID", 400);
    }

    if (body.profile !== undefined) {
      const profileBody = isRecord(body.profile) ? body.profile : {};
      const parsed = updateClientProfileSchema.safeParse({
        addressesText: profileBody.addressesText,
        clientUid: uid,
        phone: profileBody.phone,
      });

      if (!parsed.success) {
        return NextResponse.json(
          {
            code: "MOBILE_CLIENT_PROFILE_INVALID",
            message: parsed.error.issues[0]?.message ?? "تحقق من بيانات العميل.",
          },
          { status: 400 },
        );
      }

      const profile = await upsertClientProfile({
        actorRole: session.role,
        actorUid: session.uid,
        addresses: clientAddressLinesFromText(parsed.data.addressesText),
        clientUid: uid,
        phone: parsed.data.phone,
      });

      if (body.access === undefined) {
        return NextResponse.json(mobileClientProfileResponse(profile));
      }
    }

    if (body.access !== undefined) {
      const accessBody = isRecord(body.access) ? body.access : {};
      const parsed = updateClientStationAccessSchema.safeParse({
        clientUid: uid,
        stationIds: Array.isArray(accessBody.stationIds) ? accessBody.stationIds : [],
      });

      if (!parsed.success) {
        return NextResponse.json(
          {
            code: "MOBILE_CLIENT_ACCESS_INVALID",
            message: parsed.error.issues[0]?.message ?? "تحقق من محطات العميل.",
          },
          { status: 400 },
        );
      }

      await replaceClientStationAccess({
        actorRole: session.role,
        actorUid: session.uid,
        clientUid: parsed.data.clientUid,
        stationIds: parsed.data.stationIds,
      });
    }

    const detail = await getClientAccountDetail(uid);

    if (!detail) {
      throw new AppError("العميل غير موجود.", "CLIENT_NOT_FOUND", 404);
    }

    return NextResponse.json(mobileClientAccountDetailResponse(detail));
  } catch (error: unknown) {
    return mobileApiErrorResponse(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: MobileClientRouteContext,
): Promise<NextResponse<{ success: true } | ApiErrorResponse>> {
  try {
    const session = await requireBearerRole(request, ["manager"]);
    const { uid } = await params;

    await deleteClientIfSafe({
      actorRole: session.role,
      actorUid: session.uid,
      clientUid: uid,
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return mobileApiErrorResponse(error);
  }
}
