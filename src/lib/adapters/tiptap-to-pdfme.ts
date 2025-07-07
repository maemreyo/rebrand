import { JSONContent } from "@tiptap/core";
import { Template, Schema, PdfGenerationInput } from "@/types/template";

// =============================================================================
// pdfme Document Interface
// =============================================================================

export interface PdfmeDocument {
  template: Template;
  inputs: PdfGenerationInput[];
}

export interface PdfmeOptions {
  startY?: number;
  pageWidth?: number;
  pageHeight?: number;
  margin?: number;
  defaultFont?: string;
  defaultFontSize?: number;
}

// =============================================================================
// Main Adapter Class
// =============================================================================

export class TiptapToPdfmeAdapter {
  private currentY: number = 20;
  private pageWidth: number = 210; // A4 width in mm
  private pageHeight: number = 297; // A4 height in mm
  private margin: number = 20;
  private defaultFont: string = "NotoSansCJK-Regular";
  private defaultFontSize: number = 12;

  constructor(options?: PdfmeOptions) {
    if (options) {
      this.currentY = options.startY || 20;
      this.pageWidth = options.pageWidth || 210;
      this.pageHeight = options.pageHeight || 297;
      this.margin = options.margin || 20;
      this.defaultFont = options.defaultFont || "NotoSansCJK-Regular";
      this.defaultFontSize = options.defaultFontSize || 12;
    }
  }

  /**
   * Transform Tiptap JSON to pdfme template and inputs
   */
  transform(tiptapDoc: JSONContent, options?: PdfmeOptions): PdfmeDocument {
    // Reset position for new document
    this.currentY = options?.startY || 20;

    if (options) {
      this.pageWidth = options.pageWidth || this.pageWidth;
      this.pageHeight = options.pageHeight || this.pageHeight;
      this.margin = options.margin || this.margin;
      this.defaultFont = options.defaultFont || this.defaultFont;
      this.defaultFontSize = options.defaultFontSize || this.defaultFontSize;
    }

    const schemas: Schema[] = [];
    const inputs: PdfGenerationInput = {};

    if (tiptapDoc.content) {
      tiptapDoc.content.forEach((block, index) => {
        const blockResult = this.transformBlock(block, index);
        schemas.push(...blockResult.schemas);
        Object.assign(inputs, blockResult.inputs);
      });
    }

    const template: Template = {
      schemas: [schemas],
    };

    return {
      template,
      inputs: [inputs],
    };
  }

  // =============================================================================
  // Block Transformers
  // =============================================================================

  private transformBlock(
    block: JSONContent,
    index: number
  ): { schemas: Schema[]; inputs: PdfGenerationInput } {
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
  ): { schemas: Schema[]; inputs: PdfGenerationInput } {
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
      fontName: this.defaultFont,
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
  ): { schemas: Schema[]; inputs: PdfGenerationInput } {
    const fieldName = `paragraph_${index}`;
    const text = this.extractTextFromContent(block.content);
    const estimatedHeight = this.estimateTextHeight(text, this.defaultFontSize);

    const schema: Schema = {
      name: fieldName,
      type: "text",
      position: { x: this.margin, y: this.currentY },
      width: this.pageWidth - this.margin * 2,
      height: estimatedHeight,
      fontSize: this.defaultFontSize,
      fontName: this.defaultFont,
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
  ): { schemas: Schema[]; inputs: PdfGenerationInput } {
    const schemas: Schema[] = [];
    const inputs: PdfGenerationInput = {};

    if (block.content) {
      block.content.forEach((item, itemIndex) => {
        const fieldName = `list_${index}_${itemIndex}`;
        const text = this.extractTextFromListItem(item);
        const prefix = block.type === "orderedList" ? `${itemIndex + 1}. ` : "• ";
        const fullText = prefix + text;

        const estimatedHeight = this.estimateTextHeight(fullText, this.defaultFontSize);

        const schema: Schema = {
          name: fieldName,
          type: "text",
          position: { x: this.margin + 10, y: this.currentY },
          width: this.pageWidth - this.margin * 2 - 10,
          height: estimatedHeight,
          fontSize: this.defaultFontSize,
          fontName: this.defaultFont,
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
  ): { schemas: Schema[]; inputs: PdfGenerationInput } {
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
      fontName: this.defaultFont,
      fontColor: "#000000",
      borderWidth: 1,
      borderColor: "#000000",
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
  ): { schemas: Schema[]; inputs: PdfGenerationInput } {
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
  ): { schemas: Schema[]; inputs: PdfGenerationInput } {
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
  ): { schemas: Schema[]; inputs: PdfGenerationInput } {
    const fieldName = `blockquote_${index}`;
    const text = this.extractTextFromContent(block.content);
    const estimatedHeight = this.estimateTextHeight(text, this.defaultFontSize);

    const schema: Schema = {
      name: fieldName,
      type: "text",
      position: { x: this.margin + 20, y: this.currentY },
      width: this.pageWidth - this.margin * 2 - 20,
      height: estimatedHeight,
      fontSize: this.defaultFontSize,
      fontName: this.defaultFont,
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
  ): { schemas: Schema[]; inputs: PdfGenerationInput } {
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

  // =============================================================================
  // Helper Methods
  // =============================================================================

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
    return sizes[level as keyof typeof sizes] || this.defaultFontSize;
  }

  private estimateTextHeight(text: string, fontSize: number): number {
    const lineHeight = fontSize * 1.5;
    const charsPerLine = Math.floor((this.pageWidth - this.margin * 2) / (fontSize * 0.6));
    const lines = Math.ceil(text.length / charsPerLine);
    return Math.max(lines * lineHeight, fontSize);
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Transform Tiptap JSON to pdfme format (functional approach)
 */
export const tiptapToPdfmeInputs = (
  tiptapDoc: JSONContent,
  options?: PdfmeOptions
): PdfmeDocument => {
  const adapter = new TiptapToPdfmeAdapter(options);
  return adapter.transform(tiptapDoc, options);
};

/**
 * Create a basic template for text documents
 */
export const createBasicTextTemplate = (options?: PdfmeOptions): Template => {
  const pageWidth = options?.pageWidth || 210;
  const pageHeight = options?.pageHeight || 297;
  const margin = options?.margin || 20;

  return {
    schemas: [
      [
        {
          name: "title",
          type: "text",
          position: { x: margin, y: 20 },
          width: pageWidth - margin * 2,
          height: 20,
          fontSize: 18,
          fontName: "NotoSansCJK-Regular",
          alignment: "center",
          fontColor: "#000000",
        },
        {
          name: "content",
          type: "text",
          position: { x: margin, y: 50 },
          width: pageWidth - margin * 2,
          height: pageHeight - 70,
          fontSize: 12,
          fontName: "NotoSansCJK-Regular",
          lineHeight: 1.5,
          fontColor: "#000000",
        },
      ],
    ],
  };
};

/**
 * Estimate the number of pages needed for content
 */
export const estimatePageCount = (
  tiptapDoc: JSONContent,
  options?: PdfmeOptions
): number => {
  const text = extractAllText(tiptapDoc);
  const pageHeight = options?.pageHeight || 297;
  const margin = options?.margin || 20;
  const fontSize = options?.defaultFontSize || 12;

  const usableHeight = pageHeight - margin * 2;
  const linesPerPage = Math.floor(usableHeight / (fontSize * 1.5));
  const charsPerLine = Math.floor((options?.pageWidth || 210) / (fontSize * 0.6));
  const charsPerPage = linesPerPage * charsPerLine;

  return Math.ceil(text.length / charsPerPage);
};

/**
 * Extract all text from Tiptap JSON
 */
export const extractAllText = (json: JSONContent): string => {
  if (json.type === "text") {
    return json.text || "";
  }

  if (json.content && Array.isArray(json.content)) {
    return json.content.map(extractAllText).join(" ");
  }

  return "";
};

/**
 * Validate pdfme template structure
 */
export const validatePdfmeTemplate = (template: Template): boolean => {
  try {
    if (!template.schemas || !Array.isArray(template.schemas)) return false;

    return template.schemas.every((page) => {
      if (!Array.isArray(page)) return false;
      return page.every((schema) => {
        return (
          schema.name &&
          schema.type &&
          schema.position &&
          typeof schema.width === "number" &&
          typeof schema.height === "number"
        );
      });
    });
  } catch {
    return false;
  }
};

// =============================================================================
// Error Handling
// =============================================================================

export class PdfmeTransformationError extends Error {
  constructor(message: string, public originalBlock?: JSONContent) {
    super(message);
    this.name = "PdfmeTransformationError";
  }
}

/**
 * Safe transformation with error handling
 */
export const safeTiptapToPdfmeInputs = (
  tiptapDoc: JSONContent,
  options?: PdfmeOptions
): { success: true; data: PdfmeDocument } | { success: false; error: string } => {
  try {
    const result = tiptapToPdfmeInputs(tiptapDoc, options);
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown transformation error",
    };
  }
};