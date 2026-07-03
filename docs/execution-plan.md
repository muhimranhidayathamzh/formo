# 🛠 Formo — Execution Plan (Prompt per Phase)

> Copy-paste tiap blok prompt ke Claude Code **secara berurutan**.
> Satu phase selesai → verification gate → commit → baru lanjut.
> Aturan main lengkap: `WORKFLOW_SOP.md`.

---

## PRA-CODING (lakukan manual dulu)

```
□ Buat repo GitHub kosong (tanpa README)
□ Buat project Supabase baru → catat URL, anon key, service role key
□ Buat API key di Google AI Studio (aistudio.google.com) → JANGAN aktifkan billing
□ Buat folder project, taruh CLAUDE.md di root & master_spec.md di docs/
□ git init && git remote add origin <url-repo>
□ Salin .env.local.example → .env.local, isi semua key
```

Mode Claude Code:
- **Phase 1**: Edit automatically
- **Phase 2+**: Plan mode dulu

---

## PHASE 1 — Foundation

> Mode: Edit automatically

```
Kita mulai project Formo. Baca CLAUDE.md dan docs/master_spec.md dulu.

Kerjakan PHASE 1 (Foundation) saja, sesuai master spec §7 dan §8:

1. Init Next.js 15 (App Router, TypeScript strict, vanilla CSS, tanpa Tailwind).
2. globals.css: design system dari master spec §7 (CSS custom properties, light mode, mobile-first).
3. Supabase: supabase/migrations/0001_init.sql sesuai master spec §5:
   - tabel profiles
   - tabel documents (termasuk auto_clean_wording boolean default true, format_instruction_text, reference_file_path, document_model jsonb, format_profile jsonb)
   - tabel document_assets (document_id FK, user_id FK, ref_token text, storage_path text, unique(document_id, ref_token))
   - trigger updated_at di documents
   - trigger auto-insert profiles saat signup
   - DUA bucket privat: document-images, format-references
   - RLS policy penuh di semua tabel & bucket (user hanya akses milik sendiri)
4. lib/supabase: helper client & server (@supabase/ssr).
5. Auth flow: (auth)/login, (auth)/signup, middleware proteksi (app).
6. Layout shell: app/(app)/layout.tsx (header "Formo" + logout).

Jangan kerjakan editor, AI, atau render dulu. Tampilkan ringkasan file yang dibuat dan instruksi menjalankan migration.
```

**Verification + commit:**
```bash
npx tsc --noEmit && npx next lint && npm run build
git add . && git commit -m "feat: foundation — setup, design system, db schema, auth, layout" && git push origin main
```

---

## PHASE 2 — Dokumen & Editor

> Mode: Plan mode dulu

```
Lanjut PHASE 2 sesuai master spec §4 (Feature 1, 2, 6) dan §6.

1. Server actions CRUD dokumen (create, list, get, update, delete) via RLS.
2. Dashboard: daftar dokumen, tombol "Dokumen Baru", hapus, empty state.
3. Editor app/(app)/editor/[id]:
   a. Field judul + textarea konten mentah, auto-save debounced ke source_content.
   b. UPLOAD GAMBAR: tombol/drag-drop ke bucket document-images (path {user_id}/{document_id}/{ref_token}.{ext}). Setiap upload otomatis membuat row document_assets baru dengan ref_token berurutan ("gambar-1", "gambar-2", dst per dokumen). Tampilkan list thumbnail kecil, tiap thumbnail ada tombol "Sisipkan di sini" yang menaruh teks token (mis. "[gambar-1]") di POSISI KURSOR TERAKHIR pada textarea konten (pakai selectionStart/selectionEnd).
   c. TOGGLE "Rapikan ejaan & tata bahasa otomatis" — checkbox kecil dekat tombol utama, default checked, tersimpan ke documents.auto_clean_wording.
   d. SECTION COLLAPSIBLE "Aturan format? (opsional)": textarea instruksi teks → format_instruction_text; file upload contoh dokumen (accept=".pdf,.jpg,.jpeg,.png", validasi tipe & ukuran maks 10MB) ke bucket format-references → reference_file_path. Boleh isi salah satu/keduanya/kosong.
   e. Tombol "Rapikan Dokumen" (placeholder, belum fungsional — disambungkan Phase 3).

Belum ada AI atau preview di phase ini. Ikuti file structure §6 dan styling rules di CLAUDE.md.
```

**Verification + commit:**
```bash
npx tsc --noEmit && npx next lint && npm run build
git add . && git commit -m "feat: document CRUD, dashboard, editor, image assets with insert token, wording toggle, format input" && git push origin main
```

---

## PHASE 3 — AI Structuring Engine

> Mode: Plan mode dulu

```
Lanjut PHASE 3 — inti produk. Patuhi CLAUDE.md: AI hanya MEMAHAMI & MENSTRUKTURKAN, Document Model terpisah dari Format Profile, quote selalu verbatim, gambar lewat token eksplisit.

1. lib/document-model: Zod schema Document Model (meta + blocks: heading level 1-4, paragraph, list, table, image {assetId, caption?}, quote {text, attribution?}, divider, pageBreak).

2. lib/format-profile: Zod schema Format Profile (source, baseFamily wajib; fontFamily, fontSizePt, lineSpacing, margins{topCm,bottomCm,leftCm,rightCm}, headingNumberingStyle, titleAlignment, coverPage{enabled,elements[]}, extractionNotes — semua opsional).

3. lib/ai/gemini.ts: wrapper @google/genai, model dari env, dukung multimodal (file referensi format sebagai base64 file part), retry+backoff untuk 429.

4. Prompt (system + user) yang menginstruksikan:
   a. Strukturkan source_content jadi Document Model. Deteksi docType. Level heading dari konteks (JANGAN tentukan ukuran/style, itu bukan urusan AI).
   b. RESOLUSI TOKEN GAMBAR: sertakan di prompt daftar ref_token valid milik dokumen ini (query document_assets). AI mengonversi token "[gambar-N]" yang PERSIS cocok dengan daftar itu jadi image block di posisi tersebut (assetId = ref_token; caption dari teks setelah titik dua di token kalau ada). Token yang tidak ada di daftar dibiarkan sebagai teks biasa.
   c. ATURAN WORDING: kalau auto_clean_wording=true, AI boleh membetulkan ejaan/tata bahasa ringan TANPA mengubah makna/menambah fakta. Kalau false, AI DILARANG mengubah wording apapun selain menyusun ke blocks.
   d. ATURAN QUOTE: blok quote SELALU verbatim, tidak peduli status auto_clean_wording.
   e. Kalau ada format_instruction_text dan/atau reference_file: ekstrak Format Profile sesuai skema, prioritas teks > file, field tak ter-mapping → extractionNotes. Kalau tidak ada: formatProfile = {source:'default', baseFamily: docType} saja.
   f. Kembalikan HANYA JSON {documentModel, formatProfile}, tanpa markdown fence/teks lain.

5. API route POST /api/structure: ambil source_content, auto_clean_wording, format_instruction_text, reference_file_path, daftar document_assets milik dokumen → panggil Gemini → validasi Zod KEDUANYA → simpan document_model, format_profile, set status='structured'. Error JSON invalid → response actionable.

6. Sambungkan tombol "Rapikan Dokumen" dengan loading state (lebih lama kalau ada file referensi).

Zero any. Kedua output AI wajib lewat Zod.
```

**Verification + commit:**
```bash
npx tsc --noEmit && npx next lint && npm run build
git add . && git commit -m "feat: AI structuring engine — document model, format profile, image token resolution, wording rules" && git push origin main
```

---

## PHASE 4 — Preview & Template Families

> Mode: Plan mode dulu

```
Lanjut PHASE 4 sesuai master spec §4 Feature 4 dan §7.

1. lib/render/template-styles: token gaya 4 template family (report, letter, academic, article) — termasuk type scale H1/H2/H3 yang FIXED per family (ukuran, bobot, spacing). Portable, dipakai preview + PDF + DOCX.

2. components/preview/document-preview.tsx: render Document Model → HTML. Terapkan base family LALU override field Format Profile yang relevan (font body, margin, spacing, numbering, alignment) — heading typography TETAP dari template, tidak di-override. Block image resolve assetId → document_assets → signed URL → tampilkan.

3. UX:
   - formatProfile.source === 'default' → chip 4 family, switch manual re-render tanpa panggil AI ulang.
   - formatProfile.source !== 'default' → badge "Format kustom aktif" + tombol reset ke default.
   - extractionNotes terisi → banner peringatan.

4. Preview live di samping/bawah editor (side-by-side desktop, stack mobile).

Zero any.
```

**Verification + commit:**
```bash
npx tsc --noEmit && npx next lint && npm run build
git add . && git commit -m "feat: live preview + template families with format profile override" && git push origin main
```

---

## PHASE 5 — Export PDF & DOCX

> Mode: Plan mode dulu

```
Lanjut PHASE 5 sesuai master spec §4 Feature 5. Kedua renderer baca Document Model + base family + Format Profile yang SAMA dengan preview (Phase 4).

1. lib/render/pdf-renderer (@react-pdf/renderer): map tiap block ke komponen react-pdf, termasuk image (fetch signed URL → buffer, embed). Terapkan override Format Profile yang applicable (font body, margin, spacing, alignment); heading pakai type scale template.

2. lib/render/docx-renderer (docx): mapping setara, termasuk ImageRun untuk block image.

3. API routes GET /api/export/pdf?documentId=... dan /api/export/docx?documentId=... → generate & return file download, set status='exported'.

4. Tombol "Download PDF" / "Download Word" di editor + loading state. Kalau extractionNotes ada isinya, tampilkan reminder singkat sebelum/sesudah download.

Pastikan dokumen tanpa gambar dan tanpa Format Profile custom tetap render benar. Zero any.
```

**Verification + commit:**
```bash
npx tsc --noEmit && npx next lint && npm run build
git add . && git commit -m "feat: export to PDF and DOCX honoring format profile and image assets" && git push origin main
```

---

## PHASE 6 — Polish & PWA & Deploy

> Mode: Plan mode dulu

```
Lanjut PHASE 6 sesuai master spec §8.

1. PWA: manifest.json (nama Formo, ikon, theme color indigo, standalone) + service worker offline shell.
2. Robustness: error boundaries, skeleton/loading states, empty states, retry pada aksi AI/export.
3. Disclaimer privasi dekat tombol "Rapikan Dokumen" dan upload file referensi.
4. Responsive pass menyeluruh.
5. README.md: deskripsi, fitur (termasuk token gambar, toggle wording, Custom Format Input), tech stack, setup lokal, env vars, deploy.

Zero any. Jalankan verification gate terakhir.
```

**Verification + commit:**
```bash
npx tsc --noEmit && npx next lint && npm run build
git add . && git commit -m "feat: PWA, polish, error/empty states, README" && git push origin main
```

---

## DEPLOY

```
1. vercel.com → login GitHub → Import repo Formo
2. Set environment variables (sama persis dengan .env.local)
3. Deploy
4. Jalankan migration 0001_init.sql di Supabase (kalau belum)
5. Cek Supabase Auth → set Site URL & redirect URL ke domain Vercel
6. Test end-to-end: signup → buat dokumen → upload gambar → sisipkan token → (opsional) isi aturan format → rapikan → preview → export PDF & Word
```

Setelah ini, tiap `git push` → Vercel auto-deploy.

---

## KALAU CLAUDE CODE KELIRU

```
Revisi [file/komponen]:
- [perubahan spesifik 1]
- [perubahan spesifik 2]
Jangan ubah yang lain.
```

## KALAU ERROR DI LUAR CODE
- GEMINI_API_KEY salah / project keliru?
- Kena 429? Analisis file referensi makan token lebih banyak.
- Model tidak dukung multimodal? Ganti GEMINI_MODEL.
- RLS memblokir? Cek policy & auth.uid() di SEMUA tabel + bucket.
- Token gambar tidak terdeteksi? Cek daftar ref_token yang dikirim ke prompt cocok dengan yang diketik user.
- Env var belum ke-restart / belum diset di Vercel?
```
