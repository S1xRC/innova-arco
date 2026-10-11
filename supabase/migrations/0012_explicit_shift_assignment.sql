-- =============================================================================
-- Innova ARCO · 0012 · Explicit shift assignment
--
-- The recording ↔ shift assignment is now 100% manual: the mining company picks
-- an existing, still-free shift in the upload form. The automatic matching by
-- plate + start time (± 5 minutes) is removed.
--
-- What is kept:
--   * `link_video_shift` (AFTER INSERT) — bookkeeping: it copies the video id
--     back into `shifts.matched_video_id`.
--   * `video_metadata.shift_id` — now set explicitly by the form.
--   * Driver visibility and the deletion flow, which rely on
--     `shifts.matched_video_id`.
--
-- Safe to re-run.
-- =============================================================================

-- 1. Remove the automatic matchers -------------------------------------------
drop trigger if exists video_metadata_assign_shift on public.video_metadata;
drop trigger if exists shifts_match_videos on public.shifts;

drop function if exists public.assign_video_to_shift();
drop function if exists public.match_videos_for_shift();
drop function if exists public.match_shift_for_video(uuid, text, timestamptz, integer);

-- 2. One recording per shift -------------------------------------------------
-- Fail loudly when pre-existing duplicates would break the unique index.
do $$
begin
  if exists (
    select 1
    from public.video_metadata
    where shift_id is not null
    group by shift_id
    having count(*) > 1
  ) then
    raise exception
      'Hay grabaciones duplicadas para un mismo turno: resuélvelas antes de crear el índice único (video_metadata_shift_unique)';
  end if;
end
$$;

create unique index if not exists video_metadata_shift_unique
  on public.video_metadata (shift_id)
  where shift_id is not null;
