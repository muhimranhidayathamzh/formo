-- =========================================================================
-- Formo — Migration 0001: Foundation schema
-- Master spec §5. Jalankan di Supabase SQL Editor (hosted).
-- Berisi: tabel profiles/documents/document_assets, trigger updated_at,
-- trigger auto-insert profile saat signup, 2 bucket privat, RLS penuh.
-- =========================================================================

-- ------------------------------------------------------------------ profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- ----------------------------------------------------------------- documents
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text,
  doc_type text,
  source_content text,
  auto_clean_wording boolean not null default true,
  format_instruction_text text,
  reference_file_path text,
  document_model jsonb,
  format_profile jsonb,
  status text not null default 'draft'
    check (status in ('draft', 'structured', 'exported')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.documents enable row level security;

create index if not exists documents_user_id_idx
  on public.documents (user_id);

-- ----------------------------------------------------------- document_assets
create table if not exists public.document_assets (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  ref_token text not null,          -- mis. "gambar-1", unik per document_id
  storage_path text not null,        -- path di bucket document-images
  created_at timestamptz not null default now(),
  unique (document_id, ref_token)
);

alter table public.document_assets enable row level security;

create index if not exists document_assets_document_id_idx
  on public.document_assets (document_id);

-- =========================================================================
-- Triggers
-- =========================================================================

-- updated_at otomatis di documents
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists documents_set_updated_at on public.documents;
create trigger documents_set_updated_at
  before update on public.documents
  for each row
  execute function public.handle_updated_at();

-- Auto-insert profile saat user baru signup.
-- security definer + search_path fixed → aman & bypass RLS untuk insert ini.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- =========================================================================
-- RLS Policies — user hanya bisa akses baris miliknya sendiri
-- =========================================================================

-- profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- documents
drop policy if exists "documents_select_own" on public.documents;
create policy "documents_select_own" on public.documents
  for select using (auth.uid() = user_id);

drop policy if exists "documents_insert_own" on public.documents;
create policy "documents_insert_own" on public.documents
  for insert with check (auth.uid() = user_id);

drop policy if exists "documents_update_own" on public.documents;
create policy "documents_update_own" on public.documents
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "documents_delete_own" on public.documents;
create policy "documents_delete_own" on public.documents
  for delete using (auth.uid() = user_id);

-- document_assets
drop policy if exists "assets_select_own" on public.document_assets;
create policy "assets_select_own" on public.document_assets
  for select using (auth.uid() = user_id);

drop policy if exists "assets_insert_own" on public.document_assets;
create policy "assets_insert_own" on public.document_assets
  for insert with check (auth.uid() = user_id);

drop policy if exists "assets_update_own" on public.document_assets;
create policy "assets_update_own" on public.document_assets
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "assets_delete_own" on public.document_assets;
create policy "assets_delete_own" on public.document_assets
  for delete using (auth.uid() = user_id);

-- =========================================================================
-- Storage buckets (privat) + RLS
-- Konvensi path: {user_id}/{document_id}/...  →  folder pertama = user_id
-- =========================================================================

insert into storage.buckets (id, name, public)
values
  ('document-images', 'document-images', false),
  ('format-references', 'format-references', false)
on conflict (id) do nothing;

-- document-images: user hanya akses objek di folder {auth.uid()}/...
drop policy if exists "document_images_all_own" on storage.objects;
create policy "document_images_all_own" on storage.objects
  for all
  using (
    bucket_id = 'document-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'document-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- format-references: idem
drop policy if exists "format_references_all_own" on storage.objects;
create policy "format_references_all_own" on storage.objects
  for all
  using (
    bucket_id = 'format-references'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'format-references'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
