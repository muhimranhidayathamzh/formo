"use client";

import { useState } from "react";
import { safeFilename } from "@/lib/render/units";

type Kind = "pdf" | "docx";

type Props = {
  documentId: string;
  family: string;
  source: string;
  title: string | undefined;
  showNotesReminder: boolean;
};

export function ExportButtons({
  documentId,
  family,
  source,
  title,
  showNotesReminder,
}: Props) {
  const [loading, setLoading] = useState<Kind | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function download(kind: Kind) {
    setError(null);
    setLoading(kind);
    try {
      const params = new URLSearchParams({ documentId, family, source });
      const res = await fetch(`/api/export/${kind}?${params.toString()}`);
      if (!res.ok) {
        const data: unknown = await res.json().catch(() => null);
        const message =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof (data as { error?: unknown }).error === "string"
            ? (data as { error: string }).error
            : "Gagal mengunduh file.";
        setError(message);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = safeFilename(title, kind);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Gagal terhubung ke server.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="export-bar">
      <div className="export-buttons">
        <button
          type="button"
          className="btn"
          onClick={() => download("pdf")}
          disabled={loading !== null}
        >
          {loading === "pdf" ? "Menyiapkan…" : "⬇ Download PDF"}
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => download("docx")}
          disabled={loading !== null}
        >
          {loading === "docx" ? "Menyiapkan…" : "⬇ Download Word"}
        </button>
      </div>

      {showNotesReminder ? (
        <p className="export-reminder">
          ⚠ Ekstraksi format perkiraan — periksa hasil setelah diunduh.
        </p>
      ) : null}
      {error ? <div className="banner banner-danger">{error}</div> : null}
    </div>
  );
}
