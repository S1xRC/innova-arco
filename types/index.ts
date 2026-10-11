import type { CompanyType, DeletionRequest, Json, UserRole } from "./database";

export type {
  Company,
  CompanyRelation,
  CompanyType,
  Database,
  DeletionRequest,
  DeletionStatus,
  Json,
  Membership,
  MembershipStatus,
  RelationStatus,
  Shift,
  ShiftTemplate,
  Tables,
  UserProfile,
  UserRole,
  VideoMetadata,
} from "./database";

/** One of the companies a user belongs to (active membership). */
export interface MembershipSummary {
  id: string;
  companyId: string;
  companyName: string;
  companyType: CompanyType;
  role: UserRole;
  status: "INVITED" | "ACTIVE" | "REVOKED";
}

/** Snapshot of the authenticated user + their profile row + memberships. */
export interface SessionProfile {
  id: string;
  email: string;
  role: UserRole;
  /** Active company id (chosen among the user's memberships). */
  companyId: string | null;
  companyName: string | null;
  companyType: CompanyType | null;
  fullName: string | null;
  avatarUrl: string | null;
  isPlatformAdmin: boolean;
  memberships: MembershipSummary[];
}

/** A recording as seen by the driver (assigned through a shift). */
export interface DriverRecording {
  id: string;
  licensePlate: string;
  recordedAt: string;
  externalId: string | null;
  providerName: string;
  shiftStartsAt: string | null;
  requestId: string | null;
  requestStatus: DeletionRequest["status"] | null;
  scheduledDeletionAt: string | null;
  providerDeclaredAt: string | null;
  deletedAt: string | null;
  storagePath: string | null;
  accessCount: number;
  lastAccessAt: string | null;
  lastAccessCompanyName: string | null;
}

/** A shift (turno) as shown in the mining company dashboard. */
export interface ShiftRow {
  id: string;
  licensePlate: string;
  startsAt: string;
  notes: string | null;
  driverUserId: string;
  driverEmail: string;
  driverName: string | null;
  matchedVideoId: string | null;
  videoDeletedAt: string | null;
}

/** A deletion request as seen inside the mining company portal. */
export interface MiningClaimRow {
  id: string;
  status: DeletionRequest["status"];
  createdAt: string;
  scheduledDeletionAt: string | null;
  resolvedAt: string | null;
  autoDeletedAt: string | null;
  licensePlate: string;
  recordedAt: string;
  driverEmail: string;
  providerName: string | null;
  providerDeclaredAt: string | null;
}

/** A deletion ticket shown to the camera provider. */
export interface ProviderDeletionTicket {
  id: string;
  videoId: string;
  status: DeletionRequest["status"];
  createdAt: string;
  scheduledDeletionAt: string | null;
  resolvedAt: string | null;
  autoDeletedAt: string | null;
  licensePlate: string;
  recordedAt: string;
  miningName: string;
  driverEmail: string;
  providerDeclaredAt: string | null;
  providerNote: string | null;
}

/** A row of the mining company's own video catalogue. */
export interface MiningVideoRow {
  id: string;
  externalId: string | null;
  licensePlate: string;
  recordedAt: string;
  providerName: string | null;
  storagePath: string | null;
  deletedAt: string | null;
  shiftStartsAt: string | null;
  driverEmail: string | null;
  extraInfo: Json | null;
  storageSize: number | null;
}

/** A weekly schedule entry (the editable "horario" of the mining company). */
export interface ScheduleEntry {
  id: string;
  driverUserId: string;
  driverLabel: string;
  licensePlate: string;
  /** 0 = domingo … 6 = sábado (matches `extract(dow)`). */
  weekday: number;
  /** "HH:MM" */
  startTime: string;
  notes: string | null;
  active: boolean;
  /** Occurrences generated from this entry that already hold a recording. */
  assignedCount: number;
}

/** A driver row of the weekly board, with their schedule entries. */
export interface ScheduleDriverRow {
  userId: string;
  label: string;
  entries: ScheduleEntry[];
}

/** Simple option list for the schedule editor. */
export interface ScheduleDriverOption {
  userId: string;
  label: string;
}

/** A company's data processing declaration, as shown to a driver. */
export interface DataPolicyView {
  companyId: string;
  companyName: string;
  companyType: CompanyType;
  content: string;
  updatedAt: string | null;
}

/** One row of the recording access log (ARCO "acceso"). */
export interface AccessLogRow {
  id: string;
  createdAt: string;
  action: string;
  licensePlate: string;
  recordedAt: string;
  userEmail: string;
  companyName: string | null;
}

/** A company member (driver or staff) with their membership state. */
export interface CompanyMember {
  id: string;
  userId: string | null;
  email: string;
  role: UserRole;
  status: "INVITED" | "ACTIVE" | "REVOKED";
  createdAt: string;
  acceptedAt: string | null;
}

/** A mining <-> provider relation. */
export interface CompanyRelationRow {
  id: string;
  providerId: string;
  providerName: string;
  providerEmail: string | null;
  status: "INVITED" | "ACTIVE" | "REVOKED";
  createdAt: string;
  acceptedAt: string | null;
}

/** A pending invitation the signed-in user can accept. */
export interface PendingInvitation {
  id: string;
  companyId: string;
  companyName: string;
  companyType: CompanyType;
  role: UserRole;
  createdAt: string;
}

/** A user row for the platform-admin role manager. */
export interface AdminUserRow {
  id: string;
  email: string;
  role: UserRole;
  fullName: string | null;
  isPlatformAdmin: boolean;
  createdAt: string;
}
