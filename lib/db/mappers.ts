import type { AppTimestamp, AppUser, AuditLog, Report, Station, UserRole } from "@/types";
import type { user } from "@/lib/db/schema";
import { coordinatesFromRow } from "@/lib/db/schema";

type AuthUserRow = typeof user.$inferSelect;

export function toAppTimestamp(value: Date | null | undefined): AppTimestamp | undefined {
  if (!value) {
    return undefined;
  }

  const millis = value.getTime();

  return {
    seconds: Math.floor(millis / 1000),
    nanoseconds: (millis % 1000) * 1_000_000,
    toDate: () => new Date(millis),
  };
}

export function requiredTimestamp(value: Date | null | undefined): AppTimestamp {
  return toAppTimestamp(value) ?? toAppTimestamp(new Date(0))!;
}

export function appUserFromAuthUser(row: AuthUserRow): AppUser {
  return {
    uid: row.id,
    email: row.email,
    displayName: row.name,
    role: row.role,
    createdAt: requiredTimestamp(row.createdAt),
    isActive: row.banned !== true,
  };
}

export function stationFromRow(row: {
  createdAt: Date;
  createdBy: string;
  isActive: boolean;
  label: string;
  lastVisitedAt: Date | null;
  lat: number | null;
  lng: number | null;
  location: string;
  qrCodeValue: string;
  stationId: string;
  totalReports: number;
  updatedAt: Date | null;
  updatedBy: string | null;
  zone: string | null;
}): Station {
  return {
    stationId: row.stationId,
    label: row.label,
    location: row.location,
    zone: row.zone ?? undefined,
    coordinates: coordinatesFromRow(row),
    qrCodeValue: row.qrCodeValue,
    isActive: row.isActive,
    totalReports: row.totalReports,
    createdAt: requiredTimestamp(row.createdAt),
    createdBy: row.createdBy,
    updatedAt: toAppTimestamp(row.updatedAt),
    updatedBy: row.updatedBy ?? undefined,
    lastVisitedAt: toAppTimestamp(row.lastVisitedAt),
  };
}

export function reportFromRow(
  row: {
    clientReportId: string | null;
    editedAt: Date | null;
    editedBy: string | null;
    notes: string | null;
    photoPaths: Report["photoPaths"] | null;
    reportId: string;
    reviewNotes: string | null;
    reviewStatus: Report["reviewStatus"];
    reviewedAt: Date | null;
    reviewedBy: string | null;
    stationId: string;
    stationLabel: string;
    submittedAt: Date;
    technicianName: string;
    technicianUid: string;
  },
  status: Report["status"],
): Report {
  return {
    reportId: row.reportId,
    stationId: row.stationId,
    stationLabel: row.stationLabel,
    technicianUid: row.technicianUid,
    technicianName: row.technicianName,
    status,
    clientReportId: row.clientReportId ?? undefined,
    notes: row.notes ?? undefined,
    photoPaths: row.photoPaths ?? undefined,
    submittedAt: requiredTimestamp(row.submittedAt),
    reviewStatus: row.reviewStatus,
    editedAt: toAppTimestamp(row.editedAt),
    editedBy: row.editedBy ?? undefined,
    reviewedAt: toAppTimestamp(row.reviewedAt),
    reviewedBy: row.reviewedBy ?? undefined,
    reviewNotes: row.reviewNotes ?? undefined,
  };
}

export function auditLogFromRow(row: {
  action: string;
  actorRole: UserRole;
  actorUid: string;
  createdAt: Date;
  entityId: string;
  entityType: string;
  logId: string;
  metadata: Record<string, unknown> | null;
}): AuditLog {
  return {
    logId: row.logId,
    actorUid: row.actorUid,
    actorRole: row.actorRole,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    createdAt: requiredTimestamp(row.createdAt),
    metadata: row.metadata ?? undefined,
  };
}
