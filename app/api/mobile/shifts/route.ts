import { NextRequest, NextResponse } from "next/server";
import { mobileApiErrorResponse } from "@/lib/api/mobile";
import { mobileShiftResponse, type MobileTechnicianShiftResponse } from "@/lib/api/mobile-serializers";
import { requireBearerRole } from "@/lib/auth/bearer-session";
import { endShift, getOpenShift, listShiftsForAdmin, listShiftsForTechnician, startShift } from "@/lib/db/repositories";
import { AppError } from "@/lib/errors";
import type { ApiErrorResponse, ShiftSalaryStatus, ShiftStatus } from "@/types";

export const runtime = "nodejs";

interface MobileShiftListResponse {
  openShift: MobileTechnicianShiftResponse | null;
  shifts: MobileTechnicianShiftResponse[];
}

interface MobileShiftMutationResponse {
  earlyExit?: boolean;
  earlyExitMinutes?: number;
  minutesWorked?: number;
  shift: MobileTechnicianShiftResponse;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function numberField(body: Record<string, unknown>, key: string): number {
  const value = body[key];

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new AppError("بيانات الموقع غير صالحة.", "SHIFT_LOCATION_INVALID", 400);
  }

  return value;
}

function optionalDate(value: string | null): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new AppError("التاريخ غير صالح.", "SHIFT_DATE_INVALID", 400);
  }

  return date;
}

function optionalStatus(value: string | null): ShiftStatus | "" {
  if (value === "active" || value === "completed") {
    return value;
  }

  return "";
}

function optionalSalaryStatus(value: string | null): ShiftSalaryStatus | "" {
  if (value === "pending" || value === "paid" || value === "unpaid") {
    return value;
  }

  return "";
}

export async function GET(request: NextRequest): Promise<NextResponse<MobileShiftListResponse | ApiErrorResponse>> {
  try {
    const session = await requireBearerRole(request, ["technician", "supervisor", "manager"]);
    const { searchParams } = new URL(request.url);

    if (session.role === "technician") {
      const [openShift, shifts] = await Promise.all([
        getOpenShift(session.uid),
        listShiftsForTechnician(session.uid, 100),
      ]);

      return NextResponse.json({
        openShift: openShift ? mobileShiftResponse(openShift) : null,
        shifts: shifts.map(mobileShiftResponse),
      });
    }

    const technicianUid = searchParams.get("technicianUid") ?? undefined;
    const [openShift, shifts] = await Promise.all([
      technicianUid ? getOpenShift(technicianUid) : Promise.resolve(null),
      listShiftsForAdmin(
        {
          technicianUid,
          status: optionalStatus(searchParams.get("status")),
          salaryStatus: optionalSalaryStatus(searchParams.get("salaryStatus")),
          dateFrom: optionalDate(searchParams.get("dateFrom")),
          dateTo: optionalDate(searchParams.get("dateTo")),
        },
        300,
      ),
    ]);

    return NextResponse.json({
      openShift: openShift ? mobileShiftResponse(openShift) : null,
      shifts: shifts.map(mobileShiftResponse),
    });
  } catch (error: unknown) {
    return mobileApiErrorResponse(error);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<MobileShiftMutationResponse | ApiErrorResponse>> {
  try {
    const session = await requireBearerRole(request, ["technician", "manager"]);
    const body = (await request.json()) as unknown;

    if (!isRecord(body) || (body.action !== "start" && body.action !== "end")) {
      throw new AppError("طلب الشيفت غير صالح.", "SHIFT_REQUEST_INVALID", 400);
    }

    const location = {
      lat: numberField(body, "lat"),
      lng: numberField(body, "lng"),
      accuracyMeters: typeof body.accuracyMeters === "number" ? body.accuracyMeters : undefined,
    };

    if (body.action === "start") {
      const result = await startShift({
        actorRole: session.role,
        location,
        stationId: "",
        technicianName: session.user.displayName,
        technicianUid: session.uid,
      });

      return NextResponse.json({ shift: mobileShiftResponse(result.shift) });
    }

    const result = await endShift({
      actorRole: session.role,
      location,
      notes: typeof body.notes === "string" && body.notes.trim().length > 0 ? body.notes.trim() : undefined,
      stationId: "",
      technicianUid: session.uid,
    });

    return NextResponse.json({
      earlyExit: result.earlyExit,
      earlyExitMinutes: result.earlyExitMinutes,
      minutesWorked: result.minutesWorked,
      shift: mobileShiftResponse(result.shift),
    });
  } catch (error: unknown) {
    return mobileApiErrorResponse(error);
  }
}
