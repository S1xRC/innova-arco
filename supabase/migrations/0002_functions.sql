-- =============================================================================
-- Innova ARCO · 0002 · Helper functions
--
-- All helpers are SECURITY DEFINER and owned by the migration role (postgres),
-- so they read public.users bypassing RLS. This is what prevents the classic
-- "infinite recursion detected in policy for relation users" error when a
-- policy needs to look at the caller's role or company.
-- =============================================================================

-- Current caller's platform role ('DRIVER' | 'PROVIDER' | 'MINING').
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select role from public.users where id = auth.uid();
$$;

-- Current caller's company id (null for drivers that have not onboarded yet).
create or replace function public.current_company_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select company_id from public.users where id = auth.uid();
$$;

-- Lower-cased email taken from the verified JWT.
create or replace function public.current_user_email()
returns text
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

-- Does the current caller own this video record (matched by email)?
create or replace function public.is_driver_of_video(p_video_id uuid)
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
      and lower(v.driver_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- Was this video record uploaded by the current provider company?
create or replace function public.is_provider_of_video(p_video_id uuid)
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

-- A mining company may see a video record only if a driver from its own
-- company filed a deletion request against it.
create or replace function public.mining_can_view_video(p_video_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.deletion_requests dr
    join public.users u on u.id = dr.driver_id
    where dr.video_id = p_video_id
      and u.company_id = public.current_company_id()
  );
$$;

-- Does this driver belong to the current mining company?
create or replace function public.mining_owns_driver(p_driver_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.users u
    where u.id = p_driver_id
      and u.company_id = public.current_company_id()
  );
$$;

-- Can the current caller (a driver) see this provider company? True when the
-- provider holds at least one video record belonging to the caller's email.
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
    where v.provider_id = p_company_id
      and lower(v.driver_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- Can the current caller (a mining company) see this provider company? True
-- when a driver from the caller's company filed a request against a record
-- uploaded by that provider.
create or replace function public.mining_can_view_company(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.video_metadata v
    join public.deletion_requests dr on dr.video_id = v.id
    join public.users u on u.id = dr.driver_id
    where v.provider_id = p_company_id
      and u.company_id = public.current_company_id()
  );
$$;

grant execute on function public.current_user_role() to authenticated;
grant execute on function public.current_company_id() to authenticated;
grant execute on function public.current_user_email() to authenticated;
grant execute on function public.is_driver_of_video(uuid) to authenticated;
grant execute on function public.is_provider_of_video(uuid) to authenticated;
grant execute on function public.mining_can_view_video(uuid) to authenticated;
grant execute on function public.mining_owns_driver(uuid) to authenticated;
grant execute on function public.driver_can_view_company(uuid) to authenticated;
grant execute on function public.mining_can_view_company(uuid) to authenticated;

