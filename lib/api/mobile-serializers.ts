import "server-only";

import type { MobileAttendanceSession } from "@ecopest/shared/mobile";

import type {
  AppTimestamp,
  AppUser,
  AttendanceLocation,
  AttendanceSession,
  AuditLog,
  ClientOrder,
  ClientProfile,
  ClientStationAccess,
  DailyWorkReport,
  Report,
  Station,
  TechnicianShift,
  TechnicianWorkSchedule,
} from "@/types";
import type { AppSettingsRecord, ClientAccountDetail, ClientDirectoryEntry } from "@/lib/db/repositories";

export interface MobileStationResponse {
  coordinates?: {
    lat: number;
    lng: number;
  };
  createdAt?: string;
  createdBy?: string;
  description?: string;
  distanceMeters?: number;
  externalCode?: string;
  installationStatus?: Station["installationStatus"];
  isActive: boolean;
  label: string;
  lastVisitedAt?: string;
  lastVisitedBy?: string;
  location: string;
  photoUrls?: string[];
  qrCodeValue?: string;
  requiresImmediateSupervision: boolean;
  stationId: string;
  stationType?: Station["stationType"];
  totalReports: number;
  updatedAt?: string;
  updatedBy?: string;
  zone?: string;
}

export interface MobileReportResponse {
  clientReportId?: string;
  notes?: string;
  pestTypes?: Report["pestTypes"];
  photoCount: number;
  reportId: string;
  reviewNotes?: string;
  reviewStatus: Report["reviewStatus"];
  stationId: string;
  stationLabel: string;
  stationLocation?: string;
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

export interface MobileClientOrderResponse {
  clientName: string;
  clientUid: string;
  createdAt?: string;
  decisionNote?: string;
  note?: string;
  orderId: string;
  photoUrl?: string;
  proposalDescription?: string;
  proposalLat?: number;
  proposalLng?: number;
  proposalLocation?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  stationId?: string;
  stationLabel: string;
  stationLocation?: string;
  status: ClientOrder["status"];
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

export interface MobileTechnicianShiftResponse {
  baseSalary?: number;
  createdAt?: string;
  earlyExit: boolean;
  endLat?: number;
  endLng?: number;
  endStationId?: string;
  endStationLabel?: string;
  endedAt?: string;
  expectedDurationMinutes?: number;
  notes?: string;
  salaryAmount?: number;
  salaryStatus?: TechnicianShift["salaryStatus"];
  scheduleId?: string;
  shiftId: string;
  startLat?: number;
  startLng?: number;
  startStationId?: string;
  startStationLabel?: string;
  startedAt?: string;
  status: TechnicianShift["status"];
  technicianName: string;
  technicianUid: string;
  totalMinutes?: number;
  updatedAt?: string;
}

export interface MobileTechnicianWorkScheduleResponse {
  createdAt?: string;
  createdBy: string;
  expectedDurationMinutes: number;
  hourlyRate?: number;
  isActive: boolean;
  notes?: string;
  scheduleId: string;
  shiftEndTime: string;
  shiftStartTime: string;
  technicianUid: string;
  updatedAt?: string;
  workDays: number[];
}

export interface MobileDailyWorkReportResponse {
  createdAt?: string;
  dailyReportId: string;
  notes?: string;
  photos?: {
    dailyReportId: string;
    photoId: string;
    sortOrder: number;
    uploadedAt?: string;
    uploadedBy: string;
    url: string;
  }[];
  reportDate?: string;
  stationIds: string[];
  stationLabels: string[];
  summary: string;
  technicianName: string;
  technicianUid: string;
  updatedAt?: string;
}

export interface MobileClientProfileResponse {
  addresses: string[];
  clientUid: string;
  createdAt?: string;
  phone?: string;
  updatedAt?: string;
}

export interface MobileClientStationAccessResponse {
  accessId: string;
  clientName?: string;
  clientUid: string;
  createdAt?: string;
  createdBy: string;
  stationId: string;
  stationLabel?: string;
}

export interface MobileClientDirectoryEntryResponse {
  cancelledOrders: number;
  client: MobileUserResponse;
  completedOrders: number;
  inProgressOrders: number;
  latestOrderAt?: string;
  latestStationLocation?: string;
  pendingOrders: number;
  profile?: MobileClientProfileResponse;
  stationCount: number;
  totalOrders: number;
}

export interface MobileClientAccountDetailResponse {
  access: MobileClientStationAccessResponse[];
  client: MobileUserResponse;
  dailyReports: MobileDailyWorkReportResponse[];
  orders: MobileClientOrderResponse[];
  profile?: MobileClientProfileResponse;
  reports: MobileReportResponse[];
  stations: MobileStationResponse[];
}

export interface MobileAppSettingsResponse {
  clientDailyStationOrderLimit: number;
  maintenanceEnabled: boolean;
  maintenanceMessage?: string;
  supportContact?: {
    email?: string;
    hours?: string;
    phone?: string;
  };
}

export function timestampToIso(value: unknown): string | undefined {
  const timestamp = value as Partial<AppTimestamp>;

  if (typeof timestamp?.toDate !== "function") {
    return undefined;
  }

  return timestamp.toDate().toISOString();
}

export function mobileStationResponse(
  stationId: string,
  data: Partial<Station>,
  distanceMeters?: number,
): MobileStationResponse {
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
    ...(data.externalCode ? { externalCode: data.externalCode } : {}),
    ...(data.installationStatus ? { installationStatus: data.installationStatus } : {}),
    ...(data.lastVisitedBy ? { lastVisitedBy: data.lastVisitedBy } : {}),
    ...(data.photoUrls?.length ? { photoUrls: data.photoUrls } : {}),
    ...(data.qrCodeValue ? { qrCodeValue: data.qrCodeValue } : {}),
    ...(data.stationType ? { stationType: data.stationType } : {}),
    ...(data.updatedBy ? { updatedBy: data.updatedBy } : {}),
    ...(data.zone ? { zone: data.zone } : {}),
    ...(typeof distanceMeters === "number" ? { distanceMeters } : {}),
    ...(timestampToIso(data.createdAt) ? { createdAt: timestampToIso(data.createdAt) } : {}),
    ...(timestampToIso(data.lastVisitedAt) ? { lastVisitedAt: timestampToIso(data.lastVisitedAt) } : {}),
    ...(timestampToIso(data.updatedAt) ? { updatedAt: timestampToIso(data.updatedAt) } : {}),
  };
}

function mobileAttendanceLocationPayload(location?: AttendanceLocation): MobileAttendanceSession["clockInLocation"] {
  if (!location) {
    return undefined;
  }

  return {
    coordinates: location.coordinates,
    distanceMeters: location.distanceMeters,
    stationId: location.stationId,
    stationLabel: location.stationLabel,
    ...(typeof location.accuracyMeters === "number" ? { accuracyMeters: location.accuracyMeters } : {}),
    ...(location.clientName ? { clientName: location.clientName } : {}),
    ...(location.clientUid ? { clientUid: location.clientUid } : {}),
  };
}

export function mobileAttendanceSessionResponse(session: AttendanceSession): MobileAttendanceSession {
  const clockInLocation = mobileAttendanceLocationPayload(session.clockInLocation);
  const clockOutLocation = mobileAttendanceLocationPayload(session.clockOutLocation);

  return {
    attendanceId: session.attendanceId,
    technicianName: session.technicianName,
    technicianUid: session.technicianUid,
    ...(session.shiftId ? { shiftId: session.shiftId } : {}),
    ...(session.notes ? { notes: session.notes } : {}),
    ...(timestampToIso(session.clockInAt) ? { clockInAt: timestampToIso(session.clockInAt) } : {}),
    ...(timestampToIso(session.clockOutAt) ? { clockOutAt: timestampToIso(session.clockOutAt) } : {}),
    ...(clockInLocation ? { clockInLocation } : {}),
    ...(clockOutLocation ? { clockOutLocation } : {}),
  };
}

export function mobileReportResponse(report: Report): MobileReportResponse {
  const galleryCount = report.photos?.length ?? 0;
  const legacyCount =
    Number(Boolean(report.photoPaths?.before)) +
    Number(Boolean(report.photoPaths?.after)) +
    Number(Boolean(report.photoPaths?.station));

  return {
    reportId: report.reportId,
    stationId: report.stationId,
    stationLabel: report.stationLabel,
    technicianUid: report.technicianUid,
    technicianName: report.technicianName,
    status: report.status,
    reviewStatus: report.reviewStatus,
    photoCount: galleryCount > 0 ? galleryCount : legacyCount,
    ...(report.clientReportId ? { clientReportId: report.clientReportId } : {}),
    ...(report.notes ? { notes: report.notes } : {}),
    ...(report.reviewNotes ? { reviewNotes: report.reviewNotes } : {}),
    ...(report.photoPaths ? { photoPaths: report.photoPaths } : {}),
    ...(report.stationLocation ? { stationLocation: report.stationLocation } : {}),
    ...(report.pestTypes?.length ? { pestTypes: report.pestTypes } : {}),
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

export function mobileClientOrderResponse(order: ClientOrder, stationLocation?: string): MobileClientOrderResponse {
  const locFromProposal = order.proposalLocation?.trim();
  const fallbackLocation =
    stationLocation ??
    (locFromProposal !== undefined && locFromProposal.length > 0 ? locFromProposal : undefined);

  return {
    clientName: order.clientName,
    clientUid: order.clientUid,
    orderId: order.orderId,
    stationLabel: order.stationLabel,
    status: order.status,
    ...(order.note ? { note: order.note } : {}),
    ...(order.photoUrl ? { photoUrl: order.photoUrl } : {}),
    ...(fallbackLocation ? { stationLocation: fallbackLocation } : {}),
    ...(typeof order.coordinates?.lat === "number" ? { proposalLat: order.coordinates.lat } : {}),
    ...(typeof order.coordinates?.lng === "number" ? { proposalLng: order.coordinates.lng } : {}),
    ...(order.decisionNote ? { decisionNote: order.decisionNote } : {}),
    ...(order.proposalDescription ? { proposalDescription: order.proposalDescription } : {}),
    ...(locFromProposal !== undefined && locFromProposal.length > 0 ? { proposalLocation: locFromProposal } : {}),
    ...(order.reviewedBy ? { reviewedBy: order.reviewedBy } : {}),
    ...(typeof order.stationId === "string" && order.stationId.length > 0 ? { stationId: order.stationId } : {}),
    ...(timestampToIso(order.createdAt) ? { createdAt: timestampToIso(order.createdAt) } : {}),
    ...(timestampToIso(order.reviewedAt) ? { reviewedAt: timestampToIso(order.reviewedAt) } : {}),
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

export function mobileShiftResponse(shift: TechnicianShift, includePayroll = true): MobileTechnicianShiftResponse {
  return {
    shiftId: shift.shiftId,
    technicianUid: shift.technicianUid,
    technicianName: shift.technicianName,
    status: shift.status,
    earlyExit: shift.earlyExit,
    ...(shift.scheduleId ? { scheduleId: shift.scheduleId } : {}),
    ...(timestampToIso(shift.startedAt) ? { startedAt: timestampToIso(shift.startedAt) } : {}),
    ...(typeof shift.startLat === "number" ? { startLat: shift.startLat } : {}),
    ...(typeof shift.startLng === "number" ? { startLng: shift.startLng } : {}),
    ...(shift.startStationId ? { startStationId: shift.startStationId } : {}),
    ...(shift.startStationLabel ? { startStationLabel: shift.startStationLabel } : {}),
    ...(timestampToIso(shift.endedAt) ? { endedAt: timestampToIso(shift.endedAt) } : {}),
    ...(typeof shift.endLat === "number" ? { endLat: shift.endLat } : {}),
    ...(typeof shift.endLng === "number" ? { endLng: shift.endLng } : {}),
    ...(shift.endStationId ? { endStationId: shift.endStationId } : {}),
    ...(shift.endStationLabel ? { endStationLabel: shift.endStationLabel } : {}),
    ...(typeof shift.totalMinutes === "number" ? { totalMinutes: shift.totalMinutes } : {}),
    ...(typeof shift.expectedDurationMinutes === "number" ? { expectedDurationMinutes: shift.expectedDurationMinutes } : {}),
    ...(includePayroll ? { salaryStatus: shift.salaryStatus } : {}),
    ...(includePayroll && typeof shift.baseSalary === "number" ? { baseSalary: shift.baseSalary } : {}),
    ...(includePayroll && typeof shift.salaryAmount === "number" ? { salaryAmount: shift.salaryAmount } : {}),
    ...(shift.notes ? { notes: shift.notes } : {}),
    ...(timestampToIso(shift.createdAt) ? { createdAt: timestampToIso(shift.createdAt) } : {}),
    ...(timestampToIso(shift.updatedAt) ? { updatedAt: timestampToIso(shift.updatedAt) } : {}),
  };
}

export function mobileWorkScheduleResponse(schedule: TechnicianWorkSchedule): MobileTechnicianWorkScheduleResponse {
  return {
    scheduleId: schedule.scheduleId,
    technicianUid: schedule.technicianUid,
    workDays: schedule.workDays,
    shiftStartTime: schedule.shiftStartTime,
    shiftEndTime: schedule.shiftEndTime,
    expectedDurationMinutes: schedule.expectedDurationMinutes,
    isActive: schedule.isActive,
    createdBy: schedule.createdBy,
    ...(typeof schedule.hourlyRate === "number" ? { hourlyRate: schedule.hourlyRate } : {}),
    ...(schedule.notes ? { notes: schedule.notes } : {}),
    ...(timestampToIso(schedule.createdAt) ? { createdAt: timestampToIso(schedule.createdAt) } : {}),
    ...(timestampToIso(schedule.updatedAt) ? { updatedAt: timestampToIso(schedule.updatedAt) } : {}),
  };
}

export function mobileDailyWorkReportResponse(report: DailyWorkReport): MobileDailyWorkReportResponse {
  return {
    dailyReportId: report.dailyReportId,
    technicianUid: report.technicianUid,
    technicianName: report.technicianName,
    summary: report.summary,
    stationIds: report.stationIds,
    stationLabels: report.stationLabels,
    ...(report.notes ? { notes: report.notes } : {}),
    ...(report.photos?.length
      ? {
          photos: report.photos.map((photo) => ({
            dailyReportId: photo.dailyReportId,
            photoId: photo.photoId,
            sortOrder: photo.sortOrder,
            uploadedBy: photo.uploadedBy,
            url: photo.url,
            ...(timestampToIso(photo.uploadedAt) ? { uploadedAt: timestampToIso(photo.uploadedAt) } : {}),
          })),
        }
      : {}),
    ...(timestampToIso(report.reportDate) ? { reportDate: timestampToIso(report.reportDate) } : {}),
    ...(timestampToIso(report.createdAt) ? { createdAt: timestampToIso(report.createdAt) } : {}),
    ...(timestampToIso(report.updatedAt) ? { updatedAt: timestampToIso(report.updatedAt) } : {}),
  };
}

export function mobileClientProfileResponse(profile: ClientProfile): MobileClientProfileResponse {
  return {
    clientUid: profile.clientUid,
    addresses: profile.addresses,
    ...(profile.phone ? { phone: profile.phone } : {}),
    ...(timestampToIso(profile.createdAt) ? { createdAt: timestampToIso(profile.createdAt) } : {}),
    ...(timestampToIso(profile.updatedAt) ? { updatedAt: timestampToIso(profile.updatedAt) } : {}),
  };
}

export function mobileClientStationAccessResponse(access: ClientStationAccess): MobileClientStationAccessResponse {
  return {
    accessId: access.accessId,
    clientUid: access.clientUid,
    createdBy: access.createdBy,
    stationId: access.stationId,
    ...(access.clientName ? { clientName: access.clientName } : {}),
    ...(access.stationLabel ? { stationLabel: access.stationLabel } : {}),
    ...(timestampToIso(access.createdAt) ? { createdAt: timestampToIso(access.createdAt) } : {}),
  };
}

export function mobileClientDirectoryEntryResponse(entry: ClientDirectoryEntry): MobileClientDirectoryEntryResponse {
  return {
    client: mobileUserResponse(entry.client),
    totalOrders: entry.totalOrders,
    pendingOrders: entry.pendingOrders,
    inProgressOrders: entry.inProgressOrders,
    completedOrders: entry.completedOrders,
    cancelledOrders: entry.cancelledOrders,
    stationCount: entry.stationCount,
    ...(entry.profile ? { profile: mobileClientProfileResponse(entry.profile) } : {}),
    ...(entry.latestStationLocation ? { latestStationLocation: entry.latestStationLocation } : {}),
    ...(timestampToIso(entry.latestOrderAt) ? { latestOrderAt: timestampToIso(entry.latestOrderAt) } : {}),
  };
}

export function mobileClientAccountDetailResponse(detail: ClientAccountDetail): MobileClientAccountDetailResponse {
  return {
    client: mobileUserResponse(detail.client),
    access: detail.access.map(mobileClientStationAccessResponse),
    dailyReports: detail.dailyReports.map(mobileDailyWorkReportResponse),
    orders: detail.orders.map((order) => mobileClientOrderResponse(order, order.station?.location)),
    reports: detail.reports.map(mobileReportResponse),
    stations: detail.stations.map((station) => mobileStationResponse(station.stationId, station)),
    ...(detail.profile ? { profile: mobileClientProfileResponse(detail.profile) } : {}),
  };
}

export function mobileAppSettingsResponse(settings: AppSettingsRecord): MobileAppSettingsResponse {
  return {
    maintenanceEnabled: settings.maintenanceEnabled,
    clientDailyStationOrderLimit: settings.clientDailyStationOrderLimit,
    ...(settings.maintenanceMessage ? { maintenanceMessage: settings.maintenanceMessage } : {}),
    ...(settings.supportContact ? { supportContact: settings.supportContact } : {}),
  };
}
