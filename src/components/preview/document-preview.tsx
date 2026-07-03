"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { resetFormatToDefault, setBaseFamily } from "@/lib/actions/documents";
import type { Block, DocumentModel } from "@/lib/document-model";
import type { BaseFamily, FormatProfile } from "@/lib/format-profile";
import { computeHeadingNumbers } from "@/lib/render/heading-numbering";
import { resolveStyle, type ResolvedStyle } from "@/lib/render/template-styles";
import { FormatBadge } from "./format-badge";
import { NotesBanner } from "./notes-banner";

const HEADING_TAG: Record<1 | 2 | 3 | 4, "h1" | "h2" | "h3" | "h4"> = {
  1: "h1",
  2: "h2",
  3: "h3",
  4: "h4",
};

type RenderCtx = {
  style: ResolvedStyle;
  numbers: string[];
  assetUrlMap: Record<string, string | null>;
};

function renderBlock(block: Block, index: number, ctx: RenderCtx): ReactNode {
  const { style, numbers, assetUrlMap } = ctx;

  switch (block.type) {
    case "heading": {
      const h = style.headings[block.level];
      const Tag = HEADING_TAG[block.level];
      const prefix = numbers[index];
      const headingStyle: CSSProperties = {
        fontFamily: style.headingFont,
        fontSize: `${h.fontSizePt}pt`,
        fontWeight: h.fontWeight,
        marginTop: `${h.marginTopPt}pt`,
        marginBottom: `${h.marginBottomPt}pt`,
        lineHeight: 1.25,
      };
      return (
        <Tag key={index} style={headingStyle}>
          {prefix ? `${prefix}  ${block.text}` : block.text}
        </Tag>
      );
    }
    case "paragraph":
      return (
        <p key={index} style={{ margin: `0 0 ${style.paragraphSpacingPt}pt` }}>
          {block.text}
        </p>
      );
    case "list": {
      const ListTag = block.ordered ? "ol" : "ul";
      return (
        <ListTag
          key={index}
          style={{
            margin: `0 0 ${style.paragraphSpacingPt}pt`,
            paddingLeft: "1.6em",
          }}
        >
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ListTag>
      );
    }
    case "table":
      return (
        <table key={index} className="preview-table">
          {block.headers && block.headers.length > 0 ? (
            <thead>
              <tr>
                {block.headers.map((cell, i) => (
                  <th key={i}>{cell}</th>
                ))}
              </tr>
            </thead>
          ) : null}
          <tbody>
            {block.rows.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => (
                  <td key={c}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    case "image": {
      const url = assetUrlMap[block.assetId];
      return (
        <figure key={index} className="preview-figure">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt={block.caption ?? block.assetId}
              className="preview-img"
            />
          ) : (
            <div className="preview-img-missing">[{block.assetId}]</div>
          )}
          {block.caption ? <figcaption>{block.caption}</figcaption> : null}
        </figure>
      );
    }
    case "quote":
      return (
        <blockquote key={index} className="preview-quote">
          <p>{block.text}</p>
          {block.attribution ? <cite>— {block.attribution}</cite> : null}
        </blockquote>
      );
    case "divider":
      return <hr key={index} className="preview-divider" />;
    case "pageBreak":
      return (
        <div key={index} className="preview-pagebreak">
          Pergantian halaman
        </div>
      );
    default: {
      const exhaustive: never = block;
      return exhaustive;
    }
  }
}

type Props = {
  documentId: string;
  documentModel: DocumentModel;
  formatProfile: FormatProfile;
  assetUrlMap: Record<string, string | null>;
};

export function DocumentPreview({
  documentId,
  documentModel,
  formatProfile,
  assetUrlMap,
}: Props) {
  const [source, setSource] = useState<FormatProfile["source"]>(
    formatProfile.source,
  );
  const [activeFamily, setActiveFamily] = useState<BaseFamily>(
    formatProfile.baseFamily,
  );

  const effectiveProfile: FormatProfile =
    source === "default"
      ? { source: "default", baseFamily: activeFamily }
      : { ...formatProfile, baseFamily: activeFamily };

  const style = resolveStyle(activeFamily, effectiveProfile);
  const numbers = computeHeadingNumbers(
    documentModel.blocks,
    style.headingNumberingStyle,
  );

  const handleSelectFamily = (family: BaseFamily) => {
    setActiveFamily(family);
    void setBaseFamily(documentId, family).catch(() => {});
  };

  const handleReset = () => {
    setSource("default");
    setActiveFamily(formatProfile.baseFamily);
    void resetFormatToDefault(documentId).catch(() => {});
  };

  const paperStyle: CSSProperties = {
    fontFamily: style.bodyFont,
    fontSize: `${style.bodyFontSizePt}pt`,
    lineHeight: style.lineSpacing,
    padding: `${style.margins.topCm}cm ${style.margins.rightCm}cm ${style.margins.bottomCm}cm ${style.margins.leftCm}cm`,
  };

  const titleStyle: CSSProperties = {
    fontFamily: style.headingFont,
    fontSize: `${style.title.fontSizePt}pt`,
    fontWeight: style.title.fontWeight,
    marginBottom: `${style.title.marginBottomPt}pt`,
    textAlign: style.titleAlignment,
  };

  return (
    <aside className="preview-pane">
      <div className="preview-toolbar">
        <span className="preview-toolbar__label">Preview</span>
        <FormatBadge
          source={source}
          activeFamily={activeFamily}
          onSelectFamily={handleSelectFamily}
          onReset={handleReset}
        />
      </div>

      {source !== "default" && formatProfile.extractionNotes ? (
        <NotesBanner notes={formatProfile.extractionNotes} />
      ) : null}

      <div className="preview-paper" style={paperStyle}>
        {documentModel.meta.title ? (
          <div className="preview-title" style={titleStyle}>
            {documentModel.meta.title}
          </div>
        ) : null}
        {documentModel.blocks.map((block, index) =>
          renderBlock(block, index, { style, numbers, assetUrlMap }),
        )}
      </div>
    </aside>
  );
}
