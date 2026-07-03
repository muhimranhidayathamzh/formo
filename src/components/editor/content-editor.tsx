"use client";

import { forwardRef } from "react";

type Props = {
  title: string;
  content: string;
  onTitleChange: (value: string) => void;
  onContentChange: (value: string) => void;
};

/** Field judul + textarea konten mentah. Textarea di-forward ref-nya ke parent
 *  agar token gambar bisa disisipkan di posisi kursor. */
export const ContentEditor = forwardRef<HTMLTextAreaElement, Props>(
  function ContentEditor(
    { title, content, onTitleChange, onContentChange },
    ref,
  ) {
    return (
      <div className="stack card">
        <label className="field">
          <span>Judul dokumen (opsional)</span>
          <input
            type="text"
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder="Judul dokumen"
          />
        </label>
        <label className="field">
          <span>Konten</span>
          <textarea
            ref={ref}
            value={content}
            onChange={(event) => onContentChange(event.target.value)}
            rows={16}
            className="content-textarea"
            placeholder="Tulis atau paste kontenmu di sini... Bisa panjang. Bisa berantakan."
          />
        </label>
      </div>
    );
  },
);
