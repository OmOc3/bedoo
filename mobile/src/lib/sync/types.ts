// Synced from web types — do not edit manually
export type UserRole = "technician" | "supervisor" | "manager";

export type StatusOption =
  | "station_ok"
  | "station_replaced"
  | "bait_changed"
  | "bait_ok"
  | "station_excluded"
  | "station_substituted";

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

export interface MobileAppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  createdAt?: string;
}

export interface MobileReviewReport {
  notes?: string;
  reportId: string;
  reviewNotes?: string;
  reviewStatus: "pending" | "reviewed" | "rejected";
  stationId: string;
  stationLabel: string;
  status: StatusOption[];
  submittedAt?: string;
  technicianName: string;
  technicianUid: string;
}

export interface Station {
  stationId: string;
  label: string;
  location: string;
  description?: string;
  zone?: string;
  photoUrls?: string[];
  coordinates?: Coordinates;
  qrCodeValue?: string;
  isActive: boolean;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
  lastVisitedAt?: string;
  totalReports: number;
}

export interface Report {
  reportId: string;
  stationId: string;
  stationLabel: string;
  technicianUid?: string;
  technicianName?: string;
  status: StatusOption[];
  clientReportId?: string;
  notes?: string;
  photoPaths?: ReportPhotoPaths;
  submittedAt?: string;
  reviewStatus: "pending" | "reviewed" | "rejected";
  editedAt?: string;
  editedBy?: string;
  reviewedAt?: string;
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
  user: AuthenticatedUserResponse;
  redirectTo: string;
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
