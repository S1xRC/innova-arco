-- =============================================================================
-- GeoFace · 0005 · Schema evolution (multi-tenant)
--
-- New model:
--   * memberships       – N:M user <-> company (driver <-> mining, staff, ...).
--   * company_relations – a MINING company invites the PROVIDER it contracts.
--   * shifts            – a mining company schedules drivers (plate + start).
--   * video_metadata    – now uploaded by the MINING company, with an optional
--                         associated provider, camera id, extra info and a path
--                         inside Supabase Storage.
--   * deletion_requests – retention policy (30 days / instant) per company plus
--                         the provider's own-system deletion declaration.
--
-- Safe to re-run (idempotent guards).
-- =============================================================================

-- Enums ----------------------------------------------------------------------
do $$
begin
  create type public.membership_status as enum ('INVITED', 'ACTIVE', 'REVOKED');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.relation_status as enum ('INVITED', 'ACTIVE', 'REVOKED');
exception
  when duplicate_object then null;
end
$$;

-- Companies ------------------------------------------------------------------
alter table public.companies
  add column if not exists deletion_grace_days integer not null default 30,
  add column if not exists created_by uuid;

do $$
begin
  alter table public.companies
    add constraint companies_deletion_grace_days_check
    check (deletion_grace_days >= 0);
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.companies
    add constraint companies_created_by_fkey
    foreign key (created_by) references public.users (id) on delete set null;
exception
  when duplicate_object then null;
end
$$;

-- Users ----------------------------------------------------------------------
alter table public.users
  add column if not exists active_company_id uuid,
  add column if not exists is_platform_admin boolean not null default false;

do $$
begin
  alter table public.users
    add constraint users_active_company_id_fkey
    foreign key (active_company_id) references public.companies (id) on delete set null;
exception
  when duplicate_object then null;
end
$$;

-- Memberships ----------------------------------------------------------------
create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid references public.users (id) on delete cascade,
  role public.user_role not null default 'DRIVER',
  status public.membership_status not null default 'INVITED',
  invited_email text not null,
  invited_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  revoked_at timestamptz
);

create unique index if not exists memberships_company_email_key
  on public.memberships (company_id, lower(invited_email));
create unique index if not exists memberships_company_user_key
  on public.memberships (company_id, user_id)
  where user_id is not null;
create index if not exists memberships_user_idx on public.memberships (user_id);
create index if not exists memberships_email_idx
  on public.memberships (lower(invited_email));

-- Company relations ----------------------------------------------------------
create table if not exists public.company_relations (
  id uuid primary key default gen_random_uuid(),
  mining_id uuid not null references public.companies (id) on delete cascade,
  provider_id uuid not null references public.companies (id) on delete cascade,
  status public.relation_status not null default 'INVITED',
  invited_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

create unique index if not exists company_relations_key
  on public.company_relations (mining_id, provider_id);
create index if not exists company_relations_provider_idx
  on public.company_relations (provider_id);

-- Shifts ---------------------------------------------------------------------
create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  mining_id uuid not null references public.companies (id) on delete cascade,
  driver_user_id uuid not null references public.users (id) on delete cascade,
  license_plate text not null,
  starts_at timestamptz not null,
  notes text,
  matched_video_id uuid,
  video_deleted_at timestamptz,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists shifts_key
  on public.shifts (mining_id, driver_user_id, license_plate, starts_at);
create index if not exists shifts_driver_idx on public.shifts (driver_user_id);
create index if not exists shifts_mining_plate_idx
  on public.shifts (mining_id, upper(license_plate));
create index if not exists shifts_matched_video_idx on public.shifts (matched_video_id);

-- Video metadata -------------------------------------------------------------
alter table public.video_metadata
  add column if not exists mining_id uuid,
  add column if not exists external_id text,
  add column if not exists extra_info jsonb,
  add column if not exists storage_path text,
  add column if not exists storage_size bigint,
  add column if not exists storage_mime text,
  add column if not exists shift_id uuid,
  add column if not exists deleted_at timestamptz,
  add column if not exists created_by uuid;

alter table public.video_metadata alter column driver_email drop not null;
alter table public.video_metadata alter column provider_id drop not null;

do $$
begin
  alter table public.video_metadata
    add constraint video_metadata_mining_id_fkey
    foreign key (mining_id) references public.companies (id) on delete cascade;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.video_metadata
    add constraint video_metadata_shift_id_fkey
    foreign key (shift_id) references public.shifts (id) on delete set null;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.video_metadata
    add constraint video_metadata_created_by_fkey
    foreign key (created_by) references public.users (id) on delete set null;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.shifts
    add constraint shifts_matched_video_id_fkey
    foreign key (matched_video_id) references public.video_metadata (id) on delete set null;
exception
  when duplicate_object then null;
end
$$;

create index if not exists video_metadata_mining_idx on public.video_metadata (mining_id);
create index if not exists video_metadata_shift_idx on public.video_metadata (shift_id);
create index if not exists video_metadata_external_idx
  on public.video_metadata (external_id);

-- Deletion requests ----------------------------------------------------------
alter table public.deletion_requests
  add column if not exists shift_id uuid,
  add column if not exists scheduled_deletion_at timestamptz,
  add column if not exists auto_deleted_at timestamptz,
  add column if not exists provider_id uuid,
  add column if not exists provider_declared_at timestamptz,
  add column if not exists provider_declared_by uuid,
  add column if not exists provider_note text;

do $$
begin
  alter table public.deletion_requests
    add constraint deletion_requests_shift_id_fkey
    foreign key (shift_id) references public.shifts (id) on delete set null;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.deletion_requests
    add constraint deletion_requests_provider_id_fkey
    foreign key (provider_id) references public.companies (id) on delete set null;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.deletion_requests
    add constraint deletion_requests_provider_declared_by_fkey
    foreign key (provider_declared_by) references public.users (id) on delete set null;
exception
  when duplicate_object then null;
end
$$;

create index if not exists deletion_requests_scheduled_idx
  on public.deletion_requests (scheduled_deletion_at)
  where status = 'PENDING';
create index if not exists deletion_requests_provider_idx
  on public.deletion_requests (provider_id);

-- user_invites: roles may now be assigned freely (including DRIVER).
alter table public.user_invites drop constraint if exists user_invites_role_check;

-- Data migration -------------------------------------------------------------
-- Move the legacy single `users.company_id` into memberships, then drop it.
insert into public.memberships
  (company_id, user_id, role, status, invited_email, invited_by, accepted_at)
select
  u.company_id, u.id, u.role, 'ACTIVE', lower(u.email), u.id, now()
from public.users u
where u.company_id is not null
on conflict do nothing;

update public.users u
set active_company_id = u.company_id
where u.company_id is not null
  and u.active_company_id is null;

update public.video_metadata
set mining_id = provider_id
where mining_id is null;

update public.deletion_requests
set scheduled_deletion_at = created_at + interval '30 days'
where scheduled_deletion_at is null;

drop index if exists public.users_company_id_idx;
alter table public.users drop column if exists company_id;

