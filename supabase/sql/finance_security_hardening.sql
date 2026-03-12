-- finance_security_hardening.sql
-- Stage 2.5: integrity constraints, financial indexes, audit log, storage path hardening

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'receivables_status_check'
  ) then
    alter table public.receivables
      add constraint receivables_status_check
      check (status in ('pending', 'paid', 'overdue'));
  end if;

  if not exists (
    select 1
      from pg_constraint
     where conname = 'payables_status_check'
  ) then
    alter table public.payables
      add constraint payables_status_check
      check (status in ('pending', 'paid', 'overdue'));
  end if;

  if not exists (
    select 1
      from pg_constraint
     where conname = 'settlements_direction_check'
  ) then
    alter table public.settlements
      add constraint settlements_direction_check
      check (direction in ('in', 'out'));
  end if;

  if not exists (
    select 1
      from pg_constraint
     where conname = 'settlements_source_type_check'
  ) then
    alter table public.settlements
      add constraint settlements_source_type_check
      check (source_type in ('receivable', 'payable'));
  end if;

  if not exists (
    select 1
      from pg_constraint
     where conname = 'receivables_amount_non_negative'
  ) then
    alter table public.receivables
      add constraint receivables_amount_non_negative
      check (amount >= 0);
  end if;

  if not exists (
    select 1
      from pg_constraint
     where conname = 'payables_amount_non_negative'
  ) then
    alter table public.payables
      add constraint payables_amount_non_negative
      check (amount >= 0);
  end if;

  if not exists (
    select 1
      from pg_constraint
     where conname = 'settlements_amount_non_negative'
  ) then
    alter table public.settlements
      add constraint settlements_amount_non_negative
      check (amount >= 0);
  end if;
end $$;

create unique index if not exists settlements_unique_source_idx
  on public.settlements (org_id, source_type, source_id);

create index if not exists receivables_org_status_due_idx
  on public.receivables (org_id, status, due_date);

create index if not exists payables_org_status_due_idx
  on public.payables (org_id, status, due_date);

create index if not exists settlements_org_date_idx
  on public.settlements (org_id, settlement_date);

create index if not exists app_settings_org_key_idx
  on public.app_settings (org_id, setting_key);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  performed_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.audit_logs enable row level security;

drop policy if exists audit_logs_select_org_member on public.audit_logs;
create policy audit_logs_select_org_member on public.audit_logs
for select
using (private.is_org_member(org_id));

-- Apenas service_role via API deve escrever
revoke insert, update, delete on public.audit_logs from authenticated, anon;

create index if not exists audit_logs_org_entity_idx
  on public.audit_logs (org_id, entity_type, created_at desc);

-- Storage path hardening
-- users/{auth.uid}/...
-- clients/{org_id}/{client_id}/... somente membro da org

drop policy if exists avatars_authenticated_write_user_path on storage.objects;
drop policy if exists avatars_authenticated_delete_user_path on storage.objects;
drop policy if exists avatars_client_org_write on storage.objects;
drop policy if exists avatars_client_org_delete on storage.objects;

create policy avatars_authenticated_write_user_path
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = 'users'
  and (storage.foldername(name))[2] = auth.uid()::text
);

create policy avatars_authenticated_delete_user_path
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = 'users'
  and (storage.foldername(name))[2] = auth.uid()::text
);

create policy avatars_client_org_write
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = 'clients'
  and (storage.foldername(name))[2] ~* '^[0-9a-f-]{36}$'
  and (storage.foldername(name))[3] ~* '^[0-9a-f-]{36}$'
  and private.is_org_member(((storage.foldername(name))[2])::uuid, auth.uid())
  and exists (
    select 1
      from public.clients c
     where c.id = ((storage.foldername(name))[3])::uuid
       and c.org_id = ((storage.foldername(name))[2])::uuid
  )
);

create policy avatars_client_org_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = 'clients'
  and (storage.foldername(name))[2] ~* '^[0-9a-f-]{36}$'
  and (storage.foldername(name))[3] ~* '^[0-9a-f-]{36}$'
  and private.is_org_member(((storage.foldername(name))[2])::uuid, auth.uid())
  and exists (
    select 1
      from public.clients c
     where c.id = ((storage.foldername(name))[3])::uuid
       and c.org_id = ((storage.foldername(name))[2])::uuid
  )
);
