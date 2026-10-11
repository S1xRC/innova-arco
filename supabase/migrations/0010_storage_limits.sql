-- =============================================================================
-- Innova ARCO · 0010 · Storage bucket limits
--
-- Makes the `recordings` bucket size limit explicit and aligned with the app
-- (`DEFAULT_MAX_UPLOAD_MB = 50`, overridable with `STORAGE_MAX_UPLOAD_MB`).
--
-- IMPORTANT: a per-bucket limit can never exceed the project's global
-- "Global file size limit" (Supabase → Storage → Settings). On the Free plan the
-- global cap is 50 MB. If you raise the global limit (Pro and up), also raise
-- this value (in bytes) to match.
--
-- Why this matters: the browser uploads the file with a *signed upload URL*, so
-- the request goes straight to Supabase (never through Vercel / a Server
-- Action). The 1 MB limit of Next.js Server Actions does NOT apply to the file,
-- only to the metadata payload.
--
-- Safe to re-run.
-- =============================================================================

update storage.buckets
set file_size_limit = 52428800  -- 50 MB
where id = 'recordings';
