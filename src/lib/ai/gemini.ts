import { GoogleGenAI, type Part } from "@google/genai";
import { StructureError } from "./errors";

type InlineFile = { mimeType: string; data: string }; // data = base64

/** Ambil kode status dari error SDK (untuk deteksi rate-limit 429). */
function getErrorStatus(err: unknown): number | undefined {
  if (typeof err === "object" && err !== null) {
    const rec = err as { status?: unknown; code?: unknown; message?: unknown };
    if (typeof rec.status === "number") return rec.status;
    if (typeof rec.code === "number") return rec.code;
    const msg = typeof rec.message === "string" ? rec.message : "";
    if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) return 429;
  }
  return undefined;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Panggil Gemini (multimodal) dan kembalikan teks JSON mentah.
 * responseMimeType "application/json" memaksa keluaran JSON valid; validasi
 * skema dilakukan di sisi kita (structure.ts). Retry+backoff khusus 429.
 */
export async function generateStructuredJson(params: {
  systemInstruction: string;
  userText: string;
  file?: InlineFile | null;
}): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new StructureError(
      500,
      "GEMINI_API_KEY belum dikonfigurasi di server.",
    );
  }
  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  const ai = new GoogleGenAI({ apiKey });

  const parts: Part[] = [{ text: params.userText }];
  if (params.file) {
    parts.push({
      inlineData: { mimeType: params.file.mimeType, data: params.file.data },
    });
  }

  const MAX_ATTEMPTS = 4;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [{ role: "user", parts }],
        config: {
          systemInstruction: params.systemInstruction,
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      });
      const text = response.text;
      if (!text) {
        throw new StructureError(502, "AI mengembalikan respons kosong.");
      }
      return text;
    } catch (err) {
      if (err instanceof StructureError) throw err;
      const status = getErrorStatus(err);
      if (status === 429 && attempt < MAX_ATTEMPTS - 1) {
        await sleep(1000 * 2 ** attempt); // 1s, 2s, 4s
        continue;
      }
      if (status === 429) {
        throw new StructureError(
          503,
          "Layanan AI sedang sibuk (rate limit). Coba lagi sebentar.",
        );
      }
      const detail = err instanceof Error ? err.message : "kesalahan tak dikenal";
      throw new StructureError(502, `Gagal memanggil layanan AI: ${detail}`);
    }
  }
  throw new StructureError(503, "Layanan AI tidak merespons.");
}
