export type UserRole = "technician" | "supervisor" | "manager";

export type StatusOption =
  | "station_ok"
  | "station_replaced"
  | "bait_changed"
  | "bait_ok"
  | "station_excluded"
  | "station_substituted";

export interface FirestoreTimestamp {
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
  createdAt: FirestoreTimestamp;
  isActive: boolean;
}

export interface Station {
  stationId: string;
  label: string;
  location: string;
  zone?: string;
  coordinates?: Coordinates;
  qrCodeValue: string;
  isActive: boolean;
  createdAt: FirestoreTimestamp;
  createdBy: string;
  updatedAt?: FirestoreTimestamp;
  updatedBy?: string;
  lastVisitedAt?: FirestoreTimestamp;
  totalReports: number;
}

export interface Report {
  reportId: string;
  stationId: string;
  stationLabel: string;
  technicianUid: string;
  technicianName: string;
  status: StatusOption[];
  notes?: string;
  photoPaths?: ReportPhotoPaths;
  submittedAt: FirestoreTimestamp;
  reviewStatus: "pending" | "reviewed" | "rejected";
  editedAt?: FirestoreTimestamp;
  editedBy?: string;
  reviewedAt?: FirestoreTimestamp;
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
  createdAt: FirestoreTimestamp;
  metadata?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  message: string;
  code: string;
  retryAfterSeconds?: number;
}

export interface LoginSuccessResponse {
  redirectTo: string;
  customToken: string;
}

export interface SessionSuccessResponse {
  redirectTo: string;
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
