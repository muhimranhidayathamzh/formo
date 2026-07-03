"use client";

import { useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { clearReferenceFile, setReferenceFile } from "@/lib/actions/documents";
import { extFromMime, validateReferenceFile } from "@/lib/validation/files";

const BUCKET = "format-references";

type Props = {
  documentId: string;
  formatText: string;
  onFormatTextChange: (value: string) => void;
  initialReferencePath: string | null;
};

/** Section collapsible "Aturan format? (opsional)": instruksi teks + contoh dokumen.
 *  File diunggah client-direct ke bucket format-references. */
export function FormatInput({
  documentId,
  formatText,
  onFormatTextChange,
  initialReferencePath,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(
    Boolean(formatText) || Boolean(initialReferencePath),
  );
  const [referencePath, setReferencePath] = useState<string | null>(
    initialReferencePath,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    const validationError = validateReferenceFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    const ext = extFromMime(file.type);
    if (!ext) {
      setError("Tipe file tidak didukung.");
      return;
    }

    setError(null);
    setBusy(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesi tidak valid.");

      const path = `${user.id}/${documentId}/reference.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type, upsert: true });
      if (uploadError) throw uploadError;

      await setReferenceFile(documentId, path);
      setReferencePath(path);
    } catch {
      setError("Gagal mengupload contoh dokumen.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleClear() {
    setBusy(true);
    try {
      await clearReferenceFile(documentId);
      setReferencePath(null);
    } catch {
      setError("Gagal menghapus contoh dokumen.");
    } finally {
      setBusy(false);
    }
  }

  const referenceName = referencePath ? referencePath.split("/").pop() : null;

  return (
    <section className="collapsible card">
      <button
        type="button"
        className="collapsible-head"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        {open ? "▾" : "▸"} Aturan format? (opsional)
      </button>

      {open ? (
        <div className="collapsible-body stack">
          <label className="field">
            <span>Instruksi format (teks bebas)</span>
            <textarea
              value={formatText}
              onChange={(event) => onFormatTextChange(event.target.value)}
              rows={5}
              placeholder="Contoh: Times New Roman 12pt, spasi 1.5, margin 4-3-3-3 cm, judul BAB pakai angka romawi..."
            />
          </label>

          <div className="field">
            <span>Contoh dokumen (PDF/JPG/PNG, maks 10MB)</span>
            {referenceName ? (
              <div className="reference-file">
                <span className="muted">📎 {referenceName}</span>
                <button
                  type="button"
                  className="btn-ghost btn-xs"
                  onClick={() => void handleClear()}
                  disabled={busy}
                >
                  Hapus
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn-ghost"
                onClick={() => inputRef.current?.click()}
                disabled={busy}
              >
                {busy ? "Mengupload…" : "+ Upload contoh dokumen"}
              </button>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              hidden
              onChange={(event) => void handleFile(event.target.files?.[0])}
            />
          </div>

          {error ? <div className="banner banner-danger">{error}</div> : null}

          <p className="muted format-hint">
            Instruksi teks diprioritaskan; contoh dokumen melengkapi sisanya.
          </p>
        </div>
      ) : null}
    </section>
  );
}
