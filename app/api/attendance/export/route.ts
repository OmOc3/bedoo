import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/server-session";
import { listAttendanceSessionsForAdmin, type AttendanceFilters } from "@/lib/db/repositories";

export const runtime = "nodejs";

function parseDate(value: string | null, endOfDay = false): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  }

  return date;
}

function csvCell(value: string | number | undefined): string {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  await requireRole(["manager", "supervisor"]);

  const params = request.nextUrl.searchParams;
  const filters: AttendanceFilters = {
    clientUid: params.get("clientUid") ?? "",
    dateFrom: parseDate(params.get("dateFrom")),
    dateTo: parseDate(params.get("dateTo"), true),
    stationId: params.get("stationId") ?? "",
    technicianUid: params.get("technicianUid") ?? "",
  };
  const sessions = await listAttendanceSessionsForAdmin(filters, 5000);
  const rows = [
    [
      "technician",
      "clock_in",
      "clock_out",
      "client",
      "station",
      "clock_in_distance_m",
      "clock_in_accuracy_m",
      "notes",
    ],
    ...sessions.map((session) => [
      session.technicianName,
      session.clockInAt.toDate().toISOString(),
      session.clockOutAt?.toDate().toISOString() ?? "",
      session.clockInLocation?.clientName ?? "",
      session.clockInLocation?.stationLabel ?? "",
      session.clockInLocation?.distanceMeters ?? "",
      session.clockInLocation?.accuracyMeters ?? "",
      session.notes ?? "",
    ]),
  ];
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");

  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      "Content-Disposition": 'attachment; filename="attendance.csv"',
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}
