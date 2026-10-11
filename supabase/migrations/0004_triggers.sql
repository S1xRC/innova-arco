-- =============================================================================
-- GeoFace · 0004 · Triggers
-- =============================================================================

-- 1. Provision a public.users row the first time someone signs in ------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_invite public.user_invites%rowtype;
  v_role public.user_role := 'DRIVER';
  v_company uuid := null;
begin
  select * into v_invite
  from public.user_invites i
  where lower(i.email) = lower(coalesce(new.email, ''))
  limit 1;

  if found then
    v_role := v_invite.role;
    v_company := v_invite.company_id;
  end if;

  insert into public.users (id, email, role, company_id, full_name, avatar_url)
  values (
    new.id,
    lower(coalesce(new.email, '')),
    v_role,
    v_company,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'avatar_url', '')
  )
  on conflict (id) do update
    set email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill users that signed up before this trigger existed.
insert into public.users (id, email, role, company_id, full_name, avatar_url)
select
  au.id,
  lower(coalesce(au.email, '')),
  coalesce(inv.role, 'DRIVER'),
  inv.company_id,
  nullif(au.raw_user_meta_data ->> 'full_name', ''),
  nullif(au.raw_user_meta_data ->> 'avatar_url', '')
from auth.users au
left join public.user_invites inv on lower(inv.email) = lower(coalesce(au.email, ''))
on conflict (id) do nothing;

-- 2. Keep `resolved_at` in sync with the status ------------------------------
create or replace function public.handle_deletion_request_status()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'DELETED' and old.status is distinct from 'DELETED' then
    new.resolved_at := now();
  elsif new.status = 'PENDING' then
    new.resolved_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists deletion_requests_status on public.deletion_requests;
create trigger deletion_requests_status
  before update on public.deletion_requests
  for each row execute function public.handle_deletion_request_status();

-- 3. Profile guards ----------------------------------------------------------
-- The client may only set `company_id` once (driver onboarding). Role and
-- company assignment are otherwise server-controlled.
-- Skipped for privileged contexts (psql, migrations, service_role) where
-- auth.uid() is null, so seeding and admin fixes keep working.
create or replace function public.enforce_user_profile_guards()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_privileged boolean := (auth.uid() is null)
    or coalesce(auth.role(), '') = 'service_role';
begin
  if v_privileged then
    return new;
  end if;

  if new.role is distinct from old.role then
    raise exception 'El rol del usuario no puede modificarse desde la aplicación';
  end if;

  if old.company_id is not null and new.company_id is distinct from old.company_id then
    raise exception 'La empresa ya fue asignada y no puede modificarse';
  end if;

  if new.company_id is not null then
    if not exists (
      select 1
      from public.companies c
      where c.id = new.company_id
        and (new.role <> 'DRIVER' or c.type = 'MINING')
    ) then
      raise exception 'La empresa seleccionada no es válida para este rol';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists users_profile_guards on public.users;
create trigger users_profile_guards
  before update on public.users
  for each row execute function public.enforce_user_profile_guards();
