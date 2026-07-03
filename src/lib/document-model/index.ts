import { z } from "zod";

/**
 * Document Model — ISI dokumen (bukan visual). Master spec §4 Feature 3.
 * Divalidasi Zod sebelum disimpan. AI hanya menyusun, tidak mendesain.
 */

const headingBlock = z.object({
  type: z.literal("heading"),
  level: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  text: z.string(),
});

const paragraphBlock = z.object({
  type: z.literal("paragraph"),
  text: z.string(),
});

const listBlock = z.object({
  type: z.literal("list"),
  ordered: z.boolean(),
  items: z.array(z.string()),
});

const tableBlock = z.object({
  type: z.literal("table"),
  headers: z.array(z.string()).optional(),
  rows: z.array(z.array(z.string())),
});

const imageBlock = z.object({
  type: z.literal("image"),
  assetId: z.string(), // = document_assets.ref_token
  caption: z.string().optional(),
});

const quoteBlock = z.object({
  type: z.literal("quote"),
  text: z.string(),
  attribution: z.string().optional(),
});

const dividerBlock = z.object({ type: z.literal("divider") });
const pageBreakBlock = z.object({ type: z.literal("pageBreak") });

export const blockSchema = z.discriminatedUnion("type", [
  headingBlock,
  paragraphBlock,
  listBlock,
  tableBlock,
  imageBlock,
  quoteBlock,
  dividerBlock,
  pageBreakBlock,
]);

export const documentModelSchema = z.object({
  meta: z.object({
    docType: z.string(),
    title: z.string().optional(),
  }),
  blocks: z.array(blockSchema),
});

export type Block = z.infer<typeof blockSchema>;
export type DocumentModel = z.infer<typeof documentModelSchema>;
export type HeadingLevel = 1 | 2 | 3 | 4;

/**
 * Defense-in-depth token gambar: blok `image` yang assetId-nya TIDAK ada di
 * daftar ref_token valid dokumen dikembalikan menjadi paragraf teks biasa
 * ("[token]" / "[token: caption]"). Menegakkan prinsip "AI tidak mengarang".
 */
export function sanitizeImageBlocks(
  model: DocumentModel,
  validTokens: Set<string>,
): DocumentModel {
  const blocks = model.blocks.map((block): Block => {
    if (block.type === "image" && !validTokens.has(block.assetId)) {
      const text = block.caption
        ? `[${block.assetId}: ${block.caption}]`
        : `[${block.assetId}]`;
      return { type: "paragraph", text };
    }
    return block;
  });
  return { ...model, blocks };
}
