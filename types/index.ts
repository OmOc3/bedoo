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
  coordinates?: Coordinates;
  isActive: boolean;
  createdAt: FirestoreTimestamp;
  createdBy: string;
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
  submittedAt: FirestoreTimestamp;
  editedAt?: FirestoreTimestamp;
  editedBy?: string;
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
