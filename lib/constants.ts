import type {
  CompanyType,
  DeletionStatus,
  MembershipStatus,
  RelationStatus,
  UserRole,
} from "@/types/database";

/** Human readable Spanish labels for the three platform roles. */
export const ROLE_LABELS: Record<UserRole, string> = {
  DRIVER: "Conductor",
  PROVIDER: "Proveedor de cámaras",
  MINING: "Empresa minera",
};

/** Landing route for each role after a successful sign-in. */
export const ROLE_HOME: Record<UserRole, string> = {
  DRIVER: "/driver",
  PROVIDER: "/provider",
  MINING: "/mining",
};

export function roleHomePath(role: UserRole): string {
  return ROLE_HOME[role] ?? "/dashboard";
}

/** Status labels used by the camera provider (they act on the record). */
export const STATUS_LABELS: Record<DeletionStatus, string> = {
  PENDING: "Pendiente",
  DELETED: "Eliminado",
};

/** Status labels used by the mining company audit portal. */
export const AUDIT_STATUS_LABELS: Record<DeletionStatus, string> = {
  PENDING: "Pendiente",
  DELETED: "Resuelto",
};

export const MEMBERSHIP_STATUS_LABELS: Record<MembershipStatus, string> = {
  INVITED: "Invitado",
  ACTIVE: "Activo",
  REVOKED: "Revocado",
};

export const RELATION_STATUS_LABELS: Record<RelationStatus, string> = {
  INVITED: "Invitación enviada",
  ACTIVE: "Activa",
  REVOKED: "Revocada",
};

export const COMPANY_TYPE_LABELS: Record<CompanyType, string> = {
  MINING: "Empresa minera",
  PROVIDER: "Proveedor de cámaras",
};

/** Retention policy options offered to mining companies. */
export const DELETION_POLICY_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 30, label: "30 días (recomendado)" },
  { value: 7, label: "7 días" },
  { value: 1, label: "1 día" },
  { value: 0, label: "Instantáneo (demo)" },
];

export const DEFAULT_DELETION_GRACE_DAYS = 30;

export const APP_NAME = "Innova ARCO";
export const APP_DESCRIPTION =
  "Plataforma para gestionar los derechos ARCO de conductores en empresas mineras.";

/**
 * Maximum recording size accepted by the app.
 *
 * Must stay <= the Supabase Storage "Global file size limit" of the project
 * (50 MB on the Free plan). Override it with `STORAGE_MAX_UPLOAD_MB` when you
 * raise the Supabase limit.
 */
export const DEFAULT_MAX_UPLOAD_MB = 50;

export function resolveMaxUploadMb(): number {
  const raw = Number((process.env.STORAGE_MAX_UPLOAD_MB ?? "").trim());
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_MAX_UPLOAD_MB;
}

/** Human readable size, e.g. "32.0 MB". */
export function formatMegabytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Weekday labels; index = `extract(dow)` (0 = domingo … 6 = sábado). */
export const WEEKDAY_LABELS: Record<number, string> = {
  0: "Domingo",
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
};

/** Monday-first display order used by the weekly board. */
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
