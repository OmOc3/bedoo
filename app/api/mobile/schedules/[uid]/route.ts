import { NextRequest, NextResponse } from "next/server";
import { mobileApiErrorResponse } from "@/lib/api/mobile";
import {
  mobileWorkScheduleResponse,
  type MobileTechnicianWorkScheduleResponse,
} from "@/lib/api/mobile-serializers";
import { requireBearerRole } from "@/lib/auth/bearer-session";
import { getActiveWorkSchedule, getAppUser, upsertWorkSchedule } from "@/lib/db/repositories";
import { AppError } from "@/lib/errors";
import { isValidShiftTime, normalizeWorkDays } from "@/lib/shifts/schedule";
import type { ApiErrorResponse } from "@/types";

export const runtime = "nodejs";

interface MobileScheduleRouteContext {
  params: Promise<{
    uid: string;
  }>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function numberValue(value: unknown, fallback?: number): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

function parseWorkDays(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return normalizeWorkDays(value.map((item) => Number(item)));
}

export async function GET(
  request: NextRequest,
  { params }: MobileScheduleRouteContext,
): Promise<NextResponse<MobileTechnicianWorkScheduleResponse | null | ApiErrorResponse>> {
  try {
    const session = await requireBearerRole(request, ["technician", "manager"]);
    const { uid } = await params;

    if (session.role !== "manager" && session.uid !== uid) {
      throw new AppError("غير مصرح.", "SCHEDULE_FORBIDDEN", 403);
    }

    const schedule = await getActiveWorkSchedule(uid);

    return NextResponse.json(schedule ? mobileWorkScheduleResponse(schedule) : null);
  } catch (error: unknown) {
    return mobileApiErrorResponse(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: MobileScheduleRouteContext,
): Promise<NextResponse<MobileTechnicianWorkScheduleResponse | ApiErrorResponse>> {
  try {
    const session = await requireBearerRole(request, ["manager"]);
    const { uid } = await params;
    const target = await getAppUser(uid);

    if (!target || target.role !== "technician") {
      throw new AppError("الفني غير موجود.", "TECHNICIAN_NOT_FOUND", 404);
    }

    const body = (await request.json()) as unknown;

    if (!isRecord(body)) {
      throw new AppError("طلب جدول العمل غير صالح.", "SCHEDULE_REQUEST_INVALID", 400);
    }

    const shiftStartTime = typeof body.shiftStartTime === "string" ? body.shiftStartTime.trim() : "";
    const shiftEndTime = typeof body.shiftEndTime === "string" ? body.shiftEndTime.trim() : "";
    const workDays = parseWorkDays(body.workDays);
    const expectedDurationMinutes = numberValue(body.expectedDurationMinutes);
    const hourlyRate = numberValue(body.hourlyRate);

    if (!isValidShiftTime(shiftStartTime) || !isValidShiftTime(shiftEndTime)) {
      throw new AppError("توقيتات الشيفت غير صالحة.", "SCHEDULE_TIME_INVALID", 400);
    }

    if (workDays.length === 0) {
      throw new AppError("يجب تحديد يوم عمل واحد على الأقل.", "SCHEDULE_DAYS_REQUIRED", 400);
    }

    if (!expectedDurationMinutes || expectedDurationMinutes < 15 || expectedDurationMinutes > 720) {
      throw new AppError("مدة الشيفت غير صالحة.", "SCHEDULE_DURATION_INVALID", 400);
    }

    if (hourlyRate !== undefined && hourlyRate < 0) {
      throw new AppError("سعر الساعة غير صالح.", "SCHEDULE_RATE_INVALID", 400);
    }

    const schedule = await upsertWorkSchedule({
      actorRole: session.role,
      actorUid: session.uid,
      expectedDurationMinutes,
      hourlyRate,
      notes: typeof body.notes === "string" && body.notes.trim().length > 0 ? body.notes.trim() : undefined,
      shiftEndTime,
      shiftStartTime,
      technicianUid: uid,
      workDays,
    });

    return NextResponse.json(mobileWorkScheduleResponse(schedule));
  } catch (error: unknown) {
    return mobileApiErrorResponse(error);
  }
}
