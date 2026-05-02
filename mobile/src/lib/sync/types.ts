import type { SharedReviewStatus, SharedStatusOption, SharedUserRole } from '@ecopest/shared/constants';

export type UserRole = SharedUserRole;
export type StatusOption = SharedStatusOption;
export type ReviewStatus = SharedReviewStatus;
export type ClientOrderStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

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

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: AppTimestamp;
  isActive: boolean;
  image?: string | null;
}

export interface MobileAppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  image?: string | null;
  createdAt?: string;
}

export interface MobileReviewReport {
  clientReportId?: string;
  notes?: string;
  photoCount?: number;
  reportId: string;
  reviewNotes?: string;
  reviewStatus: ReviewStatus;
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
  distanceMeters?: number;
  zone?: string;
  photoUrls?: string[];
  coordinates?: Coordinates;
  qrCodeValue?: string;
  isActive: boolean;
  requiresImmediateSupervision?: boolean;
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
  lastVisitedAt?: string;
  lastVisitedBy?: string;
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
  reviewStatus: ReviewStatus;
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
  createdAt?: string;
  metadata?: Record<string, unknown>;
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

export interface AttendanceSession {
  attendanceId: string;
  clockInAt?: string;
  clockInLocation?: AttendanceLocation;
  clockOutAt?: string;
  clockOutLocation?: AttendanceLocation;
  notes?: string;
  technicianName: string;
  technicianUid: string;
}

export interface OpenAttendanceResponse {
  openSession: AttendanceSession | null;
}

export interface MobileClientOrder {
  clientName: string;
  clientUid: string;
  createdAt?: string;
  note?: string;
  orderId: string;
  photoUrl?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  stationId: string;
  stationLabel: string;
  stationLocation?: string;
  status: ClientOrderStatus;
}

export interface MobileClientOrdersResponse {
  orders: MobileClientOrder[];
  reports?: MobileReviewReport[];
  stations?: Station[];
}

export interface MobileAdminTasks {
  inactiveStations: Station[];
  pendingReports: MobileReviewReport[];
  staleStations: Station[];
  totals: {
    inactiveStations: number;
    pendingReports: number;
    staleStations: number;
  };
  truncatedStationScan: boolean;
}

export interface MobileAdminAnalytics {
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

export interface MobileManagerDashboardStats {
  activeStations: number;
  pendingReviewReports: number;
  reportsThisWeek: number;
  technicians: number;
  totalReports: number;
  totalStations: number;
}

export interface MobileSupervisorDashboardStats {
  activeStations: number;
  pendingReviewReports: number;
  reportsToday: number;
  totalReports: number;
}

export interface MobileAdminOverview {
  analytics?: MobileAdminAnalytics;
  latestReports: MobileReviewReport[];
  role: "manager" | "supervisor";
  stats: MobileManagerDashboardStats | MobileSupervisorDashboardStats;
  tasks: MobileAdminTasks;
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
  image?: string | null;
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
