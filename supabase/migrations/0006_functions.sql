-- =============================================================================
-- GeoFace · 0006 · Helper functions (multi-tenant)
--
-- Every helper is SECURITY DEFINER and owned by the migration role (postgres),
-- so it reads `public.users` / `public.memberships` bypassing RLS. This is what
-- prevents the classic "infinite recursion detected in policy for relation
-- users" error when a policy needs to look up the caller's role or company.
--
-- NOTE: these helpers REDEFINE the 0002 versions, which referenced the now
-- removed `public.users.company_id` column.
-- =============================================================================

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select role from public.users where id = auth.uid();
$$;

create or replace function public.current_company_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select active_company_id from public.users where id = auth.uid();
$$;

create or replace function public.current_user_email()
returns text
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

create or replace function public.current_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select is_platform_admin from public.users where id = auth.uid()),
    false
  );
$$;

create or replace function public.is_member_of(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.memberships m
    where m.company_id = p_company_id
      and m.user_id = auth.uid()
      and m.status = 'ACTIVE'
  );
$$;

create or replace function public.is_active_member_of(
  p_company_id uuid,
  p_role public.user_role
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.memberships m
    where m.company_id = p_company_id
      and m.user_id = auth.uid()
      and m.status = 'ACTIVE'
      and m.role = p_role
  );
$$;

create or replace function public.is_any_active_member()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.memberships m
    where m.user_id = auth.uid() and m.status = 'ACTIVE'
  );
$$;

create or replace function public.can_create_company()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.current_is_admin() or public.is_any_active_member();
$$;

-- Find the shift (for a given mining company) matching a plate + start time.
create or replace function public.match_shift_for_video(
  p_mining_id uuid,
  p_license_plate text,
  p_recorded_at timestamptz,
  p_tolerance_minutes integer default 5
)
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select s.id
  from public.shifts s
  where s.mining_id = p_mining_id
    and upper(replace(s.license_plate, ' ', '')) =
        upper(replace(p_license_plate, ' ', ''))
    and abs(extract(epoch from (s.starts_at - p_recorded_at))) <= p_tolerance_minutes * 60
  order by abs(extract(epoch from (s.starts_at - p_recorded_at))) asc
  limit 1;
$$;

-- Is this video record assigned to the caller through a shift?
create or replace function public.driver_can_view_video(p_video_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.shifts s
    where s.matched_video_id = p_video_id
      and s.driver_user_id = auth.uid()
  );
$$;

-- Is this video owned by the caller's active mining company?
create or replace function public.mining_can_view_video(p_video_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.video_metadata v
    where v.id = p_video_id
      and v.mining_id = public.current_company_id()
  );
$$;

-- Is this video associated with the caller's active provider company?
create or replace function public.provider_can_view_video(p_video_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.video_metadata v
    where v.id = p_video_id
      and v.provider_id = public.current_company_id()
  );
$$;

-- Kept for backwards compatibility (older policies referenced this name).
create or replace function public.is_provider_of_video(p_video_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.provider_can_view_video(p_video_id);
$$;

-- Does the currently authenticated driver own this video?
create or replace function public.is_driver_of_video(p_video_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.driver_can_view_video(p_video_id)
    or exists (
      select 1
      from public.video_metadata v
      where v.id = p_video_id
        and v.driver_email is not null
        and lower(v.driver_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    );
$$;

-- Does this driver have a deletion ticket against the caller's provider company?
create or replace function public.provider_owns_driver(p_driver_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.deletion_requests dr
    join public.video_metadata v on v.id = dr.video_id
    where dr.driver_id = p_driver_id
      and v.provider_id = public.current_company_id()
  );
$$;

-- Does this driver belong to the caller's active mining company?
create or replace function public.mining_owns_driver(p_driver_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.memberships m
    where m.user_id = p_driver_id
      and m.company_id = public.current_company_id()
      and m.status = 'ACTIVE'
  )
  or exists (
    select 1
    from public.shifts s
    where s.driver_user_id = p_driver_id
      and s.mining_id = public.current_company_id()
  );
$$;

-- Can the caller (a driver) see this provider company?
create or replace function public.driver_can_view_company(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.video_metadata v
    join public.shifts s on s.matched_video_id = v.id
    where v.provider_id = p_company_id
      and s.driver_user_id = auth.uid()
  );
$$;

-- Can the caller (a mining company) see this provider company?
create or replace function public.mining_can_view_company(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.company_relations r
    where r.provider_id = p_company_id
      and r.mining_id = public.current_company_id()
      and r.status = 'ACTIVE'
  );
$$;

-- Create a company (mining or provider) on behalf of the caller, enrolling them
-- as an ACTIVE member. SECURITY DEFINER so it works before the user has any
-- membership (there is no storage/service_role dependency).
create or replace function public.create_company(
  p_name text,
  p_type public.company_type
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_role public.user_role;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  if coalesce(trim(p_name), '') = '' then
    raise exception 'El nombre de la empresa es obligatorio';
  end if;

  v_role := case
    when p_type = 'MINING' then 'MINING'::public.user_role
    else 'PROVIDER'::public.user_role
  end;

  insert into public.companies (name, type, created_by)
  values (trim(p_name), p_type, auth.uid())
  returning id into v_id;

  insert into public.memberships
    (company_id, user_id, role, status, invited_email, invited_by, accepted_at)
  values
    (v_id, auth.uid(), v_role, 'ACTIVE', public.current_user_email(), auth.uid(), now())
  on conflict do nothing;

  update public.users
  set active_company_id = coalesce(active_company_id, v_id),
      role = v_role
  where id = auth.uid();

  return v_id;
end
$$;

grant execute on function public.create_company(text, public.company_type)
  to authenticated;

-- Process every deletion request whose 30-day (or instant) window elapsed.
-- DB-only part: purges sensitive metadata and flags the shift. The physical
-- Storage object is removed by `/api/cron/process-deletions` BEFORE calling
-- this function (SQL cannot delete Storage objects).
create or replace function public.process_due_deletions()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer := 0;
  r record;
begin
  for r in
    select dr.id, dr.video_id
    from public.deletion_requests dr
    where dr.status = 'PENDING'
      and dr.scheduled_deletion_at is not null
      and dr.scheduled_deletion_at <= now()
  loop
    update public.video_metadata
    set extra_info = '{}'::jsonb,
        driver_email = null,
        storage_path = null,
        storage_size = null,
        storage_mime = null,
        deleted_at = now()
    where id = r.video_id;

    update public.shifts
    set video_deleted_at = now()
    where matched_video_id = r.video_id;

    update public.deletion_requests
    set status = 'DELETED',
        resolved_at = now(),
        auto_deleted_at = now()
    where id = r.id;

    v_count := v_count + 1;
  end loop;

  return v_count;
end
$$;

grant execute on function public.current_user_role() to authenticated;
grant execute on function public.current_company_id() to authenticated;
grant execute on function public.current_user_email() to authenticated;
grant execute on function public.current_is_admin() to authenticated;
grant execute on function public.is_member_of(uuid) to authenticated;
grant execute on function public.is_active_member_of(uuid, public.user_role) to authenticated;
grant execute on function public.is_any_active_member() to authenticated;
grant execute on function public.can_create_company() to authenticated;
grant execute on function public.match_shift_for_video(uuid, text, timestamptz, integer)
  to authenticated;
grant execute on function public.driver_can_view_video(uuid) to authenticated;
grant execute on function public.mining_can_view_video(uuid) to authenticated;
grant execute on function public.provider_can_view_video(uuid) to authenticated;
grant execute on function public.is_provider_of_video(uuid) to authenticated;
grant execute on function public.is_driver_of_video(uuid) to authenticated;
grant execute on function public.mining_owns_driver(uuid) to authenticated;
grant execute on function public.provider_owns_driver(uuid) to authenticated;
grant execute on function public.driver_can_view_company(uuid) to authenticated;
grant execute on function public.mining_can_view_company(uuid) to authenticated;
grant execute on function public.process_due_deletions() to authenticated, service_role;

