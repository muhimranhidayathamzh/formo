import type { BaseFamily, FormatProfile } from "@/lib/format-profile";

/**
 * Token gaya per template family — PORTABLE (dipakai preview HTML + PDF + DOCX).
 * Nilai dalam pt (tipografi) & cm (margin) agar netral untuk semua renderer.
 * Tipografi HEADING FIXED per family; TIDAK bisa di-override Format Profile (§7).
 */

export type NumberingStyle = "decimal" | "roman-bab" | "none";
export type HeadingLevel = 1 | 2 | 3 | 4;

export type HeadingStyle = {
  fontSizePt: number;
  fontWeight: number;
  marginTopPt: number;
  marginBottomPt: number;
};

export type Margins = {
  topCm: number;
  bottomCm: number;
  leftCm: number;
  rightCm: number;
};

export type TemplateStyle = {
  bodyFont: string;
  headingFont: string;
  bodyFontSizePt: number;
  lineSpacing: number;
  paragraphSpacingPt: number;
  margins: Margins;
  titleAlignment: "left" | "center";
  headingNumberingStyle: NumberingStyle;
  title: { fontSizePt: number; fontWeight: number; marginBottomPt: number };
  headings: Record<HeadingLevel, HeadingStyle>;
};

const SERIF = '"Times New Roman", Georgia, serif';
const SANS = '"Helvetica Neue", Arial, sans-serif';

export const TEMPLATE_STYLES: Record<BaseFamily, TemplateStyle> = {
  report: {
    bodyFont: SERIF,
    headingFont: SANS,
    bodyFontSizePt: 11,
    lineSpacing: 1.5,
    paragraphSpacingPt: 8,
    margins: { topCm: 3, bottomCm: 3, leftCm: 4, rightCm: 3 },
    titleAlignment: "center",
    headingNumberingStyle: "decimal",
    title: { fontSizePt: 20, fontWeight: 700, marginBottomPt: 16 },
    headings: {
      1: { fontSizePt: 16, fontWeight: 700, marginTopPt: 18, marginBottomPt: 8 },
      2: { fontSizePt: 13, fontWeight: 700, marginTopPt: 14, marginBottomPt: 6 },
      3: { fontSizePt: 12, fontWeight: 600, marginTopPt: 12, marginBottomPt: 4 },
      4: { fontSizePt: 11, fontWeight: 600, marginTopPt: 10, marginBottomPt: 4 },
    },
  },
  letter: {
    bodyFont: SERIF,
    headingFont: SERIF,
    bodyFontSizePt: 12,
    lineSpacing: 1.15,
    paragraphSpacingPt: 10,
    margins: { topCm: 2.5, bottomCm: 2.5, leftCm: 2.5, rightCm: 2.5 },
    titleAlignment: "left",
    headingNumberingStyle: "none",
    title: { fontSizePt: 14, fontWeight: 700, marginBottomPt: 12 },
    headings: {
      1: { fontSizePt: 13, fontWeight: 700, marginTopPt: 12, marginBottomPt: 6 },
      2: { fontSizePt: 12, fontWeight: 700, marginTopPt: 10, marginBottomPt: 4 },
      3: { fontSizePt: 12, fontWeight: 600, marginTopPt: 8, marginBottomPt: 4 },
      4: { fontSizePt: 12, fontWeight: 600, marginTopPt: 8, marginBottomPt: 4 },
    },
  },
  academic: {
    bodyFont: SERIF,
    headingFont: SERIF,
    bodyFontSizePt: 12,
    lineSpacing: 2,
    paragraphSpacingPt: 8,
    margins: { topCm: 4, bottomCm: 3, leftCm: 4, rightCm: 3 },
    titleAlignment: "center",
    headingNumberingStyle: "roman-bab",
    title: { fontSizePt: 18, fontWeight: 700, marginBottomPt: 18 },
    headings: {
      1: { fontSizePt: 14, fontWeight: 700, marginTopPt: 20, marginBottomPt: 10 },
      2: { fontSizePt: 13, fontWeight: 700, marginTopPt: 14, marginBottomPt: 6 },
      3: { fontSizePt: 12, fontWeight: 700, marginTopPt: 12, marginBottomPt: 4 },
      4: { fontSizePt: 12, fontWeight: 600, marginTopPt: 10, marginBottomPt: 4 },
    },
  },
  article: {
    bodyFont: SANS,
    headingFont: SANS,
    bodyFontSizePt: 11,
    lineSpacing: 1.6,
    paragraphSpacingPt: 10,
    margins: { topCm: 2, bottomCm: 2, leftCm: 2.5, rightCm: 2.5 },
    titleAlignment: "left",
    headingNumberingStyle: "none",
    title: { fontSizePt: 22, fontWeight: 700, marginBottomPt: 14 },
    headings: {
      1: { fontSizePt: 17, fontWeight: 700, marginTopPt: 18, marginBottomPt: 6 },
      2: { fontSizePt: 14, fontWeight: 600, marginTopPt: 14, marginBottomPt: 6 },
      3: { fontSizePt: 12, fontWeight: 600, marginTopPt: 12, marginBottomPt: 4 },
      4: { fontSizePt: 11, fontWeight: 600, marginTopPt: 10, marginBottomPt: 4 },
    },
  },
};

/** Petakan string bebas headingNumberingStyle → NumberingStyle yang didukung. */
export function normalizeNumbering(
  value: string | undefined,
  fallback: NumberingStyle,
): NumberingStyle {
  if (!value) return fallback;
  const v = value.toLowerCase();
  if (v.includes("roman") || v.includes("bab")) return "roman-bab";
  if (v === "none" || v.includes("tanpa") || v.includes("no")) return "none";
  if (v.includes("decimal") || v.includes("angka") || v.includes("desimal")) {
    return "decimal";
  }
  return fallback;
}

export type ResolvedStyle = {
  bodyFont: string;
  headingFont: string;
  bodyFontSizePt: number;
  lineSpacing: number;
  paragraphSpacingPt: number;
  margins: Margins;
  titleAlignment: "left" | "center";
  headingNumberingStyle: NumberingStyle;
  title: TemplateStyle["title"];
  headings: TemplateStyle["headings"];
};

/**
 * Gabungkan token template family + override Format Profile.
 * Override HANYA berlaku kalau profile.source !== 'default'; tipografi heading
 * SELALU dari template (tidak pernah di-override).
 */
export function resolveStyle(
  family: BaseFamily,
  profile: FormatProfile,
): ResolvedStyle {
  const t = TEMPLATE_STYLES[family];
  const custom = profile.source !== "default";

  return {
    bodyFont: custom && profile.fontFamily ? profile.fontFamily : t.bodyFont,
    headingFont: t.headingFont,
    bodyFontSizePt:
      custom && profile.fontSizePt ? profile.fontSizePt : t.bodyFontSizePt,
    lineSpacing:
      custom && profile.lineSpacing ? profile.lineSpacing : t.lineSpacing,
    paragraphSpacingPt: t.paragraphSpacingPt,
    margins: custom && profile.margins ? profile.margins : t.margins,
    titleAlignment:
      custom && profile.titleAlignment
        ? profile.titleAlignment
        : t.titleAlignment,
    headingNumberingStyle: custom
      ? normalizeNumbering(profile.headingNumberingStyle, t.headingNumberingStyle)
      : t.headingNumberingStyle,
    title: t.title,
    headings: t.headings,
  };
}
