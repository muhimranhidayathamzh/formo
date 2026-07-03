"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { DocumentRow, Json } from "@/types/database";
import {
  BASE_FAMILIES,
  formatProfileSchema,
  type BaseFamily,
} from "@/lib/format-profile";

const IMAGE_BUCKET = "document-images";
const REFERENCE_BUCKET = "format-references";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// Objek hasil Zod memang JSON-serializable; cast tunggal & bernama (zero any).
function toJson<T>(value: T): Json {
  return value as unknown as Json;
}

/** Field yang boleh di-update dari editor (auto-save). */
export type DocumentPatch = Partial<
  Pick<
    DocumentRow,
    "title" | "source_content" | "auto_clean_wording" | "format_instruction_text"
  >
>;

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

/** Pastikan dokumen milik user (RLS mengembalikan baris hanya kalau owner). */
async function assertOwnsDocument(
  supabase: SupabaseServerClient,
  documentId: string,
) {
  const { data, error } = await supabase
    .from("documents")
    .select("id")
    .eq("id", documentId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Dokumen tidak ditemukan.");
}

async function removeFolder(
  supabase: SupabaseServerClient,
  bucket: string,
  prefix: string,
) {
  const { data: entries } = await supabase.storage.from(bucket).list(prefix);
  if (entries && entries.length > 0) {
    await supabase.storage
      .from(bucket)
      .remove(entries.map((entry) => `${prefix}/${entry.name}`));
  }
}

// ------------------------------------------------------------------ documents

export async function createDocument() {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("documents")
    .insert({ user_id: user.id, status: "draft" })
    .select("id")
    .single();
  if (error) throw error;

  revalidatePath("/dashboard");
  redirect(`/editor/${data.id}`);
}

export async function updateDocument(id: string, patch: DocumentPatch) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("documents").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteDocument(id: string) {
  const { supabase, user } = await requireUser();
  // Objek storage tidak ikut cascade — hapus manual di kedua bucket.
  await removeFolder(supabase, IMAGE_BUCKET, `${user.id}/${id}`);
  await removeFolder(supabase, REFERENCE_BUCKET, `${user.id}/${id}`);

  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) throw error;

  revalidatePath("/dashboard");
}

// -------------------------------------------------------------- image assets

function nextTokenNumber(rows: { ref_token: string }[]): number {
  let max = 0;
  for (const row of rows) {
    const match = /^gambar-(\d+)$/.exec(row.ref_token);
    if (match) {
      const n = Number(match[1]);
      if (n > max) max = n;
    }
  }
  return max + 1;
}

/**
 * Reserve satu slot aset gambar: alokasikan ref_token berurutan & insert row
 * SEBELUM file diunggah (upload dilakukan client-direct ke storage). Kalau upload
 * gagal, client memanggil `deleteImageAsset` untuk rollback.
 */
export async function reserveImageAsset(
  documentId: string,
  ext: string,
): Promise<{ id: string; refToken: string; storagePath: string }> {
  const { supabase, user } = await requireUser();
  await assertOwnsDocument(supabase, documentId);

  const { data: existing, error: listErr } = await supabase
    .from("document_assets")
    .select("ref_token")
    .eq("document_id", documentId);
  if (listErr) throw listErr;

  let next = nextTokenNumber(existing ?? []);

  // Retry kalau ref_token bentrok (race pada unique(document_id, ref_token)).
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const refToken = `gambar-${next}`;
    const storagePath = `${user.id}/${documentId}/${refToken}.${ext}`;
    const { data, error } = await supabase
      .from("document_assets")
      .insert({
        document_id: documentId,
        user_id: user.id,
        ref_token: refToken,
        storage_path: storagePath,
      })
      .select("id")
      .single();

    if (!error && data) {
      return { id: data.id, refToken, storagePath };
    }
    if (error?.code === "23505") {
      next += 1;
      continue;
    }
    if (error) throw error;
  }
  throw new Error("Gagal mengalokasikan token gambar, coba lagi.");
}

export async function deleteImageAsset(assetId: string) {
  const { supabase } = await requireUser();
  const { data: asset } = await supabase
    .from("document_assets")
    .select("storage_path")
    .eq("id", assetId)
    .maybeSingle();
  if (asset) {
    await supabase.storage.from(IMAGE_BUCKET).remove([asset.storage_path]);
  }
  const { error } = await supabase
    .from("document_assets")
    .delete()
    .eq("id", assetId);
  if (error) throw error;
}

// ---------------------------------------------------------- reference file

export async function setReferenceFile(documentId: string, storagePath: string) {
  const { supabase } = await requireUser();
  const { data: doc, error } = await supabase
    .from("documents")
    .select("reference_file_path")
    .eq("id", documentId)
    .maybeSingle();
  if (error) throw error;
  if (!doc) throw new Error("Dokumen tidak ditemukan.");

  const oldPath = doc.reference_file_path;
  const { error: updErr } = await supabase
    .from("documents")
    .update({ reference_file_path: storagePath })
    .eq("id", documentId);
  if (updErr) throw updErr;

  if (oldPath && oldPath !== storagePath) {
    await supabase.storage.from(REFERENCE_BUCKET).remove([oldPath]);
  }
}

export async function clearReferenceFile(documentId: string) {
  const { supabase } = await requireUser();
  const { data: doc, error } = await supabase
    .from("documents")
    .select("reference_file_path")
    .eq("id", documentId)
    .maybeSingle();
  if (error) throw error;
  if (!doc) throw new Error("Dokumen tidak ditemukan.");

  if (doc.reference_file_path) {
    await supabase.storage
      .from(REFERENCE_BUCKET)
      .remove([doc.reference_file_path]);
  }
  const { error: updErr } = await supabase
    .from("documents")
    .update({ reference_file_path: null })
    .eq("id", documentId);
  if (updErr) throw updErr;
}

// ---------------------------------------------------------- format profile

function isBaseFamily(value: string): value is BaseFamily {
  return (BASE_FAMILIES as readonly string[]).includes(value);
}

/** Ganti template family (chip preview) — persist tanpa panggil AI ulang. */
export async function setBaseFamily(documentId: string, family: string) {
  if (!isBaseFamily(family)) throw new Error("Template family tidak valid.");
  const { supabase } = await requireUser();

  const { data: doc, error } = await supabase
    .from("documents")
    .select("format_profile")
    .eq("id", documentId)
    .maybeSingle();
  if (error) throw error;
  if (!doc) throw new Error("Dokumen tidak ditemukan.");

  const parsed = formatProfileSchema.safeParse(doc.format_profile);
  const profile = parsed.success
    ? parsed.data
    : { source: "default" as const, baseFamily: family };
  const next = { ...profile, baseFamily: family };

  const { error: updErr } = await supabase
    .from("documents")
    .update({ format_profile: toJson(next) })
    .eq("id", documentId);
  if (updErr) throw updErr;
}

/** Reset Format Profile kustom → default (baseFamily dipertahankan). */
export async function resetFormatToDefault(documentId: string) {
  const { supabase } = await requireUser();

  const { data: doc, error } = await supabase
    .from("documents")
    .select("format_profile")
    .eq("id", documentId)
    .maybeSingle();
  if (error) throw error;
  if (!doc) throw new Error("Dokumen tidak ditemukan.");

  const parsed = formatProfileSchema.safeParse(doc.format_profile);
  const baseFamily: BaseFamily = parsed.success
    ? parsed.data.baseFamily
    : "report";

  const { error: updErr } = await supabase
    .from("documents")
    .update({ format_profile: toJson({ source: "default", baseFamily }) })
    .eq("id", documentId);
  if (updErr) throw updErr;
}
