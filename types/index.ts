import type { Company, DeletionRequest, UserProfile, VideoMetadata } from "./database";

export type {
  Company,
  CompanyType,
  Database,
  DeletionRequest,
  DeletionStatus,
  Json,
  Tables,
  UserProfile,
  UserRole,
  VideoMetadata,
} from "./database";

/** Snapshot of the authenticated user + their profile row. */
export interface SessionProfile {
  id: string;
  email: string;
  role: UserProfile["role"];
  companyId: string | null;
  companyName: string | null;
  fullName: string | null;
  avatarUrl: string | null;
}

/** A driver row enriched with provider info and the state of any deletion request. */
export interface DriverRecord {
  id: string;
  licensePlate: string;
  recordedAt: string;
  providerName: string;
  requestId: string | null;
  requestStatus: DeletionRequest["status"] | null;
}

/** A claim as seen by the camera provider. */
export interface ProviderClaim {
  id: string;
  videoId: string;
  status: DeletionRequest["status"];
  createdAt: string;
  resolvedAt: string | null;
  licensePlate: string;
  recordedAt: string;
  driverEmail: string;
}

/** A read-only audit row for the mining company portal. */
export interface MiningAuditRow {
  id: string;
  status: DeletionRequest["status"];
  createdAt: string;
  resolvedAt: string | null;
  licensePlate: string;
  recordedAt: string;
  driverEmail: string;
  providerName: string;
}

export type { Company as CompanyRecord, VideoMetadata as VideoMetadataRecord };
