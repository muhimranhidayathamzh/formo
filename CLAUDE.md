# CLAUDE.md — Formo

> Instruksi utama untuk Claude Code. Baca file ini sebelum mengerjakan apapun.

---

## Project Overview

**Formo** — tool di mana user cukup menuang konten mentah, lalu AI menstrukturkannya dan mesin render menghasilkan dokumen profesional siap pakai (PDF & Word) — termasuk mengikuti format khusus (kampus/institusi/perusahaan) kalau user memberi instruksi teks atau contoh dokumen, dan tetap menjaga isi user tidak berubah tanpa sepengetahuannya.

Master spec: `docs/master_spec.md`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, RSC) |
| Language | TypeScript strict — **zero `any`** |
| Database | Supabase (Postgres) |
| Auth | Supabase Auth |
| AI | Google Gemini (`gemini-2.5-flash`, via env `GEMINI_MODEL`), multimodal |
| Storage | Supabase Storage |
| Validation | Zod |
| PDF render | `@react-pdf/renderer` |
| DOCX render | `docx` |
| Styling | Vanilla CSS |
| Hosting | Vercel |

---

## Architecture Rules

### Prinsip inti (JANGAN dilanggar)
- **AI hanya memahami & menstrukturkan konten, TIDAK mendesain.** Output AI: **Document Model** (isi, selalu ada) + **Format Profile** (visual, opsional, kosong kalau user tidak memberi instruksi/contoh).
- **Blok `quote` TIDAK PERNAH diparafrase**, apapun kondisi toggle wording. Kutipan langsung selalu verbatim.
- **Toggle `auto_clean_wording`** (dari kolom `documents.auto_clean_wording`) mengontrol prompt: kalau `true`, AI boleh membetulkan ejaan/tata bahasa ringan TANPA mengubah makna/menambah fakta; kalau `false`, AI DILARANG mengubah wording apapun selain menyusun ke blocks.
- **Gambar disisipkan lewat token eksplisit** (`[gambar-N]`) yang diketik/ditaruh user di posisi yang diinginkan dalam `source_content` — BUKAN AI menebak posisi. Saat structuring, kirim daftar `ref_token` valid milik dokumen (dari tabel `document_assets`) ke prompt; AI hanya boleh mengonversi token yang ADA di daftar itu jadi `image` block, token lain dibiarkan sebagai teks biasa.
- **Level heading (H1/H2/H3) ditentukan AI dari konteks konten**; ukuran/spacing/gaya visualnya FIXED per template family di `lib/render/template-styles`, bukan bagian dari Format Profile di MVP.
- **Prioritas format saat instruksi teks & contoh dokumen sama-sama diisi:** teks menang untuk hal eksplisit, dokumen contoh melengkapi sisanya, teks menang kalau bentrok.
- **Format Profile bukan janji pixel-perfect.** Field yang tak ter-mapping wajib masuk `extractionNotes`, jangan dipaksakan ke field lain atau di-drop diam-diam.
- **Satu Document Model + satu Format Profile → banyak output** (preview, PDF, DOCX) baca sumber yang sama.
- **Desain hidup di render layer**, bukan di AI.

### Code Standards
- TypeScript strict mode. Zero `any`. No `@ts-ignore`.
- Semua response AI (Document Model & Format Profile) **wajib** divalidasi Zod sebelum disimpan.
- Server Components by default. `'use client'` hanya bila perlu interaktivitas.
- Conventional commits.

### API Keys & Security
- `GEMINI_API_KEY` & `SUPABASE_SERVICE_ROLE_KEY` = server-side only.
- Semua akses DB via RLS.
- Gambar & file referensi via signed URL.
- Validasi tipe (`pdf`, `jpg`, `jpeg`, `png`) & ukuran file di client DAN server.

### Document Model
- `lib/document-model`: Zod schema. `meta` + `blocks[]` (discriminated union: `heading | paragraph | list | table | image | quote | divider | pageBreak`). Block `image` punya field `assetId` yang mengacu ke `document_assets.ref_token`.

### Format Profile
- `lib/format-profile`: Zod schema. `source`, `baseFamily` wajib; sisanya opsional. Renderer fallback ke token base family kalau field kosong.

### Styling Rules
- Vanilla CSS + CSS custom properties (palette di master spec §7). Light mode default. Mobile-first.

### Error Handling
- Try-catch di semua API route. Retry+backoff untuk Gemini 429. JSON invalid dari AI → error actionable, jangan crash.

### File Naming
- Components: `kebab-case.tsx`. Utilities: `kebab-case.ts`. API routes: `route.ts`.

---

## Database Schema

Tabel `profiles`, `documents` (termasuk `auto_clean_wording` boolean, `format_instruction_text`, `reference_file_path`, `document_model` jsonb, `format_profile` jsonb), dan `document_assets` (ref_token ↔ storage_path, unique per document_id). Dua storage bucket privat: `document-images`, `format-references`. Semua **wajib RLS**. Detail: master spec §5.

---

## Key Design Decisions

1. **AI = otak semantik, render = desainer** — pemisahan "memahami" dari "membuat cantik".
2. **Document Model & Format Profile dipisah** — isi dan aturan visual adalah concern berbeda.
3. **Reference document dibatasi PDF/gambar** — Gemini baca visual langsung tanpa parser tambahan.
4. **`@react-pdf/renderer` + `docx`, bukan Puppeteer** — pure-JS, serverless-friendly.
5. **Gemini Flash via env** — free tier, swappable.
6. **Toggle `auto_clean_wording` diekspos ke user** (default aktif) — bukan disembunyikan. Menjaga trust: user presisi-sensitif (kutipan, istilah teknis, dokumen akademik) bisa mematikan pembetulan ejaan, mayoritas user lain tidak perlu peduli.
7. **Quote selalu verbatim** — independen dari toggle di atas, karena kutipan langsung punya bobot semantik berbeda dari prosa biasa.
8. **Gambar disisipkan lewat token eksplisit, bukan AI menebak posisi** — menjaga prinsip "AI menstrukturkan, tidak mengarang" berlaku juga untuk elemen non-teks.
9. **Heading level dideteksi AI, tapi tipografinya fixed per template** — konsistensi visual antar dokumen lebih penting daripada override granular di MVP.

---

## Implementation Phases

1. **Foundation** — init, design system, DB schema (3 tabel + 2 bucket) + RLS, auth, layout
2. **Dokumen & Editor** — CRUD, dashboard, content editor, upload gambar + token sisip, toggle wording, format input UI
3. **AI Structuring Engine** — Document Model + Format Profile (Zod), gemini multimodal, resolusi token gambar, `POST /api/structure`
4. **Preview & Template Families** — render HTML, override Format Profile, UX chip/badge
5. **Export** — PDF + DOCX menghormati Format Profile & gambar
6. **Polish & PWA** — manifest, service worker, error/empty states, README, deploy

---

## Verification (jalankan setiap akhir phase)

```bash
npx tsc --noEmit
npx next lint
npm run build
```

---

## Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
```
