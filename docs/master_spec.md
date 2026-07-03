# 🚀 Formo — Master Project Document

> Isi dokumen ini sebelum mulai coding apapun.
> Template ini berdasarkan workflow Feynman Challenge yang terbukti berhasil.
>
> **Ganti nama project?** Cukup ubah kata "Formo" di file ini, `CLAUDE.md`, dan `manifest.json`.

---

## 1. Product Identity

| Aspek | Detail |
|---|---|
| **Nama project** | Formo |
| **Tagline** | "Fokus ke isi, biar formatnya kami yang urus." |
| **Target user** | Siapa saja yang harus bikin dokumen rapi tapi tidak mau (atau tidak bisa) berkutat dengan formatting — mahasiswa (termasuk laporan praktikum dengan format baku kampus), pekerja kantoran, freelancer, UMKM. |
| **Tujuan utama** | Menghilangkan beban formatting TANPA mengorbankan kendali user atas isi. AI menstrukturkan konten & (opsional) mengikuti aturan format khusus; mesin render menghasilkan dokumen profesional siap pakai (PDF & Word). |
| **Konteks project** | Portfolio (showcase kemampuan full-stack + integrasi AI). |

---

## 2. Platform

- [x] Web App biasa
- [x] PWA (Progressive Web App) — installable, offline shell
- [ ] Mobile (React Native)
- [ ] Desktop

**Alasan pilihan platform:**
Web-first karena pekerjaan dokumen paling nyaman di layar lebar, tapi ditambah lapisan PWA supaya bisa di-install dan punya splash/offline shell. Tidak perlu native.

---

## 3. Tech Stack

| Layer | Technology | Alasan |
|---|---|---|
| **Framework** | Next.js 15 (App Router, RSC) | Standar SOP |
| **Language** | TypeScript strict | Type safety, zero `any` |
| **Database** | Supabase (Postgres) | DB + Auth + Storage dalam satu |
| **Auth** | Supabase Auth (email/password) | Terintegrasi, RLS native |
| **AI** | Google Gemini `gemini-2.5-flash` (Google AI Studio free tier) | Gratis, context 1M token, multimodal (baca PDF/gambar referensi format) |
| **Storage** | Supabase Storage | Gambar konten, file referensi format |
| **Styling** | Vanilla CSS (CSS custom properties) | Kontrol penuh, ringan |
| **PDF render** | `@react-pdf/renderer` | Pure-JS, jalan di Vercel serverless |
| **DOCX render** | `docx` | Native JS |
| **Validation** | Zod | Validasi Document Model & Format Profile |
| **Hosting** | Vercel | Auto-deploy dari GitHub |

> ⚠️ **Model AI:** free tier Gemini 2026 hanya Flash/Flash-Lite. `gemini-2.5-flash` default, di-set via env `GEMINI_MODEL`.
> ⚠️ **Privasi:** prompt & file yang diupload bisa dipakai Google untuk training di free tier — disclaimer kecil di UI.
> ⚠️ **Format referensi dokumen:** MVP hanya PDF/gambar (JPG/PNG), bukan `.docx` mentah.

---

## 4. Core Features

### Feature 1: Content Editor (input bebas format)
Textarea/rich editor sederhana menerima teks bebas + upload gambar. **Tidak ada** kontrol font/margin/heading style di sini.

**Menyisipkan gambar (mekanisme token):**
1. User upload gambar (tombol/drag-drop) → sistem membuat entri `document_assets` dengan token referensi otomatis berurutan, mis. `gambar-1`, `gambar-2`.
2. Thumbnail gambar tampil di list kecil dekat editor dengan tombol **"Sisipkan di sini"** — klik akan menaruh token (mis. `[gambar-1]`) di posisi kursor terakhir pada textarea konten.
3. User bebas ketik/pindah token itu ke posisi manapun dalam teks, termasuk menambah keterangan opsional: `[gambar-1: Grafik hasil pengukuran]`.
4. Saat structuring, AI mengonversi token yang valid jadi `image` block **tepat di posisi tersebut** — bukan AI menebak, posisinya eksplisit dari user. Token yang tidak dikenal (bukan aset yang benar-benar diupload) diperlakukan sebagai teks biasa, bukan gambar.

**Toggle "Rapikan ejaan & tata bahasa otomatis"** (checkbox kecil dekat tombol "Rapikan Dokumen", default **aktif**):
- Aktif → AI boleh membetulkan ejaan/tata bahasa ringan, TAPI dilarang mengubah makna atau menambah fakta.
- Nonaktif → AI hanya menyusun ulang konten jadi blocks, tidak mengubah satu kata pun (structuring murni).
- **Terlepas dari status toggle ini, blok `quote` TIDAK PERNAH diparafrase** — selalu verbatim, karena kutipan langsung punya bobot semantik khusus.

```
UI sketch:
┌──────────────────────────────────────────┐
│  Judul dokumen (opsional)                 │
├──────────────────────────────────────────┤
│  Tulis atau paste kontenmu di sini...      │
│  Bisa panjang. Bisa berantakan.            │
│                                            │
│  🖼 gambar-1 [Sisipkan di sini]  [+Upload] │
├──────────────────────────────────────────┤
│  ▸ Aturan format? (opsional)               │
├──────────────────────────────────────────┤
│  ☑ Rapikan ejaan & tata bahasa otomatis    │
│              [ ✨ Rapikan Dokumen ]         │
└──────────────────────────────────────────┘
```

### Feature 2: Custom Format Input (opsional)
Section collapsible di editor. Dua jalur, boleh salah satu atau keduanya:
- **(a) Instruksi teks bebas** — user tempel aturan mentah apa adanya.
- **(b) Upload contoh dokumen** — PDF/gambar dari dokumen yang formatnya sudah "benar".

**Prioritas saat keduanya diisi:** instruksi teks menang untuk hal eksplisit; contoh dokumen melengkapi sisanya; kalau bentrok, teks menang.

> Ekstraksi dari contoh dokumen adalah **estimasi AI berbasis visual**, bukan pixel-perfect. Field yang tak ter-mapping masuk `extractionNotes`, ditampilkan sebagai peringatan, bukan disembunyikan.

### Feature 3: AI Structuring Engine
Satu pemanggilan Gemini menghasilkan **dua objek terpisah**, masing-masing divalidasi Zod:

1. **Document Model** — `meta` + `blocks[]` (heading, paragraph, list, table, image, quote, divider). AI mendeteksi jenis dokumen otomatis.
2. **Format Profile** — aturan visual (kosong kalau user tidak memberi instruksi/contoh).

**Aturan penting yang dipegang AI:**
- Level heading (H1/H2/H3) disimpulkan dari konteks konten — AI **hanya menentukan level**, bukan ukuran/spacing-nya (itu tanggung jawab render layer, lihat §7).
- Token gambar `[gambar-N]` dikonversi jadi image block di posisi persis, HANYA untuk token yang terdaftar sebagai aset dokumen tersebut.
- Blok `quote` selalu verbatim.
- Kalau toggle "rapikan ejaan" nonaktif: AI dilarang mengubah wording apapun di luar penyusunan ke blocks.

### Feature 4: Template Families + Preview
Empat "baju" bawaan (report, letter, academic, article) di-render deterministik. Format Profile (kalau ada) di-*layer* di atas sebagai override per-field.

**UX preview:**
- Tidak ada Format Profile custom → chip 4 template family, bebas switch.
- Ada Format Profile custom → badge "Format kustom aktif" + tombol "Gunakan template standar".
- `extractionNotes` terisi → banner peringatan kecil.

### Feature 5: Export PDF & Word
Dari Document Model + Format Profile yang sama → PDF (`@react-pdf/renderer`) & DOCX (`docx`). Gambar di-resolve dari `document_assets` via signed URL lalu di-embed ke kedua output.

### Feature 6: Dashboard Dokumen
Daftar dokumen user, buka/edit/re-generate/hapus.

---

## 5. Database Schema

### Table: `profiles`
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | = `auth.users.id` |
| `full_name` | `text` | nullable |
| `created_at` | `timestamptz` | default now() |

### Table: `documents`
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | default gen_random_uuid() |
| `user_id` | `uuid` FK → auth.users | |
| `title` | `text` | |
| `doc_type` | `text` | hasil deteksi AI |
| `source_content` | `text` | konten mentah (termasuk token gambar) |
| `auto_clean_wording` | `boolean` | default `true` — status toggle rapikan ejaan |
| `format_instruction_text` | `text` | nullable |
| `reference_file_path` | `text` | nullable |
| `document_model` | `jsonb` | |
| `format_profile` | `jsonb` | nullable |
| `status` | `text` | 'draft' \| 'structured' \| 'exported', default 'draft' |
| `created_at` | `timestamptz` | default now() |
| `updated_at` | `timestamptz` | trigger auto-update |

### Table: `document_assets`
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | default gen_random_uuid() |
| `document_id` | `uuid` FK → documents | |
| `user_id` | `uuid` FK → auth.users | denormalized untuk RLS simpel |
| `ref_token` | `text` | mis. "gambar-1", unik per document_id |
| `storage_path` | `text` | path di bucket document-images |
| `created_at` | `timestamptz` | default now() |

> Unique constraint: (`document_id`, `ref_token`).

### Skema `format_profile` (jsonb, konseptual)
```
FormatProfile {
  source: 'default' | 'textInstruction' | 'exampleDocument' | 'combined'
  baseFamily: 'report' | 'letter' | 'academic' | 'article'
  fontFamily?: string
  fontSizePt?: number
  lineSpacing?: number
  margins?: { topCm: number, bottomCm: number, leftCm: number, rightCm: number }
  headingNumberingStyle?: 'decimal' | 'roman-bab' | 'none' | string
  titleAlignment?: 'left' | 'center'
  coverPage?: { enabled: boolean, elements: string[] }
  extractionNotes?: string | null
}
```
> Catatan scope: field di atas mengontrol body text & layout halaman. Ukuran/gaya HEADING (H1/H2/H3) sengaja TIDAK termasuk field yang bisa di-override — tetap fixed per template family (§7) untuk MVP, supaya hierarki visual konsisten. Bisa di-extend di Enhancement kalau kebutuhan nyata muncul.

### Storage buckets (privat)
- `document-images` — path: `{user_id}/{document_id}/{ref_token}.{ext}`
- `format-references` — path: `{user_id}/{document_id}/reference.{ext}`

> Semua tabel **wajib RLS** (`user_id = auth.uid()`). Storage policy setara.

---

## 6. File Structure

```
formo/
│
├── public/
│   ├── manifest.json
│   └── icons/
├── src/
│   ├── app/
│   │   ├── (auth)/{login,signup}/page.tsx
│   │   ├── (app)/
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── editor/[id]/page.tsx
│   │   │   └── layout.tsx
│   │   ├── api/
│   │   │   ├── structure/route.ts
│   │   │   ├── export/pdf/route.ts
│   │   │   └── export/docx/route.ts
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── editor/          # content-editor, image-asset-list, format-input, wording-toggle
│   │   ├── preview/         # document-preview, format-badge, notes-banner
│   │   └── ui/
│   ├── lib/
│   │   ├── supabase/
│   │   ├── ai/gemini.ts
│   │   ├── document-model/  # Zod schema
│   │   ├── format-profile/  # Zod schema
│   │   └── render/          # pdf-renderer, docx-renderer, template-styles
│   ├── hooks/
│   └── types/
├── supabase/migrations/0001_init.sql
├── CLAUDE.md
├── docs/master_spec.md
└── .env.local.example
```

---

## 7. Design System

### Konsep visual
"Kertas modern" — tenang, editorial, content-first.

### Color Palette
```css
--bg-primary:     #FAF9F6;
--bg-secondary:   #FFFFFF;
--surface:        #F2F0EA;
--border:         #E5E1D8;
--accent-primary: #3B3A6B;
--accent-hover:   #2C2B54;
--text-primary:   #1A1A18;
--text-secondary: #6B6862;
--danger:         #B4432E;
--success:        #3E7C55;
--caution:        #8A6A1F;  /* untuk banner extractionNotes */
```

### Hierarki Heading (fixed, tidak user-configurable)
Tiap template family punya type scale sendiri untuk H1/H2/H3 (ukuran, bobot, jarak atas-bawah) — didefinisikan sekali di `lib/render/template-styles`, dipakai konsisten di semua dokumen family tersebut. AI hanya menentukan LEVEL heading dari konten; besaran visualnya murni tanggung jawab render layer.

### Design Principles
- Light mode default. Mobile-first responsive.
- Minim kontrol formatting yang dihadapkan ke user.
- Loading state jelas saat AI bekerja (bisa 5–15 detik kalau ada file referensi).

---

## 8. Implementation Phases

### Phase 1: Foundation
- Project init, design system, migration `0001_init.sql` (tabel `profiles`, `documents`, `document_assets`, RLS, 2 bucket), Supabase helpers, auth, layout shell.

### Phase 2: Dokumen & Editor
- CRUD dokumen, dashboard, content editor (judul + konten + toggle wording).
- Upload gambar → buat `document_assets` (ref_token auto-increment per dokumen) → list thumbnail dengan tombol "Sisipkan di sini" (menaruh token di posisi kursor textarea).
- Format Input UI (instruksi teks + upload contoh dokumen).

### Phase 3: AI Structuring Engine
- Zod schema Document Model & Format Profile.
- `lib/ai/gemini.ts` multimodal wrapper.
- Prompt: structuring + ekstraksi format + resolusi token gambar (pakai daftar ref_token valid dari `document_assets`) + aturan quote verbatim + aturan kondisional wording sesuai `auto_clean_wording`.
- `POST /api/structure`: validasi Zod dua objek, simpan.

### Phase 4: Preview & Template Families
- Render HTML dari Document Model, base family + override Format Profile.
- Image block resolve ke signed URL dari `document_assets`.
- UX chip vs badge kustom, banner extractionNotes.

### Phase 5: Export PDF & DOCX
- Kedua renderer baca Document Model + Format Profile yang sama, embed gambar dari `document_assets`.

### Phase 6: Polish & PWA & Deploy
- manifest + service worker, error/empty states, disclaimer privasi, responsive, README, deploy.

---

## 9. Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # server-side only

GEMINI_API_KEY=                 # server-side only
GEMINI_MODEL=gemini-2.5-flash   # swappable, harus dukung multimodal
```

---

## 10. Cost Analysis

| Service | Free Tier | Status |
|---|---|---|
| Vercel | 100GB bandwidth | ✅ Gratis |
| Supabase | 500MB DB, 1GB Storage | ✅ Gratis |
| Gemini (AI Studio) | ~1.500 req/hari, Flash | ✅ Gratis |
| **TOTAL** | | **$0/bulan** |

---

## 11. MVP vs Future

### MVP (Portfolio-ready)
- [ ] Auth
- [ ] Content editor + upload gambar dengan token penyisipan
- [ ] Toggle "rapikan ejaan otomatis" (default aktif) + aturan quote verbatim
- [ ] Custom Format Input (instruksi teks & upload contoh dokumen)
- [ ] AI structuring → Document Model + Format Profile
- [ ] Preview live + 4 template family + override
- [ ] Export PDF & Word
- [ ] Dashboard dokumen
- [ ] PWA + deploy

### Enhancement (Phase 2)
- [ ] Override gaya HEADING lewat Format Profile (font/ukuran/bobot per level)
- [ ] Template tersimpan & reusable ("Level 2")
- [ ] Dukungan upload `.docx` sebagai contoh format
- [ ] Riwayat versi dokumen

### Future
- [ ] Template gallery antar mahasiswa/kampus
- [ ] Kolaborasi multi-user
- [ ] Custom branding untuk UMKM
- [ ] Ekspor ke Google Docs / Slides
- [ ] Mode "chat untuk revisi"
