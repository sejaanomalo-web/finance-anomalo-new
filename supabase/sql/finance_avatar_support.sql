-- finance_avatar_support.sql
-- Stage 2: avatar support for clients + storage bucket/policies

alter table public.clients
  add column if not exists avatar_url text;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Reset baseline policies to avoid duplicates across environments

drop policy if exists avatars_public_read on storage.objects;
drop policy if exists avatars_authenticated_write_user_path on storage.objects;
drop policy if exists avatars_authenticated_delete_user_path on storage.objects;
drop policy if exists avatars_client_org_write on storage.objects;
drop policy if exists avatars_client_org_delete on storage.objects;

create policy avatars_public_read
on storage.objects
for select
to public
using (bucket_id = 'avatars');

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
  and private.is_org_member(((storage.foldername(name))[2])::uuid, auth.uid())
);

create policy avatars_client_org_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = 'clients'
  and private.is_org_member(((storage.foldername(name))[2])::uuid, auth.uid())
);
