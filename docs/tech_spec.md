# DocRebrander Technical Specification: AI-Powered Document Processing Pipeline

## Executive Summary

DocRebrander represents a sophisticated document processing system that seamlessly integrates Google Gemini AI, Tiptap rich text editor, and pdfme PDF generation to create a powerful raw text → structured JSON → editable document → PDF pipeline. This specification provides complete implementation guidance for building a production-ready Next.js 14+ TypeScript application with robust error handling, optimal performance, and extensible architecture.

## 1. System Architecture Overview

The DocRebrander system implements a **four-stage pipeline pattern** with strict data validation and transformation at each stage:

1. **Raw Text Analysis** (Gemini AI): Converts unstructured text into standardized JSON
2. **JSON Canonicalization** (Custom Transform): Ensures consistent data structure
3. **Rich Text Editing** (Tiptap): Provides visual editing capabilities
4. **PDF Generation** (pdfme): Creates publication-ready documents

**Key Design Principles:**

- **Schema-first approach** with TypeScript interfaces ensuring type safety
- **Adapter pattern** for seamless data transformation between systems
- **Error boundary pattern** with comprehensive fallback mechanisms
- **Performance optimization** through caching and parallel processing

## 2. Canonical JSON Structure Design

### 2.1 Core TypeScript Interfaces

```typescript
interface CanonicalDocument {
  metadata: DocumentMetadata;
  content: CanonicalBlock[];
  version: string;
  createdAt: string;
  updatedAt: string;
}

interface DocumentMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string[];
  documentType: "report" | "article" | "form" | "contract" | "other";
  language: string;
  confidenceScore: number;
}

type CanonicalBlock =
  | HeadingBlock
  | ParagraphBlock
  | ListBlock
  | TableBlock
  | ImageBlock
  | CodeBlock
  | BlockquoteBlock
  | MultipleChoiceBlock
  | DividerBlock;

interface BaseBlock {
  id: string;
  type: string;
  metadata?: {
    confidence?: number;
    sourceContext?: string;
  };
}

interface HeadingBlock extends BaseBlock {
  type: "heading";
  level: 1 | 2 | 3;
  content: InlineContent[];
}

interface ParagraphBlock extends BaseBlock {
  type: "paragraph";
  content: InlineContent[];
}

interface ListBlock extends BaseBlock {
  type: "list";
  listType: "bulleted" | "numbered";
  items: ListItem[];
}

interface ListItem {
  id: string;
  content: InlineContent[];
  items?: ListItem[]; // For nested lists
}

interface TableBlock extends BaseBlock {
  type: "table";
  headers: TableRow;
  rows: TableRow[];
  caption?: string;
}

interface TableRow {
  id: string;
  cells: TableCell[];
}

interface TableCell {
  id: string;
  content: InlineContent[];
  colspan?: number;
  rowspan?: number;
  isHeader?: boolean;
}

interface ImageBlock extends BaseBlock {
  type: "image";
  src: string;
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
}

interface CodeBlock extends BaseBlock {
  type: "codeBlock";
  content: string;
  language?: string;
}

interface BlockquoteBlock extends BaseBlock {
  type: "blockquote";
  content: CanonicalBlock[];
  citation?: string;
}

interface MultipleChoiceBlock extends BaseBlock {
  type: "multipleChoice";
  question: InlineContent[];
  options: MultipleChoiceOption[];
  correctAnswer?: number;
}

interface MultipleChoiceOption {
  id: string;
  content: InlineContent[];
  isCorrect?: boolean;
}

interface DividerBlock extends BaseBlock {
  type: "divider";
  style?: "solid" | "dashed" | "dotted";
}

type InlineContent =
  | TextContent
  | FormattedTextContent
  | LinkContent
  | BreakContent;

interface TextContent {
  type: "text";
  text: string;
}

interface FormattedTextContent {
  type: "text";
  text: string;
  formatting: TextFormatting;
}

interface TextFormatting {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
  superscript?: boolean;
  subscript?: boolean;
}

interface LinkContent {
  type: "link";
  text: string;
  url: string;
  title?: string;
}

interface BreakContent {
  type: "break";
  breakType: "soft" | "hard";
}
```

### 2.2 Schema Validation

```typescript
import { z } from "zod";

const InlineContentSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("text"),
    text: z.string(),
    formatting: z
      .object({
        bold: z.boolean().optional(),
        italic: z.boolean().optional(),
        underline: z.boolean().optional(),
        strikethrough: z.boolean().optional(),
        code: z.boolean().optional(),
        superscript: z.boolean().optional(),
        subscript: z.boolean().optional(),
      })
      .optional(),
  }),
  z.object({
    type: z.literal("link"),
    text: z.string(),
    url: z.string().url(),
    title: z.string().optional(),
  }),
  z.object({
    type: z.literal("break"),
    breakType: z.enum(["soft", "hard"]),
  }),
]);

const CanonicalDocumentSchema = z.object({
  metadata: z.object({
    title: z.string().optional(),
    author: z.string().optional(),
    subject: z.string().optional(),
    keywords: z.array(z.string()).optional(),
    documentType: z.enum(["report", "article", "form", "contract", "other"]),
    language: z.string(),
    confidenceScore: z.number().min(0).max(1),
  }),
  content: z.array(z.any()), // Defined separately for each block type
  version: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const validateCanonicalDocument = (doc: unknown): CanonicalDocument => {
  return CanonicalDocumentSchema.parse(doc);
};
```

## 3. Gemini AI Integration and Prompt Engineering

### 3.1 Optimal Gemini Configuration

```typescript
import { GoogleGenerativeAI, GenerationConfig } from "@google/generative-ai";

const GEMINI_CONFIG: GenerationConfig = {
  temperature: 0.1,
  topP: 0.9,
  topK: 25,
  maxOutputTokens: 8192,
  responseMimeType: "application/json",
  responseSchema: {
    type: "object",
    properties: {
      metadata: {
        type: "object",
        properties: {
          title: { type: "string", nullable: true },
          author: { type: "string", nullable: true },
          subject: { type: "string", nullable: true },
          keywords: {
            type: "array",
            items: { type: "string" },
            nullable: true,
          },
          documentType: {
            type: "string",
            enum: ["report", "article", "form", "contract", "other"],
          },
          language: { type: "string" },
          confidenceScore: { type: "number", minimum: 0, maximum: 1 },
        },
        required: ["documentType", "language", "confidenceScore"],
      },
      content: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            type: {
              type: "string",
              enum: [
                "heading",
                "paragraph",
                "list",
                "table",
                "image",
                "codeBlock",
                "blockquote",
                "multipleChoice",
                "divider",
              ],
            },
          },
          required: ["id", "type"],
        },
      },
      version: { type: "string" },
      createdAt: { type: "string" },
      updatedAt: { type: "string" },
    },
    required: ["metadata", "content", "version", "createdAt", "updatedAt"],
  },
};

class GeminiDocumentProcessor {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: GEMINI_CONFIG,
    });
  }

  async processDocument(rawText: string): Promise<CanonicalDocument> {
    const prompt = this.buildAnalysisPrompt(rawText);

    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const jsonString = response.text();

      const parsedDocument = JSON.parse(jsonString);
      return validateCanonicalDocument(parsedDocument);
    } catch (error) {
      throw new DocumentProcessingError(
        "Failed to process document with Gemini AI",
        error
      );
    }
  }

  private buildAnalysisPrompt(rawText: string): string {
    return `
SYSTEM: You are a precise document analysis AI that converts raw text into structured JSON format. Your task is to analyze the provided text and extract it into a canonical document structure.

ROLE: Expert document analyzer specializing in content structure identification and data extraction.

TASK: Convert the following raw text into a structured JSON document following the exact schema provided. Analyze the content to identify document structure, formatting, and semantic elements.

INSTRUCTIONS:
1. Analyze the text to identify document structure (headings, paragraphs, lists, tables, etc.)
2. Extract inline formatting (bold, italic, underline) based on textual cues
3. Identify and structure any tabular data
4. Detect code blocks, quotes, and special content
5. Generate appropriate metadata including document type and confidence score
6. Assign unique IDs to all blocks and elements
7. Maintain original content while improving structure

CONSTRAINTS:
- Return only valid JSON matching the provided schema
- Use null for missing information
- Preserve original text content exactly
- Assign confidence scores based on clarity of structure identification
- Generate ISO 8601 timestamps for createdAt and updatedAt
- Use version "1.0" for initial processing

EXAMPLES:

<example>
<input>
# Financial Report Q4 2024

## Executive Summary
Our company performed **exceptionally well** in Q4 2024, with revenue increasing by 15% compared to the previous quarter.

### Key Metrics
- Revenue: $2.5M
- Profit: $450K
- Customer Growth: 12%

## Detailed Analysis
The strong performance can be attributed to several factors:
1. Improved marketing campaigns
2. Enhanced product features
3. Better customer retention

| Department | Q3 Revenue | Q4 Revenue | Growth |
|------------|------------|------------|---------|
| Sales      | $1.2M      | $1.4M      | 16.7%   |
| Marketing  | $800K      | $900K      | 12.5%   |
| Support    | $300K      | $350K      | 16.7%   |
</input>
<output>
{
  "metadata": {
    "title": "Financial Report Q4 2024",
    "documentType": "report",
    "language": "en",
    "confidenceScore": 0.95
  },
  "content": [
    {
      "id": "h1-1",
      "type": "heading",
      "level": 1,
      "content": [
        {
          "type": "text",
          "text": "Financial Report Q4 2024"
        }
      ]
    },
    {
      "id": "h2-1",
      "type": "heading",
      "level": 2,
      "content": [
        {
          "type": "text",
          "text": "Executive Summary"
        }
      ]
    },
    {
      "id": "p-1",
      "type": "paragraph",
      "content": [
        {
          "type": "text",
          "text": "Our company performed "
        },
        {
          "type": "text",
          "text": "exceptionally well",
          "formatting": {
            "bold": true
          }
        },
        {
          "type": "text",
          "text": " in Q4 2024, with revenue increasing by 15% compared to the previous quarter."
        }
      ]
    },
    {
      "id": "h3-1",
      "type": "heading",
      "level": 3,
      "content": [
        {
          "type": "text",
          "text": "Key Metrics"
        }
      ]
    },
    {
      "id": "list-1",
      "type": "list",
      "listType": "bulleted",
      "items": [
        {
          "id": "li-1",
          "content": [
            {
              "type": "text",
              "text": "Revenue: $2.5M"
            }
          ]
        },
        {
          "id": "li-2",
          "content": [
            {
              "type": "text",
              "text": "Profit: $450K"
            }
          ]
        },
        {
          "id": "li-3",
          "content": [
            {
              "type": "text",
              "text": "Customer Growth: 12%"
            }
          ]
        }
      ]
    },
    {
      "id": "table-1",
      "type": "table",
      "headers": {
        "id": "row-header",
        "cells": [
          {
            "id": "cell-h1",
            "content": [
              {
                "type": "text",
                "text": "Department"
              }
            ],
            "isHeader": true
          },
          {
            "id": "cell-h2",
            "content": [
              {
                "type": "text",
                "text": "Q3 Revenue"
              }
            ],
            "isHeader": true
          },
          {
            "id": "cell-h3",
            "content": [
              {
                "type": "text",
                "text": "Q4 Revenue"
              }
            ],
            "isHeader": true
          },
          {
            "id": "cell-h4",
            "content": [
              {
                "type": "text",
                "text": "Growth"
              }
            ],
            "isHeader": true
          }
        ]
      },
      "rows": [
        {
          "id": "row-1",
          "cells": [
            {
              "id": "cell-1-1",
              "content": [
                {
                  "type": "text",
                  "text": "Sales"
                }
              ]
            },
            {
              "id": "cell-1-2",
              "content": [
                {
                  "type": "text",
                  "text": "$1.2M"
                }
              ]
            },
            {
              "id": "cell-1-3",
              "content": [
                {
                  "type": "text",
                  "text": "$1.4M"
                }
              ]
            },
            {
              "id": "cell-1-4",
              "content": [
                {
                  "type": "text",
                  "text": "16.7%"
                }
              ]
            }
          ]
        }
      ]
    }
  ],
  "version": "1.0",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
</output>
</example>

INPUT TEXT:
${rawText}

OUTPUT JSON:`;
  }
}
```

### 3.2 Error Handling and Fallbacks

```typescript
class DocumentProcessingError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = "DocumentProcessingError";
  }
}

class GeminiDocumentProcessor {
  async processDocumentWithFallbacks(
    rawText: string
  ): Promise<CanonicalDocument> {
    const strategies = [
      () => this.processDocument(rawText),
      () => this.processWithSimplifiedSchema(rawText),
      () => this.processWithBasicStructure(rawText),
      () => this.createFallbackDocument(rawText),
    ];

    for (const strategy of strategies) {
      try {
        return await strategy();
      } catch (error) {
        console.warn("Processing strategy failed:", error);
        continue;
      }
    }

    throw new DocumentProcessingError("All processing strategies failed");
  }

  private async processWithSimplifiedSchema(
    rawText: string
  ): Promise<CanonicalDocument> {
    // Simplified schema with reduced complexity
    const simplifiedConfig = {
      ...GEMINI_CONFIG,
      responseSchema: {
        type: "object",
        properties: {
          metadata: {
            type: "object",
            properties: {
              documentType: {
                type: "string",
                enum: ["report", "article", "form", "contract", "other"],
              },
              language: { type: "string" },
              confidenceScore: { type: "number" },
            },
          },
          content: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                type: { type: "string" },
                content: { type: "array" },
              },
            },
          },
        },
      },
    };

    // Process with simplified schema
    return this.processWithConfig(rawText, simplifiedConfig);
  }

  private createFallbackDocument(rawText: string): CanonicalDocument {
    return {
      metadata: {
        documentType: "other",
        language: "en",
        confidenceScore: 0.5,
      },
      content: [
        {
          id: "p-fallback",
          type: "paragraph",
          content: [
            {
              type: "text",
              text: rawText,
            },
          ],
        },
      ],
      version: "1.0",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}
```

## 4. Data Transformation Adapters

### 4.1 Canonical to Tiptap JSON Adapter

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

### 4.2 Tiptap to pdfme Adapter

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
```

## 5. Next.js Application Implementation

### 5.1 Main Document Processing Hook

```typescript
// hooks/useDocumentProcessing.ts
import { useState, useCallback } from "react";
import { CanonicalDocument } from "@/types/document";
import { JSONContent } from "@tiptap/core";

export const useDocumentProcessing = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canonicalDocument, setCanonicalDocument] =
    useState<CanonicalDocument | null>(null);
  const [tiptapContent, setTiptapContent] = useState<JSONContent | null>(null);

  const processRawText = useCallback(async (rawText: string) => {
    setIsProcessing(true);
    setError(null);

    try {
      const geminiProcessor = new GeminiDocumentProcessor(
        process.env.NEXT_PUBLIC_GEMINI_API_KEY!
      );
      const canonical = await geminiProcessor.processDocumentWithFallbacks(
        rawText
      );

      const tiptapAdapter = new CanonicalToTiptapAdapter();
      const tiptapDoc = tiptapAdapter.transform(canonical);

      setCanonicalDocument(canonical);
      setTiptapContent(tiptapDoc);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Processing failed");
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const generatePDF = useCallback(async (tiptapDoc: JSONContent) => {
    try {
      const pdfmeAdapter = new TiptapToPdfmeAdapter();
      const { template, inputs } = pdfmeAdapter.transform(tiptapDoc);

      const { generate } = await import("@pdfme/generator");
      const pdf = await generate({
        template,
        inputs,
      });

      // Create blob and download
      const blob = new Blob([pdf], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "document.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF generation failed");
    }
  }, []);

  return {
    isProcessing,
    error,
    canonicalDocument,
    tiptapContent,
    processRawText,
    generatePDF,
  };
};
```

### 5.2 Document Editor Component

```typescript
// components/DocumentEditor.tsx
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { JSONContent } from "@tiptap/core";
import { useCallback } from "react";

interface DocumentEditorProps {
  initialContent?: JSONContent;
  onContentChange?: (content: JSONContent) => void;
  onGeneratePDF?: (content: JSONContent) => void;
}

export const DocumentEditor: React.FC<DocumentEditorProps> = ({
  initialContent,
  onContentChange,
  onGeneratePDF,
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Image,
      Link.configure({
        openOnClick: false,
      }),
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      onContentChange?.(json);
    },
  });

  const handleGeneratePDF = useCallback(() => {
    if (editor) {
      const content = editor.getJSON();
      onGeneratePDF?.(content);
    }
  }, [editor, onGeneratePDF]);

  if (!editor) {
    return <div>Loading editor...</div>;
  }

  return (
    <div className="document-editor">
      <div className="editor-toolbar">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive("bold") ? "is-active" : ""}
        >
          Bold
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive("italic") ? "is-active" : ""}
        >
          Italic
        </button>
        <button
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          className={
            editor.isActive("heading", { level: 1 }) ? "is-active" : ""
          }
        >
          H1
        </button>
        <button
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          className={
            editor.isActive("heading", { level: 2 }) ? "is-active" : ""
          }
        >
          H2
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive("bulletList") ? "is-active" : ""}
        >
          Bullet List
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive("orderedList") ? "is-active" : ""}
        >
          Ordered List
        </button>
        <button
          onClick={() =>
            editor
              .chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run()
          }
        >
          Insert Table
        </button>
        <button onClick={handleGeneratePDF} className="generate-pdf-btn">
          Generate PDF
        </button>
      </div>
      <EditorContent editor={editor} className="editor-content" />
    </div>
  );
};
```

### 5.3 Main Application Component

```typescript
// components/DocRebranderApp.tsx
import { useState } from "react";
import { DocumentEditor } from "./DocumentEditor";
import { useDocumentProcessing } from "@/hooks/useDocumentProcessing";

export const DocRebranderApp: React.FC = () => {
  const [rawText, setRawText] = useState("");
  const {
    isProcessing,
    error,
    canonicalDocument,
    tiptapContent,
    processRawText,
    generatePDF,
  } = useDocumentProcessing();

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rawText.trim()) {
      await processRawText(rawText);
    }
  };

  return (
    <div className="app-container">
      <h1>DocRebrander</h1>

      {!tiptapContent && (
        <div className="input-section">
          <form onSubmit={handleTextSubmit}>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste your raw text here..."
              className="text-input"
              rows={10}
              disabled={isProcessing}
            />
            <button
              type="submit"
              disabled={isProcessing || !rawText.trim()}
              className="process-btn"
            >
              {isProcessing ? "Processing..." : "Process Text"}
            </button>
          </form>
        </div>
      )}

      {error && <div className="error-message">Error: {error}</div>}

      {tiptapContent && (
        <div className="editor-section">
          <h2>Edit Your Document</h2>
          <DocumentEditor
            initialContent={tiptapContent}
            onGeneratePDF={generatePDF}
          />
        </div>
      )}

      {canonicalDocument && (
        <div className="debug-section">
          <h3>Debug Information</h3>
          <details>
            <summary>Canonical Document Structure</summary>
            <pre>{JSON.stringify(canonicalDocument, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  );
};
```

## 6. Performance Optimization and Caching

### 6.1 Document Processing Cache

```typescript
// utils/documentCache.ts
import { LRUCache } from "lru-cache";

class DocumentProcessingCache {
  private cache = new LRUCache<string, CanonicalDocument>({
    max: 100,
    ttl: 1000 * 60 * 60 * 24, // 24 hours
  });

  generateKey(rawText: string): string {
    return Buffer.from(rawText).toString("base64").slice(0, 32);
  }

  get(rawText: string): CanonicalDocument | undefined {
    const key = this.generateKey(rawText);
    return this.cache.get(key);
  }

  set(rawText: string, document: CanonicalDocument): void {
    const key = this.generateKey(rawText);
    this.cache.set(key, document);
  }

  clear(): void {
    this.cache.clear();
  }
}

export const documentCache = new DocumentProcessingCache();
```

### 6.2 Optimized Gemini Processing

```typescript
// Enhanced GeminiDocumentProcessor with caching
class GeminiDocumentProcessor {
  async processDocumentWithCaching(
    rawText: string
  ): Promise<CanonicalDocument> {
    // Check cache first
    const cached = documentCache.get(rawText);
    if (cached) {
      return cached;
    }

    // Process if not cached
    const document = await this.processDocumentWithFallbacks(rawText);

    // Cache the result
    documentCache.set(rawText, document);

    return document;
  }
}
```

## 7. Error Handling and Monitoring

### 7.1 Comprehensive Error Boundaries

```typescript
// components/ErrorBoundary.tsx
import React from "react";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

export class ErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("DocumentProcessing Error:", error, errorInfo);

    // Log to monitoring service
    this.logError(error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });
  }

  private logError(error: Error, errorInfo: React.ErrorInfo) {
    // Integration with monitoring service (e.g., Sentry, LogRocket)
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "exception", {
        description: error.message,
        fatal: false,
      });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <p>
            We're sorry, but something went wrong while processing your
            document.
          </p>
          <details>
            <summary>Error Details</summary>
            <pre>{this.state.error?.message}</pre>
            <pre>{this.state.errorInfo?.componentStack}</pre>
          </details>
          <button onClick={() => window.location.reload()}>Reload Page</button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

## 8. Production Deployment Considerations

### 8.1 Environment Configuration

```typescript
// lib/config.ts
export const config = {
  gemini: {
    apiKey: process.env.GEMINI_API_KEY!,
    model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
    timeout: parseInt(process.env.GEMINI_TIMEOUT || "30000"),
    maxRetries: parseInt(process.env.GEMINI_MAX_RETRIES || "3"),
  },
  cache: {
    enabled: process.env.NODE_ENV === "production",
    ttl: parseInt(process.env.CACHE_TTL || "86400000"), // 24 hours
  },
  monitoring: {
    enabled: process.env.NODE_ENV === "production",
    sentry: {
      dsn: process.env.SENTRY_DSN,
    },
  },
};

// Validate required environment variables
const requiredEnvVars = ["GEMINI_API_KEY"];
requiredEnvVars.forEach((varName) => {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
});
```

### 8.2 API Routes for Server-Side Processing

```typescript
// pages/api/process-document.ts
import { NextApiRequest, NextApiResponse } from "next";
import { GeminiDocumentProcessor } from "@/lib/gemini-processor";
import { CanonicalToTiptapAdapter } from "@/lib/adapters";
import { validateCanonicalDocument } from "@/lib/validation";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { rawText } = req.body;

    if (!rawText || typeof rawText !== "string") {
      return res.status(400).json({ error: "Invalid input" });
    }

    const processor = new GeminiDocumentProcessor(process.env.GEMINI_API_KEY!);
    const canonicalDoc = await processor.processDocumentWithCaching(rawText);

    const adapter = new CanonicalToTiptapAdapter();
    const tiptapDoc = adapter.transform(canonicalDoc);

    res.status(200).json({
      canonical: canonicalDoc,
      tiptap: tiptapDoc,
    });
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({
      error: "Processing failed",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
```

## Implementation Timeline and Next Steps

### Phase 1: Core Infrastructure (Weeks 1-2)

1. Set up Next.js 14+ project with TypeScript
2. Implement canonical JSON structure and validation
3. Create Gemini AI integration with basic prompt
4. Build fundamental adapter patterns

### Phase 2: Editor Integration (Weeks 3-4)

1. Integrate Tiptap with custom extensions
2. Implement canonical-to-Tiptap adapter
3. Build rich text editor UI components
4. Add comprehensive error handling

### Phase 3: PDF Generation (Weeks 5-6)

1. Integrate pdfme library
2. Implement Tiptap-to-pdfme adapter
3. Create flexible PDF template system
4. Add PDF generation UI and controls

### Phase 4: Optimization and Production (Weeks 7-8)

1. Implement caching and performance optimization
2. Add comprehensive monitoring and logging
3. Create production deployment configuration
4. Conduct thorough testing and documentation

This comprehensive technical specification provides a complete roadmap for implementing DocRebrander with production-ready code examples, robust error handling, and scalable architecture patterns. The system leverages the latest capabilities of each technology while maintaining data integrity and user experience throughout the document processing pipeline.
