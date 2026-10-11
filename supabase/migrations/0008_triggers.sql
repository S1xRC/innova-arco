-- =============================================================================
-- Innova ARCO · 0008 · Triggers (multi-tenant)
-- =============================================================================

-- 1. Provision a `public.users` row the first time someone signs in -----------
--    Roles come from a pending membership (preferred) or `user_invites`.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_invite public.user_invites%rowtype;
  v_membership public.memberships%rowtype;
  v_role public.user_role := 'DRIVER';
  v_company uuid := null;
  v_email text := lower(coalesce(new.email, ''));
begin
  select * into v_invite
  from public.user_invites i
  where lower(i.email) = v_email
  limit 1;

  if found then
    v_role := v_invite.role;
    v_company := v_invite.company_id;
  end if;

  -- A pending membership invitation takes precedence over `user_invites`.
  select * into v_membership
  from public.memberships m
  where lower(m.invited_email) = v_email
    and m.status = 'INVITED'
  order by m.created_at asc
  limit 1;

  if found then
    v_role := v_membership.role;
    v_company := v_membership.company_id;
  end if;

  insert into public.users
    (id, email, role, active_company_id, full_name, avatar_url)
  values (
    new.id,
    v_email,
    v_role,
    v_company,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'avatar_url', '')
  )
  on conflict (id) do update
    set email = excluded.email;

  -- Activate every pending membership matching this email.
  update public.memberships m
  set user_id = new.id,
      status = 'ACTIVE',
      accepted_at = coalesce(m.accepted_at, now())
  where lower(m.invited_email) = v_email
    and m.status = 'INVITED';

  -- Pick an active company if none was set yet.
  update public.users u
  set active_company_id = coalesce(
    u.active_company_id,
    (
      select m.company_id
      from public.memberships m
      where m.user_id = new.id and m.status = 'ACTIVE'
      order by m.created_at asc
      limit 1
    )
  )
  where u.id = new.id;

  return new;
end
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill users created before this trigger existed.
insert into public.users
  (id, email, role, active_company_id, full_name, avatar_url)
select
  au.id,
  lower(coalesce(au.email, '')),
  coalesce(inv.role, 'DRIVER'),
  inv.company_id,
  nullif(au.raw_user_meta_data ->> 'full_name', ''),
  nullif(au.raw_user_meta_data ->> 'avatar_url', '')
from auth.users au
left join public.user_invites inv
  on lower(inv.email) = lower(coalesce(au.email, ''))
on conflict (id) do nothing;

-- 2. Automatic shift matching ------------------------------------------------
--    When the mining company uploads a recording, look for a shift of the same
--    company that matches on plate + start time (tolerance: 5 minutes).
create or replace function public.assign_video_to_shift()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.mining_id is null then
    return new;
  end if;

  if new.shift_id is null then
    new.shift_id := public.match_shift_for_video(
      new.mining_id,
      new.license_plate,
      new.recorded_at,
      5
    );
  end if;

  return new;
end
$$;

drop trigger if exists video_metadata_assign_shift on public.video_metadata;
create trigger video_metadata_assign_shift
  before insert on public.video_metadata
  for each row execute function public.assign_video_to_shift();

-- Once the video exists, record the assignment back on the shift.
create or replace function public.link_video_shift()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.shift_id is not null then
    update public.shifts
    set matched_video_id = new.id
    where id = new.shift_id
      and (matched_video_id is null or matched_video_id = new.id);
  end if;

  return new;
end
$$;

drop trigger if exists video_metadata_link_shift on public.video_metadata;
create trigger video_metadata_link_shift
  after insert on public.video_metadata
  for each row execute function public.link_video_shift();

-- When a shift is created, attach any already-uploaded matching recording.
create or replace function public.match_videos_for_shift()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_video uuid;
begin
  if new.matched_video_id is not null then
    return new;
  end if;

  select v.id into v_video
  from public.video_metadata v
  where v.mining_id = new.mining_id
    and v.shift_id is null
    and v.deleted_at is null
    and upper(replace(v.license_plate, ' ', '')) =
        upper(replace(new.license_plate, ' ', ''))
    and abs(extract(epoch from (v.recorded_at - new.starts_at))) <= 300
  order by abs(extract(epoch from (v.recorded_at - new.starts_at))) asc
  limit 1;

  if v_video is not null then
    new.matched_video_id := v_video;
    update public.video_metadata set shift_id = new.id where id = v_video;
  end if;

  return new;
end
$$;

drop trigger if exists shifts_match_videos on public.shifts;
create trigger shifts_match_videos
  before insert on public.shifts
  for each row execute function public.match_videos_for_shift();

-- 3. Deletion request lifecycle ----------------------------------------------
--    * INSERT: computes `scheduled_deletion_at` from the company's policy and
--      copies the associated provider / shift.
--    * UPDATE: keeps `resolved_at` in sync, and restricts a *provider* caller to
--      only declaring the deletion on its own systems.
create or replace function public.handle_deletion_request_cycle()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_days integer;
  v_privileged boolean;
begin
  if tg_op = 'INSERT' then
    if new.scheduled_deletion_at is null then
      select coalesce(c.deletion_grace_days, 30) into v_days
      from public.video_metadata v
      join public.companies c on c.id = v.mining_id
      where v.id = new.video_id;

      new.scheduled_deletion_at :=
        new.created_at + make_interval(days => coalesce(v_days, 30));
    end if;

    if new.provider_id is null then
      select v.provider_id into new.provider_id
      from public.video_metadata v where v.id = new.video_id;
    end if;

    if new.shift_id is null then
      select v.shift_id into new.shift_id
      from public.video_metadata v where v.id = new.video_id;
    end if;

    return new;
  end if;

  -- UPDATE ---------------------------------------------------------------
  v_privileged := auth.uid() is null
    or coalesce(auth.role(), '') = 'service_role'
    or public.current_is_admin()
    or public.mining_can_view_video(old.video_id);

  if not v_privileged then
    -- A provider may only declare the deletion on its own systems.
    new.status := old.status;
    new.video_id := old.video_id;
    new.driver_id := old.driver_id;
    new.provider_id := old.provider_id;
    new.shift_id := old.shift_id;
    new.scheduled_deletion_at := old.scheduled_deletion_at;
    new.auto_deleted_at := old.auto_deleted_at;
  end if;

  if new.status = 'DELETED' and old.status is distinct from 'DELETED' then
    new.resolved_at := coalesce(new.resolved_at, now());
  elsif new.status = 'PENDING' then
    new.resolved_at := null;
  end if;

  return new;
end
$$;

drop trigger if exists deletion_requests_status on public.deletion_requests;
drop trigger if exists deletion_requests_cycle on public.deletion_requests;
create trigger deletion_requests_cycle
  before insert or update on public.deletion_requests
  for each row execute function public.handle_deletion_request_cycle();

-- 4. Profile guards ----------------------------------------------------------
--    Roles and the active company are now freely assignable; only the platform
--    admin flag stays server-controlled. Skipped for privileged contexts
--    (psql, migrations, service_role) so seeding keeps working.
create or replace function public.enforce_user_profile_guards()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_privileged boolean := (auth.uid() is null)
    or coalesce(auth.role(), '') = 'service_role'
    or public.current_is_admin();
begin
  if v_privileged then
    return new;
  end if;

  if new.is_platform_admin is distinct from old.is_platform_admin then
    raise exception 'Solo un administrador puede cambiar privilegios de plataforma';
  end if;

  return new;
end
$$;

drop trigger if exists users_profile_guards on public.users;
create trigger users_profile_guards
  before update on public.users
  for each row execute function public.enforce_user_profile_guards();
