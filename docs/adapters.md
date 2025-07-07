# Data Transformation Adapters

DocRebrander utilizes adapter patterns to ensure seamless data transformation between different systems and formats. This section details the key adapters implemented in the system.

## 4.1 Canonical to Tiptap JSON Adapter

```typescript
import { JSONContent } from "@tiptap/core";

class CanonicalToTiptapAdapter {
  transform(canonicalDoc: CanonicalDocument): JSONContent {
    return {
      type: "doc",
      content: canonicalDoc.content.map((block) => this.transformBlock(block)),
    };
  }

  private transformBlock(block: CanonicalBlock): JSONContent {
    switch (block.type) {
      case "heading":
        return this.transformHeading(block);
      case "paragraph":
        return this.transformParagraph(block);
      case "list":
        return this.transformList(block);
      case "table":
        return this.transformTable(block);
      case "image":
        return this.transformImage(block);
      case "codeBlock":
        return this.transformCodeBlock(block);
      case "blockquote":
        return this.transformBlockquote(block);
      case "multipleChoice":
        return this.transformMultipleChoice(block);
      case "divider":
        return this.transformDivider(block);
      default:
        return this.transformParagraph(block as ParagraphBlock);
    }
  }

  private transformHeading(block: HeadingBlock): JSONContent {
    return {
      type: "heading",
      attrs: {
        level: block.level,
      },
      content: this.transformInlineContent(block.content),
    };
  }

  private transformParagraph(block: ParagraphBlock): JSONContent {
    return {
      type: "paragraph",
      content: this.transformInlineContent(block.content),
    };
  }

  private transformList(block: ListBlock): JSONContent {
    const listType =
      block.listType === "numbered" ? "orderedList" : "bulletList";

    return {
      type: listType,
      content: block.items.map((item) => ({
        type: "listItem",
        content: [
          {
            type: "paragraph",
            content: this.transformInlineContent(item.content),
          },
          ...(item.items
            ? [this.transformNestedList(item.items, block.listType)]
            : []),
        ],
      })),
    };
  }

  private transformNestedList(
    items: ListItem[],
    listType: "bulleted" | "numbered"
  ): JSONContent {
    const type = listType === "numbered" ? "orderedList" : "bulletList";

    return {
      type,
      content: items.map((item) => ({
        type: "listItem",
        content: [
          {
            type: "paragraph",
            content: this.transformInlineContent(item.content),
          },
        ],
      })),
    };
  }

  private transformTable(block: TableBlock): JSONContent {
    const headerRow = {
      type: "table_row",
      content: block.headers.cells.map((cell) => ({
        type: "table_header",
        attrs: {
          colspan: cell.colspan || 1,
          rowspan: cell.rowspan || 1,
        },
        content: [
          {
            type: "paragraph",
            content: this.transformInlineContent(cell.content),
          },
        ],
      })),
    };

    const bodyRows = block.rows.map((row) => ({
      type: "table_row",
      content: row.cells.map((cell) => ({
        type: "table_cell",
        attrs: {
          colspan: cell.colspan || 1,
          rowspan: cell.rowspan || 1,
        },
        content: [
          {
            type: "paragraph",
            content: this.transformInlineContent(cell.content),
          },
        ],
      })),
    }));

    return {
      type: "table",
      content: [headerRow, ...bodyRows],
    };
  }

  private transformImage(block: ImageBlock): JSONContent {
    return {
      type: "image",
      attrs: {
        src: block.src,
        alt: block.alt || "",
        title: block.caption || "",
        width: block.width,
        height: block.height,
      },
    };
  }

  private transformCodeBlock(block: CodeBlock): JSONContent {
    return {
      type: "codeBlock",
      attrs: {
        language: block.language || null,
      },
      content: [
        {
          type: "text",
          text: block.content,
        },
      ],
    };
  }

  private transformBlockquote(block: BlockquoteBlock): JSONContent {
    return {
      type: "blockquote",
      content: block.content.map((childBlock) =>
        this.transformBlock(childBlock)
      ),
    };
  }

  private transformMultipleChoice(block: MultipleChoiceBlock): JSONContent {
    // Custom node for multiple choice questions
    return {
      type: "multipleChoice",
      attrs: {
        question: this.transformInlineContent(block.question),
        options: block.options.map((option) => ({
          id: option.id,
          content: this.transformInlineContent(option.content),
          isCorrect: option.isCorrect || false,
        })),
        correctAnswer: block.correctAnswer,
      },
    };
  }

  private transformDivider(block: DividerBlock): JSONContent {
    return {
      type: "horizontalRule",
      attrs: {
        style: block.style || "solid",
      },
    };
  }

  private transformInlineContent(content: InlineContent[]): JSONContent[] {
    return content.map((item) => {
      switch (item.type) {
        case "text":
          return this.transformText(item);
        case "link":
          return this.transformLink(item);
        case "break":
          return this.transformBreak(item);
        default:
          return {
            type: "text",
            text: (item as any).text || "",
          };
      }
    });
  }

  private transformText(item: TextContent | FormattedTextContent): JSONContent {
    const marks = [];

    if ("formatting" in item && item.formatting) {
      if (item.formatting.bold) marks.push({ type: "bold" });
      if (item.formatting.italic) marks.push({ type: "italic" });
      if (item.formatting.underline) marks.push({ type: "underline" });
      if (item.formatting.strikethrough) marks.push({ type: "strike" });
      if (item.formatting.code) marks.push({ type: "code" });
      if (item.formatting.superscript) marks.push({ type: "superscript" });
      if (item.formatting.subscript) marks.push({ type: "subscript" });
    }

    return {
      type: "text",
      text: item.text,
      ...(marks.length > 0 && { marks }),
    };
  }

  private transformLink(item: LinkContent): JSONContent {
    return {
      type: "text",
      text: item.text,
      marks: [
        {
          type: "link",
          attrs: {
            href: item.url,
            title: item.title || null,
          },
        },
      ],
    };
  }

  private transformBreak(item: BreakContent): JSONContent {
    return {
      type: item.breakType === "hard" ? "hardBreak" : "softBreak",
    };
  }
}
```

## 4.2 Tiptap to pdfme Adapter

```typescript
import { Template, Schema } from "@pdfme/common";
import { JSONContent } from "@tiptap/core";

interface PdfmeDocument {
  template: Template;
  inputs: Record<string, any>[];
}

class TiptapToPdfmeAdapter {
  private currentY: number = 20;
  private pageWidth: number = 210; // A4 width in mm
  private pageHeight: number = 297; // A4 height in mm
  private margin: number = 20;

  transform(tiptapDoc: JSONContent, options?: PdfmeOptions): PdfmeDocument {
    this.currentY = options?.startY || 20;
    this.pageWidth = options?.pageWidth || 210;
    this.pageHeight = options?.pageHeight || 297;
    this.margin = options?.margin || 20;

    const schemas: Schema[] = [];
    const inputs: Record<string, any> = {};

    if (tiptapDoc.content) {
      tiptapDoc.content.forEach((block, index) => {
        const blockSchemas = this.transformBlock(block, index);
        schemas.push(...blockSchemas.schemas);
        Object.assign(inputs, blockSchemas.inputs);
      });
    }

    const template: Template = {
      basePdf: {
        width: this.pageWidth,
        height: this.pageHeight,
        padding: [this.margin, this.margin, this.margin, this.margin],
      },
      schemas: [schemas],
    };

    return {
      template,
      inputs: [inputs],
    };
  }

  private transformBlock(
    block: JSONContent,
    index: number
  ): { schemas: Schema[]; inputs: Record<string, any> } {
    switch (block.type) {
      case "heading":
        return this.transformHeading(block, index);
      case "paragraph":
        return this.transformParagraph(block, index);
      case "bulletList":
      case "orderedList":
        return this.transformList(block, index);
      case "table":
        return this.transformTable(block, index);
      case "image":
        return this.transformImage(block, index);
      case "codeBlock":
        return this.transformCodeBlock(block, index);
      case "blockquote":
        return this.transformBlockquote(block, index);
      case "horizontalRule":
        return this.transformHorizontalRule(block, index);
      default:
        return this.transformParagraph(block, index);
    }
  }

  private transformHeading(
    block: JSONContent,
    index: number
  ): { schemas: Schema[]; inputs: Record<string, any> } {
    const fieldName = `heading_${index}`;
    const level = block.attrs?.level || 1;
    const fontSize = this.getHeadingFontSize(level);
    const text = this.extractTextFromContent(block.content);

    const schema: Schema = {
      name: fieldName,
      type: "text",
      position: { x: this.margin, y: this.currentY },
      width: this.pageWidth - this.margin * 2,
      height: fontSize * 1.2,
      fontSize,
      fontName: "NotoSansCJK-Regular",
      fontColor: "#000000",
      alignment: "left",
      verticalAlignment: "top",
    };

    this.currentY += fontSize * 1.5;

    return {
      schemas: [schema],
      inputs: { [fieldName]: text },
    };
  }

  private transformParagraph(
    block: JSONContent,
    index: number
  ): { schemas: Schema[]; inputs: Record<string, any> } {
    const fieldName = `paragraph_${index}`;
    const text = this.extractTextFromContent(block.content);
    const estimatedHeight = this.estimateTextHeight(text, 12);

    const schema: Schema = {
      name: fieldName,
      type: "text",
      position: { x: this.margin, y: this.currentY },
      width: this.pageWidth - this.margin * 2,
      height: estimatedHeight,
      fontSize: 12,
      fontName: "NotoSansCJK-Regular",
      fontColor: "#000000",
      alignment: "left",
      verticalAlignment: "top",
      lineHeight: 1.5,
    };

    this.currentY += estimatedHeight + 5;

    return {
      schemas: [schema],
      inputs: { [fieldName]: text },
    };
  }

  private transformList(
    block: JSONContent,
    index: number
  ): { schemas: Schema[]; inputs: Record<string, any> } {
    const schemas: Schema[] = [];
    const inputs: Record<string, any> = {};

    if (block.content) {
      block.content.forEach((item, itemIndex) => {
        const fieldName = `list_${index}_${itemIndex}`;
        const text = this.extractTextFromListItem(item);
        const prefix =
          block.type === "orderedList" ? `${itemIndex + 1}. ` : "• ";
        const fullText = prefix + text;

        const estimatedHeight = this.estimateTextHeight(fullText, 12);

        const schema: Schema = {
          name: fieldName,
          type: "text",
          position: { x: this.margin + 10, y: this.currentY },
          width: this.pageWidth - this.margin * 2 - 10,
          height: estimatedHeight,
          fontSize: 12,
          fontName: "NotoSansCJK-Regular",
          fontColor: "#000000",
          alignment: "left",
          verticalAlignment: "top",
          lineHeight: 1.5,
        };

        schemas.push(schema);
        inputs[fieldName] = fullText;
        this.currentY += estimatedHeight + 3;
      });
    }

    this.currentY += 10; // Add spacing after list

    return { schemas, inputs };
  }

  private transformTable(
    block: JSONContent,
    index: number
  ): { schemas: Schema[]; inputs: Record<string, any> } {
    const fieldName = `table_${index}`;
    const tableData = this.extractTableData(block);

    const estimatedHeight = (tableData.length + 1) * 20; // Rough estimate

    const schema: Schema = {
      name: fieldName,
      type: "table",
      position: { x: this.margin, y: this.currentY },
      width: this.pageWidth - this.margin * 2,
      height: estimatedHeight,
      fontSize: 10,
      fontName: "NotoSansCJK-Regular",
      fontColor: "#000000",
      borderWidth: 1,
      borderColor: "#000000",
      headStyles: {
        backgroundColor: "#f0f0f0",
        fontColor: "#000000",
        fontSize: 11,
      },
      bodyStyles: {
        backgroundColor: "#ffffff",
        fontColor: "#000000",
        fontSize: 10,
      },
    };

    this.currentY += estimatedHeight + 10;

    return {
      schemas: [schema],
      inputs: { [fieldName]: tableData },
    };
  }

  private transformImage(
    block: JSONContent,
    index: number
  ): { schemas: Schema[]; inputs: Record<string, any> } {
    const fieldName = `image_${index}`;
    const src = block.attrs?.src || "";
    const width = block.attrs?.width || 100;
    const height = block.attrs?.height || 100;

    const schema: Schema = {
      name: fieldName,
      type: "image",
      position: { x: this.margin, y: this.currentY },
      width: Math.min(width, this.pageWidth - this.margin * 2),
      height: height,
      alignment: "left",
    };

    this.currentY += height + 10;

    return {
      schemas: [schema],
      inputs: { [fieldName]: src },
    };
  }

  private transformCodeBlock(
    block: JSONContent,
    index: number
  ): { schemas: Schema[]; inputs: Record<string, any> } {
    const fieldName = `code_${index}`;
    const text = this.extractTextFromContent(block.content);
    const estimatedHeight = this.estimateTextHeight(text, 10);

    const schema: Schema = {
      name: fieldName,
      type: "text",
      position: { x: this.margin, y: this.currentY },
      width: this.pageWidth - this.margin * 2,
      height: estimatedHeight,
      fontSize: 10,
      fontName: "CourierPrime-Regular",
      fontColor: "#000000",
      backgroundColor: "#f5f5f5",
      alignment: "left",
      verticalAlignment: "top",
      lineHeight: 1.2,
    };

    this.currentY += estimatedHeight + 10;

    return {
      schemas: [schema],
      inputs: { [fieldName]: text },
    };
  }

  private transformBlockquote(
    block: JSONContent,
    index: number
  ): { schemas: Schema[]; inputs: Record<string, any> } {
    const fieldName = `blockquote_${index}`;
    const text = this.extractTextFromContent(block.content);
    const estimatedHeight = this.estimateTextHeight(text, 12);

    const schema: Schema = {
      name: fieldName,
      type: "text",
      position: { x: this.margin + 20, y: this.currentY },
      width: this.pageWidth - this.margin * 2 - 20,
      height: estimatedHeight,
      fontSize: 12,
      fontName: "NotoSansCJK-Regular",
      fontColor: "#666666",
      alignment: "left",
      verticalAlignment: "top",
      lineHeight: 1.5,
    };

    this.currentY += estimatedHeight + 10;

    return {
      schemas: [schema],
      inputs: { [fieldName]: text },
    };
  }

  private transformHorizontalRule(
    block: JSONContent,
    index: number
  ): { schemas: Schema[]; inputs: Record<string, any> } {
    const fieldName = `hr_${index}`;

    const schema: Schema = {
      name: fieldName,
      type: "line",
      position: { x: this.margin, y: this.currentY },
      width: this.pageWidth - this.margin * 2,
      height: 1,
      borderWidth: 1,
      borderColor: "#cccccc",
    };

    this.currentY += 20;

    return {
      schemas: [schema],
      inputs: { [fieldName]: "" },
    };
  }

  // Helper methods
  private extractTextFromContent(content: JSONContent[] | undefined): string {
    if (!content) return "";

    return content
      .map((item) => {
        if (item.type === "text") {
          return item.text || "";
        } else if (item.content) {
          return this.extractTextFromContent(item.content);
        }
        return "";
      })
      .join("");
  }

  private extractTextFromListItem(item: JSONContent): string {
    if (item.content) {
      return item.content
        .map((block) => {
          if (block.type === "paragraph" && block.content) {
            return this.extractTextFromContent(block.content);
          }
          return "";
        })
        .join("");
    }
    return "";
  }

  private extractTableData(block: JSONContent): string[][] {
    if (!block.content) return [];

    return block.content.map((row) => {
      if (row.content) {
        return row.content.map((cell) => {
          if (cell.content) {
            return this.extractTextFromContent(cell.content);
          }
          return "";
        });
      }
      return [];
    });
  }

  private getHeadingFontSize(level: number): number {
    const sizes = { 1: 24, 2: 20, 3: 16, 4: 14, 5: 12, 6: 10 };
    return sizes[level as keyof typeof sizes] || 12;
  }

  private estimateTextHeight(text: string, fontSize: number): number {
    const lineHeight = fontSize * 1.5;
    const charsPerLine = Math.floor(
      (this.pageWidth - this.margin * 2) / (fontSize * 0.6)
    );
    const lines = Math.ceil(text.length / charsPerLine);
    return Math.max(lines * lineHeight, fontSize);
  }
}

interface PdfmeOptions {
  startY?: number;
  pageWidth?: number;
  pageHeight?: number;
  margin?: number;
}
