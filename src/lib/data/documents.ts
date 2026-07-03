import { createClient } from "@/lib/supabase/server";
import type { DocumentAssetRow, DocumentRow } from "@/types/database";

/**
 * Fungsi baca (read) untuk dokumen — dipakai langsung oleh Server Components.
 * Semua terikat RLS: hanya mengembalikan baris milik user yang sedang login.
 */

export type DocumentListItem = Pick<
  DocumentRow,
  "id" | "title" | "status" | "updated_at"
>;

export async function listDocuments(): Promise<DocumentListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select("id, title, status, updated_at")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getDocument(id: string): Promise<DocumentRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export type AssetWithUrl = DocumentAssetRow & { signedUrl: string | null };

export async function getDocumentAssets(
  documentId: string,
): Promise<AssetWithUrl[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_assets")
    .select("*")
    .eq("document_id", documentId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  const assets = data ?? [];

  return Promise.all(
    assets.map(async (asset) => {
      const { data: signed } = await supabase.storage
        .from("document-images")
        .createSignedUrl(asset.storage_path, 3600);
      return { ...asset, signedUrl: signed?.signedUrl ?? null };
    }),
  );
}
