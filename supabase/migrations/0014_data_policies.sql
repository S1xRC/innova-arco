-- =============================================================================
-- Innova ARCO · 0014 · Data processing declarations
--
-- Each company (mining or provider) publishes a "declaración de uso y
-- tratamiento de datos" that its drivers can read.
--
--   * staff (membership role <> 'DRIVER') may edit it;
--   * the company's drivers, and the drivers of the mining companies it works
--     with, may read it.
--
-- Also hardens `companies_update`: until now ANY member (including drivers,
-- who are members of their mining company) could edit the company settings.
--
-- Safe to re-run.
-- =============================================================================

-- 1. Only company staff may manage a company --------------------------------
create or replace function public.can_manage_company(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.current_is_admin()
    or exists (
      select 1
      from public.memberships m
      where m.company_id = p_company_id
        and m.user_id = auth.uid()
        and m.status = 'ACTIVE'
        and m.role <> 'DRIVER'
    );
$$;

-- 2. Who may read a company's declaration ------------------------------------
create or replace function public.can_view_data_policy(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.current_is_admin()
    or public.is_member_of(p_company_id)
    or public.driver_can_view_company(p_company_id)
    or exists (
      select 1
      from public.company_relations r
      join public.memberships m on m.company_id = r.mining_id
      where r.provider_id = p_company_id
        and r.status = 'ACTIVE'
        and m.user_id = auth.uid()
        and m.status = 'ACTIVE'
    );
$$;

grant execute on function public.can_manage_company(uuid) to authenticated;
grant execute on function public.can_view_data_policy(uuid) to authenticated;

-- 3. Declarations ------------------------------------------------------------
create table if not exists public.company_data_policies (
  company_id uuid primary key references public.companies (id) on delete cascade,
  content text not null default '',
  updated_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.company_data_policies enable row level security;

drop policy if exists company_data_policies_select on public.company_data_policies;
create policy company_data_policies_select on public.company_data_policies
  for select to authenticated
  using (public.can_view_data_policy(company_id));

drop policy if exists company_data_policies_insert on public.company_data_policies;
create policy company_data_policies_insert on public.company_data_policies
  for insert to authenticated
  with check (public.can_manage_company(company_id));

drop policy if exists company_data_policies_update on public.company_data_policies;
create policy company_data_policies_update on public.company_data_policies
  for update to authenticated
  using (public.can_manage_company(company_id))
  with check (public.can_manage_company(company_id));

-- 4. Harden `companies`: only staff may update -------------------------------
drop policy if exists companies_update on public.companies;
create policy companies_update on public.companies
  for update to authenticated
  using (public.can_manage_company(id) or public.current_is_admin())
  with check (public.can_manage_company(id) or public.current_is_admin());
