"use client";

import { BASE_FAMILIES, type BaseFamily } from "@/lib/format-profile";

const FAMILY_LABEL: Record<BaseFamily, string> = {
  report: "Laporan",
  letter: "Surat",
  academic: "Akademik",
  article: "Artikel",
};

type Props = {
  source: string;
  activeFamily: BaseFamily;
  onSelectFamily: (family: BaseFamily) => void;
  onReset: () => void;
};

export function FormatBadge({
  source,
  activeFamily,
  onSelectFamily,
  onReset,
}: Props) {
  if (source === "default") {
    return (
      <div className="family-chips" role="group" aria-label="Template family">
        {BASE_FAMILIES.map((family) => (
          <button
            key={family}
            type="button"
            className={`family-chip${family === activeFamily ? " family-chip--active" : ""}`}
            onClick={() => onSelectFamily(family)}
            aria-pressed={family === activeFamily}
          >
            {FAMILY_LABEL[family]}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="format-badge">
      <span className="format-badge__label">✨ Format kustom aktif</span>
      <button type="button" className="btn-ghost btn-xs" onClick={onReset}>
        Gunakan template standar
      </button>
    </div>
  );
}
