-- =============================================================================
-- GeoFace · 0009 · Storage bucket + deletion cron
--
-- 1. Creates the private `recordings` bucket used for the video files. Every
--    read/write goes through the server (service_role), so no storage RLS
--    policies are required for the MVP.
-- 2. Schedules the daily automatic deletion job with pg_cron. If the extension
--    is not available the migration keeps working (the API route
--    `/api/cron/process-deletions` covers the same job via Vercel Cron).
--
-- Safe to re-run.
-- =============================================================================

-- 1. Storage bucket ----------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('recordings', 'recordings', false)
on conflict (id) do nothing;

-- 2. Daily deletion job ------------------------------------------------------
do $$
begin
  begin
    execute 'create extension if not exists pg_cron';
  exception
    when others then null;
  end;

  begin
    perform cron.unschedule('innova-process-deletions');
  exception
    when others then null;
  end;

  begin
    perform cron.schedule(
      'innova-process-deletions',
      '0 3 * * *',
      'select public.process_due_deletions();'
    );
  exception
    when others then null;
  end;
end
$$;
