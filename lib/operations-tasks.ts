import { eq } from "drizzle-orm";
import { listReports, listStations, countRows } from "@/lib/db/repositories";
import { reports, stations } from "@/lib/db/schema";
import { getStationHealth, isStationStale } from "@/lib/station-health";
import type { Report, Station } from "@/types";

export interface OperationTasks {
  inactiveStations: Station[];
  pendingReports: Report[];
  staleStations: Station[];
  totals: {
    inactiveStations: number;
    pendingReports: number;
    staleStations: number;
  };
  truncatedStationScan: boolean;
}

const stationTaskScanLimit = 500;

export async function getOperationTasks(limit = 12): Promise<OperationTasks> {
  const [stationRows, pendingReports, inactiveStationsTotal, pendingReportsTotal] = await Promise.all([
    listStations(),
    listReports({
      filters: { reviewStatus: "pending" },
      limit,
    }),
    countRows("stations", eq(stations.isActive, false)),
    countRows("reports", eq(reports.reviewStatus, "pending")),
  ]);
  const scannedStations = stationRows.slice(0, stationTaskScanLimit);
  const staleStations = scannedStations
    .filter(isStationStale)
    .sort((a, b) => {
      const healthA = getStationHealth(a).value;
      const healthB = getStationHealth(b).value;

      return healthA.localeCompare(healthB);
    });
  const inactiveStations = scannedStations.filter((station) => !station.isActive);

  return {
    inactiveStations: inactiveStations.slice(0, limit),
    pendingReports: pendingReports.slice(0, limit),
    staleStations: staleStations.slice(0, limit),
    totals: {
      inactiveStations: inactiveStationsTotal,
      pendingReports: pendingReportsTotal,
      staleStations: staleStations.length,
    },
    truncatedStationScan: stationRows.length > stationTaskScanLimit,
  };
}
