"use client";

type Props = {
  checked: boolean;
  onChange: (value: boolean) => void;
};

/** Checkbox "Rapikan ejaan & tata bahasa otomatis" (default aktif). */
export function WordingToggle({ checked, onChange }: Props) {
  return (
    <label className="wording-toggle">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>Rapikan ejaan & tata bahasa otomatis</span>
    </label>
  );
}
