import Link from "next/link";
import { createDocument, deleteDocument } from "@/lib/actions/documents";
import { listDocuments } from "@/lib/data/documents";
import { PendingButton } from "@/components/ui/pending-button";
import type { DocumentStatus } from "@/types/database";

const STATUS_LABEL: Record<DocumentStatus, string> = {
  draft: "Draft",
  structured: "Terstruktur",
  exported: "Diekspor",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function DashboardPage() {
  const documents = await listDocuments();

  return (
    <section className="stack">
      <div className="dashboard-head">
        <div>
          <h1>Dokumen</h1>
          <p className="muted">Semua dokumen kamu.</p>
        </div>
        <form action={createDocument}>
          <PendingButton pendingLabel="Membuat…">+ Dokumen Baru</PendingButton>
        </form>
      </div>

      {documents.length === 0 ? (
        <div className="empty-state card">
          <p>Belum ada dokumen.</p>
          <p className="muted">Mulai dengan menekan tombol Dokumen Baru.</p>
        </div>
      ) : (
        <ul className="doc-list">
          {documents.map((doc) => (
            <li key={doc.id} className="doc-card card">
              <Link href={`/editor/${doc.id}`} className="doc-card__main">
                <span className="doc-card__title">
                  {doc.title && doc.title.trim() !== "" ? doc.title : "Tanpa judul"}
                </span>
                <span className="doc-card__meta">
                  <span className={`status-badge status-badge--${doc.status}`}>
                    {STATUS_LABEL[doc.status]}
                  </span>
                  <span className="muted">
                    Diperbarui {formatDate(doc.updated_at)}
                  </span>
                </span>
              </Link>
              <form action={deleteDocument.bind(null, doc.id)}>
                <PendingButton className="btn-ghost btn-xs" pendingLabel="Menghapus…">
                  Hapus
                </PendingButton>
              </form>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
