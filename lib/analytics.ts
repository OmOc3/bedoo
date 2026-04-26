import type { Report, Station, StatusOption } from "@/types";

export interface ZoneStats {
  activeStations: number;
  reports: number;
  stations: number;
  zone: string;
}

export interface TechnicianStats {
  pending: number;
  reports: number;
  technicianName: string;
  technicianUid: string;
}

export interface StatusSummary {
  count: number;
  status: StatusOption;
}

export function stationFromData(stationId: string, data: Partial<Station>): Station {
  return {
    stationId: data.stationId ?? stationId,
    label: data.label ?? "محطة بدون اسم",
    location: data.location ?? "غير محدد",
    zone: data.zone,
    coordinates: data.coordinates,
    qrCodeValue: data.qrCodeValue ?? "",
    isActive: data.isActive ?? false,
    createdAt: data.createdAt as Station["createdAt"],
    createdBy: data.createdBy ?? "",
    updatedAt: data.updatedAt,
    updatedBy: data.updatedBy,
    lastVisitedAt: data.lastVisitedAt,
    totalReports: data.totalReports ?? 0,
  };
}

export function reportFromData(reportId: string, data: Partial<Report>): Report {
  return {
    reportId: data.reportId ?? reportId,
    stationId: data.stationId ?? "",
    stationLabel: data.stationLabel ?? "محطة بدون اسم",
    technicianUid: data.technicianUid ?? "",
    technicianName: data.technicianName ?? "فني غير محدد",
    status: (data.status ?? []) as StatusOption[],
    notes: data.notes,
    photoPaths: data.photoPaths,
    submittedAt: data.submittedAt as Report["submittedAt"],
    reviewStatus: data.reviewStatus ?? "pending",
    editedAt: data.editedAt,
    editedBy: data.editedBy,
    reviewedAt: data.reviewedAt,
    reviewedBy: data.reviewedBy,
    reviewNotes: data.reviewNotes,
  };
}

export function buildZoneStats(stations: Station[], reports: Report[]): ZoneStats[] {
  const stationZoneById = new Map(stations.map((station) => [station.stationId, station.zone ?? "غير محدد"]));
  const statsByZone = new Map<string, ZoneStats>();

  stations.forEach((station) => {
    const zone = station.zone ?? "غير محدد";
    const current = statsByZone.get(zone) ?? {
      activeStations: 0,
      reports: 0,
      stations: 0,
      zone,
    };

    current.stations += 1;
    current.activeStations += station.isActive ? 1 : 0;
    statsByZone.set(zone, current);
  });

  reports.forEach((report) => {
    const zone = stationZoneById.get(report.stationId) ?? "غير محدد";
    const current = statsByZone.get(zone) ?? {
      activeStations: 0,
      reports: 0,
      stations: 0,
      zone,
    };

    current.reports += 1;
    statsByZone.set(zone, current);
  });

  return Array.from(statsByZone.values()).sort((a, b) => b.reports - a.reports);
}

export function buildTechnicianStats(reports: Report[]): TechnicianStats[] {
  const statsByTechnician = new Map<string, TechnicianStats>();

  reports.forEach((report) => {
    const key = report.technicianUid || report.technicianName;
    const current = statsByTechnician.get(key) ?? {
      pending: 0,
      reports: 0,
      technicianName: report.technicianName,
      technicianUid: report.technicianUid,
    };

    current.reports += 1;
    current.pending += report.reviewStatus === "pending" ? 1 : 0;
    statsByTechnician.set(key, current);
  });

  return Array.from(statsByTechnician.values()).sort((a, b) => b.reports - a.reports).slice(0, 10);
}

export function buildStatusCounts(reports: Report[]): StatusSummary[] {
  const counts = new Map<StatusOption, number>();

  reports.forEach((report) => {
    report.status.forEach((status) => {
      counts.set(status, (counts.get(status) ?? 0) + 1);
    });
  });

  return Array.from(counts.entries())
    .map(([status, count]) => ({ count, status }))
    .sort((a, b) => b.count - a.count);
}
