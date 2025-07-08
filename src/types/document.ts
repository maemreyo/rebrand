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
  documentType:
    | "report"
    | "article"
    | "form"
    | "contract"
    | "other"
    | "academic"
    | "mathematical";
  language: string;
  confidenceScore: number;
  hasMatematicalContent?: boolean;
  mathComplexity?: "basic" | "intermediate" | "advanced";
  footnoteCount?: number;
}

// =============================================================================
// Block Types (ENHANCED WITH MATH)
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
  | DividerBlock
  | MathBlock // ← Math display blocks
  | FootnoteBlock // ← Footnote definitions
  | CitationBlock // ← Citation blocks
  | TheoremBlock // ← Academic theorem blocks
  | ProofBlock; // ← Mathematical proof blocks

export interface BaseBlock {
  id: string;
  type: string;
  metadata?: {
    confidence?: number;
    sourceContext?: string;
    academicLevel?: "undergraduate" | "graduate" | "research";
  };
}

// Existing blocks (unchanged)
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
// Math and Academic Block Types
// =============================================================================

export interface MathBlock extends BaseBlock {
  type: "math";
  mathType: "inline" | "display";
  latex: string;
  rendered?: string;
  numbered?: boolean;
  label?: string;
  error?: string;
  description?: string; // For accessibility
  complexity?: "basic" | "intermediate" | "advanced";
}

export interface FootnoteBlock extends BaseBlock {
  type: "footnote";
  noteId: string;
  noteNumber?: number;
  content: InlineContent[];
  backref?: string; // Reference back to the citation point
}

export interface CitationBlock extends BaseBlock {
  type: "citation";
  citationKey: string;
  citationType: "numeric" | "author-year" | "footnote";
  pageNumber?: string;
  displayText: string;
  bibEntry?: BibliographyEntry;
}

export interface BibliographyEntry {
  id: string;
  type: "article" | "book" | "inproceedings" | "misc";
  title: string;
  authors: string[];
  year?: number;
  journal?: string;
  volume?: string;
  pages?: string;
  publisher?: string;
  doi?: string;
  url?: string;
}

export interface TheoremBlock extends BaseBlock {
  type: "theorem";
  theoremType: "theorem" | "lemma" | "corollary" | "proposition" | "definition";
  theoremNumber?: string;
  title?: string;
  content: InlineContent[];
  proof?: ProofBlock;
}

export interface ProofBlock extends BaseBlock {
  type: "proof";
  content: CanonicalBlock[];
  proofMethod?: "direct" | "contradiction" | "induction" | "construction";
  qed?: boolean; // End of proof marker
}

// =============================================================================
// Inline Content Types (ENHANCED WITH MATH)
// =============================================================================

export type InlineContent =
  | TextContent
  | FormattedTextContent
  | LinkContent
  | BreakContent
  | MathInlineContent // ← Inline math expressions
  | FootnoteReference // ← Footnote citations
  | CitationReference // ← Bibliography citations
  | SymbolContent; // ← Special mathematical symbols

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
  highlight?: boolean;
  color?: string;
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

// Math inline content
export interface MathInlineContent {
  type: "math";
  latex: string;
  rendered?: string;
  error?: string;
  description?: string; // For accessibility
}

// Footnote reference
export interface FootnoteReference {
  type: "footnoteRef";
  noteId: string;
  noteNumber: number;
  displayNumber?: string; // For custom numbering (e.g., *, †, ‡)
}

// Citation reference
export interface CitationReference {
  type: "citationRef";
  citationKey: string;
  displayText: string;
  citationType: "numeric" | "author-year" | "footnote";
}

// Special symbol content
export interface SymbolContent {
  type: "symbol";
  symbol: string;
  unicode: string;
  latex?: string;
  description?: string;
  category: "greek" | "operator" | "relation" | "arrow" | "set" | "misc";
}

// =============================================================================
// Math-Specific Utility Types
// =============================================================================

export interface MathExpression {
  latex: string;
  complexity: "basic" | "intermediate" | "advanced";
  category:
    | "algebra"
    | "calculus"
    | "geometry"
    | "statistics"
    | "logic"
    | "other";
  symbols: string[];
  description?: string;
  alternativeNotations?: string[];
}

export interface MathValidationResult {
  valid: boolean;
  error?: string;
  suggestions?: string[];
  complexity?: "basic" | "intermediate" | "advanced";
  requiredPackages?: string[];
}

// =============================================================================
// Enhanced Zod Schema Validation
// =============================================================================

const TextFormattingSchema = z.object({
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  underline: z.boolean().optional(),
  strikethrough: z.boolean().optional(),
  code: z.boolean().optional(),
  superscript: z.boolean().optional(),
  subscript: z.boolean().optional(),
  highlight: z.boolean().optional(),
  color: z.string().optional(),
});

const InlineContentSchema: z.ZodType<InlineContent> = z.discriminatedUnion(
  "type",
  [
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
    z.object({
      type: z.literal("math"),
      latex: z.string(),
      rendered: z.string().optional(),
      error: z.string().optional(),
      description: z.string().optional(),
    }),
    z.object({
      type: z.literal("footnoteRef"),
      noteId: z.string(),
      noteNumber: z.number(),
      displayNumber: z.string().optional(),
    }),
    z.object({
      type: z.literal("citationRef"),
      citationKey: z.string(),
      displayText: z.string(),
      citationType: z.enum(["numeric", "author-year", "footnote"]),
    }),
    z.object({
      type: z.literal("symbol"),
      symbol: z.string(),
      unicode: z.string(),
      latex: z.string().optional(),
      description: z.string().optional(),
      category: z.enum([
        "greek",
        "operator",
        "relation",
        "arrow",
        "set",
        "misc",
      ]),
    }),
  ]
);

// =============================================================================
// 🔧 ENHANCED: Zod Schema with Null Handling
// =============================================================================

const DocumentMetadataSchema = z.object({
  title: z.string().optional(),
  author: z.string().optional(),
  subject: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  documentType: z.enum([
    "report",
    "article",
    "form",
    "contract",
    "other",
    "academic",
    "mathematical",
  ]),
  language: z.string(),
  confidenceScore: z.number().min(0).max(1),

  // 🔧 FIX: Allow null values and transform them to undefined
  hasMatematicalContent: z
    .boolean()
    .nullable()
    .optional()
    .transform((val) => val ?? undefined),
  mathComplexity: z
    .enum(["basic", "intermediate", "advanced"])
    .nullable()
    .optional()
    .transform((val) => val ?? undefined),
  footnoteCount: z
    .number()
    .nullable()
    .optional()
    .transform((val) => val ?? undefined),
});

const BaseBlockSchema = z.object({
  id: z.string(),
  type: z.string(),
  metadata: z
    .object({
      confidence: z
        .number()
        .nullable()
        .optional()
        .transform((val) => val ?? undefined),
      sourceContext: z
        .string()
        .nullable()
        .optional()
        .transform((val) => val ?? undefined),
      academicLevel: z
        .enum(["undergraduate", "graduate", "research"])
        .nullable()
        .optional()
        .transform((val) => val ?? undefined),
    })
    .optional(),
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

/**
 * 🔧 ENHANCED: Safe document validation with cleaning
 */
export const validateCanonicalDocument = (doc: unknown): CanonicalDocument => {
  try {
    console.log("=== Document Validation Debug ===");
    console.log(
      "Original document metadata:",
      JSON.stringify((doc as any)?.metadata, null, 2)
    );

    // Clean the document data first
    const cleanedDoc = cleanDocumentData(doc);

    console.log(
      "Cleaned document metadata:",
      JSON.stringify(cleanedDoc?.metadata, null, 2)
    );

    // Validate with Zod
    const validatedDoc = CanonicalDocumentSchema.parse(
      cleanedDoc
    ) as CanonicalDocument;

    console.log("✅ Document validation successful");
    console.log("Final metadata:", validatedDoc.metadata);

    return validatedDoc;
  } catch (error) {
    console.error("❌ Document validation failed:", error);

    if (error instanceof z.ZodError) {
      console.error(
        "Zod validation errors:",
        JSON.stringify(error.errors, null, 2)
      );

      // Log specific field issues
      error.errors.forEach((err) => {
        console.error(`Validation error at ${err.path.join(".")}:`, {
          expected: err.expected,
          received: err.received,
          message: err.message,
          value: err.path.reduce((obj: any, key) => obj?.[key], doc),
        });
      });
    }

    throw error;
  }
};

/**
 * 🔧 ENHANCED: Safe metadata validation
 */
export const validateDocumentMetadata = (
  metadata: unknown
): DocumentMetadata => {
  try {
    console.log("=== Metadata Validation Debug ===");
    console.log("Original metadata:", JSON.stringify(metadata, null, 2));

    // Clean metadata first
    const cleanedMetadata = cleanDocumentData({ metadata })?.metadata;

    console.log("Cleaned metadata:", JSON.stringify(cleanedMetadata, null, 2));

    const validatedMetadata = DocumentMetadataSchema.parse(cleanedMetadata);

    console.log("✅ Metadata validation successful");

    return validatedMetadata;
  } catch (error) {
    console.error("❌ Metadata validation failed:", error);

    if (error instanceof z.ZodError) {
      console.error(
        "Metadata validation errors:",
        JSON.stringify(error.errors, null, 2)
      );
    }

    throw error;
  }
};

/**
 * 🔧 ENHANCED: Safe inline content validation
 */
export const validateInlineContent = (content: unknown): InlineContent => {
  try {
    // Clean the content first
    const cleanedContent = cleanDocumentData({ content })?.content;
    return InlineContentSchema.parse(cleanedContent);
  } catch (error) {
    console.error("Inline content validation failed:", error);
    throw error;
  }
};

// LaTeX validation function
export const validateLatex = (latex: string): MathValidationResult => {
  try {
    if (!latex.trim()) {
      return {
        valid: false,
        error: "Empty LaTeX expression",
        suggestions: ["Add a mathematical expression, e.g., x^2 + y^2 = z^2"],
      };
    }

    // Check for balanced braces
    let braceCount = 0;
    for (const char of latex) {
      if (char === "{") braceCount++;
      if (char === "}") braceCount--;
      if (braceCount < 0) {
        return {
          valid: false,
          error: "Unmatched closing brace",
          suggestions: ["Check that every { has a matching }"],
        };
      }
    }
    if (braceCount !== 0) {
      return {
        valid: false,
        error: "Unmatched opening brace",
        suggestions: ["Check that every { has a matching }"],
      };
    }

    // Check for common LaTeX patterns
    const hasCommands = /\\[a-zA-Z]+/.test(latex);
    const hasSymbols = /[\^_{}]/.test(latex);
    const hasSpecialChars =
      /[αβγδεζηθικλμνξπρστυφχψωΑΒΓΔΕΖΗΘΙΚΛΜΝΞΠΡΣΤΥΦΧΨΩ∑∏∫∂∇∞≤≥≠∈∉⊂⊃∩∪]/.test(
        latex
      );

    let complexity: "basic" | "intermediate" | "advanced" = "basic";
    if (hasCommands && hasSymbols) complexity = "intermediate";
    if ((latex.match(/\\/g) || []).length > 5) complexity = "advanced";

    // Detect required packages
    const requiredPackages: string[] = [];
    if (/\\begin\{(align|equation|matrix|cases)/.test(latex)) {
      requiredPackages.push("amsmath");
    }
    if (/\\mathbb/.test(latex)) {
      requiredPackages.push("amssymb");
    }

    return {
      valid: true,
      complexity,
      requiredPackages:
        requiredPackages.length > 0 ? requiredPackages : undefined,
    };
  } catch (error) {
    return {
      valid: false,
      error: "Invalid LaTeX syntax",
      suggestions: ["Check LaTeX syntax and escape special characters"],
    };
  }
};

// =============================================================================
// Type Guards and Utility Functions
// =============================================================================

export const isMathBlock = (block: CanonicalBlock): block is MathBlock => {
  return block.type === "math";
};

export const isFootnoteBlock = (
  block: CanonicalBlock
): block is FootnoteBlock => {
  return block.type === "footnote";
};

export const isTheoremBlock = (
  block: CanonicalBlock
): block is TheoremBlock => {
  return block.type === "theorem";
};

export const isProofBlock = (block: CanonicalBlock): block is ProofBlock => {
  return block.type === "proof";
};

export const isMathInline = (
  content: InlineContent
): content is MathInlineContent => {
  return content.type === "math";
};

export const isFootnoteRef = (
  content: InlineContent
): content is FootnoteReference => {
  return content.type === "footnoteRef";
};

export const isCitationRef = (
  content: InlineContent
): content is CitationReference => {
  return content.type === "citationRef";
};

export const isSymbolContent = (
  content: InlineContent
): content is SymbolContent => {
  return content.type === "symbol";
};

// Math utility functions
export const extractMathFromDocument = (
  document: CanonicalDocument
): MathExpression[] => {
  const mathExpressions: MathExpression[] = [];

  const processBlocks = (blocks: CanonicalBlock[]) => {
    blocks.forEach((block) => {
      if (isMathBlock(block)) {
        const validation = validateLatex(block.latex);
        mathExpressions.push({
          latex: block.latex,
          complexity: validation.complexity || "basic",
          category: "other", // Would need more sophisticated categorization
          symbols: [], // Would need LaTeX parsing
          description: block.description,
        });
      }

      // Process inline content for math
      if ("content" in block && Array.isArray(block.content)) {
        block.content.forEach((inline) => {
          if (isMathInline(inline)) {
            const validation = validateLatex(inline.latex);
            mathExpressions.push({
              latex: inline.latex,
              complexity: validation.complexity || "basic",
              category: "other",
              symbols: [],
              description: inline.description,
            });
          }
        });
      }
    });
  };

  processBlocks(document.content);
  return mathExpressions;
};

export const generateBlockId = (): string => {
  return `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const generateMathId = (): string => {
  return `math_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const generateFootnoteId = (): string => {
  return `footnote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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

export const createMathBlock = (
  latex: string,
  mathType: "inline" | "display" = "display",
  numbered: boolean = false
): MathBlock => {
  const validation = validateLatex(latex);

  return {
    id: generateMathId(),
    type: "math",
    mathType,
    latex,
    numbered,
    error: validation.valid ? undefined : validation.error,
    complexity: validation.complexity,
  };
};

export const createFootnoteBlock = (
  content: InlineContent[],
  noteId?: string
): FootnoteBlock => {
  return {
    id: generateBlockId(),
    type: "footnote",
    noteId: noteId || generateFootnoteId(),
    content,
  };
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

export class MathProcessingError extends Error {
  constructor(message: string, public latex?: string, public cause?: Error) {
    super(message);
    this.name = "MathProcessingError";
    this.latex = latex;
  }
}

export class FootnoteProcessingError extends Error {
  constructor(message: string, public noteId?: string, public cause?: Error) {
    super(message);
    this.name = "FootnoteProcessingError";
    this.noteId = noteId;
  }
}

// =============================================================================
// Constants for Math Processing
// =============================================================================

export const MATH_CONSTANTS = {
  // LaTeX delimiters
  INLINE_DELIMITERS: ["$", "\\(", "\\)"],
  DISPLAY_DELIMITERS: ["$$", "\\[", "\\]"],

  // Common LaTeX commands
  COMMON_COMMANDS: [
    "frac",
    "sqrt",
    "sum",
    "int",
    "prod",
    "lim",
    "alpha",
    "beta",
    "gamma",
    "delta",
    "epsilon",
    "theta",
    "lambda",
    "mu",
    "pi",
    "sigma",
    "omega",
    "infty",
    "partial",
    "nabla",
    "pm",
    "times",
    "div",
    "cdot",
    "leq",
    "geq",
    "neq",
    "approx",
    "equiv",
    "in",
    "notin",
    "subset",
    "supset",
    "begin",
    "end",
    "left",
    "right",
  ],

  // Math environments
  ENVIRONMENTS: [
    "equation",
    "align",
    "gather",
    "multline",
    "split",
    "matrix",
    "bmatrix",
    "pmatrix",
    "vmatrix",
    "Vmatrix",
    "cases",
    "aligned",
    "gathered",
  ],

  // Academic theorem types
  THEOREM_TYPES: [
    "theorem",
    "lemma",
    "corollary",
    "proposition",
    "definition",
    "example",
    "remark",
    "note",
    "proof",
    "solution",
  ],
} as const;

// =============================================================================
// 🔧 ENHANCED: Safe Validation Functions with Data Cleaning
// =============================================================================

/**
 * Clean document data before validation to handle common issues
 */
function cleanDocumentData(doc: any): any {
  if (!doc || typeof doc !== "object") {
    return doc;
  }

  const cleaned = { ...doc };

  // Clean metadata
  if (cleaned.metadata && typeof cleaned.metadata === "object") {
    const metadata = { ...cleaned.metadata };

    // Convert null values to undefined for optional fields
    if (metadata.hasMatematicalContent === null) {
      metadata.hasMatematicalContent = undefined;
    }
    if (metadata.mathComplexity === null) {
      metadata.mathComplexity = undefined;
    }
    if (metadata.footnoteCount === null) {
      metadata.footnoteCount = undefined;
    }
    if (metadata.title === null) {
      metadata.title = undefined;
    }
    if (metadata.author === null) {
      metadata.author = undefined;
    }
    if (metadata.subject === null) {
      metadata.subject = undefined;
    }
    if (metadata.keywords === null) {
      metadata.keywords = undefined;
    }

    cleaned.metadata = metadata;
  }

  // Clean content blocks
  if (cleaned.content && Array.isArray(cleaned.content)) {
    cleaned.content = cleaned.content.map((block: any) => {
      if (!block || typeof block !== "object") {
        return block;
      }

      const cleanedBlock = { ...block };

      // Clean block metadata
      if (cleanedBlock.metadata && typeof cleanedBlock.metadata === "object") {
        const blockMetadata = { ...cleanedBlock.metadata };

        if (blockMetadata.confidence === null) {
          blockMetadata.confidence = undefined;
        }
        if (blockMetadata.sourceContext === null) {
          blockMetadata.sourceContext = undefined;
        }
        if (blockMetadata.academicLevel === null) {
          blockMetadata.academicLevel = undefined;
        }

        cleanedBlock.metadata = blockMetadata;
      }

      // Clean specific block properties
      if (cleanedBlock.type === "math") {
        if (cleanedBlock.latex === null) {
          cleanedBlock.latex = ""; // Math blocks need valid latex
        }
        if (cleanedBlock.mathType === null) {
          cleanedBlock.mathType = "display";
        }
        if (cleanedBlock.numbered === null) {
          cleanedBlock.numbered = false;
        }
        if (cleanedBlock.error === null) {
          cleanedBlock.error = undefined;
        }
        if (cleanedBlock.rendered === null) {
          cleanedBlock.rendered = undefined;
        }
        if (cleanedBlock.description === null) {
          cleanedBlock.description = undefined;
        }
        if (cleanedBlock.complexity === null) {
          cleanedBlock.complexity = undefined;
        }
      }

      // Clean content arrays
      if (cleanedBlock.content && Array.isArray(cleanedBlock.content)) {
        cleanedBlock.content = cleanedBlock.content.map((inline: any) => {
          if (!inline || typeof inline !== "object") {
            return inline;
          }

          const cleanedInline = { ...inline };

          // Clean null values in inline content
          Object.keys(cleanedInline).forEach((key) => {
            if (cleanedInline[key] === null && key !== "text") {
              cleanedInline[key] = undefined;
            }
          });

          return cleanedInline;
        });
      }

      return cleanedBlock;
    });
  }

  return cleaned;
}

// =============================================================================
// 🔧 NEW: Validation Helper Functions
// =============================================================================

/**
 * Check if a document needs cleaning before validation
 */
export const needsCleaning = (doc: any): boolean => {
  if (!doc || typeof doc !== "object") return false;

  // Check for null values in metadata
  if (doc.metadata) {
    const metadata = doc.metadata;
    if (
      metadata.hasMatematicalContent === null ||
      metadata.mathComplexity === null ||
      metadata.footnoteCount === null ||
      metadata.title === null ||
      metadata.author === null ||
      metadata.subject === null ||
      metadata.keywords === null
    ) {
      return true;
    }
  }

  // Check for null values in content blocks
  if (doc.content && Array.isArray(doc.content)) {
    return doc.content.some((block: any) => {
      if (!block || typeof block !== "object") return false;

      // Check block-level null values
      if (
        block.latex === null ||
        block.mathType === null ||
        block.numbered === null ||
        block.error === null ||
        block.rendered === null ||
        block.description === null ||
        block.complexity === null
      ) {
        return true;
      }

      // Check metadata null values
      if (block.metadata && typeof block.metadata === "object") {
        const metadata = block.metadata;
        if (
          metadata.confidence === null ||
          metadata.sourceContext === null ||
          metadata.academicLevel === null
        ) {
          return true;
        }
      }

      return false;
    });
  }

  return false;
};

/**
 * Get validation summary
 */
export const getValidationSummary = (
  doc: any
): {
  needsCleaning: boolean;
  nullFields: string[];
  blockIssues: number;
} => {
  const nullFields: string[] = [];
  let blockIssues = 0;

  // Check metadata null values
  if (doc?.metadata) {
    const metadata = doc.metadata;
    if (metadata.hasMatematicalContent === null)
      nullFields.push("metadata.hasMatematicalContent");
    if (metadata.mathComplexity === null)
      nullFields.push("metadata.mathComplexity");
    if (metadata.footnoteCount === null)
      nullFields.push("metadata.footnoteCount");
    if (metadata.title === null) nullFields.push("metadata.title");
    if (metadata.author === null) nullFields.push("metadata.author");
    if (metadata.subject === null) nullFields.push("metadata.subject");
    if (metadata.keywords === null) nullFields.push("metadata.keywords");
  }

  // Check content blocks
  if (doc?.content && Array.isArray(doc.content)) {
    doc.content.forEach((block: any, index: number) => {
      if (!block || typeof block !== "object") return;

      let hasIssues = false;

      // Check for null values
      if (block.latex === null) {
        nullFields.push(`content[${index}].latex`);
        hasIssues = true;
      }
      if (block.mathType === null) {
        nullFields.push(`content[${index}].mathType`);
        hasIssues = true;
      }

      if (hasIssues) blockIssues++;
    });
  }

  return {
    needsCleaning: nullFields.length > 0 || blockIssues > 0,
    nullFields,
    blockIssues,
  };
};
