import "server-only";

import type { AppTimestamp, AppUser, AuditLog, Report, Station } from "@/types";

export interface MobileStationResponse {
  coordinates?: {
    lat: number;
    lng: number;
  };
  createdAt?: string;
  createdBy?: string;
  description?: string;
  isActive: boolean;
  label: string;
  lastVisitedAt?: string;
  lastVisitedBy?: string;
  location: string;
  photoUrls?: string[];
  qrCodeValue?: string;
  requiresImmediateSupervision: boolean;
  stationId: string;
  totalReports: number;
  updatedAt?: string;
  updatedBy?: string;
  zone?: string;
}

export interface MobileReportResponse {
  clientReportId?: string;
  notes?: string;
  photoCount: number;
  reportId: string;
  reviewNotes?: string;
  reviewStatus: Report["reviewStatus"];
  stationId: string;
  stationLabel: string;
  status: Report["status"];
  submittedAt?: string;
  technicianName: string;
  technicianUid: string;
}

export interface MobileAuditLogResponse {
  action: string;
  actorRole: AuditLog["actorRole"];
  actorUid: string;
  createdAt?: string;
  entityId: string;
  entityType: string;
  logId: string;
  metadata?: Record<string, unknown>;
}

export interface MobileUserResponse {
  createdAt?: string;
  displayName: string;
  email: string;
  isActive: boolean;
  role: AppUser["role"];
  uid: string;
  image?: string;
}

export function timestampToIso(value: unknown): string | undefined {
  const timestamp = value as Partial<AppTimestamp>;

  if (typeof timestamp?.toDate !== "function") {
    return undefined;
  }

  return timestamp.toDate().toISOString();
}

export function mobileStationResponse(stationId: string, data: Partial<Station>): MobileStationResponse {
  return {
    stationId: data.stationId ?? stationId,
    label: data.label ?? "محطة بدون اسم",
    location: data.location ?? "غير محدد",
    isActive: data.isActive ?? false,
    requiresImmediateSupervision: data.requiresImmediateSupervision ?? false,
    totalReports: data.totalReports ?? 0,
    ...(data.coordinates ? { coordinates: data.coordinates } : {}),
    ...(data.createdBy ? { createdBy: data.createdBy } : {}),
    ...(data.description ? { description: data.description } : {}),
    ...(data.lastVisitedBy ? { lastVisitedBy: data.lastVisitedBy } : {}),
    ...(data.photoUrls?.length ? { photoUrls: data.photoUrls } : {}),
    ...(data.qrCodeValue ? { qrCodeValue: data.qrCodeValue } : {}),
    ...(data.updatedBy ? { updatedBy: data.updatedBy } : {}),
    ...(data.zone ? { zone: data.zone } : {}),
    ...(timestampToIso(data.createdAt) ? { createdAt: timestampToIso(data.createdAt) } : {}),
    ...(timestampToIso(data.lastVisitedAt) ? { lastVisitedAt: timestampToIso(data.lastVisitedAt) } : {}),
    ...(timestampToIso(data.updatedAt) ? { updatedAt: timestampToIso(data.updatedAt) } : {}),
  };
}

export function mobileReportResponse(report: Report): MobileReportResponse {
  return {
    reportId: report.reportId,
    stationId: report.stationId,
    stationLabel: report.stationLabel,
    technicianUid: report.technicianUid,
    technicianName: report.technicianName,
    status: report.status,
    reviewStatus: report.reviewStatus,
    photoCount:
      Number(Boolean(report.photoPaths?.before)) +
      Number(Boolean(report.photoPaths?.after)) +
      Number(Boolean(report.photoPaths?.station)),
    ...(report.clientReportId ? { clientReportId: report.clientReportId } : {}),
    ...(report.notes ? { notes: report.notes } : {}),
    ...(report.reviewNotes ? { reviewNotes: report.reviewNotes } : {}),
    ...(timestampToIso(report.submittedAt) ? { submittedAt: timestampToIso(report.submittedAt) } : {}),
  };
}

export function mobileAuditLogResponse(log: AuditLog): MobileAuditLogResponse {
  return {
    logId: log.logId,
    actorUid: log.actorUid,
    actorRole: log.actorRole,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    ...(log.metadata ? { metadata: log.metadata } : {}),
    ...(timestampToIso(log.createdAt) ? { createdAt: timestampToIso(log.createdAt) } : {}),
  };
}

export function mobileUserResponse(user: AppUser): MobileUserResponse {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    isActive: user.isActive,
    ...(user.image ? { image: user.image } : {}),
    ...(timestampToIso(user.createdAt) ? { createdAt: timestampToIso(user.createdAt) } : {}),
  };
}
