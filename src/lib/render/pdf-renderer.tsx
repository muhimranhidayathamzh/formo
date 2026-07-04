import type { ReactElement } from "react";
import {
  Document,
  Image,
  Page,
  renderToBuffer,
  Text,
  View,
} from "@react-pdf/renderer";
import type { Block } from "@/lib/document-model";
import type { ExportContext } from "./export-context";
import { cmToPt, contentWidthPt, pdfFontFamily } from "./units";

const PX_TO_PT = 0.75; // 96px = 72pt

type Cfg = { font: string; headingFont: string; contentWidth: number };

function renderBlock(
  block: Block,
  index: number,
  ctx: ExportContext,
  cfg: Cfg,
): ReactElement {
  const { style, numbers, images } = ctx;

  switch (block.type) {
    case "heading": {
      const h = style.headings[block.level];
      const prefix = numbers[index];
      return (
        <Text
          key={index}
          style={{
            fontFamily: cfg.headingFont,
            fontSize: h.fontSizePt,
            fontWeight: h.fontWeight >= 600 ? "bold" : "normal",
            marginTop: h.marginTopPt,
            marginBottom: h.marginBottomPt,
          }}
        >
          {prefix ? `${prefix}  ${block.text}` : block.text}
        </Text>
      );
    }
    case "paragraph":
      return (
        <Text
          key={index}
          style={{ marginBottom: style.paragraphSpacingPt, textAlign: "justify" }}
        >
          {block.text}
        </Text>
      );
    case "list":
      return (
        <View
          key={index}
          style={{ marginBottom: style.paragraphSpacingPt, paddingLeft: 12 }}
        >
          {block.items.map((item, i) => (
            <View key={i} style={{ flexDirection: "row", marginBottom: 2 }}>
              <Text style={{ width: 18 }}>
                {block.ordered ? `${i + 1}.` : "•"}
              </Text>
              <Text style={{ flex: 1 }}>{item}</Text>
            </View>
          ))}
        </View>
      );
    case "table":
      return (
        <View
          key={index}
          style={{
            marginBottom: 10,
            borderTopWidth: 1,
            borderTopColor: "#999999",
            borderLeftWidth: 1,
            borderLeftColor: "#999999",
          }}
        >
          {block.headers && block.headers.length > 0 ? (
            <View style={{ flexDirection: "row" }}>
              {block.headers.map((cell, c) => (
                <Text
                  key={c}
                  style={{
                    flex: 1,
                    padding: 3,
                    fontWeight: "bold",
                    backgroundColor: "#eeeeee",
                    borderRightWidth: 1,
                    borderRightColor: "#999999",
                    borderBottomWidth: 1,
                    borderBottomColor: "#999999",
                  }}
                >
                  {cell}
                </Text>
              ))}
            </View>
          ) : null}
          {block.rows.map((row, r) => (
            <View key={r} style={{ flexDirection: "row" }}>
              {row.map((cell, c) => (
                <Text
                  key={c}
                  style={{
                    flex: 1,
                    padding: 3,
                    borderRightWidth: 1,
                    borderRightColor: "#999999",
                    borderBottomWidth: 1,
                    borderBottomColor: "#999999",
                  }}
                >
                  {cell}
                </Text>
              ))}
            </View>
          ))}
        </View>
      );
    case "image": {
      const img = images[block.assetId];
      if (!img) {
        return (
          <Text key={index} style={{ color: "#888888" }}>
            [{block.assetId}]
          </Text>
        );
      }
      const width = Math.min(img.width * PX_TO_PT, cfg.contentWidth);
      const height = (img.height / img.width) * width;
      return (
        <View key={index} style={{ marginVertical: 8, alignItems: "center" }}>
          {/* react-pdf Image (bukan <img> HTML) — tidak punya prop alt */}
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={{ data: img.data, format: img.format }} style={{ width, height }} />
          {block.caption ? (
            <Text
              style={{
                fontSize: style.bodyFontSizePt - 1,
                color: "#555555",
                marginTop: 3,
                fontStyle: "italic",
              }}
            >
              {block.caption}
            </Text>
          ) : null}
        </View>
      );
    }
    case "quote":
      return (
        <View
          key={index}
          style={{
            marginVertical: 8,
            paddingLeft: 10,
            borderLeftWidth: 2,
            borderLeftColor: "#cccccc",
          }}
        >
          <Text style={{ fontStyle: "italic", color: "#333333" }}>
            {block.text}
          </Text>
          {block.attribution ? (
            <Text
              style={{
                fontSize: style.bodyFontSizePt - 1,
                color: "#666666",
                marginTop: 2,
              }}
            >
              — {block.attribution}
            </Text>
          ) : null}
        </View>
      );
    case "divider":
      return (
        <View
          key={index}
          style={{
            borderBottomWidth: 1,
            borderBottomColor: "#cccccc",
            marginVertical: 10,
          }}
        />
      );
    case "pageBreak":
      return <View key={index} break />;
    default: {
      const exhaustive: never = block;
      return exhaustive;
    }
  }
}

function PdfDocument({ ctx }: { ctx: ExportContext }): ReactElement {
  const { model, style } = ctx;
  const cfg: Cfg = {
    font: pdfFontFamily(style.bodyFont),
    headingFont: pdfFontFamily(style.headingFont),
    contentWidth: contentWidthPt(style.margins),
  };

  return (
    <Document>
      <Page
        size="A4"
        style={{
          paddingTop: cmToPt(style.margins.topCm),
          paddingBottom: cmToPt(style.margins.bottomCm),
          paddingLeft: cmToPt(style.margins.leftCm),
          paddingRight: cmToPt(style.margins.rightCm),
          fontFamily: cfg.font,
          fontSize: style.bodyFontSizePt,
          lineHeight: style.lineSpacing,
          color: "#111111",
        }}
      >
        {model.meta.title ? (
          <Text
            style={{
              fontFamily: cfg.headingFont,
              fontSize: style.title.fontSizePt,
              fontWeight: style.title.fontWeight >= 600 ? "bold" : "normal",
              marginBottom: style.title.marginBottomPt,
              textAlign: style.titleAlignment,
            }}
          >
            {model.meta.title}
          </Text>
        ) : null}
        {model.blocks.map((block, index) => renderBlock(block, index, ctx, cfg))}
      </Page>
    </Document>
  );
}

export async function renderPdf(ctx: ExportContext): Promise<Buffer> {
  return renderToBuffer(<PdfDocument ctx={ctx} />);
}
