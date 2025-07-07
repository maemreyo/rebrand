import { z } from "zod";

// =============================================================================
// Core Document Interfaces
// =============================================================================

export interface CanonicalDocument {
  metadata: DocumentMetadata;
  content: CanonicalBlock[];
  version: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string[];
  documentType: "report" | "article" | "form" | "contract" | "other";
  language: string;
  confidenceScore: number;
}

// =============================================================================
// Block Types
// =============================================================================

export type CanonicalBlock =
  | HeadingBlock
  | ParagraphBlock
  | ListBlock
  | TableBlock
  | ImageBlock
  | CodeBlock
  | BlockquoteBlock
  | MultipleChoiceBlock
  | DividerBlock;

export interface BaseBlock {
  id: string;
  type: string;
  metadata?: {
    confidence?: number;
    sourceContext?: string;
  };
}

export interface HeadingBlock extends BaseBlock {
  type: "heading";
  level: 1 | 2 | 3;
  content: InlineContent[];
}

export interface ParagraphBlock extends BaseBlock {
  type: "paragraph";
  content: InlineContent[];
}

export interface ListBlock extends BaseBlock {
  type: "list";
  listType: "bulleted" | "numbered";
  items: ListItem[];
}

export interface ListItem {
  id: string;
  content: InlineContent[];
  items?: ListItem[]; // For nested lists
}

export interface TableBlock extends BaseBlock {
  type: "table";
  headers: TableRow;
  rows: TableRow[];
  caption?: string;
}

export interface TableRow {
  id: string;
  cells: TableCell[];
}

export interface TableCell {
  id: string;
  content: InlineContent[];
  colspan?: number;
  rowspan?: number;
  isHeader?: boolean;
}

export interface ImageBlock extends BaseBlock {
  type: "image";
  src: string;
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
}

export interface CodeBlock extends BaseBlock {
  type: "codeBlock";
  content: string;
  language?: string;
}

export interface BlockquoteBlock extends BaseBlock {
  type: "blockquote";
  content: CanonicalBlock[];
  citation?: string;
}

export interface MultipleChoiceBlock extends BaseBlock {
  type: "multipleChoice";
  question: InlineContent[];
  options: MultipleChoiceOption[];
  correctAnswer?: number;
}

export interface MultipleChoiceOption {
  id: string;
  content: InlineContent[];
  isCorrect?: boolean;
}

export interface DividerBlock extends BaseBlock {
  type: "divider";
  style?: "solid" | "dashed" | "dotted";
}

// =============================================================================
// Inline Content Types
// =============================================================================

export type InlineContent =
  | TextContent
  | FormattedTextContent
  | LinkContent
  | BreakContent;

export interface TextContent {
  type: "text";
  text: string;
}

export interface FormattedTextContent {
  type: "text";
  text: string;
  formatting: TextFormatting;
}

export interface TextFormatting {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
  superscript?: boolean;
  subscript?: boolean;
}

export interface LinkContent {
  type: "link";
  text: string;
  url: string;
  title?: string;
}

export interface BreakContent {
  type: "break";
  breakType: "soft" | "hard";
}

// =============================================================================
// Zod Schema Validation
// =============================================================================

const TextFormattingSchema = z.object({
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  underline: z.boolean().optional(),
  strikethrough: z.boolean().optional(),
  code: z.boolean().optional(),
  superscript: z.boolean().optional(),
  subscript: z.boolean().optional(),
});

const InlineContentSchema: z.ZodType<InlineContent> = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("text"),
    text: z.string(),
    formatting: TextFormattingSchema.optional(),
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

const DocumentMetadataSchema = z.object({
  title: z.string().optional(),
  author: z.string().optional(),
  subject: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  documentType: z.enum(["report", "article", "form", "contract", "other"]),
  language: z.string(),
  confidenceScore: z.number().min(0).max(1),
});

const BaseBlockSchema = z.object({
  id: z.string(),
  type: z.string(),
  metadata: z.object({
    confidence: z.number().optional(),
    sourceContext: z.string().optional(),
  }).optional(),
});

const CanonicalDocumentSchema = z.object({
  metadata: DocumentMetadataSchema,
  content: z.array(z.any()), // Will be validated by specific block schemas
  version: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// =============================================================================
// Validation Functions
// =============================================================================

export const validateCanonicalDocument = (doc: unknown): CanonicalDocument => {
  return CanonicalDocumentSchema.parse(doc) as CanonicalDocument;
};

export const validateDocumentMetadata = (metadata: unknown): DocumentMetadata => {
  return DocumentMetadataSchema.parse(metadata);
};

export const validateInlineContent = (content: unknown): InlineContent => {
  return InlineContentSchema.parse(content);
};

// =============================================================================
// Error Classes
// =============================================================================

export class DocumentProcessingError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = "DocumentProcessingError";
  }
}

export class DocumentValidationError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = "DocumentValidationError";
    this.details = details;
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

export const generateBlockId = (): string => {
  return `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const createEmptyCanonicalDocument = (): CanonicalDocument => {
  return {
    metadata: {
      documentType: "other",
      language: "en",
      confidenceScore: 0.5,
    },
    content: [],
    version: "1.0",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

export const isTextContent = (content: InlineContent): content is TextContent | FormattedTextContent => {
  return content.type === "text";
};

export const isLinkContent = (content: InlineContent): content is LinkContent => {
  return content.type === "link";
};

export const isBreakContent = (content: InlineContent): content is BreakContent => {
  return content.type === "break";
};