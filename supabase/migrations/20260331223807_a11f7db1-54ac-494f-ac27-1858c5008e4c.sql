create or replace function public.can_manage_product_members(_user_id uuid, _product_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.products p
    where p.id = _product_id
      and p.created_by = _user_id
  )
  or exists (
    select 1
    from public.product_members pm
    where pm.product_id = _product_id
      and pm.user_id = _user_id
      and coalesce(lower(pm.role), 'member') in ('owner', 'admin')
  );
$$;

create or replace function public.handle_product_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.created_by is not null then
    insert into public.product_members (product_id, user_id, role)
    values (new.id, new.created_by, 'owner')
    on conflict (product_id, user_id)
    do update set role =
      case
        when coalesce(lower(public.product_members.role), 'member') in ('owner', 'admin') then public.product_members.role
        else excluded.role
      end;
  end if;

  return new;
end;
$$;

create unique index if not exists product_members_product_user_uidx
on public.product_members (product_id, user_id);

create unique index if not exists documents_file_path_uidx
on public.documents (file_path);

drop trigger if exists on_product_created_add_owner on public.products;
create trigger on_product_created_add_owner
after insert on public.products
for each row
execute function public.handle_product_created();

insert into public.product_members (product_id, user_id, role)
select p.id, p.created_by, 'owner'
from public.products p
where p.created_by is not null
on conflict (product_id, user_id)
do update set role =
  case
    when coalesce(lower(public.product_members.role), 'member') in ('owner', 'admin') then public.product_members.role
    else excluded.role
  end;

drop policy if exists "Profiles viewable by authenticated" on public.profiles;
create policy "Users view own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = user_id);

drop view if exists public.profiles_safe;

drop policy if exists "Product members viewable by authenticated" on public.product_members;
create policy "Product members viewable by members"
on public.product_members
for select
to authenticated
using (public.is_product_member(auth.uid(), product_id));

drop policy if exists "Product members insertable by members" on public.product_members;
create policy "Product memberships managed by owners"
on public.product_members
for insert
to authenticated
with check (public.can_manage_product_members(auth.uid(), product_id));

drop policy if exists "Product members deletable by members" on public.product_members;
create policy "Product memberships removable by owners"
on public.product_members
for delete
to authenticated
using (
  public.can_manage_product_members(auth.uid(), product_id)
  and not (
    auth.uid() = user_id
    and coalesce(lower(role), 'member') = 'owner'
  )
);

drop policy if exists "Documents viewable by authenticated" on public.documents;
create policy "Documents viewable by product members"
on public.documents
for select
to authenticated
using (
  auth.uid() = uploaded_by
  or public.is_product_member(auth.uid(), product_id)
);

create or replace function public.can_access_document_object(_object_name text, _user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.documents d
    where d.file_path = _object_name
      and (
        d.uploaded_by = _user_id
        or public.is_product_member(_user_id, d.product_id)
      )
  );
$$;

create or replace function public.can_upload_document_object(_object_name text, _user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select _user_id is not null
    and split_part(_object_name, '/', 1) = _user_id::text
    and position('/' in _object_name) > 0;
$$;

drop policy if exists "Authenticated can view documents" on storage.objects;
create policy "Document members can view files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'documents'
  and public.can_access_document_object(name, auth.uid())
);

drop policy if exists "Authenticated can upload documents" on storage.objects;
create policy "Authenticated users upload own document files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'documents'
  and public.can_upload_document_object(name, auth.uid())
);

drop policy if exists "Authenticated can delete documents" on storage.objects;
create policy "Document members can delete files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'documents'
  and public.can_access_document_object(name, auth.uid())
);

do $$
begin
  if exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    execute 'alter publication supabase_realtime drop table public.messages';
  end if;
end
$$;