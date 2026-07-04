import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildExportContext, ExportError } from "@/lib/render/export-context";
import { renderDocx } from "@/lib/render/docx-renderer";
import { safeFilename } from "@/lib/render/units";

export const runtime = "nodejs";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const documentId = searchParams.get("documentId");
  if (!documentId) {
    return NextResponse.json(
      { error: "documentId wajib diisi." },
      { status: 400 },
    );
  }

  try {
    const supabase = await createClient();
    const ctx = await buildExportContext({
      supabase,
      documentId,
      family: searchParams.get("family"),
      source: searchParams.get("source"),
    });

    const buffer = await renderDocx(ctx);
    await supabase
      .from("documents")
      .update({ status: "exported" })
      .eq("id", documentId);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": DOCX_MIME,
        "Content-Disposition": `attachment; filename="${safeFilename(ctx.title, "docx")}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    if (err instanceof ExportError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const detail = err instanceof Error ? err.message : "kesalahan tak dikenal";
    return NextResponse.json(
      { error: `Gagal membuat DOCX: ${detail}` },
      { status: 500 },
    );
  }
}
