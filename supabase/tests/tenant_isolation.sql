# Tenant isolation SQL harness
#
# Proves organization A cannot read organization B under RLS, using the
# `authenticated` role and auth.uid() JWT claims.
#
# Requires a running local/CI Postgres with migrations applied, e.g.:
#   npx supabase start
#   npx supabase db reset
#   psql postgresql://postgres:postgres@127.0.0.1:54322/postgres \
#     -v ON_ERROR_STOP=1 -f supabase/tests/tenant_isolation.sql
#
# Docker is not required for CI. When this harness cannot run, the TypeScript
# tests in tests/rls/ still validate the same isolation contract against the
# committed migrations and policy helpers.

begin;

create extension if not exists pgcrypto with schema extensions;

-- Unique emails so the harness can be re-run after rollback (and after a
-- previous aborted run that left users behind).
do $$
begin
  delete from auth.users
  where email in ('rls-user-a@example.test', 'rls-user-b@example.test');
exception
  when undefined_table then
    raise exception 'auth.users is missing; run this harness against a Supabase database';
end
$$;

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'authenticated',
    'authenticated',
    'rls-user-a@example.test',
    extensions.crypt('test-password', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"User A"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'authenticated',
    'authenticated',
    'rls-user-b@example.test',
    extensions.crypt('test-password', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"User B"}'::jsonb,
    now(),
    now()
  );

-- Create organizations as a privileged role (bypasses RLS), then rely on the
-- handle_new_organization trigger to add OWNER membership + settings.
insert into public.organizations (id, name, slug, created_by)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'Org Alpha',
    'org-alpha-rls',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Org Bravo',
    'org-bravo-rls',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
  );

insert into public.invitations (
  organization_id,
  email,
  role,
  invited_by
)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'invite-a@example.test',
    'VIEWER',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'invite-b@example.test',
    'VIEWER',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
  );

-- Impersonate user A (org Alpha). Postgres superuser bypasses RLS; authenticated does not.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'role', 'authenticated'
  )::text,
  true
);

do $$
declare
  org_count integer;
  other_org integer;
  member_count integer;
  settings_count integer;
  invite_count integer;
  other_profile integer;
begin
  select count(*) into org_count from public.organizations;
  if org_count <> 1 then
    raise exception 'RLS FAIL: user A should see 1 organization, saw %', org_count;
  end if;

  select count(*) into other_org
  from public.organizations
  where id = '22222222-2222-2222-2222-222222222222';
  if other_org <> 0 then
    raise exception 'RLS FAIL: user A must not read org Bravo';
  end if;

  select count(*) into member_count from public.organization_members;
  if member_count <> 1 then
    raise exception 'RLS FAIL: user A should see 1 membership row, saw %', member_count;
  end if;

  select count(*) into settings_count
  from public.organization_settings
  where organization_id = '22222222-2222-2222-2222-222222222222';
  if settings_count <> 0 then
    raise exception 'RLS FAIL: user A must not read org Bravo settings';
  end if;

  select count(*) into invite_count
  from public.invitations
  where organization_id = '22222222-2222-2222-2222-222222222222';
  if invite_count <> 0 then
    raise exception 'RLS FAIL: user A must not read org Bravo invitations';
  end if;

  select count(*) into other_profile
  from public.profiles
  where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  if other_profile <> 0 then
    raise exception 'RLS FAIL: user A must not read user B profile across tenants';
  end if;
end
$$;

-- Cross-tenant write must fail (0 rows updated under RLS).
do $$
declare
  updated integer;
begin
  update public.organizations
  set name = 'Hijacked Bravo'
  where id = '22222222-2222-2222-2222-222222222222';
  get diagnostics updated = row_count;
  if updated <> 0 then
    raise exception 'RLS FAIL: user A updated org Bravo (% rows)', updated;
  end if;
end
$$;

reset role;

-- Confirm the privileged role can still see both orgs (data was not deleted).
do $$
declare
  org_count integer;
begin
  select count(*) into org_count
  from public.organizations
  where id in (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222'
  );
  if org_count <> 2 then
    raise exception 'Harness setup failed: expected both orgs to exist, saw %', org_count;
  end if;

  raise notice 'PASS: org A cannot read org B under RLS';
end
$$;

rollback;
