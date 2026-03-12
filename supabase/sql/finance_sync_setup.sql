-- finance_sync_setup.sql
-- Stage 1: baseline multi-tenant schema + RLS + realtime + profile bootstrap

create extension if not exists pgcrypto;
create schema if not exists private;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_organization_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  role text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, org_id, role)
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  document text,
  status text not null default 'active',
  notes text,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  type text not null,
  color text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(org_id, name, type)
);

create table if not exists public.platforms (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  type text,
  fee_value numeric(14, 2) not null default 0,
  fee_type text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(org_id, name)
);

create table if not exists public.receivables (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  description text not null,
  amount numeric(14, 2) not null,
  due_date date not null,
  expected_date date,
  issue_date date,
  external_reference text,
  payment_method text,
  category_id uuid references public.categories(id) on delete set null,
  platform_id uuid references public.platforms(id) on delete set null,
  notes text,
  status text not null default 'pending',
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payables (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  description text not null,
  amount numeric(14, 2) not null,
  due_date date not null,
  issue_date date,
  supplier_name text,
  payment_method text,
  category_id uuid references public.categories(id) on delete set null,
  platform_id uuid references public.platforms(id) on delete set null,
  notes text,
  status text not null default 'pending',
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cash_entries (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  description text not null,
  amount numeric(14, 2) not null,
  type text not null,
  entry_date date not null,
  category_id uuid references public.categories(id) on delete set null,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.settlements (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  source_type text not null,
  source_id uuid not null,
  direction text not null,
  amount numeric(14, 2) not null,
  settlement_date date not null,
  reference text,
  notes text,
  account_name text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  setting_key text not null,
  setting_value jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(org_id, setting_key)
);

create or replace function private.is_org_member(p_org_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.user_organization_roles uor
     where uor.org_id = p_org_id
       and uor.user_id = p_user_id
       and uor.active = true
  );
$$;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.user_organization_roles enable row level security;
alter table public.clients enable row level security;
alter table public.categories enable row level security;
alter table public.platforms enable row level security;
alter table public.receivables enable row level security;
alter table public.payables enable row level security;
alter table public.cash_entries enable row level security;
alter table public.settlements enable row level security;
alter table public.app_settings enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
for select
using (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
for update
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists organizations_select_member on public.organizations;
create policy organizations_select_member on public.organizations
for select
using (private.is_org_member(id));

drop policy if exists user_org_roles_select_member on public.user_organization_roles;
create policy user_org_roles_select_member on public.user_organization_roles
for select
using (private.is_org_member(org_id));

drop policy if exists user_org_roles_manage_admin on public.user_organization_roles;
create policy user_org_roles_manage_admin on public.user_organization_roles
for all
using (
  exists (
    select 1
      from public.user_organization_roles m
     where m.org_id = user_organization_roles.org_id
       and m.user_id = auth.uid()
       and m.active = true
       and m.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
      from public.user_organization_roles m
     where m.org_id = user_organization_roles.org_id
       and m.user_id = auth.uid()
       and m.active = true
       and m.role in ('owner', 'admin')
  )
);

-- Shared policy generator equivalent for org-scoped tables

drop policy if exists clients_select_org_member on public.clients;
create policy clients_select_org_member on public.clients
for select
using (private.is_org_member(org_id));

drop policy if exists clients_write_org_member on public.clients;
create policy clients_write_org_member on public.clients
for all
using (private.is_org_member(org_id))
with check (private.is_org_member(org_id));

drop policy if exists categories_select_org_member on public.categories;
create policy categories_select_org_member on public.categories
for select
using (private.is_org_member(org_id));

drop policy if exists categories_write_org_member on public.categories;
create policy categories_write_org_member on public.categories
for all
using (private.is_org_member(org_id))
with check (private.is_org_member(org_id));

drop policy if exists platforms_select_org_member on public.platforms;
create policy platforms_select_org_member on public.platforms
for select
using (private.is_org_member(org_id));

drop policy if exists platforms_write_org_member on public.platforms;
create policy platforms_write_org_member on public.platforms
for all
using (private.is_org_member(org_id))
with check (private.is_org_member(org_id));

drop policy if exists receivables_select_org_member on public.receivables;
create policy receivables_select_org_member on public.receivables
for select
using (private.is_org_member(org_id));

drop policy if exists receivables_write_org_member on public.receivables;
create policy receivables_write_org_member on public.receivables
for all
using (private.is_org_member(org_id))
with check (private.is_org_member(org_id));

drop policy if exists payables_select_org_member on public.payables;
create policy payables_select_org_member on public.payables
for select
using (private.is_org_member(org_id));

drop policy if exists payables_write_org_member on public.payables;
create policy payables_write_org_member on public.payables
for all
using (private.is_org_member(org_id))
with check (private.is_org_member(org_id));

drop policy if exists cash_entries_select_org_member on public.cash_entries;
create policy cash_entries_select_org_member on public.cash_entries
for select
using (private.is_org_member(org_id));

drop policy if exists cash_entries_write_org_member on public.cash_entries;
create policy cash_entries_write_org_member on public.cash_entries
for all
using (private.is_org_member(org_id))
with check (private.is_org_member(org_id));

drop policy if exists settlements_select_org_member on public.settlements;
create policy settlements_select_org_member on public.settlements
for select
using (private.is_org_member(org_id));

drop policy if exists settlements_write_org_member on public.settlements;
create policy settlements_write_org_member on public.settlements
for all
using (private.is_org_member(org_id))
with check (private.is_org_member(org_id));

drop policy if exists app_settings_select_org_member on public.app_settings;
create policy app_settings_select_org_member on public.app_settings
for select
using (private.is_org_member(org_id));

drop policy if exists app_settings_write_org_member on public.app_settings;
create policy app_settings_write_org_member on public.app_settings
for all
using (private.is_org_member(org_id))
with check (private.is_org_member(org_id));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
    set full_name = excluded.full_name,
        avatar_url = excluded.avatar_url,
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user();

-- Updated_at triggers

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles
for each row execute procedure private.set_updated_at();

drop trigger if exists trg_organizations_updated_at on public.organizations;
create trigger trg_organizations_updated_at before update on public.organizations
for each row execute procedure private.set_updated_at();

drop trigger if exists trg_user_org_roles_updated_at on public.user_organization_roles;
create trigger trg_user_org_roles_updated_at before update on public.user_organization_roles
for each row execute procedure private.set_updated_at();

drop trigger if exists trg_clients_updated_at on public.clients;
create trigger trg_clients_updated_at before update on public.clients
for each row execute procedure private.set_updated_at();

drop trigger if exists trg_categories_updated_at on public.categories;
create trigger trg_categories_updated_at before update on public.categories
for each row execute procedure private.set_updated_at();

drop trigger if exists trg_platforms_updated_at on public.platforms;
create trigger trg_platforms_updated_at before update on public.platforms
for each row execute procedure private.set_updated_at();

drop trigger if exists trg_receivables_updated_at on public.receivables;
create trigger trg_receivables_updated_at before update on public.receivables
for each row execute procedure private.set_updated_at();

drop trigger if exists trg_payables_updated_at on public.payables;
create trigger trg_payables_updated_at before update on public.payables
for each row execute procedure private.set_updated_at();

drop trigger if exists trg_cash_entries_updated_at on public.cash_entries;
create trigger trg_cash_entries_updated_at before update on public.cash_entries
for each row execute procedure private.set_updated_at();

drop trigger if exists trg_settlements_updated_at on public.settlements;
create trigger trg_settlements_updated_at before update on public.settlements
for each row execute procedure private.set_updated_at();

drop trigger if exists trg_app_settings_updated_at on public.app_settings;
create trigger trg_app_settings_updated_at before update on public.app_settings
for each row execute procedure private.set_updated_at();

-- Realtime publication

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'profiles',
    'organizations',
    'user_organization_roles',
    'clients',
    'categories',
    'platforms',
    'receivables',
    'payables',
    'cash_entries',
    'settlements',
    'app_settings'
  ] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', tbl);
    exception
      when duplicate_object then null;
      when undefined_object then null;
    end;
  end loop;
end $$;
