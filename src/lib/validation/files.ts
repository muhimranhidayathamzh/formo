/**
 * Validasi file upload — dipakai di client (sebelum upload) DAN di server action
 * (pertahanan kedua). Aturan CLAUDE.md: validasi tipe & ukuran di client DAN server.
 */

export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_FILE_LABEL = "10MB";

export const IMAGE_TYPES = ["image/jpeg", "image/png"] as const;
export const REFERENCE_TYPES = [
  "image/jpeg",
  "image/png",
  "application/pdf",
] as const;

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "application/pdf": "pdf",
};

/** Ekstensi file dari MIME type; null kalau tidak dikenal. */
export function extFromMime(mime: string): string | null {
  return MIME_TO_EXT[mime] ?? null;
}

function checkSize(file: File): string | null {
  if (file.size === 0) return "File kosong.";
  if (file.size > MAX_FILE_BYTES) {
    return `Ukuran file melebihi ${MAX_FILE_LABEL}.`;
  }
  return null;
}

/** Validasi gambar konten (JPG/PNG, ≤10MB). Return pesan error atau null kalau valid. */
export function validateImageFile(file: File): string | null {
  if (!IMAGE_TYPES.includes(file.type as (typeof IMAGE_TYPES)[number])) {
    return "Format gambar harus JPG atau PNG.";
  }
  return checkSize(file);
}

/** Validasi contoh dokumen referensi (PDF/JPG/PNG, ≤10MB). */
export function validateReferenceFile(file: File): string | null {
  if (
    !REFERENCE_TYPES.includes(file.type as (typeof REFERENCE_TYPES)[number])
  ) {
    return "Format contoh dokumen harus PDF, JPG, atau PNG.";
  }
  return checkSize(file);
}
