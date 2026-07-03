import { notFound } from "next/navigation";
import { getDocument, getDocumentAssets } from "@/lib/data/documents";
import { documentModelSchema } from "@/lib/document-model";
import { formatProfileSchema } from "@/lib/format-profile";
import { DocumentEditor } from "@/components/editor/document-editor";
import { DocumentPreview } from "@/components/preview/document-preview";

export default async function EditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const doc = await getDocument(id);
  if (!doc) notFound();

  const assets = await getDocumentAssets(id);

  // Hasil AI (kalau sudah di-Rapikan) — validasi ulang sebelum dipreview.
  const model = documentModelSchema.safeParse(doc.document_model);
  const profile = formatProfileSchema.safeParse(doc.format_profile);
  const structured = model.success && profile.success;

  const assetUrlMap: Record<string, string | null> = Object.fromEntries(
    assets.map((asset) => [asset.ref_token, asset.signedUrl]),
  );

  return (
    <div className={`editor-layout${structured ? " editor-layout--split" : ""}`}>
      <DocumentEditor
        docId={doc.id}
        initialTitle={doc.title ?? ""}
        initialContent={doc.source_content ?? ""}
        initialAutoClean={doc.auto_clean_wording}
        initialFormatText={doc.format_instruction_text ?? ""}
        initialReferencePath={doc.reference_file_path}
        initialAssets={assets.map((asset) => ({
          id: asset.id,
          refToken: asset.ref_token,
          signedUrl: asset.signedUrl,
        }))}
      />

      {model.success && profile.success ? (
        <DocumentPreview
          key={doc.updated_at}
          documentId={doc.id}
          documentModel={model.data}
          formatProfile={profile.data}
          assetUrlMap={assetUrlMap}
        />
      ) : null}
    </div>
  );
}
