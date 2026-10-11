-- =============================================================================
-- GeoFace · 0015 · Shift window + free-occurrence pruning
--
-- 1. `generate_shift_occurrences()` now generates from MONDAY of the current
--    week (America/Santiago) up to +14 days, instead of the previous -7/+28.
--    Shifts are still created ahead of time by the daily cron; the Monday start
--    only exists so a recording uploaded a few days late can still be attached
--    to its shift.
-- 2. Free occurrences (no recording, not marked as deleted) older than 7 days
--    are pruned. Occurrences holding a recording are NEVER touched, and neither
--    are those with a deletion mark.
-- 3. The daily cron job prunes and then generates.
--
-- NOTE: this migration uses `can_manage_company()` (migration 0014).
-- Safe to re-run.
-- =============================================================================

-- 1. New default window ------------------------------------------------------
create or replace function public.generate_shift_occurrences(
  p_mining_id uuid,
  p_from timestamptz default (
    (date_trunc('week', (now() at time zone 'America/Santiago')))
      at time zone 'America/Santiago'
  ),
  p_to timestamptz default (now() + interval '14 days')
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer := 0;
begin
  with days as (
    select d::date as day_date
    from generate_series(
      (p_from at time zone 'America/Santiago')::date,
      (p_to at time zone 'America/Santiago')::date,
      interval '1 day'
    ) as d
  ),
  candidates as (
    select
      t.mining_id,
      t.driver_user_id,
      t.license_plate,
      t.notes,
      t.id as template_id,
      t.created_by,
      ((d.day_date + t.start_time) at time zone 'America/Santiago') as starts_at
    from public.shift_templates t
    join days d on extract(dow from d.day_date)::smallint = t.weekday
    where t.mining_id = p_mining_id
      and t.active
  )
  insert into public.shifts
    (mining_id, driver_user_id, license_plate, starts_at, notes, template_id, created_by)
  select
    c.mining_id,
    c.driver_user_id,
    c.license_plate,
    c.starts_at,
    c.notes,
    c.template_id,
    c.created_by
  from candidates c
  on conflict do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end
$$;

grant execute on function public.generate_shift_occurrences(uuid, timestamptz, timestamptz)
  to authenticated, service_role;

-- 2. Pruning -----------------------------------------------------------------
-- Only free occurrences (no recording, no deletion mark). Everything else is
-- historical data and is preserved.
create or replace function public.prune_free_shift_occurrences(
  p_mining_id uuid,
  p_older_than timestamptz default (now() - interval '7 days')
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer := 0;
begin
  with removed as (
    delete from public.shifts
    where mining_id = p_mining_id
      and matched_video_id is null
      and video_deleted_at is null
      and starts_at < p_older_than
    returning 1
  )
  select count(*) into v_count from removed;

  return v_count;
end
$$;

create or replace function public.prune_all_free_shift_occurrences()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer := 0;
begin
  with removed as (
    delete from public.shifts
    where matched_video_id is null
      and video_deleted_at is null
      and starts_at < (now() - interval '7 days')
    returning 1
  )
  select count(*) into v_count from removed;

  return v_count;
end
$$;

grant execute on function public.prune_all_free_shift_occurrences() to service_role;

-- Callable from the app: only the caller's active company, only if they manage it.
create or replace function public.prune_my_shift_occurrences(
  p_older_than timestamptz default (now() - interval '7 days')
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_company uuid := public.current_company_id();
  v_count integer := 0;
begin
  if v_company is null or not public.can_manage_company(v_company) then
    return 0;
  end if;

  with removed as (
    delete from public.shifts
    where mining_id = v_company
      and matched_video_id is null
      and video_deleted_at is null
      and starts_at < p_older_than
    returning 1
  )
  select count(*) into v_count from removed;

  return v_count;
end
$$;

grant execute on function public.prune_my_shift_occurrences(timestamptz) to authenticated;

-- 3. Daily maintenance: prune first, then extend the window -------------------
create or replace function public.maintain_shift_occurrences()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.prune_all_free_shift_occurrences();
  return public.generate_all_shift_occurrences();
end
$$;

grant execute on function public.maintain_shift_occurrences() to service_role;

do $$
begin
  begin
    execute 'create extension if not exists pg_cron';
  exception
    when others then null;
  end;

  begin
    perform cron.unschedule('innova-generate-shifts');
  exception
    when others then null;
  end;

  begin
    perform cron.schedule(
      'innova-generate-shifts',
      '0 2 * * *',
      'select public.maintain_shift_occurrences();'
    );
  exception
    when others then null;
  end;
end
$$;
