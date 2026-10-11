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

/**
 * Identificador laxo.
 *
 * `z.guid()` acepta cualquier identificador hexadecimal con forma 8-4-4-4-12,
 * mientras que `z.uuid()` exige los nibbles de versión y variante del estándar
 * RFC 9562/4122. El seed de demo usa ids legibles de relleno
 * (p. ej. `11111111-1111-1111-1111-111111111111`) que son GUID válidos pero NO
 * UUID RFC, por lo que aquí se usa la comprobación laxa.
 */
const idSchema = (message: string) => z.guid(message);

const optionalIdSchema = idSchema("Identificador inválido").optional().or(z.literal(""));

/** Camera / video identifier typed by the mining company. */
export const externalIdSchema = z
  .string()
  .trim()
  .min(1, "El identificador de video/cámara es obligatorio")
  .max(120, "El identificador es demasiado largo");

/** Mining company "ingest video metadata" form (+ optional direct upload). */
export const createVideoMetadataSchema = z.object({
  externalId: externalIdSchema,
  licensePlate: licensePlateSchema,
  recordedDate: dateSchema,
  recordedTime: timeSchema,
  providerId: optionalIdSchema,
  shiftId: optionalIdSchema,
  extraInfo: z
    .string()
    .trim()
    .max(2000, "La información extra es demasiado larga")
    .optional()
    .or(z.literal("")),
  storagePath: z.string().trim().optional().or(z.literal("")),
  storageSize: z.coerce.number().int().nonnegative().optional(),
  storageMime: z
    .string()
    .trim()
    .max(120, "El tipo de archivo es demasiado largo")
    .optional()
    .or(z.literal("")),
});

export type CreateVideoMetadataInput = z.infer<
  typeof createVideoMetadataSchema
>;

/** Mining company schedules a shift for one of its drivers. */
export const createShiftSchema = z.object({
  driverUserId: idSchema("Debes seleccionar un conductor"),
  licensePlate: licensePlateSchema,
  shiftDate: dateSchema,
  shiftTime: timeSchema,
  notes: z
    .string()
    .trim()
    .max(500, "La nota es demasiado larga")
    .optional()
    .or(z.literal("")),
});

/** Mining company invites a driver to its organisation (by email). */
export const inviteDriverSchema = z.object({
  email: emailSchema,
});

/** Mining company invites the provider company it contracts. */
export const inviteProviderSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "El nombre de la proveedora es obligatorio")
    .max(120, "El nombre es demasiado largo"),
  email: emailSchema,
});

/** Any authenticated user switches role (from the roles they were granted). */
export const updateUserRoleSchema = z.object({
  role: z.enum(["DRIVER", "PROVIDER", "MINING"]),
});

/** Switch the active company among the user's memberships. */
export const setActiveCompanySchema = z.object({
  companyId: idSchema("Empresa inválida"),
});

/** Mining company settings. */
export const companySettingsSchema = z.object({
  deletionGraceDays: z.coerce
    .number()
    .int("Debe ser un número entero")
    .min(0, "No puede ser negativo")
    .max(365, "Máximo 365 días"),
  supportEmail: emailSchema.optional().or(z.literal("")),
});

/** Accept / decline an invitation. */
export const respondInvitationSchema = z.object({
  membershipId: idSchema("Invitación inválida"),
});

/** Provider declares the recording was deleted on its own systems. */
export const declareProviderDeletionSchema = z.object({
  requestId: idSchema("Solicitud de borrado inválida"),
  note: z
    .string()
    .trim()
    .max(500, "La nota es demasiado larga")
    .optional()
    .or(z.literal("")),
});

/** Driver requests the deletion of one of their recordings. */
export const requestDeletionSchema = z.object({
  videoId: idSchema("Registro de video inválido"),
});

/** Simple id-only payloads. */
export const requestIdSchema = z.object({
  requestId: idSchema("Solicitud inválida"),
});

export const videoIdSchema = z.object({
  videoId: idSchema("Registro de video inválido"),
});

export const shiftIdSchema = z.object({
  shiftId: idSchema("Turno inválido"),
});

/** Self-service company creation (mining or provider). */
export const createCompanySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "El nombre es obligatorio")
    .max(120, "El nombre es demasiado largo"),
  type: z.enum(["MINING", "PROVIDER"]),
});

/** Platform admin assigns a role to a user. */
export const adminSetRoleSchema = z.object({
  userId: idSchema("Usuario inválido"),
  role: z.enum(["DRIVER", "PROVIDER", "MINING"]),
});

/**
 * Flattens a `ZodError` into a `{ field: message }` record for form rendering.
 */
export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};

  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "_form";
    if (!result[key]) {
      result[key] = issue.message;
    }
  }

  return result;
}
