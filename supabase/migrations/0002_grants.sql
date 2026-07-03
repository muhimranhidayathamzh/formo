-- =========================================================================
-- Formo — Migration 0002: Grant privilege tabel ke role API Supabase
--
-- Latar: 0001 membuat tabel tanpa GRANT eksplisit, mengandalkan default
-- privilege bawaan Supabase. Di project ini grant otomatis TIDAK ter-apply
-- (umum pada setup dengan API key format baru `sb_publishable_` / `sb_secret_`),
-- sehingga SEMUA query PostgREST — termasuk service_role — gagal dengan:
--     ERROR 42501: permission denied for table <tabel>
--
-- RLS (0001) tetap menjadi gerbang per-baris; GRANT ini hanya memberi hak
-- level-tabel yang memang diasumsikan sudah ada oleh Supabase.
--
-- Jalankan di Supabase SQL Editor (hosted). Idempotent — aman dijalankan ulang.
-- =========================================================================

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on public.profiles
  to anon, authenticated, service_role;

grant select, insert, update, delete on public.documents
  to anon, authenticated, service_role;

grant select, insert, update, delete on public.document_assets
  to anon, authenticated, service_role;

-- Agar tabel baru di schema public otomatis ter-grant (untuk migrasi berikutnya).
alter default privileges in schema public
  grant select, insert, update, delete on tables
  to anon, authenticated, service_role;
