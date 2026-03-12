-- finance_stage3_hardening.sql
-- Stage 3: soft delete + idempotency + RBAC helpers + atomic RPCs + direct-write revocation

alter table public.receivables
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id);

alter table public.payables
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id);

create table if not exists public.finance_idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete cascade,
  scope text not null,
  idempotency_key text not null,
  request_hash text not null,
  response_payload jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '48 hours')
);

create unique index if not exists finance_idempotency_keys_unique_idx
  on public.finance_idempotency_keys (org_id, actor_id, scope, idempotency_key);

create index if not exists finance_idempotency_keys_exp_idx
  on public.finance_idempotency_keys (expires_at);

alter table public.finance_idempotency_keys enable row level security;

create or replace function private.finance_role_can(p_role text, p_permission text)
returns boolean
language sql
immutable
as $$
  select case p_permission
    when 'read' then p_role in ('owner', 'admin', 'finance_manager', 'finance_analyst', 'analyst', 'auditor', 'viewer', 'read_only')
    when 'write' then p_role in ('owner', 'admin', 'finance_manager', 'finance_analyst')
    when 'delete' then p_role in ('owner', 'admin', 'finance_manager')
    else false
  end;
$$;

create or replace function private.require_finance_permission(p_org_id uuid, p_actor_id uuid, p_permission text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  select uor.role
    into v_role
    from public.user_organization_roles uor
   where uor.org_id = p_org_id
     and uor.user_id = p_actor_id
     and uor.active = true
   order by case uor.role
      when 'owner' then 1
      when 'admin' then 2
      when 'finance_manager' then 3
      when 'finance_analyst' then 4
      when 'analyst' then 5
      when 'auditor' then 6
      when 'viewer' then 7
      else 99
   end
   limit 1;

  if v_role is null then
    raise exception 'forbidden'
      using errcode = '42501', detail = 'not_org_member';
  end if;

  if not private.finance_role_can(v_role, p_permission) then
    raise exception 'forbidden'
      using errcode = '42501', detail = format('role=%s permission=%s', v_role, p_permission);
  end if;
end;
$$;

create or replace function private.normalize_finance_status(p_status text)
returns text
language plpgsql
immutable
as $$
begin
  if p_status is null then
    return 'pending';
  end if;

  case trim(p_status)
    when 'pending', 'Pendente' then return 'pending';
    when 'paid', 'Pago', 'Realizado' then return 'paid';
    when 'overdue', 'Em Atraso' then return 'overdue';
    else
      raise exception 'invalid_status'
        using errcode = '22023', detail = p_status;
  end case;
end;
$$;

create or replace function public.finance_mutate_receivable(
  p_org_id uuid,
  p_actor_id uuid,
  p_action text,
  p_entity_id uuid,
  p_payload jsonb,
  p_idempotency_key text,
  p_request_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_scope text;
  v_permission text;
  v_lock_key text;
  v_existing_key public.finance_idempotency_keys%rowtype;
  v_old public.receivables%rowtype;
  v_row public.receivables%rowtype;
  v_status text;
  v_result jsonb;
begin
  if p_action not in ('create', 'update', 'delete') then
    raise exception 'invalid_action'
      using errcode = '22023', detail = p_action;
  end if;

  if p_idempotency_key is null or char_length(p_idempotency_key) < 8 or char_length(p_idempotency_key) > 200 then
    raise exception 'invalid_idempotency_key'
      using errcode = '22023';
  end if;

  if p_request_hash is null or char_length(p_request_hash) < 16 then
    raise exception 'invalid_request_hash'
      using errcode = '22023';
  end if;

  v_scope := format('receivable:%s', p_action);
  v_permission := case when p_action = 'delete' then 'delete' else 'write' end;
  v_lock_key := format('%s:%s:%s:%s', v_scope, p_org_id, p_actor_id, p_idempotency_key);

  perform pg_advisory_xact_lock(hashtext(v_lock_key));

  select *
    into v_existing_key
    from public.finance_idempotency_keys k
   where k.org_id = p_org_id
     and k.actor_id = p_actor_id
     and k.scope = v_scope
     and k.idempotency_key = p_idempotency_key
     and k.expires_at > now()
   limit 1;

  if found then
    if v_existing_key.request_hash <> p_request_hash then
      raise exception 'idempotency_conflict'
        using errcode = 'P0001', detail = 'same_key_different_payload';
    end if;

    return v_existing_key.response_payload;
  end if;

  perform private.require_finance_permission(p_org_id, p_actor_id, v_permission);

  if p_action = 'create' then
    if coalesce(nullif(trim(p_payload ->> 'description'), ''), '') = '' then
      raise exception 'description_required' using errcode = '22023';
    end if;

    if p_payload ->> 'dueDate' is null then
      raise exception 'due_date_required' using errcode = '22023';
    end if;

    if p_payload ->> 'amount_cents' is null then
      raise exception 'amount_required' using errcode = '22023';
    end if;

    v_status := private.normalize_finance_status(coalesce(p_payload ->> 'status', 'pending'));

    insert into public.receivables (
      org_id,
      client_id,
      description,
      amount,
      due_date,
      expected_date,
      issue_date,
      external_reference,
      payment_method,
      category_id,
      platform_id,
      notes,
      status,
      created_by,
      updated_by
    )
    values (
      p_org_id,
      nullif(p_payload ->> 'clientId', '')::uuid,
      trim(p_payload ->> 'description'),
      ((p_payload ->> 'amount_cents')::bigint)::numeric / 100.0,
      (p_payload ->> 'dueDate')::date,
      nullif(p_payload ->> 'expectedDate', '')::date,
      nullif(p_payload ->> 'issueDate', '')::date,
      nullif(p_payload ->> 'externalReference', ''),
      nullif(p_payload ->> 'paymentMethod', ''),
      nullif(p_payload ->> 'categoryId', '')::uuid,
      nullif(p_payload ->> 'platformId', '')::uuid,
      nullif(p_payload ->> 'notes', ''),
      v_status,
      p_actor_id,
      p_actor_id
    )
    returning * into v_row;

    if v_row.status = 'paid' then
      insert into public.settlements (
        org_id,
        source_type,
        source_id,
        direction,
        amount,
        settlement_date,
        reference,
        notes,
        account_name,
        created_by
      )
      values (
        p_org_id,
        'receivable',
        v_row.id,
        'in',
        v_row.amount,
        coalesce(v_row.expected_date, v_row.due_date),
        v_row.external_reference,
        v_row.notes,
        v_row.payment_method,
        p_actor_id
      )
      on conflict (org_id, source_type, source_id)
      do update
        set direction = excluded.direction,
            amount = excluded.amount,
            settlement_date = excluded.settlement_date,
            reference = excluded.reference,
            notes = excluded.notes,
            account_name = excluded.account_name,
            updated_at = now();
    end if;

    insert into public.audit_logs (org_id, entity_type, entity_id, action, old_data, new_data, performed_by)
    values (p_org_id, 'receivable', v_row.id, 'create', null, to_jsonb(v_row), p_actor_id);

  elsif p_action = 'update' then
    if p_entity_id is null then
      raise exception 'entity_id_required' using errcode = '22023';
    end if;

    select *
      into v_old
      from public.receivables
     where id = p_entity_id
       and org_id = p_org_id
       and deleted_at is null
     for update;

    if not found then
      raise exception 'receivable_not_found'
        using errcode = 'P0002';
    end if;

    v_status := case
      when p_payload ? 'status' then private.normalize_finance_status(p_payload ->> 'status')
      else v_old.status
    end;

    update public.receivables
       set client_id = case when p_payload ? 'clientId' then nullif(p_payload ->> 'clientId', '')::uuid else client_id end,
           description = case when p_payload ? 'description' then trim(p_payload ->> 'description') else description end,
           amount = case when p_payload ? 'amount_cents' then ((p_payload ->> 'amount_cents')::bigint)::numeric / 100.0 else amount end,
           due_date = case when p_payload ? 'dueDate' then nullif(p_payload ->> 'dueDate', '')::date else due_date end,
           expected_date = case when p_payload ? 'expectedDate' then nullif(p_payload ->> 'expectedDate', '')::date else expected_date end,
           issue_date = case when p_payload ? 'issueDate' then nullif(p_payload ->> 'issueDate', '')::date else issue_date end,
           external_reference = case when p_payload ? 'externalReference' then nullif(p_payload ->> 'externalReference', '') else external_reference end,
           payment_method = case when p_payload ? 'paymentMethod' then nullif(p_payload ->> 'paymentMethod', '') else payment_method end,
           category_id = case when p_payload ? 'categoryId' then nullif(p_payload ->> 'categoryId', '')::uuid else category_id end,
           platform_id = case when p_payload ? 'platformId' then nullif(p_payload ->> 'platformId', '')::uuid else platform_id end,
           notes = case when p_payload ? 'notes' then nullif(p_payload ->> 'notes', '') else notes end,
           status = v_status,
           updated_by = p_actor_id,
           updated_at = now()
     where id = p_entity_id
       and org_id = p_org_id
     returning * into v_row;

    if v_row.status = 'paid' then
      insert into public.settlements (
        org_id,
        source_type,
        source_id,
        direction,
        amount,
        settlement_date,
        reference,
        notes,
        account_name,
        created_by
      )
      values (
        p_org_id,
        'receivable',
        v_row.id,
        'in',
        v_row.amount,
        coalesce(v_row.expected_date, v_row.due_date),
        v_row.external_reference,
        v_row.notes,
        v_row.payment_method,
        p_actor_id
      )
      on conflict (org_id, source_type, source_id)
      do update
        set direction = excluded.direction,
            amount = excluded.amount,
            settlement_date = excluded.settlement_date,
            reference = excluded.reference,
            notes = excluded.notes,
            account_name = excluded.account_name,
            updated_at = now();
    else
      delete from public.settlements
       where org_id = p_org_id
         and source_type = 'receivable'
         and source_id = v_row.id;
    end if;

    insert into public.audit_logs (org_id, entity_type, entity_id, action, old_data, new_data, performed_by)
    values (p_org_id, 'receivable', v_row.id, 'update', to_jsonb(v_old), to_jsonb(v_row), p_actor_id);

  else
    if p_entity_id is null then
      raise exception 'entity_id_required' using errcode = '22023';
    end if;

    select *
      into v_old
      from public.receivables
     where id = p_entity_id
       and org_id = p_org_id
       and deleted_at is null
     for update;

    if not found then
      raise exception 'receivable_not_found'
        using errcode = 'P0002';
    end if;

    update public.receivables
       set deleted_at = now(),
           deleted_by = p_actor_id,
           updated_by = p_actor_id,
           updated_at = now()
     where id = p_entity_id
       and org_id = p_org_id
     returning * into v_row;

    delete from public.settlements
     where org_id = p_org_id
       and source_type = 'receivable'
       and source_id = p_entity_id;

    insert into public.audit_logs (org_id, entity_type, entity_id, action, old_data, new_data, performed_by)
    values (p_org_id, 'receivable', v_row.id, 'delete', to_jsonb(v_old), to_jsonb(v_row), p_actor_id);
  end if;

  v_result := jsonb_build_object('entity', 'receivable', 'action', p_action, 'data', to_jsonb(v_row));

  insert into public.finance_idempotency_keys (
    org_id,
    actor_id,
    scope,
    idempotency_key,
    request_hash,
    response_payload,
    expires_at
  )
  values (
    p_org_id,
    p_actor_id,
    v_scope,
    p_idempotency_key,
    p_request_hash,
    v_result,
    now() + interval '48 hours'
  )
  on conflict (org_id, actor_id, scope, idempotency_key)
  do update
    set request_hash = excluded.request_hash,
        response_payload = excluded.response_payload,
        expires_at = excluded.expires_at;

  return v_result;
end;
$$;

create or replace function public.finance_mutate_payable(
  p_org_id uuid,
  p_actor_id uuid,
  p_action text,
  p_entity_id uuid,
  p_payload jsonb,
  p_idempotency_key text,
  p_request_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_scope text;
  v_permission text;
  v_lock_key text;
  v_existing_key public.finance_idempotency_keys%rowtype;
  v_old public.payables%rowtype;
  v_row public.payables%rowtype;
  v_status text;
  v_result jsonb;
begin
  if p_action not in ('create', 'update', 'delete') then
    raise exception 'invalid_action'
      using errcode = '22023', detail = p_action;
  end if;

  if p_idempotency_key is null or char_length(p_idempotency_key) < 8 or char_length(p_idempotency_key) > 200 then
    raise exception 'invalid_idempotency_key'
      using errcode = '22023';
  end if;

  if p_request_hash is null or char_length(p_request_hash) < 16 then
    raise exception 'invalid_request_hash'
      using errcode = '22023';
  end if;

  v_scope := format('payable:%s', p_action);
  v_permission := case when p_action = 'delete' then 'delete' else 'write' end;
  v_lock_key := format('%s:%s:%s:%s', v_scope, p_org_id, p_actor_id, p_idempotency_key);

  perform pg_advisory_xact_lock(hashtext(v_lock_key));

  select *
    into v_existing_key
    from public.finance_idempotency_keys k
   where k.org_id = p_org_id
     and k.actor_id = p_actor_id
     and k.scope = v_scope
     and k.idempotency_key = p_idempotency_key
     and k.expires_at > now()
   limit 1;

  if found then
    if v_existing_key.request_hash <> p_request_hash then
      raise exception 'idempotency_conflict'
        using errcode = 'P0001', detail = 'same_key_different_payload';
    end if;

    return v_existing_key.response_payload;
  end if;

  perform private.require_finance_permission(p_org_id, p_actor_id, v_permission);

  if p_action = 'create' then
    if coalesce(nullif(trim(p_payload ->> 'description'), ''), '') = '' then
      raise exception 'description_required' using errcode = '22023';
    end if;

    if p_payload ->> 'dueDate' is null then
      raise exception 'due_date_required' using errcode = '22023';
    end if;

    if p_payload ->> 'amount_cents' is null then
      raise exception 'amount_required' using errcode = '22023';
    end if;

    v_status := private.normalize_finance_status(coalesce(p_payload ->> 'status', 'pending'));

    insert into public.payables (
      org_id,
      description,
      amount,
      due_date,
      issue_date,
      supplier_name,
      payment_method,
      category_id,
      platform_id,
      notes,
      status,
      created_by,
      updated_by
    )
    values (
      p_org_id,
      trim(p_payload ->> 'description'),
      ((p_payload ->> 'amount_cents')::bigint)::numeric / 100.0,
      (p_payload ->> 'dueDate')::date,
      nullif(p_payload ->> 'issueDate', '')::date,
      nullif(p_payload ->> 'supplierName', ''),
      nullif(p_payload ->> 'paymentMethod', ''),
      nullif(p_payload ->> 'categoryId', '')::uuid,
      nullif(p_payload ->> 'platformId', '')::uuid,
      nullif(p_payload ->> 'notes', ''),
      v_status,
      p_actor_id,
      p_actor_id
    )
    returning * into v_row;

    if v_row.status = 'paid' then
      insert into public.settlements (
        org_id,
        source_type,
        source_id,
        direction,
        amount,
        settlement_date,
        reference,
        notes,
        account_name,
        created_by
      )
      values (
        p_org_id,
        'payable',
        v_row.id,
        'out',
        v_row.amount,
        v_row.due_date,
        null,
        v_row.notes,
        v_row.payment_method,
        p_actor_id
      )
      on conflict (org_id, source_type, source_id)
      do update
        set direction = excluded.direction,
            amount = excluded.amount,
            settlement_date = excluded.settlement_date,
            notes = excluded.notes,
            account_name = excluded.account_name,
            updated_at = now();
    end if;

    insert into public.audit_logs (org_id, entity_type, entity_id, action, old_data, new_data, performed_by)
    values (p_org_id, 'payable', v_row.id, 'create', null, to_jsonb(v_row), p_actor_id);

  elsif p_action = 'update' then
    if p_entity_id is null then
      raise exception 'entity_id_required' using errcode = '22023';
    end if;

    select *
      into v_old
      from public.payables
     where id = p_entity_id
       and org_id = p_org_id
       and deleted_at is null
     for update;

    if not found then
      raise exception 'payable_not_found'
        using errcode = 'P0002';
    end if;

    v_status := case
      when p_payload ? 'status' then private.normalize_finance_status(p_payload ->> 'status')
      else v_old.status
    end;

    update public.payables
       set description = case when p_payload ? 'description' then trim(p_payload ->> 'description') else description end,
           amount = case when p_payload ? 'amount_cents' then ((p_payload ->> 'amount_cents')::bigint)::numeric / 100.0 else amount end,
           due_date = case when p_payload ? 'dueDate' then nullif(p_payload ->> 'dueDate', '')::date else due_date end,
           issue_date = case when p_payload ? 'issueDate' then nullif(p_payload ->> 'issueDate', '')::date else issue_date end,
           supplier_name = case when p_payload ? 'supplierName' then nullif(p_payload ->> 'supplierName', '') else supplier_name end,
           payment_method = case when p_payload ? 'paymentMethod' then nullif(p_payload ->> 'paymentMethod', '') else payment_method end,
           category_id = case when p_payload ? 'categoryId' then nullif(p_payload ->> 'categoryId', '')::uuid else category_id end,
           platform_id = case when p_payload ? 'platformId' then nullif(p_payload ->> 'platformId', '')::uuid else platform_id end,
           notes = case when p_payload ? 'notes' then nullif(p_payload ->> 'notes', '') else notes end,
           status = v_status,
           updated_by = p_actor_id,
           updated_at = now()
     where id = p_entity_id
       and org_id = p_org_id
     returning * into v_row;

    if v_row.status = 'paid' then
      insert into public.settlements (
        org_id,
        source_type,
        source_id,
        direction,
        amount,
        settlement_date,
        reference,
        notes,
        account_name,
        created_by
      )
      values (
        p_org_id,
        'payable',
        v_row.id,
        'out',
        v_row.amount,
        v_row.due_date,
        null,
        v_row.notes,
        v_row.payment_method,
        p_actor_id
      )
      on conflict (org_id, source_type, source_id)
      do update
        set direction = excluded.direction,
            amount = excluded.amount,
            settlement_date = excluded.settlement_date,
            notes = excluded.notes,
            account_name = excluded.account_name,
            updated_at = now();
    else
      delete from public.settlements
       where org_id = p_org_id
         and source_type = 'payable'
         and source_id = v_row.id;
    end if;

    insert into public.audit_logs (org_id, entity_type, entity_id, action, old_data, new_data, performed_by)
    values (p_org_id, 'payable', v_row.id, 'update', to_jsonb(v_old), to_jsonb(v_row), p_actor_id);

  else
    if p_entity_id is null then
      raise exception 'entity_id_required' using errcode = '22023';
    end if;

    select *
      into v_old
      from public.payables
     where id = p_entity_id
       and org_id = p_org_id
       and deleted_at is null
     for update;

    if not found then
      raise exception 'payable_not_found'
        using errcode = 'P0002';
    end if;

    update public.payables
       set deleted_at = now(),
           deleted_by = p_actor_id,
           updated_by = p_actor_id,
           updated_at = now()
     where id = p_entity_id
       and org_id = p_org_id
     returning * into v_row;

    delete from public.settlements
     where org_id = p_org_id
       and source_type = 'payable'
       and source_id = p_entity_id;

    insert into public.audit_logs (org_id, entity_type, entity_id, action, old_data, new_data, performed_by)
    values (p_org_id, 'payable', v_row.id, 'delete', to_jsonb(v_old), to_jsonb(v_row), p_actor_id);
  end if;

  v_result := jsonb_build_object('entity', 'payable', 'action', p_action, 'data', to_jsonb(v_row));

  insert into public.finance_idempotency_keys (
    org_id,
    actor_id,
    scope,
    idempotency_key,
    request_hash,
    response_payload,
    expires_at
  )
  values (
    p_org_id,
    p_actor_id,
    v_scope,
    p_idempotency_key,
    p_request_hash,
    v_result,
    now() + interval '48 hours'
  )
  on conflict (org_id, actor_id, scope, idempotency_key)
  do update
    set request_hash = excluded.request_hash,
        response_payload = excluded.response_payload,
        expires_at = excluded.expires_at;

  return v_result;
end;
$$;

-- RPC execution hardening
revoke all on function public.finance_mutate_receivable(uuid, uuid, text, uuid, jsonb, text, text) from public;
revoke all on function public.finance_mutate_receivable(uuid, uuid, text, uuid, jsonb, text, text) from authenticated;
revoke all on function public.finance_mutate_receivable(uuid, uuid, text, uuid, jsonb, text, text) from anon;
grant execute on function public.finance_mutate_receivable(uuid, uuid, text, uuid, jsonb, text, text) to service_role;

revoke all on function public.finance_mutate_payable(uuid, uuid, text, uuid, jsonb, text, text) from public;
revoke all on function public.finance_mutate_payable(uuid, uuid, text, uuid, jsonb, text, text) from authenticated;
revoke all on function public.finance_mutate_payable(uuid, uuid, text, uuid, jsonb, text, text) from anon;
grant execute on function public.finance_mutate_payable(uuid, uuid, text, uuid, jsonb, text, text) to service_role;

-- Revoke direct writes from client role for critical finance entities
revoke insert, update, delete on table public.receivables from authenticated;
revoke insert, update, delete on table public.payables from authenticated;
revoke insert, update, delete on table public.settlements from authenticated;
revoke insert, update, delete on table public.audit_logs from authenticated;
revoke insert, update, delete on table public.finance_idempotency_keys from authenticated;

-- Optional cleanup for expired idempotency keys
create or replace function public.finance_cleanup_idempotency_keys(p_limit int default 1000)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted int;
begin
  with expired as (
    select id
      from public.finance_idempotency_keys
     where expires_at < now()
     order by expires_at asc
     limit greatest(p_limit, 1)
  )
  delete from public.finance_idempotency_keys k
   using expired e
   where k.id = e.id;

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

grant execute on function public.finance_cleanup_idempotency_keys(int) to service_role;
revoke all on function public.finance_cleanup_idempotency_keys(int) from public, authenticated, anon;
