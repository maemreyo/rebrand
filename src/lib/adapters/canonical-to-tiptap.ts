import { JSONContent } from "@tiptap/core";
import {
  CanonicalDocument,
  CanonicalBlock,
  HeadingBlock,
  ParagraphBlock,
  ListBlock,
  TableBlock,
  ImageBlock,
  CodeBlock,
  BlockquoteBlock,
  MultipleChoiceBlock,
  DividerBlock,
  MathBlock,
  FootnoteBlock,
  CitationBlock,
  TheoremBlock,
  ProofBlock,
  InlineContent,
  TextContent,
  FormattedTextContent,
  LinkContent,
  BreakContent,
  MathInlineContent,
  FootnoteReference,
  CitationReference,
  SymbolContent,
  ListItem,
} from "@/types/document";

// =============================================================================
// Main Enhanced Adapter Class
// =============================================================================

export class CanonicalToTiptapAdapter {
  /**
   * Transform a canonical document to Tiptap JSON format with math support
   */
  transform(canonicalDoc: CanonicalDocument): JSONContent {
    return {
      type: "doc",
      content: canonicalDoc.content.map((block) => this.transformBlock(block)),
    };
  }

  /**
   * Transform a single canonical block to Tiptap format (ENHANCED)
   */
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

      //  Math and Academic Content
      case "math":
        return this.transformMath(block as MathBlock);
      case "footnote":
        return this.transformFootnote(block as FootnoteBlock);
      case "citation":
        return this.transformCitation(block as CitationBlock);
      case "theorem":
        return this.transformTheorem(block as TheoremBlock);
      case "proof":
        return this.transformProof(block as ProofBlock);

      default:
        // Fallback to paragraph for unknown types
        return this.transformParagraph(block as ParagraphBlock);
    }
  }

  // =============================================================================
  // Existing Block Transformers (unchanged)
  // =============================================================================

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
      content: block.items.map((item) =>
        this.transformListItem(item, block.listType)
      ),
    };
  }

  private transformListItem(
    item: ListItem,
    listType: "bulleted" | "numbered"
  ): JSONContent {
    const content: JSONContent[] = [
      {
        type: "paragraph",
        content: this.transformInlineContent(item.content),
      },
    ];

    // Handle nested lists
    if (item.items && item.items.length > 0) {
      const nestedListType =
        listType === "numbered" ? "orderedList" : "bulletList";
      content.push({
        type: nestedListType,
        content: item.items.map((nestedItem) =>
          this.transformListItem(nestedItem, listType)
        ),
      });
    }

    return {
      type: "listItem",
      content,
    };
  }

  private transformTable(block: TableBlock): JSONContent {
    // Create header row
    const headerRow: JSONContent = {
      type: "tableRow",
      content: block.headers.cells.map((cell) => ({
        type: "tableHeader",
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

    // Create body rows
    const bodyRows: JSONContent[] = block.rows.map((row) => ({
      type: "tableRow",
      content: row.cells.map((cell) => ({
        type: "tableCell",
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

  // =============================================================================
  // NEW: Math and Academic Block Transformers
  // =============================================================================

  /**
   * Transform math block to Tiptap format
   */
  private transformMath(block: MathBlock): JSONContent {
    if (block.mathType === "inline") {
      // For inline math, we'll embed it in a paragraph
      return {
        type: "paragraph",
        content: [
          {
            type: "mathInline",
            attrs: {
              latex: block.latex,
              rendered: block.rendered,
              error: block.error,
              description: block.description,
              complexity: block.complexity,
            },
          },
        ],
      };
    } else {
      // Display math as a separate block
      return {
        type: "mathDisplay",
        attrs: {
          latex: block.latex,
          rendered: block.rendered,
          numbered: block.numbered || false,
          label: block.label,
          error: block.error,
          description: block.description,
          complexity: block.complexity,
        },
      };
    }
  }

  /**
   * Transform footnote block to Tiptap format
   */
  private transformFootnote(block: FootnoteBlock): JSONContent {
    return {
      type: "footnote",
      attrs: {
        noteId: block.noteId,
        noteNumber: block.noteNumber,
        backref: block.backref,
      },
      content: [
        {
          type: "paragraph",
          content: this.transformInlineContent(block.content),
        },
      ],
    };
  }

  /**
   * Transform citation block to Tiptap format
   */
  private transformCitation(block: CitationBlock): JSONContent {
    return {
      type: "citation",
      attrs: {
        citationKey: block.citationKey,
        citationType: block.citationType,
        pageNumber: block.pageNumber,
        displayText: block.displayText,
        bibEntry: block.bibEntry,
      },
    };
  }

  /**
   * Transform theorem block to Tiptap format
   */
  private transformTheorem(block: TheoremBlock): JSONContent {
    return {
      type: "theorem",
      attrs: {
        theoremType: block.theoremType,
        theoremNumber: block.theoremNumber,
        title: block.title,
      },
      content: [
        {
          type: "paragraph",
          content: this.transformInlineContent(block.content),
        },
        // Include proof if present
        ...(block.proof ? [this.transformProof(block.proof)] : []),
      ],
    };
  }

  /**
   * Transform proof block to Tiptap format
   */
  private transformProof(block: ProofBlock): JSONContent {
    return {
      type: "proof",
      attrs: {
        proofMethod: block.proofMethod,
        qed: block.qed || false,
      },
      content: block.content.map((childBlock) =>
        this.transformBlock(childBlock)
      ),
    };
  }

  // =============================================================================
  // Enhanced Inline Content Transformers
  // =============================================================================

  /**
   * Transform inline content with math support (ENHANCED)
   */
  private transformInlineContent(content: InlineContent[]): JSONContent[] {
    return content.map((item) => {
      switch (item.type) {
        case "text":
          return this.transformText(item);
        case "link":
          return this.transformLink(item);
        case "break":
          return this.transformBreak(item);

        //  Math and Academic Inline Content
        case "math":
          return this.transformMathInline(item as MathInlineContent);
        case "footnoteRef":
          return this.transformFootnoteRef(item as FootnoteReference);
        case "citationRef":
          return this.transformCitationRef(item as CitationReference);
        case "symbol":
          return this.transformSymbol(item as SymbolContent);

        default:
          // Fallback for unknown types
          return {
            type: "text",
            text: (item as any).text || "",
          };
      }
    });
  }

  /**
   * Transform text content (enhanced with more formatting options)
   */
  private transformText(item: TextContent | FormattedTextContent): JSONContent {
    const marks: any[] = [];

    // Check if item has formatting
    if ("formatting" in item && item.formatting) {
      const { formatting } = item;

      if (formatting.bold) marks.push({ type: "bold" });
      if (formatting.italic) marks.push({ type: "italic" });
      if (formatting.underline) marks.push({ type: "underline" });
      if (formatting.strikethrough) marks.push({ type: "strike" });
      if (formatting.code) marks.push({ type: "code" });
      if (formatting.superscript) marks.push({ type: "superscript" });
      if (formatting.subscript) marks.push({ type: "subscript" });

      //  Enhanced formatting
      if (formatting.highlight) marks.push({ type: "highlight" });
      if (formatting.color)
        marks.push({
          type: "textStyle",
          attrs: { color: formatting.color },
        });
    }

    const result: JSONContent = {
      type: "text",
      text: item.text,
    };

    if (marks.length > 0) {
      result.marks = marks;
    }

    return result;
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

  // =============================================================================
  // NEW: Math and Academic Inline Transformers
  // =============================================================================

  /**
   * Transform inline math content
   */
  private transformMathInline(item: MathInlineContent): JSONContent {
    return {
      type: "text",
      text: `$${item.latex}$`, // Keep LaTeX delimiters for now
      marks: [
        {
          type: "mathInline",
          attrs: {
            latex: item.latex,
            rendered: item.rendered,
            error: item.error,
            description: item.description,
          },
        },
      ],
    };
  }

  /**
   * Transform footnote reference
   */
  private transformFootnoteRef(item: FootnoteReference): JSONContent {
    return {
      type: "text",
      text: item.displayNumber || item.noteNumber.toString(),
      marks: [
        {
          type: "footnoteRef",
          attrs: {
            noteId: item.noteId,
            noteNumber: item.noteNumber,
            displayNumber: item.displayNumber,
          },
        },
      ],
    };
  }

  /**
   * Transform citation reference
   */
  private transformCitationRef(item: CitationReference): JSONContent {
    return {
      type: "text",
      text: item.displayText,
      marks: [
        {
          type: "citationRef",
          attrs: {
            citationKey: item.citationKey,
            citationType: item.citationType,
          },
        },
      ],
    };
  }

  /**
   * Transform special symbol content
   */
  private transformSymbol(item: SymbolContent): JSONContent {
    return {
      type: "text",
      text: item.symbol,
      marks: [
        {
          type: "symbol",
          attrs: {
            unicode: item.unicode,
            latex: item.latex,
            description: item.description,
            category: item.category,
          },
        },
      ],
    };
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Transform canonical document to Tiptap JSON (functional approach)
 */
export const canonicalToTiptapJson = (
  canonicalDoc: CanonicalDocument
): JSONContent => {
  const adapter = new CanonicalToTiptapAdapter();
  return adapter.transform(canonicalDoc);
};

/**
 * Transform a single canonical block to Tiptap JSON
 */
export const canonicalBlockToTiptapJson = (
  block: CanonicalBlock
): JSONContent => {
  const adapter = new CanonicalToTiptapAdapter();
  return (adapter as any).transformBlock(block);
};

/**
 * Validate that a Tiptap JSON structure is valid for math content
 */
export const validateTiptapJsonWithMath = (json: JSONContent): boolean => {
  try {
    // Basic validation - check required properties
    if (!json || typeof json !== "object") return false;
    if (!json.type || typeof json.type !== "string") return false;

    // Validate math-specific content
    if (json.type === "mathDisplay" || json.type === "mathInline") {
      if (!json.attrs?.latex || typeof json.attrs.latex !== "string") {
        return false;
      }
    }

    // If it has content, validate recursively
    if (json.content && Array.isArray(json.content)) {
      return json.content.every(validateTiptapJsonWithMath);
    }

    return true;
  } catch {
    return false;
  }
};

/**
 * Extract all math content from a Tiptap JSON structure
 */
export const extractMathFromTiptapJson = (
  json: JSONContent
): Array<{
  type: "inline" | "display";
  latex: string;
  error?: string;
}> => {
  const mathContent: Array<{
    type: "inline" | "display";
    latex: string;
    error?: string;
  }> = [];

  const traverse = (node: JSONContent) => {
    // Check for math blocks
    if (node.type === "mathDisplay") {
      mathContent.push({
        type: "display",
        latex: node.attrs?.latex || "",
        error: node.attrs?.error,
      });
    } else if (node.type === "mathInline") {
      mathContent.push({
        type: "inline",
        latex: node.attrs?.latex || "",
        error: node.attrs?.error,
      });
    }

    // Check for math marks
    if (node.marks) {
      node.marks.forEach((mark) => {
        if (mark.type === "mathInline") {
          mathContent.push({
            type: "inline",
            latex: mark.attrs?.latex || "",
            error: mark.attrs?.error,
          });
        }
      });
    }

    // Traverse children
    if (node.content && Array.isArray(node.content)) {
      node.content.forEach(traverse);
    }
  };

  traverse(json);
  return mathContent;
};

/**
 * Get all text content from a Tiptap JSON structure (math-aware)
 */
export const extractTextFromTiptapJson = (json: JSONContent): string => {
  if (json.type === "text") {
    return json.text || "";
  }

  // Handle math content specially
  if (json.type === "mathDisplay") {
    return `$$${json.attrs?.latex || ""}$$`;
  }

  if (json.type === "mathInline") {
    return `$${json.attrs?.latex || ""}$`;
  }

  if (json.content && Array.isArray(json.content)) {
    return json.content.map(extractTextFromTiptapJson).join("");
  }

  return "";
};

/**
 * Count blocks in a Tiptap JSON structure (including math blocks)
 */
export const countTiptapBlocks = (
  json: JSONContent
): {
  total: number;
  mathBlocks: number;
  mathInline: number;
  footnotes: number;
} => {
  let total = 1;
  let mathBlocks = 0;
  let mathInline = 0;
  let footnotes = 0;

  if (json.type === "mathDisplay") mathBlocks++;
  if (json.type === "mathInline") mathInline++;
  if (json.type === "footnote") footnotes++;

  if (json.content && Array.isArray(json.content)) {
    json.content.forEach((child) => {
      const counts = countTiptapBlocks(child);
      total += counts.total;
      mathBlocks += counts.mathBlocks;
      mathInline += counts.mathInline;
      footnotes += counts.footnotes;
    });
  }

  return { total, mathBlocks, mathInline, footnotes };
};

// =============================================================================
// Error Handling (Enhanced)
// =============================================================================

export class TiptapTransformationError extends Error {
  constructor(message: string, public originalBlock?: CanonicalBlock) {
    super(message);
    this.name = "TiptapTransformationError";
  }
}

export class MathTransformationError extends Error {
  constructor(message: string, public latex?: string, public blockId?: string) {
    super(message);
    this.name = "MathTransformationError";
    this.latex = latex;
    this.blockId = blockId;
  }
}

/**
 * Safe transformation with enhanced error handling
 */
export const safeCanonicalToTiptapJson = (
  canonicalDoc: CanonicalDocument
):
  | { success: true; data: JSONContent }
  | { success: false; error: string; details?: any } => {
  try {
    const result = canonicalToTiptapJson(canonicalDoc);

    // Validate the result
    if (!validateTiptapJsonWithMath(result)) {
      return {
        success: false,
        error: "Generated Tiptap JSON failed validation",
        details: { type: result.type, hasContent: !!result.content },
      };
    }

    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Unknown transformation error",
      details:
        error instanceof TiptapTransformationError
          ? {
              originalBlock: error.originalBlock,
            }
          : undefined,
    };
  }
};
