-- finance_sync_smoke_test.sql
-- Smoke checks for schema, security and realtime plumbing

do $$
declare
  v_missing int;
  v_count int;
begin
  -- required tables
  select count(*) into v_count
    from information_schema.tables
   where table_schema = 'public'
     and table_name in (
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
       'app_settings',
       'audit_logs',
       'finance_idempotency_keys'
     );

  if v_count <> 13 then
    raise exception 'smoke_failed: missing required tables (found=%)', v_count;
  end if;

  -- stage3 columns
  select count(*) into v_count
    from information_schema.columns
   where table_schema = 'public'
     and table_name in ('receivables', 'payables')
     and column_name in ('deleted_at', 'deleted_by');

  if v_count <> 4 then
    raise exception 'smoke_failed: missing stage3 soft-delete columns';
  end if;

  -- functions
  select count(*) into v_count
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname in ('public', 'private')
     and p.proname in (
       'is_org_member',
       'finance_role_can',
       'require_finance_permission',
       'normalize_finance_status',
       'finance_mutate_receivable',
       'finance_mutate_payable'
     );

  if v_count < 6 then
    raise exception 'smoke_failed: missing required functions';
  end if;

  -- RLS enabled checks
  select count(*) into v_count
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relname in (
       'receivables',
       'payables',
       'settlements',
       'audit_logs',
       'finance_idempotency_keys'
     )
     and c.relrowsecurity = true;

  if v_count <> 5 then
    raise exception 'smoke_failed: RLS not enabled on all critical tables';
  end if;

  -- publication presence for realtime tables
  select count(*) into v_count
    from pg_publication_tables
   where pubname = 'supabase_realtime'
     and schemaname = 'public'
     and tablename in (
       'clients',
       'receivables',
       'payables',
       'cash_entries',
       'settlements',
       'categories',
       'platforms',
       'app_settings'
     );

  if v_count <> 8 then
    raise exception 'smoke_failed: realtime publication missing required tables (found=%)', v_count;
  end if;

  -- check direct-write revoke intent by privilege query
  select count(*) into v_missing
    from (
      values
        ('receivables'::text),
        ('payables'),
        ('settlements'),
        ('audit_logs'),
        ('finance_idempotency_keys')
    ) t(tbl)
   where has_table_privilege('authenticated', format('public.%I', t.tbl), 'INSERT,UPDATE,DELETE');

  if v_missing > 0 then
    raise exception 'smoke_failed: authenticated still has direct write in critical tables';
  end if;

  raise notice 'finance smoke test passed';
end $$;
