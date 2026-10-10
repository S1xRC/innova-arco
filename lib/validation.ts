import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .min(1, "El correo electrónico es obligatorio")
  .toLowerCase()
  .pipe(z.email("Ingresa un correo electrónico válido"));

export const licensePlateSchema = z
  .string()
  .trim()
  .min(3, "La patente debe tener al menos 3 caracteres")
  .max(12, "La patente es demasiado larga")
  .transform((value) => value.toUpperCase());

const dateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (AAAA-MM-DD)");

const timeSchema = z
  .string()
  .trim()
  .regex(/^\d{2}:\d{2}$/, "Formato de hora inválido (HH:MM)");

/** Provider "ingest video metadata" form. */
export const createVideoMetadataSchema = z.object({
  licensePlate: licensePlateSchema,
  recordedDate: dateSchema,
  recordedTime: timeSchema,
  driverEmail: emailSchema,
});

export type CreateVideoMetadataInput = z.infer<
  typeof createVideoMetadataSchema
>;

/** Driver onboarding: pick the mining company they work for. */
export const selectMiningCompanySchema = z.object({
  companyId: z.uuid("Debes seleccionar una empresa minera"),
});

/** Driver requests the deletion of one of their video records. */
export const requestDeletionSchema = z.object({
  videoId: z.uuid("Registro de video inválido"),
});

/** Provider resolves a pending claim. */
export const resolveDeletionSchema = z.object({
  requestId: z.uuid("Solicitud de borrado inválida"),
});

/**
 * Flattens a `ZodError` into a `{ field: message }` record for form rendering,
 * falling back to the first issue when the path cannot be resolved.
 */
export function zodFieldErrors(
  error: z.ZodError,
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "_form";
    if (!result[key]) {
      result[key] = issue.message;
    }
  }

  return result;
}
