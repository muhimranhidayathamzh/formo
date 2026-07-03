import { sanitizeImageBlocks, type DocumentModel } from "@/lib/document-model";
import { structureResultSchema, type FormatProfile } from "@/lib/format-profile";
import { StructureError } from "./errors";
import { generateStructuredJson } from "./gemini";
import { buildSystemInstruction, buildUserPrompt } from "./prompt";

export type StructuringInput = {
  sourceContent: string;
  autoCleanWording: boolean;
  validRefTokens: string[];
  formatInstructionText: string | null;
  referenceFile?: { mimeType: string; data: string } | null;
};

/**
 * Orkestrasi structuring: build prompt → Gemini → parse JSON → validasi Zod →
 * sanitasi token gambar. Tetap murni (tanpa DB) agar route tipis & testable.
 */
export async function runStructuring(
  input: StructuringInput,
): Promise<{ documentModel: DocumentModel; formatProfile: FormatProfile }> {
  const raw = await generateStructuredJson({
    systemInstruction: buildSystemInstruction(),
    userText: buildUserPrompt({
      sourceContent: input.sourceContent,
      autoCleanWording: input.autoCleanWording,
      validRefTokens: input.validRefTokens,
      formatInstructionText: input.formatInstructionText,
      hasReferenceFile: Boolean(input.referenceFile),
    }),
    file: input.referenceFile ?? null,
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new StructureError(
      502,
      "AI mengembalikan format yang tidak bisa dibaca. Coba lagi.",
    );
  }

  const result = structureResultSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .slice(0, 3)
      .map((issue) => `${issue.path.map(String).join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new StructureError(
      502,
      `Struktur dari AI tidak sesuai skema (${issues}). Coba lagi.`,
    );
  }

  const validTokens = new Set(input.validRefTokens);
  return {
    documentModel: sanitizeImageBlocks(result.data.documentModel, validTokens),
    formatProfile: result.data.formatProfile,
  };
}
