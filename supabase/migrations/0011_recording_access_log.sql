-- =============================================================================
-- GeoFace · 0011 · Recording access log (ARCO "derecho de acceso")
--
-- Immutable audit trail of who opened each recording. Written server-side by
-- `app/api/recordings/[id]` every time a signed URL is minted (deduplicated so
-- the Range chunks of a single playback only produce one row).
--
-- Visibility:
--   * the viewer sees their own accesses;
--   * a DRIVER sees the accesses to the recordings assigned to them;
--   * a MINING company sees the accesses to its own recordings.
--
-- No UPDATE/DELETE policies on purpose (the trail must be immutable).
--
-- Safe to re-run.
-- =============================================================================

create table if not exists public.recording_access_log (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.video_metadata (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  company_id uuid references public.companies (id) on delete set null,
  action text not null default 'VIEW',
  created_at timestamptz not null default now(),
  constraint recording_access_log_action_check
    check (action in ('VIEW', 'DOWNLOAD'))
);

create index if not exists recording_access_log_video_idx
  on public.recording_access_log (video_id, created_at desc);
create index if not exists recording_access_log_user_idx
  on public.recording_access_log (user_id, created_at desc);

alter table public.recording_access_log enable row level security;

-- A caller may only log their own access, and only to a recording they may see.
drop policy if exists recording_access_log_insert on public.recording_access_log;
create policy recording_access_log_insert on public.recording_access_log
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and (
      public.driver_can_view_video(video_id)
      or public.mining_can_view_video(video_id)
    )
  );

drop policy if exists recording_access_log_select on public.recording_access_log;
create policy recording_access_log_select on public.recording_access_log
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.driver_can_view_video(video_id)
    or public.mining_can_view_video(video_id)
    or public.current_is_admin()
  );
