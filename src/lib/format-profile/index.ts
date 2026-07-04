import { z } from "zod";
import { documentModelSchema } from "@/lib/document-model";

/**
 * Format Profile — aturan VISUAL (opsional). Master spec §5. Kosong (source:
 * "default") kalau user tidak memberi instruksi/contoh. Gaya/ukuran HEADING
 * sengaja TIDAK di sini — fixed per template family (render layer, Phase 4).
 */

export const BASE_FAMILIES = [
  "report",
  "letter",
  "academic",
  "article",
] as const;
export type BaseFamily = (typeof BASE_FAMILIES)[number];

export function isBaseFamily(value: string): value is BaseFamily {
  return (BASE_FAMILIES as readonly string[]).includes(value);
}

export const formatProfileSchema = z.object({
  source: z.enum(["default", "textInstruction", "exampleDocument", "combined"]),
  baseFamily: z.enum(BASE_FAMILIES),
  fontFamily: z.string().optional(),
  fontSizePt: z.number().optional(),
  lineSpacing: z.number().optional(),
  margins: z
    .object({
      topCm: z.number(),
      bottomCm: z.number(),
      leftCm: z.number(),
      rightCm: z.number(),
    })
    .optional(),
  headingNumberingStyle: z.string().optional(), // saran: decimal | roman-bab | none
  titleAlignment: z.enum(["left", "center"]).optional(),
  coverPage: z
    .object({
      enabled: z.boolean(),
      elements: z.array(z.string()),
    })
    .optional(),
  extractionNotes: z.string().nullable().optional(),
});

export type FormatProfile = z.infer<typeof formatProfileSchema>;

/** Payload gabungan yang dikembalikan AI, divalidasi sekaligus. */
export const structureResultSchema = z.object({
  documentModel: documentModelSchema,
  formatProfile: formatProfileSchema,
});

export type StructureResult = z.infer<typeof structureResultSchema>;
