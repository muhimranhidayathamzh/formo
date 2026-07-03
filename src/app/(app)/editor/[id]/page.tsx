import { notFound } from "next/navigation";
import { getDocument, getDocumentAssets } from "@/lib/data/documents";
import { DocumentEditor } from "@/components/editor/document-editor";

export default async function EditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const doc = await getDocument(id);
  if (!doc) notFound();

  const assets = await getDocumentAssets(id);

  return (
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
  );
}
