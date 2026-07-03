"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { updateDocument, type DocumentPatch } from "@/lib/actions/documents";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { ContentEditor } from "./content-editor";
import { FormatInput } from "./format-input";
import { ImageAssetList } from "./image-asset-list";
import { WordingToggle } from "./wording-toggle";
import type { EditorAsset } from "./types";

type Props = {
  docId: string;
  initialTitle: string;
  initialContent: string;
  initialAutoClean: boolean;
  initialFormatText: string;
  initialReferencePath: string | null;
  initialAssets: EditorAsset[];
};

type SaveStatus = "idle" | "saving" | "saved" | "error";

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;
  const label =
    status === "saving"
      ? "Menyimpan…"
      : status === "saved"
        ? "Tersimpan"
        : "Gagal menyimpan";
  return <span className={`save-status save-status--${status}`}>{label}</span>;
}

export function DocumentEditor(props: Props) {
  const { docId } = props;

  const [title, setTitle] = useState(props.initialTitle);
  const [content, setContent] = useState(props.initialContent);
  const [autoClean, setAutoClean] = useState(props.initialAutoClean);
  const [formatText, setFormatText] = useState(props.initialFormatText);
  const [assets, setAssets] = useState<EditorAsset[]>(props.initialAssets);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingPatch = useRef<DocumentPatch>({});

  const flush = useCallback(async () => {
    const patch = pendingPatch.current;
    if (Object.keys(patch).length === 0) return;
    pendingPatch.current = {};
    setSaveStatus("saving");
    try {
      await updateDocument(docId, patch);
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
  }, [docId]);

  const debouncedFlush = useDebouncedCallback(flush, 800);

  const scheduleSave = useCallback(
    (partial: DocumentPatch) => {
      pendingPatch.current = { ...pendingPatch.current, ...partial };
      setSaveStatus("saving");
      debouncedFlush();
    },
    [debouncedFlush],
  );

  const handleTitle = (value: string) => {
    setTitle(value);
    scheduleSave({ title: value.trim() === "" ? null : value });
  };

  const handleContent = (value: string) => {
    setContent(value);
    scheduleSave({ source_content: value });
  };

  const handleFormatText = (value: string) => {
    setFormatText(value);
    scheduleSave({
      format_instruction_text: value.trim() === "" ? null : value,
    });
  };

  const handleToggle = async (value: boolean) => {
    setAutoClean(value);
    setSaveStatus("saving");
    try {
      await updateDocument(docId, { auto_clean_wording: value });
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
  };

  const insertToken = useCallback(
    (refToken: string) => {
      const token = `[${refToken}]`;
      const el = textareaRef.current;
      const start = el ? el.selectionStart : content.length;
      const end = el ? el.selectionEnd : content.length;
      const next = `${content.slice(0, start)}${token}${content.slice(end)}`;
      setContent(next);
      scheduleSave({ source_content: next });
      if (el) {
        const caret = start + token.length;
        requestAnimationFrame(() => {
          el.focus();
          el.setSelectionRange(caret, caret);
        });
      }
    },
    [content, scheduleSave],
  );

  const addAsset = useCallback(
    (asset: EditorAsset) => setAssets((prev) => [...prev, asset]),
    [],
  );
  const removeAsset = useCallback(
    (assetId: string) =>
      setAssets((prev) => prev.filter((asset) => asset.id !== assetId)),
    [],
  );

  return (
    <div className="editor stack">
      <div className="editor-topbar">
        <Link href="/dashboard" className="btn-ghost btn-xs">
          ← Dashboard
        </Link>
        <SaveIndicator status={saveStatus} />
      </div>

      <ContentEditor
        ref={textareaRef}
        title={title}
        content={content}
        onTitleChange={handleTitle}
        onContentChange={handleContent}
      />

      <ImageAssetList
        documentId={docId}
        assets={assets}
        onInsert={insertToken}
        onAdd={addAsset}
        onRemove={removeAsset}
      />

      <FormatInput
        documentId={docId}
        formatText={formatText}
        onFormatTextChange={handleFormatText}
        initialReferencePath={props.initialReferencePath}
      />

      <div className="editor-footer card">
        <WordingToggle checked={autoClean} onChange={handleToggle} />
        <div className="editor-footer__action">
          <button type="button" className="btn" disabled title="Aktif di Phase 3">
            ✨ Rapikan Dokumen
          </button>
          <span className="muted format-hint">Fitur AI aktif di Phase 3.</span>
        </div>
      </div>
    </div>
  );
}
