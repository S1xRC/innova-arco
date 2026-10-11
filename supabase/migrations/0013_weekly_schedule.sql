-- =============================================================================
-- GeoFace · 0013 · Weekly schedule (shift templates)
--
-- Two levels:
--   * `shift_templates` — the weekly schedule the mining company edits
--     ("Juan, AB-CD-12, lunes 08:00").
--   * `shifts`          — the dated occurrences generated from them, which keep
--     the recording assignment (`matched_video_id`) and the deletion marking
--     (`video_deleted_at`). Everything that already depends on `shifts`
--     (driver visibility, deletion requests, access log) keeps working.
--
-- Safety: occurrences that already hold a recording are never rewritten.
--
-- Safe to re-run.
-- =============================================================================

-- 1. Weekly schedule definitions ---------------------------------------------
create table if not exists public.shift_templates (
  id uuid primary key default gen_random_uuid(),
  mining_id uuid not null references public.companies (id) on delete cascade,
  driver_user_id uuid not null references public.users (id) on delete cascade,
  license_plate text not null,
  weekday smallint not null,
  start_time time not null,
  notes text,
  active boolean not null default true,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shift_templates_weekday_check check (weekday between 0 and 6)
);

create unique index if not exists shift_templates_key
  on public.shift_templates (mining_id, driver_user_id, upper(license_plate), weekday, start_time);
create index if not exists shift_templates_mining_idx
  on public.shift_templates (mining_id);
create index if not exists shift_templates_driver_idx
  on public.shift_templates (driver_user_id);

-- 2. Link occurrences to their schedule entry --------------------------------
alter table public.shifts
  add column if not exists template_id uuid;

do $$
begin
  alter table public.shifts
    add constraint shifts_template_id_fkey
    foreign key (template_id) references public.shift_templates (id) on delete set null;
exception
  when duplicate_object then null;
end
$$;

create index if not exists shifts_template_idx on public.shifts (template_id);

-- 3. Row Level Security ------------------------------------------------------
alter table public.shift_templates enable row level security;

drop policy if exists shift_templates_select on public.shift_templates;
create policy shift_templates_select on public.shift_templates
  for select to authenticated
  using (
    public.is_member_of(mining_id)
    or driver_user_id = auth.uid()
    or public.current_is_admin()
  );

drop policy if exists shift_templates_insert on public.shift_templates;
create policy shift_templates_insert on public.shift_templates
  for insert to authenticated
  with check (mining_id = public.current_company_id());

drop policy if exists shift_templates_update on public.shift_templates;
create policy shift_templates_update on public.shift_templates
  for update to authenticated
  using (public.is_member_of(mining_id) or public.current_is_admin())
  with check (public.is_member_of(mining_id) or public.current_is_admin());

drop policy if exists shift_templates_delete on public.shift_templates;
create policy shift_templates_delete on public.shift_templates
  for delete to authenticated
  using (public.is_member_of(mining_id) or public.current_is_admin());

-- 4. Occurrence generation ---------------------------------------------------
-- Idempotent: `on conflict do nothing` skips instants that already exist.
create or replace function public.generate_shift_occurrences(
  p_mining_id uuid,
  p_from timestamptz default (now() - interval '7 days'),
  p_to timestamptz default (now() + interval '28 days')
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

create or replace function public.generate_all_shift_occurrences()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  r record;
  v_total integer := 0;
begin
  for r in select distinct mining_id from public.shift_templates where active loop
    v_total := v_total + public.generate_shift_occurrences(r.mining_id);
  end loop;

  return v_total;
end
$$;

grant execute on function public.generate_all_shift_occurrences() to service_role;

-- 5. Backfill: derive weekly templates from the existing shifts ---------------
insert into public.shift_templates
  (mining_id, driver_user_id, license_plate, weekday, start_time, active, created_by)
select distinct
  s.mining_id,
  s.driver_user_id,
  s.license_plate,
  extract(dow from (s.starts_at at time zone 'America/Santiago'))::smallint,
  (date_trunc('minute', s.starts_at at time zone 'America/Santiago'))::time,
  true,
  s.created_by
from public.shifts s
on conflict do nothing;

-- Link existing occurrences (even those holding a recording) to their template.
-- NOTE: this only adds a reference; driver / plate / time are NOT modified.
update public.shifts s
set template_id = t.id
from public.shift_templates t
where s.template_id is null
  and t.mining_id = s.mining_id
  and t.driver_user_id = s.driver_user_id
  and upper(t.license_plate) = upper(s.license_plate)
  and t.weekday = extract(dow from (s.starts_at at time zone 'America/Santiago'))::smallint
  and t.start_time =
      (date_trunc('minute', s.starts_at at time zone 'America/Santiago'))::time;

-- 6. Populate the calendar for every company that has active templates --------
do $$
declare
  r record;
begin
  for r in select distinct mining_id from public.shift_templates where active loop
    perform public.generate_shift_occurrences(r.mining_id);
  end loop;
end
$$;

-- 7. Daily cron: extend the rolling window -----------------------------------
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
      'select public.generate_all_shift_occurrences();'
    );
  exception
    when others then null;
  end;
end
$$;
