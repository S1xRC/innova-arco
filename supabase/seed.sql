-- =============================================================================
-- Innova ARCO · Seed data (DEMO)
--
-- Replace the emails below with the real Google accounts you will use:
--   * PROVIDER rows  -> camera providers that upload video metadata.
--   * MINING rows    -> mining companies that audit the ARCO requests.
-- Any email NOT listed here signs in as a DRIVER (self-declared company).
--
-- `support_email` is where the deletion-request notification is delivered.
-- =============================================================================

insert into public.companies (id, name, type, support_email)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'Minera Los Andes S.A.',
    'MINING',
    'auditoria@mineralosandes.cl'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Compañía Minera del Norte',
    'MINING',
    'datos@cminorte.cl'
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'SafeDrive Cámaras SpA',
    'PROVIDER',
    'soporte@safedrive.cl'
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    'MinerCam Ltda.',
    'PROVIDER',
    'reclamos@minercam.cl'
  )
on conflict (id) do update
  set name = excluded.name,
      type = excluded.type,
      support_email = excluded.support_email;

-- Pre-provisioned roles. Sign in with these Google accounts to get the role.
insert into public.user_invites (email, role, company_id)
values
  ('auditoria@mineralosandes.cl', 'MINING', '11111111-1111-1111-1111-111111111111'),
  ('datos@cminorte.cl', 'MINING', '22222222-2222-2222-2222-222222222222'),
  ('soporte@safedrive.cl', 'PROVIDER', '33333333-3333-3333-3333-333333333333'),
  ('reclamos@minercam.cl', 'PROVIDER', '44444444-4444-4444-4444-444444444444')
on conflict (email) do update
  set role = excluded.role,
      company_id = excluded.company_id;

-- Sample video records. These become visible to the driver whose Google
-- account email matches `driver_email`.
insert into public.video_metadata (id, provider_id, driver_email, license_plate, recorded_at)
values
  (
    'aaaaaaa1-0000-0000-0000-000000000001',
    '33333333-3333-3333-3333-333333333333',
    'conductor.demo@gmail.com',
    'AB-CD-12',
    now() - interval '3 days'
  ),
  (
    'aaaaaaa1-0000-0000-0000-000000000002',
    '33333333-3333-3333-3333-333333333333',
    'conductor.demo@gmail.com',
    'AB-CD-12',
    now() - interval '1 day'
  ),
  (
    'aaaaaaa1-0000-0000-0000-000000000003',
    '44444444-4444-4444-4444-444444444444',
    'conductor.demo@gmail.com',
    'XY-ZZ-98',
    now() - interval '5 hours'
  )
on conflict (id) do nothing;
