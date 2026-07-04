import {
  AlignmentType,
  BorderStyle,
  Document,
  ImageRun,
  Packer,
  PageBreak,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type { Block } from "@/lib/document-model";
import type { ExportContext } from "./export-context";
import { cmToTwip, contentWidthPx, docxFontFamily } from "./units";

const PT_TO_TWIP = 20;

type Cfg = {
  bodyFont: string;
  headingFont: string;
  bodyHalf: number;
  contentPx: number;
};

type DocChild = Paragraph | Table;

function pushBlock(
  out: DocChild[],
  block: Block,
  index: number,
  ctx: ExportContext,
  cfg: Cfg,
): void {
  const { style, numbers, images } = ctx;

  switch (block.type) {
    case "heading": {
      const h = style.headings[block.level];
      const prefix = numbers[index];
      out.push(
        new Paragraph({
          spacing: {
            before: h.marginTopPt * PT_TO_TWIP,
            after: h.marginBottomPt * PT_TO_TWIP,
          },
          children: [
            new TextRun({
              text: prefix ? `${prefix}  ${block.text}` : block.text,
              bold: h.fontWeight >= 600,
              size: Math.round(h.fontSizePt * 2),
              font: cfg.headingFont,
            }),
          ],
        }),
      );
      break;
    }
    case "paragraph":
      out.push(
        new Paragraph({
          spacing: { after: style.paragraphSpacingPt * PT_TO_TWIP },
          children: [
            new TextRun({ text: block.text, size: cfg.bodyHalf, font: cfg.bodyFont }),
          ],
        }),
      );
      break;
    case "list":
      block.items.forEach((item, i) => {
        out.push(
          new Paragraph({
            bullet: block.ordered ? undefined : { level: 0 },
            spacing: { after: 40 },
            children: [
              new TextRun({
                text: block.ordered ? `${i + 1}. ${item}` : item,
                size: cfg.bodyHalf,
                font: cfg.bodyFont,
              }),
            ],
          }),
        );
      });
      break;
    case "table": {
      const rows: TableRow[] = [];
      if (block.headers && block.headers.length > 0) {
        rows.push(
          new TableRow({
            tableHeader: true,
            children: block.headers.map(
              (cell) =>
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: cell,
                          bold: true,
                          size: cfg.bodyHalf,
                          font: cfg.bodyFont,
                        }),
                      ],
                    }),
                  ],
                }),
            ),
          }),
        );
      }
      block.rows.forEach((row) => {
        rows.push(
          new TableRow({
            children: row.map(
              (cell) =>
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: cell,
                          size: cfg.bodyHalf,
                          font: cfg.bodyFont,
                        }),
                      ],
                    }),
                  ],
                }),
            ),
          }),
        );
      });
      out.push(
        new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }),
      );
      out.push(new Paragraph({ spacing: { after: 100 }, children: [] }));
      break;
    }
    case "image": {
      const img = images[block.assetId];
      if (!img) {
        out.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `[${block.assetId}]`,
                italics: true,
                color: "888888",
                size: cfg.bodyHalf,
                font: cfg.bodyFont,
              }),
            ],
          }),
        );
        break;
      }
      const width = Math.min(img.width, cfg.contentPx);
      const height = (img.height / img.width) * width;
      out.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 120, after: 60 },
          children: [
            new ImageRun({
              type: img.format,
              data: img.data,
              transformation: {
                width: Math.round(width),
                height: Math.round(height),
              },
            }),
          ],
        }),
      );
      if (block.caption) {
        out.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: block.caption,
                italics: true,
                size: cfg.bodyHalf - 2,
                color: "555555",
                font: cfg.bodyFont,
              }),
            ],
          }),
        );
      }
      break;
    }
    case "quote":
      out.push(
        new Paragraph({
          indent: { left: 400 },
          spacing: { before: 80, after: block.attribution ? 20 : 80 },
          children: [
            new TextRun({
              text: block.text,
              italics: true,
              size: cfg.bodyHalf,
              color: "333333",
              font: cfg.bodyFont,
            }),
          ],
        }),
      );
      if (block.attribution) {
        out.push(
          new Paragraph({
            indent: { left: 400 },
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: `— ${block.attribution}`,
                size: cfg.bodyHalf - 2,
                color: "666666",
                font: cfg.bodyFont,
              }),
            ],
          }),
        );
      }
      break;
    case "divider":
      out.push(
        new Paragraph({
          spacing: { before: 120, after: 120 },
          border: {
            bottom: {
              style: BorderStyle.SINGLE,
              size: 6,
              color: "CCCCCC",
              space: 1,
            },
          },
          children: [],
        }),
      );
      break;
    case "pageBreak":
      out.push(new Paragraph({ children: [new PageBreak()] }));
      break;
    default: {
      const exhaustive: never = block;
      return exhaustive;
    }
  }
}

export async function renderDocx(ctx: ExportContext): Promise<Buffer> {
  const { model, style } = ctx;
  const cfg: Cfg = {
    bodyFont: docxFontFamily(style.bodyFont),
    headingFont: docxFontFamily(style.headingFont),
    bodyHalf: Math.round(style.bodyFontSizePt * 2),
    contentPx: contentWidthPx(style.margins),
  };

  const children: DocChild[] = [];

  if (model.meta.title) {
    children.push(
      new Paragraph({
        alignment:
          style.titleAlignment === "center"
            ? AlignmentType.CENTER
            : AlignmentType.LEFT,
        spacing: { after: style.title.marginBottomPt * PT_TO_TWIP },
        children: [
          new TextRun({
            text: model.meta.title,
            bold: style.title.fontWeight >= 600,
            size: Math.round(style.title.fontSizePt * 2),
            font: cfg.headingFont,
          }),
        ],
      }),
    );
  }

  model.blocks.forEach((block, index) => pushBlock(children, block, index, ctx, cfg));

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: cmToTwip(style.margins.topCm),
              bottom: cmToTwip(style.margins.bottomCm),
              left: cmToTwip(style.margins.leftCm),
              right: cmToTwip(style.margins.rightCm),
            },
          },
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(doc);
}
