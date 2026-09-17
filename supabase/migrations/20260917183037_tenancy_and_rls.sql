-- Phase 1 tenancy + Row Level Security
-- RLS is enabled AND forced on every public table in this migration.
-- Isolation is membership-based: a user may only see rows for organizations
-- they belong to in public.organization_members (or as a platform admin).
-- Security-definer helpers live in the unexposed `private` schema.

create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to postgres, service_role, authenticated;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'organization_role'
  ) then
    create type public.organization_role as enum (
      'OWNER',
      'ADMIN',
      'PROJECT_MANAGER',
      'INSPECTOR',
      'FOREMAN',
      'FIELD_USER',
      'VIEWER'
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'invitation_status'
  ) then
    create type public.invitation_status as enum (
      'PENDING',
      'ACCEPTED',
      'EXPIRED',
      'REVOKED'
    );
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  '1:1 with auth.users. Application profile; id is the auth user id.';

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_slug_key unique (slug)
);

comment on table public.organizations is
  'Tenant root. Every other tenant-owned table references this id.';

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.organization_role not null default 'VIEWER',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_members_org_user_key unique (organization_id, user_id)
);

comment on table public.organization_members is
  'Membership and role for a user inside an organization. Source of truth for RLS.';

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email text not null,
  role public.organization_role not null default 'VIEWER',
  status public.invitation_status not null default 'PENDING',
  token text not null default encode(extensions.gen_random_bytes(32), 'hex'),
  invited_by uuid references auth.users (id) on delete set null,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invitations_email_lower_chk check (email = lower(email)),
  constraint invitations_token_key unique (token)
);

comment on table public.invitations is
  'Pending / historical invites to join an organization.';

create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null
);

comment on table public.platform_admins is
  'Cross-tenant operators. Bootstrap the first row with a privileged role (postgres/service_role).';

create table if not exists public.organization_settings (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  oq_expiring_days integer not null default 30,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_settings_oq_expiring_days_chk check (oq_expiring_days > 0)
);

comment on table public.organization_settings is
  'Per-tenant settings. oq_expiring_days defaults to 30.';
comment on column public.organization_settings.oq_expiring_days is
  'Days before an operator qualification expires to treat it as expiring. Default 30.';

-- ---------------------------------------------------------------------------
-- Indexes used by RLS membership lookups
-- ---------------------------------------------------------------------------

create index if not exists organization_members_user_id_idx
  on public.organization_members (user_id);

create index if not exists organization_members_organization_id_idx
  on public.organization_members (organization_id);

create index if not exists invitations_organization_id_idx
  on public.invitations (organization_id);

create index if not exists invitations_email_idx
  on public.invitations (email);

create unique index if not exists invitations_pending_org_email_idx
  on public.invitations (organization_id, email)
  where status = 'PENDING';

-- ---------------------------------------------------------------------------
-- Private helper functions (SECURITY DEFINER, empty search_path)
-- ---------------------------------------------------------------------------

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.platform_admins pa
    where pa.user_id = (select auth.uid())
  );
$$;

create or replace function private.is_org_member(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = p_organization_id
      and m.user_id = (select auth.uid())
  );
$$;

create or replace function private.has_org_role(
  p_organization_id uuid,
  p_roles public.organization_role[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = p_organization_id
      and m.user_id = (select auth.uid())
      and m.role = any (p_roles)
  );
$$;

create or replace function private.shares_organization_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members mine
    join public.organization_members theirs
      on theirs.organization_id = mine.organization_id
    where mine.user_id = (select auth.uid())
      and theirs.user_id = p_user_id
  );
$$;

create or replace function private.org_owner_count(p_organization_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.organization_members m
  where m.organization_id = p_organization_id
    and m.role = 'OWNER';
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name),
        updated_at = now();
  return new;
end;
$$;

create or replace function private.handle_new_organization()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.organization_settings (organization_id)
  values (new.id)
  on conflict (organization_id) do nothing;

  if new.created_by is not null then
    insert into public.organization_members (organization_id, user_id, role)
    values (new.id, new.created_by, 'OWNER')
    on conflict (organization_id, user_id) do nothing;
  end if;

  return new;
end;
$$;

create or replace function private.protect_last_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.role = 'OWNER'
       and private.org_owner_count(old.organization_id) <= 1 then
      raise exception 'Cannot remove the last OWNER from an organization';
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE'
     and old.role = 'OWNER'
     and new.role is distinct from 'OWNER'
     and private.org_owner_count(old.organization_id) <= 1 then
    raise exception 'Cannot demote the last OWNER of an organization';
  end if;

  return new;
end;
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated;
revoke all on function private.handle_new_user() from public, anon, authenticated;
revoke all on function private.handle_new_organization() from public, anon, authenticated;
revoke all on function private.protect_last_owner() from public, anon, authenticated;

grant execute on function private.is_platform_admin() to authenticated;
grant execute on function private.is_org_member(uuid) to authenticated;
grant execute on function private.has_org_role(uuid, public.organization_role[]) to authenticated;
grant execute on function private.shares_organization_with(uuid) to authenticated;
grant execute on function private.org_owner_count(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

drop trigger if exists on_organization_created on public.organizations;
create trigger on_organization_created
  after insert on public.organizations
  for each row execute function private.handle_new_organization();

drop trigger if exists organization_members_protect_last_owner on public.organization_members;
create trigger organization_members_protect_last_owner
  before update or delete on public.organization_members
  for each row execute function private.protect_last_owner();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

drop trigger if exists organizations_set_updated_at on public.organizations;
create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute function private.set_updated_at();

drop trigger if exists organization_members_set_updated_at on public.organization_members;
create trigger organization_members_set_updated_at
  before update on public.organization_members
  for each row execute function private.set_updated_at();

drop trigger if exists invitations_set_updated_at on public.invitations;
create trigger invitations_set_updated_at
  before update on public.invitations
  for each row execute function private.set_updated_at();

drop trigger if exists organization_settings_set_updated_at on public.organization_settings;
create trigger organization_settings_set_updated_at
  before update on public.organization_settings
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Grants (least privilege). Never grant service_role to client roles.
-- ---------------------------------------------------------------------------

revoke all on table public.profiles from public, anon;
revoke all on table public.organizations from public, anon;
revoke all on table public.organization_members from public, anon;
revoke all on table public.invitations from public, anon;
revoke all on table public.platform_admins from public, anon;
revoke all on table public.organization_settings from public, anon;

grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.organizations to authenticated;
grant select, insert, update, delete on table public.organization_members to authenticated;
grant select, insert, update, delete on table public.invitations to authenticated;
grant select, insert, delete on table public.platform_admins to authenticated;
grant select, insert, update on table public.organization_settings to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security — enable + force on every public table
-- Policy names are asserted by tests/rls. Do not rename without updating tests.
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.profiles force row level security;

alter table public.organizations enable row level security;
alter table public.organizations force row level security;

alter table public.organization_members enable row level security;
alter table public.organization_members force row level security;

alter table public.invitations enable row level security;
alter table public.invitations force row level security;

alter table public.platform_admins enable row level security;
alter table public.platform_admins force row level security;

alter table public.organization_settings enable row level security;
alter table public.organization_settings force row level security;

-- profiles
drop policy if exists profiles_select on public.profiles;
create policy profiles_select
  on public.profiles
  for select
  to authenticated
  using (
    id = (select auth.uid())
    or private.is_platform_admin()
    or private.shares_organization_with(id)
  );

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
  on public.profiles
  for insert
  to authenticated
  with check (id = (select auth.uid()));

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()) or private.is_platform_admin())
  with check (id = (select auth.uid()) or private.is_platform_admin());

-- organizations
drop policy if exists organizations_select on public.organizations;
create policy organizations_select
  on public.organizations
  for select
  to authenticated
  using (
    private.is_platform_admin()
    or private.is_org_member(id)
  );

drop policy if exists organizations_insert on public.organizations;
create policy organizations_insert
  on public.organizations
  for insert
  to authenticated
  with check (created_by = (select auth.uid()));

drop policy if exists organizations_update on public.organizations;
create policy organizations_update
  on public.organizations
  for update
  to authenticated
  using (
    private.is_platform_admin()
    or private.has_org_role(id, array['OWNER', 'ADMIN']::public.organization_role[])
  )
  with check (
    private.is_platform_admin()
    or private.has_org_role(id, array['OWNER', 'ADMIN']::public.organization_role[])
  );

drop policy if exists organizations_delete on public.organizations;
create policy organizations_delete
  on public.organizations
  for delete
  to authenticated
  using (
    private.is_platform_admin()
    or private.has_org_role(id, array['OWNER']::public.organization_role[])
  );

-- organization_members
drop policy if exists organization_members_select on public.organization_members;
create policy organization_members_select
  on public.organization_members
  for select
  to authenticated
  using (
    private.is_platform_admin()
    or private.is_org_member(organization_id)
  );

drop policy if exists organization_members_insert on public.organization_members;
create policy organization_members_insert
  on public.organization_members
  for insert
  to authenticated
  with check (
    private.is_platform_admin()
    or private.has_org_role(
      organization_id,
      array['OWNER', 'ADMIN']::public.organization_role[]
    )
  );

drop policy if exists organization_members_update on public.organization_members;
create policy organization_members_update
  on public.organization_members
  for update
  to authenticated
  using (
    private.is_platform_admin()
    or private.has_org_role(
      organization_id,
      array['OWNER', 'ADMIN']::public.organization_role[]
    )
  )
  with check (
    private.is_platform_admin()
    or private.has_org_role(
      organization_id,
      array['OWNER', 'ADMIN']::public.organization_role[]
    )
  );

drop policy if exists organization_members_delete on public.organization_members;
create policy organization_members_delete
  on public.organization_members
  for delete
  to authenticated
  using (
    private.is_platform_admin()
    or private.has_org_role(
      organization_id,
      array['OWNER', 'ADMIN']::public.organization_role[]
    )
    or user_id = (select auth.uid())
  );

-- invitations (OWNER / ADMIN only)
drop policy if exists invitations_select on public.invitations;
create policy invitations_select
  on public.invitations
  for select
  to authenticated
  using (
    private.is_platform_admin()
    or private.has_org_role(
      organization_id,
      array['OWNER', 'ADMIN']::public.organization_role[]
    )
  );

drop policy if exists invitations_insert on public.invitations;
create policy invitations_insert
  on public.invitations
  for insert
  to authenticated
  with check (
    invited_by = (select auth.uid())
    and (
      private.is_platform_admin()
      or private.has_org_role(
        organization_id,
        array['OWNER', 'ADMIN']::public.organization_role[]
      )
    )
  );

drop policy if exists invitations_update on public.invitations;
create policy invitations_update
  on public.invitations
  for update
  to authenticated
  using (
    private.is_platform_admin()
    or private.has_org_role(
      organization_id,
      array['OWNER', 'ADMIN']::public.organization_role[]
    )
  )
  with check (
    private.is_platform_admin()
    or private.has_org_role(
      organization_id,
      array['OWNER', 'ADMIN']::public.organization_role[]
    )
  );

drop policy if exists invitations_delete on public.invitations;
create policy invitations_delete
  on public.invitations
  for delete
  to authenticated
  using (
    private.is_platform_admin()
    or private.has_org_role(
      organization_id,
      array['OWNER', 'ADMIN']::public.organization_role[]
    )
  );

-- platform_admins: only existing platform admins can read/write
drop policy if exists platform_admins_select on public.platform_admins;
create policy platform_admins_select
  on public.platform_admins
  for select
  to authenticated
  using (private.is_platform_admin());

drop policy if exists platform_admins_insert on public.platform_admins;
create policy platform_admins_insert
  on public.platform_admins
  for insert
  to authenticated
  with check (private.is_platform_admin());

drop policy if exists platform_admins_delete on public.platform_admins;
create policy platform_admins_delete
  on public.platform_admins
  for delete
  to authenticated
  using (private.is_platform_admin());

-- organization_settings
drop policy if exists organization_settings_select on public.organization_settings;
create policy organization_settings_select
  on public.organization_settings
  for select
  to authenticated
  using (
    private.is_platform_admin()
    or private.is_org_member(organization_id)
  );

drop policy if exists organization_settings_insert on public.organization_settings;
create policy organization_settings_insert
  on public.organization_settings
  for insert
  to authenticated
  with check (
    private.is_platform_admin()
    or private.has_org_role(
      organization_id,
      array['OWNER', 'ADMIN']::public.organization_role[]
    )
  );

drop policy if exists organization_settings_update on public.organization_settings;
create policy organization_settings_update
  on public.organization_settings
  for update
  to authenticated
  using (
    private.is_platform_admin()
    or private.has_org_role(
      organization_id,
      array['OWNER', 'ADMIN']::public.organization_role[]
    )
  )
  with check (
    private.is_platform_admin()
    or private.has_org_role(
      organization_id,
      array['OWNER', 'ADMIN']::public.organization_role[]
    )
  );
