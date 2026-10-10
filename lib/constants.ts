import type { DeletionStatus, UserRole } from "@/types/database";

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

export const APP_NAME = "Innova ARCO";
export const APP_DESCRIPTION =
  "Plataforma para gestionar los derechos ARCO de conductores en faenas mineras.";
