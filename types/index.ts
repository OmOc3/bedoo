import type { SharedReviewStatus, SharedStatusOption, SharedUserRole } from "@/lib/shared/constants";

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
}

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: AppTimestamp;
  isActive: boolean;
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
  alerts: string[];
  recommendations: string[];
  generatedAt: string;
  source: "gemini" | "fallback";
  model?: string;
  note?: string;
}
