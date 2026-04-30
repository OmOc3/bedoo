import type { SharedReviewStatus, SharedStatusOption, SharedUserRole } from "@ecopest/shared/constants";

export type UserRole = SharedUserRole;

export type StatusOption = SharedStatusOption;

export interface AppTimestamp {
  seconds: number;
  nanoseconds: number;
  toDate: () => Date;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface ReportPhotoPaths {
  after?: string;
  before?: string;
  station?: string;
}

export type ReportPhotoCategory = "after" | "before" | "during" | "other" | "station";

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: AppTimestamp;
  isActive: boolean;
  image?: string | null;
  passwordChangedAt?: AppTimestamp;
}

export interface Station {
  stationId: string;
  label: string;
  location: string;
  description?: string;
  zone?: string;
  photoUrls?: string[];
  coordinates?: Coordinates;
  qrCodeValue: string;
  isActive: boolean;
  requiresImmediateSupervision: boolean;
  createdAt: AppTimestamp;
  createdBy: string;
  updatedAt?: AppTimestamp;
  updatedBy?: string;
  lastVisitedAt?: AppTimestamp;
  lastVisitedBy?: string;
  totalReports: number;
}

export interface Report {
  reportId: string;
  stationId: string;
  stationLabel: string;
  technicianUid: string;
  technicianName: string;
  status: StatusOption[];
  clientReportId?: string;
  notes?: string;
  photos?: ReportPhoto[];
  photoPaths?: ReportPhotoPaths;
  submittedAt: AppTimestamp;
  reviewStatus: SharedReviewStatus;
  editedAt?: AppTimestamp;
  editedBy?: string;
  reviewedAt?: AppTimestamp;
  reviewedBy?: string;
  reviewNotes?: string;
}

export interface AuditLog {
  logId: string;
  actorUid: string;
  actorRole: UserRole;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: AppTimestamp;
  metadata?: Record<string, unknown>;
}

export interface AttendanceSession {
  attendanceId: string;
  technicianUid: string;
  technicianName: string;
  clockInAt: AppTimestamp;
  clockInLocation?: AttendanceLocation;
  clockOutAt?: AppTimestamp;
  clockOutLocation?: AttendanceLocation;
  notes?: string;
}

export interface AttendanceLocation {
  accuracyMeters?: number;
  clientName?: string;
  clientUid?: string;
  coordinates: Coordinates;
  distanceMeters: number;
  stationId: string;
  stationLabel: string;
}

export interface ClientStationAccess {
  accessId: string;
  clientName?: string;
  clientUid: string;
  createdAt: AppTimestamp;
  createdBy: string;
  stationId: string;
  stationLabel?: string;
}

export interface ReportPhoto {
  category: ReportPhotoCategory;
  photoId: string;
  reportId: string;
  sortOrder: number;
  uploadedAt: AppTimestamp;
  uploadedBy: string;
  url: string;
}

export interface DailyReportPhoto {
  dailyReportId: string;
  photoId: string;
  sortOrder: number;
  uploadedAt: AppTimestamp;
  uploadedBy: string;
  url: string;
}

export interface DailyWorkReport {
  createdAt: AppTimestamp;
  dailyReportId: string;
  notes?: string;
  photos?: DailyReportPhoto[];
  reportDate: AppTimestamp;
  stationIds: string[];
  stationLabels: string[];
  summary: string;
  technicianName: string;
  technicianUid: string;
  updatedAt?: AppTimestamp;
}

export type ClientOrderStatus = "pending" | "in_progress" | "completed" | "cancelled";

export interface ClientOrder {
  orderId: string;
  clientUid: string;
  clientName: string;
  stationId: string;
  stationLabel: string;
  note?: string;
  photoUrl?: string;
  status: ClientOrderStatus;
  createdAt: AppTimestamp;
  reviewedAt?: AppTimestamp;
  reviewedBy?: string;
}

export interface ClientProfile {
  clientUid: string;
  phone?: string;
  addresses: string[];
  createdAt: AppTimestamp;
  updatedAt?: AppTimestamp;
}

export interface ClientOrderStationSnapshot {
  coordinates?: Coordinates;
  createdAt: AppTimestamp;
  description?: string;
  isActive: boolean;
  lastVisitedAt?: AppTimestamp;
  location: string;
  totalReports: number;
  zone?: string;
}

export interface ClientOrderWithStation extends ClientOrder {
  station?: ClientOrderStationSnapshot;
}

export interface ApiErrorResponse {
  message: string;
  code: string;
  debug?: string;
  retryAfterSeconds?: number;
}

export interface AuthenticatedUserResponse {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  image?: string | null;
}

export interface LoginSuccessResponse {
  redirectTo: string;
  user: AuthenticatedUserResponse;
}

export interface SessionSuccessResponse {
  redirectTo: string;
}

export interface MobileWebSessionResponse {
  expiresAt: string;
  redirectTo: string;
  url: string;
}

export interface AiInsightsResult {
  summary: string;
  fullReport?: string;
  alerts: string[];
  recommendations: string[];
  sections?: AiReportSection[];
  dataQualityNotes?: string[];
  dataCoverage?: AiDataCoverageItem[];
  generatedAt: string;
  source: "gemini" | "fallback";
  model?: string;
  note?: string;
}

export interface AiReportSection {
  title: string;
  body: string;
  items: string[];
}

export interface AiDataCoverageItem {
  includedRows: number;
  key: string;
  label: string;
  totalRows: number;
  truncated: boolean;
}
