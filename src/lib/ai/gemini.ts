import { GoogleGenAI, type Part } from "@google/genai";
import { StructureError } from "./errors";

type InlineFile = { mimeType: string; data: string }; // data = base64

/** Status transient dari Gemini yang layak di-retry (rate limit / overload / internal). */
const RETRYABLE_STATUS = new Set([429, 500, 503]);

/**
 * Ambil kode status HTTP dari error SDK Gemini. Menangani beberapa bentuk:
 * `status`/`code` numerik, atau JSON di `message`
 * (mis. {"error":{"code":503,"status":"UNAVAILABLE"}}).
 */
export function geminiErrorStatus(err: unknown): number | undefined {
  if (typeof err !== "object" || err === null) return undefined;
  const rec = err as { status?: unknown; code?: unknown; message?: unknown };
  if (typeof rec.status === "number") return rec.status;
  if (typeof rec.code === "number") return rec.code;
  const msg = typeof rec.message === "string" ? rec.message : "";
  const codeMatch = msg.match(/"code"\s*:\s*(\d{3})/);
  if (codeMatch) return Number(codeMatch[1]);
  if (/RESOURCE_EXHAUSTED|rate limit|\bquota\b/i.test(msg)) return 429;
  if (/UNAVAILABLE|overloaded|high demand/i.test(msg)) return 503;
  if (/\bINTERNAL\b/i.test(msg)) return 500;
  return undefined;
}

/** Pesan actionable untuk error transient yang gagal setelah retry. */
function transientMessage(status: number | undefined): string {
  if (status === 429) {
    return "Layanan AI sedang sibuk (rate limit). Coba lagi sebentar.";
  }
  if (status === 503) {
    return "Model AI sedang overload / permintaan tinggi. Coba lagi beberapa saat.";
  }
  if (status === 500) {
    return "Layanan AI mengalami gangguan sementara. Coba lagi.";
  }
  return "Layanan AI tidak merespons. Coba lagi.";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Panggil Gemini (multimodal) dan kembalikan teks JSON mentah.
 * responseMimeType "application/json" memaksa keluaran JSON valid; validasi
 * skema dilakukan di sisi kita (structure.ts). Retry+backoff untuk error
 * transient Gemini (429 rate limit, 503 overload/UNAVAILABLE, 500 internal).
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

  const MAX_ATTEMPTS = 5;
  let lastStatus: number | undefined;
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
      const status = geminiErrorStatus(err);
      lastStatus = status;
      const retryable = status !== undefined && RETRYABLE_STATUS.has(status);

      if (retryable && attempt < MAX_ATTEMPTS - 1) {
        // Backoff eksponensial dengan cap + jitter: ~1s, 2s, 4s, 4s.
        const delay = Math.min(1000 * 2 ** attempt, 4000) + Math.random() * 250;
        await sleep(delay);
        continue;
      }
      if (retryable) {
        throw new StructureError(503, transientMessage(status));
      }
      const detail = err instanceof Error ? err.message : "kesalahan tak dikenal";
      throw new StructureError(502, `Gagal memanggil layanan AI: ${detail}`);
    }
  }
  throw new StructureError(503, transientMessage(lastStatus));
}
