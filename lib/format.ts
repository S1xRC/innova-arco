/**
 * Date handling.
 *
 * Timestamps are stored as true UTC instants and always rendered in the
 * application time zone (`America/Santiago`). The provider's `date` + `time`
 * inputs are interpreted as Chilean local time before being converted to UTC,
 * so what they type is exactly what everybody else reads back.
 *
 * Implemented with the platform `Intl` API — no extra dependency required.
 */

export const APP_TIME_ZONE = "America/Santiago";

const dateTimeFormatter = new Intl.DateTimeFormat("es-CL", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: APP_TIME_ZONE,
});

const dateFormatter = new Intl.DateTimeFormat("es-CL", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: APP_TIME_ZONE,
});

const longDateTimeFormatter = new Intl.DateTimeFormat("es-CL", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: APP_TIME_ZONE,
});

const timeFormatter = new Intl.DateTimeFormat("es-CL", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: APP_TIME_ZONE,
});

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

export function formatDateTime(value: string | Date): string {
  return dateTimeFormatter.format(toDate(value));
}

/** Time of day (HH:mm) in the application time zone. */
export function formatTime(value: string | Date): string {
  return timeFormatter.format(toDate(value));
}

export function formatDate(value: string | Date): string {
  return dateFormatter.format(toDate(value));
}

export function formatLongDateTime(value: string | Date): string {
  return `${longDateTimeFormatter.format(toDate(value))} hrs`;
}

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

/** Minutes the given time zone is ahead of UTC at that instant. */
function timeZoneOffsetMinutes(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);

  const values: Record<string, number> = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      values[part.type] = Number(part.value);
    }
  }

  const asUtc = Date.UTC(
    values.year,
    values.month - 1,
    values.day,
    values.hour % 24,
    values.minute,
    values.second,
  );

  return (asUtc - instant.getTime()) / 60_000;
}

/** Interprets a wall-clock date/time in `timeZone` and returns the UTC instant. */
function zonedWallClockToUtc(
  date: string,
  time: string,
  timeZone: string,
): Date {
  const naive = new Date(`${date}T${time}:00Z`);

  // Two passes converge even across DST boundaries.
  let instant = new Date(
    naive.getTime() - timeZoneOffsetMinutes(naive, timeZone) * 60_000,
  );
  instant = new Date(
    naive.getTime() - timeZoneOffsetMinutes(instant, timeZone) * 60_000,
  );

  return instant;
}

/** Wall-clock components of an instant, in the application time zone. */
function zonedParts(instant: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(instant);

  const values: Record<string, number> = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      values[part.type] = Number(part.value);
    }
  }

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour % 24,
    minute: values.minute,
  };
}

/** Wall-clock date for `<input type="date">`. */
export function toDateInputValue(value: Date): string {
  const { year, month, day } = zonedParts(value);
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** Wall-clock time for `<input type="time">`. */
export function toTimeInputValue(value: Date): string {
  const { hour, minute } = zonedParts(value);
  return `${pad(hour)}:${pad(minute)}`;
}

/**
 * Combines a `yyyy-MM-dd` date and an `HH:mm` time (interpreted as Chilean
 * local time) into a UTC `Date`. Returns `null` when the input is invalid.
 */
export function combineDateTime(date: string, time: string): Date | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time.trim());

  if (!dateMatch || !timeMatch) {
    return null;
  }

  const parsed = zonedWallClockToUtc(
    `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`,
    `${timeMatch[1]}:${timeMatch[2]}`,
    APP_TIME_ZONE,
  );

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Returns the number of whole days between now and `value` (rounded up).
 * Negative when the value is in the past.
 */
export function daysUntil(value: string | Date): number {
  const target = toDate(value).getTime();
  const diff = target - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/** Human readable countdown, e.g. "quedan 12 días" / "vencido". */
export function formatRemaining(value: string | Date): string {
  const days = daysUntil(value);

  if (days < 0) {
    return "vencido";
  }

  if (days === 0) {
    return "hoy";
  }

  if (days === 1) {
    return "queda 1 día";
  }

  return `quedan ${days} días`;
}

/** Cuándo se borra la grabación una vez que el conductor lo pide. */
export function describeRetentionDays(days: number): string {
  if (days <= 0) {
    return "de inmediato al pedirlo";
  }

  if (days === 1) {
    return "1 día después de pedirlo";
  }

  return `${days} días después de pedirlo`;
}

/** Adds `days` to a date and returns a new Date. */
export function addDays(value: string | Date, days: number): Date {
  return new Date(toDate(value).getTime() + days * 24 * 60 * 60 * 1000);
}

const shortDateFormatter = new Intl.DateTimeFormat("es-CL", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  timeZone: APP_TIME_ZONE,
});

/** Short weekday + date, e.g. "lun 16/03" — used by the day picker. */
export function formatShortDate(value: string | Date): string {
  return shortDateFormatter.format(toDate(value));
}


