import { imageSize } from "image-size";
import { createClient } from "@/lib/supabase/server";
import { documentModelSchema, type DocumentModel } from "@/lib/document-model";
import {
  formatProfileSchema,
  isBaseFamily,
  type FormatProfile,
} from "@/lib/format-profile";
import { computeHeadingNumbers } from "./heading-numbering";
import { resolveStyle, type ResolvedStyle } from "./template-styles";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const IMAGE_BUCKET = "document-images";

export class ExportError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ExportError";
    this.status = status;
  }
}

export type PreparedImage = {
  data: Buffer;
  format: "png" | "jpg";
  width: number;
  height: number;
};

export type ExportContext = {
  model: DocumentModel;
  style: ResolvedStyle;
  numbers: string[];
  images: Record<string, PreparedImage>;
  title: string | undefined;
  extractionNotes: string | null;
};

/**
 * Muat & siapkan semua yang dibutuhkan kedua renderer. effectiveProfile dihitung
 * dari query param (family/source) agar hasil export == tampilan preview.
 */
export async function buildExportContext(params: {
  supabase: SupabaseServerClient;
  documentId: string;
  family: string | null;
  source: string | null;
}): Promise<ExportContext> {
  const { supabase, documentId, family, source } = params;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new ExportError(401, "Tidak terautentikasi.");

  const { data: doc, error } = await supabase
    .from("documents")
    .select("document_model, format_profile, title")
    .eq("id", documentId)
    .maybeSingle();
  if (error) throw error;
  if (!doc) throw new ExportError(404, "Dokumen tidak ditemukan.");

  const modelParsed = documentModelSchema.safeParse(doc.document_model);
  const profileParsed = formatProfileSchema.safeParse(doc.format_profile);
  if (!modelParsed.success || !profileParsed.success) {
    throw new ExportError(
      400,
      'Dokumen belum dirapikan. Klik "Rapikan Dokumen" dulu.',
    );
  }
  const model = modelParsed.data;
  const dbProfile = profileParsed.data;

  const chosenFamily =
    family && isBaseFamily(family) ? family : dbProfile.baseFamily;
  const effectiveProfile: FormatProfile =
    source === "default"
      ? { source: "default", baseFamily: chosenFamily }
      : { ...dbProfile, baseFamily: chosenFamily };

  const style = resolveStyle(chosenFamily, effectiveProfile);
  const numbers = computeHeadingNumbers(
    model.blocks,
    style.headingNumberingStyle,
  );

  // Kumpulkan token gambar yang dipakai di model.
  const referenced = new Set<string>();
  for (const block of model.blocks) {
    if (block.type === "image") referenced.add(block.assetId);
  }

  const images: Record<string, PreparedImage> = {};
  if (referenced.size > 0) {
    const { data: assets } = await supabase
      .from("document_assets")
      .select("ref_token, storage_path")
      .eq("document_id", documentId);

    for (const asset of assets ?? []) {
      if (!referenced.has(asset.ref_token)) continue;
      const { data: blob } = await supabase.storage
        .from(IMAGE_BUCKET)
        .download(asset.storage_path);
      if (!blob) continue;

      const buffer = Buffer.from(await blob.arrayBuffer());
      const dim = imageSize(buffer);
      const hasDim = Boolean(dim.width && dim.height);
      const ext = asset.storage_path.split(".").pop()?.toLowerCase();
      images[asset.ref_token] = {
        data: buffer,
        format: ext === "png" ? "png" : "jpg",
        width: hasDim ? dim.width : 300,
        height: hasDim ? dim.height : 200,
      };
    }
  }

  return {
    model,
    style,
    numbers,
    images,
    title: model.meta.title,
    extractionNotes: dbProfile.extractionNotes ?? null,
  };
}
