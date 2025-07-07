# Canonical JSON Structure Design

This section details the core TypeScript interfaces and schema validation for the canonical JSON structure used throughout the DocRebrander system.

## 2.1 Core TypeScript Interfaces

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

## 2.2 Schema Validation

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
