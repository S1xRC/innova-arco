/**
 * Static environment access.
 *
 * Next.js only inlines `process.env.NEXT_PUBLIC_*` when the reference is
 * written literally (not via a dynamic key), so every variable is read with a
 * static member expression here and re-exported.
 */

export const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();

/**
 * Supabase renamed the browser-safe key from "anon" to "publishable".
 * We accept either name so the project works on every project generation.
 */
export const supabaseAnonKey = (
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  ""
).trim();

export const siteUrl =
  (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim() ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
  "http://localhost:3000";

export function assertSupabaseEnv(): void {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Faltan las variables de entorno de Supabase. Define " +
        "NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY " +
        "(o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) en tu archivo .env.local.",
    );
  }
}
