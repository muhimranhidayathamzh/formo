"use client";

import { useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { deleteImageAsset, reserveImageAsset } from "@/lib/actions/documents";
import { extFromMime, validateImageFile } from "@/lib/validation/files";
import type { EditorAsset } from "./types";

const BUCKET = "document-images";

type Props = {
  documentId: string;
  assets: EditorAsset[];
  onInsert: (refToken: string) => void;
  onAdd: (asset: EditorAsset) => void;
  onRemove: (assetId: string) => void;
};

/** Upload gambar (client-direct ke Supabase Storage) + list thumbnail dengan
 *  tombol "Sisipkan di sini" yang menaruh token di posisi kursor textarea. */
export function ImageAssetList({
  documentId,
  assets,
  onInsert,
  onAdd,
  onRemove,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadOne(file: File) {
    const validationError = validateImageFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    const ext = extFromMime(file.type);
    if (!ext) {
      setError("Tipe gambar tidak didukung.");
      return;
    }

    // 1) reserve ref_token + row (server) → 2) upload file (client-direct)
    const reserved = await reserveImageAsset(documentId, ext);
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(reserved.storagePath, file, {
        contentType: file.type,
        upsert: true,
      });
    if (uploadError) {
      await deleteImageAsset(reserved.id); // rollback baris reserved
      throw uploadError;
    }

    const { data: signed } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(reserved.storagePath, 3600);

    onAdd({
      id: reserved.id,
      refToken: reserved.refToken,
      signedUrl: signed?.signedUrl ?? null,
    });
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        await uploadOne(file);
      }
    } catch {
      setError("Gagal mengupload gambar. Coba lagi.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDelete(assetId: string) {
    try {
      await deleteImageAsset(assetId);
      onRemove(assetId);
    } catch {
      setError("Gagal menghapus gambar.");
    }
  }

  return (
    <div className="asset-panel card">
      <span className="field-label">Gambar</span>

      <div
        className={`asset-drop${dragOver ? " asset-drop--over" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          void handleFiles(event.dataTransfer.files);
        }}
      >
        <p className="muted">Tarik gambar ke sini, atau</p>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? "Mengupload…" : "+ Upload gambar"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png"
          multiple
          hidden
          onChange={(event) => void handleFiles(event.target.files)}
        />
      </div>

      {error ? <div className="banner banner-danger">{error}</div> : null}

      {assets.length > 0 ? (
        <ul className="asset-list">
          {assets.map((asset) => (
            <li key={asset.id} className="asset-thumb">
              {asset.signedUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={asset.signedUrl}
                  alt={asset.refToken}
                  className="asset-thumb__img"
                />
              ) : (
                <div className="asset-thumb__placeholder">{asset.refToken}</div>
              )}
              <div className="asset-thumb__meta">
                <code>[{asset.refToken}]</code>
                <div className="asset-thumb__actions">
                  <button
                    type="button"
                    className="btn-ghost btn-xs"
                    onClick={() => onInsert(asset.refToken)}
                  >
                    Sisipkan di sini
                  </button>
                  <button
                    type="button"
                    className="btn-ghost btn-xs"
                    onClick={() => void handleDelete(asset.id)}
                  >
                    Hapus
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted asset-empty">Belum ada gambar.</p>
      )}
    </div>
  );
}
