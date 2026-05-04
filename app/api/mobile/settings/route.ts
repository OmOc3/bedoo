import { NextRequest, NextResponse } from "next/server";
import { mobileApiErrorResponse } from "@/lib/api/mobile";
import { mobileAppSettingsResponse, type MobileAppSettingsResponse } from "@/lib/api/mobile-serializers";
import { requireBearerRole } from "@/lib/auth/bearer-session";
import { getAppSettings, updateAppSettings } from "@/lib/db/repositories";
import { updateAppSettingsSchema } from "@/lib/validation/settings";
import type { ApiErrorResponse } from "@/types";

export const runtime = "nodejs";

function booleanFromJson(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value === 1;
  }

  if (typeof value === "string") {
    return value.toLowerCase() === "true" || value === "1";
  }

  return false;
}

export async function GET(request: NextRequest): Promise<NextResponse<MobileAppSettingsResponse | ApiErrorResponse>> {
  try {
    await requireBearerRole(request, ["client", "technician", "supervisor", "manager"]);
    const settings = await getAppSettings();

    return NextResponse.json(mobileAppSettingsResponse(settings));
  } catch (error: unknown) {
    return mobileApiErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse<MobileAppSettingsResponse | ApiErrorResponse>> {
  try {
    const session = await requireBearerRole(request, ["manager"]);
    const body = (await request.json()) as unknown;
    const input = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
    const parsed = updateAppSettingsSchema.safeParse({
      maintenanceEnabled: booleanFromJson(input.maintenanceEnabled),
      maintenanceMessage: typeof input.maintenanceMessage === "string" ? input.maintenanceMessage : undefined,
      clientDailyStationOrderLimit:
        typeof input.clientDailyStationOrderLimit === "number"
          ? input.clientDailyStationOrderLimit
          : Number(input.clientDailyStationOrderLimit ?? 0),
      supportEmail: typeof input.supportEmail === "string" ? input.supportEmail : undefined,
      supportHours: typeof input.supportHours === "string" ? input.supportHours : undefined,
      supportPhone: typeof input.supportPhone === "string" ? input.supportPhone : undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          code: "MOBILE_SETTINGS_INVALID",
          message: parsed.error.issues[0]?.message ?? "تحقق من بيانات الإعدادات.",
        },
        { status: 400 },
      );
    }

    const settings = await updateAppSettings({
      actorRole: session.role,
      actorUid: session.uid,
      clientDailyStationOrderLimit: parsed.data.clientDailyStationOrderLimit,
      maintenanceEnabled: parsed.data.maintenanceEnabled,
      maintenanceMessage: parsed.data.maintenanceMessage,
      supportEmail: parsed.data.supportEmail,
      supportHours: parsed.data.supportHours,
      supportPhone: parsed.data.supportPhone,
    });

    return NextResponse.json(mobileAppSettingsResponse(settings));
  } catch (error: unknown) {
    return mobileApiErrorResponse(error);
  }
}
