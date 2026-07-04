import type { Margins } from "./template-styles";

/** Konversi satuan & pemetaan font untuk renderer PDF/DOCX (dari token pt/cm). */

export const CM_TO_PT = 28.3465; // 1cm dalam point
export const CM_TO_TWIP = 567; // 1cm dalam twip (docx)
export const PT_TO_TWIP = 20; // 1pt dalam twip
export const PX_PER_CM = 37.795; // 96dpi

// A4
export const PAGE_WIDTH_PT = 595.28;
export const PAGE_WIDTH_PX = 793.7;

export function cmToPt(cm: number): number {
  return cm * CM_TO_PT;
}

export function cmToTwip(cm: number): number {
  return Math.round(cm * CM_TO_TWIP);
}

/** Lebar area konten (pt) = lebar A4 − margin kiri/kanan. */
export function contentWidthPt(margins: Margins): number {
  return PAGE_WIDTH_PT - cmToPt(margins.leftCm) - cmToPt(margins.rightCm);
}

/** Lebar area konten (px) = lebar A4 − margin kiri/kanan. */
export function contentWidthPx(margins: Margins): number {
  return PAGE_WIDTH_PX - margins.leftCm * PX_PER_CM - margins.rightCm * PX_PER_CM;
}

/** Petakan font-stack CSS → salah satu standard-14 font react-pdf. */
export function pdfFontFamily(css: string): "Times-Roman" | "Helvetica" | "Courier" {
  const v = css.toLowerCase();
  if (v.includes("courier") || v.includes("mono")) return "Courier";
  if (
    v.includes("helvetica") ||
    v.includes("arial") ||
    v.includes("sans") ||
    v.includes("verdana") ||
    v.includes("calibri") ||
    v.includes("tahoma")
  ) {
    return "Helvetica";
  }
  return "Times-Roman";
}

/** Ambil nama family pertama dari font-stack CSS untuk DOCX (Word substitusi bila perlu). */
export function docxFontFamily(css: string): string {
  const first = css.split(",")[0]?.trim() ?? "";
  const unquoted = first.replace(/^["']|["']$/g, "").trim();
  return unquoted || "Times New Roman";
}

/** Nama file aman dari judul dokumen. */
export function safeFilename(title: string | undefined, ext: string): string {
  const base = (title ?? "")
    .trim()
    .replace(/[^\p{L}\p{N} _-]+/gu, "")
    .replace(/\s+/g, "-")
    .slice(0, 60);
  return `${base || "dokumen"}.${ext}`;
}
