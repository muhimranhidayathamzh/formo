import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDocument } from "@/lib/data/documents";
import { runStructuring } from "@/lib/ai/structure";
import { StructureError } from "@/lib/ai/errors";
import type { Json } from "@/types/database";

export const runtime = "nodejs";

const REFERENCE_BUCKET = "format-references";

function mimeFromPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "application/pdf";
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  return "application/octet-stream";
}

// Objek hasil Zod memang JSON-serializable; cast tunggal & bernama (zero any).
function toJson<T>(value: T): Json {
  return value as unknown as Json;
}

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Body harus JSON." }, { status: 400 });
    }

    const documentId =
      typeof body === "object" && body !== null && "documentId" in body
        ? (body as { documentId?: unknown }).documentId
        : undefined;
    if (typeof documentId !== "string" || documentId === "") {
      return NextResponse.json(
        { error: "documentId wajib diisi." },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Tidak terautentikasi." },
        { status: 401 },
      );
    }

    const doc = await getDocument(documentId);
    if (!doc) {
      return NextResponse.json(
        { error: "Dokumen tidak ditemukan." },
        { status: 404 },
      );
    }
    if (!doc.source_content || doc.source_content.trim() === "") {
      return NextResponse.json(
        { error: "Konten dokumen masih kosong. Tulis konten dulu." },
        { status: 400 },
      );
    }

    // Daftar ref_token valid milik dokumen ini.
    const { data: assets, error: assetsErr } = await supabase
      .from("document_assets")
      .select("ref_token")
      .eq("document_id", documentId);
    if (assetsErr) throw assetsErr;
    const validRefTokens = (assets ?? []).map((asset) => asset.ref_token);

    // File contoh format (opsional) → base64 inline part untuk Gemini.
    let referenceFile: { mimeType: string; data: string } | null = null;
    if (doc.reference_file_path) {
      const { data: blob, error: dlErr } = await supabase.storage
        .from(REFERENCE_BUCKET)
        .download(doc.reference_file_path);
      if (dlErr || !blob) {
        return NextResponse.json(
          { error: "Gagal membaca file contoh format." },
          { status: 502 },
        );
      }
      const buffer = Buffer.from(await blob.arrayBuffer());
      referenceFile = {
        mimeType: mimeFromPath(doc.reference_file_path),
        data: buffer.toString("base64"),
      };
    }

    const { documentModel, formatProfile } = await runStructuring({
      sourceContent: doc.source_content,
      autoCleanWording: doc.auto_clean_wording,
      validRefTokens,
      formatInstructionText: doc.format_instruction_text,
      referenceFile,
    });

    const { error: updErr } = await supabase
      .from("documents")
      .update({
        document_model: toJson(documentModel),
        format_profile: toJson(formatProfile),
        doc_type: documentModel.meta.docType,
        status: "structured",
      })
      .eq("id", documentId);
    if (updErr) throw updErr;

    return NextResponse.json({ ok: true, status: "structured" });
  } catch (err) {
    if (err instanceof StructureError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const detail = err instanceof Error ? err.message : "kesalahan tak dikenal";
    return NextResponse.json(
      { error: `Terjadi kesalahan: ${detail}` },
      { status: 500 },
    );
  }
}
