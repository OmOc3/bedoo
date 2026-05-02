import { NextRequest, NextResponse } from "next/server";
import { buildStatusCounts, buildTechnicianStats, buildZoneStats } from "@/lib/analytics";
import { mobileApiErrorResponse } from "@/lib/api/mobile";
import { mobileReportResponse, mobileStationResponse } from "@/lib/api/mobile-serializers";
import { requireBearerRole } from "@/lib/auth/bearer-session";
import { getOperationTasks } from "@/lib/operations-tasks";
import { getLatestReports, getManagerDashboardStats, getSupervisorDashboardStats } from "@/lib/stats/dashboard-stats";
import { getBoundedReportStatsInput } from "@/lib/stats/report-stats";
import type { MobileReportResponse, MobileStationResponse } from "@/lib/api/mobile-serializers";
import type { StatusOption } from "@/types";

export const runtime = "nodejs";

interface MobileAdminTaskResponse {
  inactiveStations: MobileStationResponse[];
  pendingReports: MobileReportResponse[];
  staleStations: MobileStationResponse[];
  totals: {
    inactiveStations: number;
    pendingReports: number;
    staleStations: number;
  };
  truncatedStationScan: boolean;
}

interface MobileAdminAnalyticsResponse {
  rangeDays: number;
  reportsTruncated: boolean;
  stationsTruncated: boolean;
  statusSummary: {
    count: number;
    status: StatusOption;
  }[];
  technicians: {
    pending: number;
    reports: number;
    technicianName: string;
    technicianUid: string;
  }[];
  zones: {
    activeStations: number;
    reports: number;
    stations: number;
    zone: string;
  }[];
}

interface MobileAdminOverviewResponse {
  analytics?: MobileAdminAnalyticsResponse;
  latestReports: MobileReportResponse[];
  role: "manager" | "supervisor";
  stats:
    | Awaited<ReturnType<typeof getManagerDashboardStats>>
    | Awaited<ReturnType<typeof getSupervisorDashboardStats>>;
  tasks: MobileAdminTaskResponse;
}

function mapTasks(tasks: Awaited<ReturnType<typeof getOperationTasks>>): MobileAdminTaskResponse {
  return {
    inactiveStations: tasks.inactiveStations.map((station) => mobileStationResponse(station.stationId, station)),
    pendingReports: tasks.pendingReports.map(mobileReportResponse),
    staleStations: tasks.staleStations.map((station) => mobileStationResponse(station.stationId, station)),
    totals: tasks.totals,
    truncatedStationScan: tasks.truncatedStationScan,
  };
}

export async function GET(
  request: NextRequest,
): Promise<NextResponse<MobileAdminOverviewResponse | { code: string; message: string }>> {
  try {
    const session = await requireBearerRole(request, ["manager", "supervisor"]);
    const adminRole: MobileAdminOverviewResponse["role"] = session.role === "manager" ? "manager" : "supervisor";
    const [stats, latestReports, tasks] = await Promise.all([
      adminRole === "manager" ? getManagerDashboardStats() : getSupervisorDashboardStats(),
      getLatestReports(8),
      getOperationTasks(8),
    ]);
    let analytics: MobileAdminAnalyticsResponse | undefined;

    if (adminRole === "manager") {
      const analyticsInput = await getBoundedReportStatsInput();

      analytics = {
        rangeDays: analyticsInput.rangeDays,
        reportsTruncated: analyticsInput.reportsTruncated,
        stationsTruncated: analyticsInput.stationsTruncated,
        zones: buildZoneStats(analyticsInput.stations, analyticsInput.reports).slice(0, 8),
        technicians: buildTechnicianStats(analyticsInput.reports).slice(0, 8),
        statusSummary: buildStatusCounts(analyticsInput.reports).slice(0, 8),
      };
    }

    return NextResponse.json({
      role: adminRole,
      stats,
      latestReports: latestReports.map(mobileReportResponse),
      tasks: mapTasks(tasks),
      ...(analytics ? { analytics } : {}),
    });
  } catch (error: unknown) {
    return mobileApiErrorResponse(error);
  }
}
