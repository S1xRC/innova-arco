-- =============================================================================
-- GeoFace · 0003 · Row Level Security
--
-- Security model:
--   DRIVER   -> only their own video records (matched by email) + own requests.
--   PROVIDER -> only records/requests belonging to their company.
--   MINING   -> read-only audit of requests filed by drivers of their company.
-- =============================================================================

alter table public.companies enable row level security;
alter table public.users enable row level security;
alter table public.video_metadata enable row level security;
alter table public.deletion_requests enable row level security;
alter table public.user_invites enable row level security;

-- Companies ------------------------------------------------------------------
-- Visible to the caller when:
--   * it is a mining company (drivers need the list to pick their employer), or
--   * it is the caller's own company, or
--   * it is the provider holding one of the caller's video records, or
--   * it is the provider of a record involved in one of the caller's requests.
drop policy if exists companies_select on public.companies;
create policy companies_select on public.companies
  for select to authenticated
  using (
    type = 'MINING'
    or id = public.current_company_id()
    or public.driver_can_view_company(id)
    or public.mining_can_view_company(id)
  );

-- Users ----------------------------------------------------------------------
drop policy if exists users_select_self on public.users;
create policy users_select_self on public.users
  for select to authenticated
  using (id = (select auth.uid()));

drop policy if exists users_update_self on public.users;
create policy users_update_self on public.users
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Video metadata -------------------------------------------------------------
drop policy if exists video_select_driver on public.video_metadata;
create policy video_select_driver on public.video_metadata
  for select to authenticated
  using (
    public.current_user_role() = 'DRIVER'
    and lower(driver_email) = public.current_user_email()
  );

drop policy if exists video_select_provider on public.video_metadata;
create policy video_select_provider on public.video_metadata
  for select to authenticated
  using (
    public.current_user_role() = 'PROVIDER'
    and provider_id = public.current_company_id()
  );

drop policy if exists video_select_mining on public.video_metadata;
create policy video_select_mining on public.video_metadata
  for select to authenticated
  using (
    public.current_user_role() = 'MINING'
    and public.mining_can_view_video(id)
  );

drop policy if exists video_insert_provider on public.video_metadata;
create policy video_insert_provider on public.video_metadata
  for insert to authenticated
  with check (
    public.current_user_role() = 'PROVIDER'
    and provider_id = public.current_company_id()
  );

-- Deletion requests ----------------------------------------------------------
drop policy if exists deletion_requests_select_driver on public.deletion_requests;
create policy deletion_requests_select_driver on public.deletion_requests
  for select to authenticated
  using (
    public.current_user_role() = 'DRIVER'
    and driver_id = (select auth.uid())
  );

drop policy if exists deletion_requests_insert_driver on public.deletion_requests;
create policy deletion_requests_insert_driver on public.deletion_requests
  for insert to authenticated
  with check (
    public.current_user_role() = 'DRIVER'
    and driver_id = (select auth.uid())
    and public.is_driver_of_video(video_id)
  );

drop policy if exists deletion_requests_select_provider on public.deletion_requests;
create policy deletion_requests_select_provider on public.deletion_requests
  for select to authenticated
  using (
    public.current_user_role() = 'PROVIDER'
    and public.is_provider_of_video(video_id)
  );

drop policy if exists deletion_requests_update_provider on public.deletion_requests;
create policy deletion_requests_update_provider on public.deletion_requests
  for update to authenticated
  using (
    public.current_user_role() = 'PROVIDER'
    and public.is_provider_of_video(video_id)
  )
  with check (
    public.current_user_role() = 'PROVIDER'
    and public.is_provider_of_video(video_id)
  );

drop policy if exists deletion_requests_select_mining on public.deletion_requests;
create policy deletion_requests_select_mining on public.deletion_requests
  for select to authenticated
  using (
    public.current_user_role() = 'MINING'
    and public.mining_owns_driver(driver_id)
  );

-- user_invites ---------------------------------------------------------------
-- RLS is enabled with NO policies on purpose: only the service_role key
-- (which bypasses RLS) can read or write pre-provisioned roles.
