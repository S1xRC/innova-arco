-- =============================================================================
-- Innova ARCO · 0001 · Schema
-- Run order: 0001 -> 0002 -> 0003 -> 0004
-- Safe to re-run (idempotent guards).
-- =============================================================================

create extension if not exists "pgcrypto";

-- Enums ----------------------------------------------------------------------
do $$
begin
  create type public.company_type as enum ('MINING', 'PROVIDER');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.user_role as enum ('DRIVER', 'PROVIDER', 'MINING');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.deletion_status as enum ('PENDING', 'DELETED');
exception
  when duplicate_object then null;
end
$$;

-- Tables ---------------------------------------------------------------------
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type public.company_type not null,
  support_email text,
  created_at timestamptz not null default now()
);

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  role public.user_role not null default 'DRIVER',
  company_id uuid references public.companies (id) on delete set null,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.video_metadata (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.companies (id) on delete cascade,
  driver_email text not null,
  license_plate text not null,
  recorded_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.deletion_requests (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.video_metadata (id) on delete cascade,
  driver_id uuid not null references public.users (id) on delete cascade,
  status public.deletion_status not null default 'PENDING',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  -- A given video record can only ever have one deletion request (ARCO).
  constraint deletion_requests_video_id_key unique (video_id)
);

-- Pre-provisioned roles: any email present here signs in as PROVIDER/MINING.
create table if not exists public.user_invites (
  email text primary key,
  role public.user_role not null,
  company_id uuid references public.companies (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint user_invites_role_check check (role <> 'DRIVER')
);

-- Indexes --------------------------------------------------------------------
create index if not exists video_metadata_driver_email_idx
  on public.video_metadata (lower(driver_email));
create index if not exists video_metadata_provider_id_idx
  on public.video_metadata (provider_id);
create index if not exists video_metadata_recorded_at_idx
  on public.video_metadata (recorded_at desc);
create index if not exists deletion_requests_driver_id_idx
  on public.deletion_requests (driver_id);
create index if not exists deletion_requests_status_idx
  on public.deletion_requests (status);
create index if not exists users_company_id_idx
  on public.users (company_id);
create index if not exists users_email_idx
  on public.users (lower(email));
