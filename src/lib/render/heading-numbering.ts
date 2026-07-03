import type { Block } from "@/lib/document-model";
import type { NumberingStyle } from "./template-styles";

const ROMAN: ReadonlyArray<readonly [number, string]> = [
  [1000, "M"],
  [900, "CM"],
  [500, "D"],
  [400, "CD"],
  [100, "C"],
  [90, "XC"],
  [50, "L"],
  [40, "XL"],
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"],
];

export function toRoman(n: number): string {
  let num = n;
  let out = "";
  for (const [value, symbol] of ROMAN) {
    while (num >= value) {
      out += symbol;
      num -= value;
    }
  }
  return out;
}

/**
 * Prefix nomor heading per blok (string kosong untuk non-heading / style "none").
 * Portable — dipakai preview + PDF + DOCX. Counter L1–L4; level lebih dalam
 * di-reset saat level di atasnya bertambah.
 * - decimal   : "1", "1.1", "1.1.1"
 * - roman-bab : L1 "BAB I", L2+ "1.1" (nomor bab arab + sub)
 */
export function computeHeadingNumbers(
  blocks: Block[],
  style: NumberingStyle,
): string[] {
  const counters = [0, 0, 0, 0];
  return blocks.map((block) => {
    if (block.type !== "heading" || style === "none") return "";
    const level = block.level;
    counters[level - 1] += 1;
    for (let i = level; i < counters.length; i += 1) counters[i] = 0;

    if (style === "roman-bab" && level === 1) {
      return `BAB ${toRoman(counters[0])}`;
    }
    return counters.slice(0, level).join(".");
  });
}
