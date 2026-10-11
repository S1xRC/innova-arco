-- =============================================================================
-- GeoFace · 0007 · Row Level Security (multi-tenant)
--
-- Security model:
--   DRIVER   -> recordings assigned to them through a shift, own requests.
--   PROVIDER -> deletion tickets for videos where it is the associated provider.
--   MINING   -> full control of its own videos, shifts, members and relations.
-- =============================================================================

alter table public.companies enable row level security;
alter table public.users enable row level security;
alter table public.video_metadata enable row level security;
alter table public.deletion_requests enable row level security;
alter table public.user_invites enable row level security;
alter table public.memberships enable row level security;
alter table public.company_relations enable row level security;
alter table public.shifts enable row level security;

-- Companies ------------------------------------------------------------------
drop policy if exists companies_select on public.companies;
create policy companies_select on public.companies
  for select to authenticated
  using (
    id = public.current_company_id()
    or public.is_member_of(id)
    or public.driver_can_view_company(id)
    or public.mining_can_view_company(id)
    or public.current_is_admin()
    -- Needed to pick / invite the other side of a relation.
    or type = 'PROVIDER'
    or type = 'MINING'
  );

drop policy if exists companies_insert on public.companies;
create policy companies_insert on public.companies
  for insert to authenticated
  with check (public.can_create_company() and created_by = auth.uid());

drop policy if exists companies_update on public.companies;
create policy companies_update on public.companies
  for update to authenticated
  using (public.is_member_of(id) or public.current_is_admin())
  with check (public.is_member_of(id) or public.current_is_admin());

-- Users ----------------------------------------------------------------------
drop policy if exists users_select_self on public.users;
create policy users_select_self on public.users
  for select to authenticated
  using (id = (select auth.uid()));

-- Mining companies can resolve the identity of their drivers / staff.
drop policy if exists users_select_company_members on public.users;
create policy users_select_company_members on public.users
  for select to authenticated
  using (
    public.mining_owns_driver(id)
    or public.provider_owns_driver(id)
    or public.current_is_admin()
  );

-- Platform administrators see and manage every user (free role assignment).
drop policy if exists users_select_admin on public.users;
create policy users_select_admin on public.users
  for select to authenticated
  using (public.current_is_admin());

drop policy if exists users_update_admin on public.users;
create policy users_update_admin on public.users
  for update to authenticated
  using (public.current_is_admin())
  with check (public.current_is_admin());

drop policy if exists users_update_self on public.users;
create policy users_update_self on public.users
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Memberships ----------------------------------------------------------------
drop policy if exists memberships_select on public.memberships;
create policy memberships_select on public.memberships
  for select to authenticated
  using (
    user_id = auth.uid()
    or lower(invited_email) = public.current_user_email()
    or public.is_member_of(company_id)
    or public.current_is_admin()
  );

drop policy if exists memberships_insert on public.memberships;
create policy memberships_insert on public.memberships
  for insert to authenticated
  with check (
    public.is_member_of(company_id)
    or public.is_any_active_member()
    or public.current_is_admin()
  );

drop policy if exists memberships_update on public.memberships;
create policy memberships_update on public.memberships
  for update to authenticated
  using (
    user_id = auth.uid()
    or lower(invited_email) = public.current_user_email()
    or public.is_member_of(company_id)
    or public.current_is_admin()
  )
  with check (true);

drop policy if exists memberships_delete on public.memberships;
create policy memberships_delete on public.memberships
  for delete to authenticated
  using (public.is_member_of(company_id) or public.current_is_admin());

-- Company relations ----------------------------------------------------------
drop policy if exists company_relations_select on public.company_relations;
create policy company_relations_select on public.company_relations
  for select to authenticated
  using (
    public.is_member_of(mining_id)
    or public.is_member_of(provider_id)
    or public.current_is_admin()
  );

drop policy if exists company_relations_insert on public.company_relations;
create policy company_relations_insert on public.company_relations
  for insert to authenticated
  with check (
    mining_id = public.current_company_id()
    or public.current_is_admin()
  );

drop policy if exists company_relations_update on public.company_relations;
create policy company_relations_update on public.company_relations
  for update to authenticated
  using (
    public.is_member_of(mining_id)
    or public.is_member_of(provider_id)
    or public.current_is_admin()
  )
  with check (true);

drop policy if exists company_relations_delete on public.company_relations;
create policy company_relations_delete on public.company_relations
  for delete to authenticated
  using (public.is_member_of(mining_id) or public.current_is_admin());

-- Shifts ---------------------------------------------------------------------
drop policy if exists shifts_select on public.shifts;
create policy shifts_select on public.shifts
  for select to authenticated
  using (
    public.is_member_of(mining_id)
    or driver_user_id = auth.uid()
    or public.current_is_admin()
  );

drop policy if exists shifts_insert on public.shifts;
create policy shifts_insert on public.shifts
  for insert to authenticated
  with check (mining_id = public.current_company_id());

drop policy if exists shifts_update on public.shifts;
create policy shifts_update on public.shifts
  for update to authenticated
  using (public.is_member_of(mining_id) or public.current_is_admin())
  with check (public.is_member_of(mining_id) or public.current_is_admin());

drop policy if exists shifts_delete on public.shifts;
create policy shifts_delete on public.shifts
  for delete to authenticated
  using (public.is_member_of(mining_id) or public.current_is_admin());

-- Video metadata -------------------------------------------------------------
drop policy if exists video_select_driver on public.video_metadata;
drop policy if exists video_select_provider on public.video_metadata;
drop policy if exists video_select_mining on public.video_metadata;
drop policy if exists video_insert_provider on public.video_metadata;
drop policy if exists video_select on public.video_metadata;
drop policy if exists video_insert on public.video_metadata;
drop policy if exists video_update on public.video_metadata;
drop policy if exists video_delete on public.video_metadata;

create policy video_select on public.video_metadata
  for select to authenticated
  using (
    public.is_member_of(mining_id)
    or public.driver_can_view_video(id)
    or public.provider_can_view_video(id)
    or public.current_is_admin()
  );

create policy video_insert on public.video_metadata
  for insert to authenticated
  with check (
    mining_id = public.current_company_id()
    and public.is_member_of(mining_id)
  );

create policy video_update on public.video_metadata
  for update to authenticated
  using (public.is_member_of(mining_id) or public.current_is_admin())
  with check (public.is_member_of(mining_id) or public.current_is_admin());

create policy video_delete on public.video_metadata
  for delete to authenticated
  using (public.is_member_of(mining_id) or public.current_is_admin());

-- Deletion requests ----------------------------------------------------------
drop policy if exists deletion_requests_select_driver on public.deletion_requests;
drop policy if exists deletion_requests_insert_driver on public.deletion_requests;
drop policy if exists deletion_requests_select_provider on public.deletion_requests;
drop policy if exists deletion_requests_update_provider on public.deletion_requests;
drop policy if exists deletion_requests_select_mining on public.deletion_requests;
drop policy if exists deletion_requests_select on public.deletion_requests;
drop policy if exists deletion_requests_insert on public.deletion_requests;
drop policy if exists deletion_requests_update on public.deletion_requests;
drop policy if exists deletion_requests_delete on public.deletion_requests;

create policy deletion_requests_select on public.deletion_requests
  for select to authenticated
  using (
    driver_id = auth.uid()
    or public.mining_can_view_video(video_id)
    or public.provider_can_view_video(video_id)
    or public.current_is_admin()
  );

create policy deletion_requests_insert on public.deletion_requests
  for insert to authenticated
  with check (
    driver_id = auth.uid()
    and public.driver_can_view_video(video_id)
  );

create policy deletion_requests_update on public.deletion_requests
  for update to authenticated
  using (
    public.mining_can_view_video(video_id)
    or public.provider_can_view_video(video_id)
    or public.current_is_admin()
  )
  with check (true);

create policy deletion_requests_delete on public.deletion_requests
  for delete to authenticated
  using (
    driver_id = auth.uid()
    or public.mining_can_view_video(video_id)
    or public.current_is_admin()
  );

-- user_invites ---------------------------------------------------------------
-- RLS is enabled with NO policies on purpose: only the service_role key
-- (which bypasses RLS) can read or write pre-provisioned roles.
