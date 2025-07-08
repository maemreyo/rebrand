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
    // 🔧 FIX 1: Defensive check for canonicalDoc.content
    if (!canonicalDoc?.content || !Array.isArray(canonicalDoc.content)) {
      console.warn(
        "canonicalDoc.content is undefined or not an array:",
        canonicalDoc
      );
      return {
        type: "doc",
        content: [],
      };
    }

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

  /**
   * 🔧 ENHANCED: Transform heading with debugging
   */
  private transformHeading(block: HeadingBlock): JSONContent {
    console.log("=== transformHeading Debug ===");
    console.log("Input block:", JSON.stringify(block, null, 2));

    const transformedContent = this.transformInlineContent(block.content || []);

    const result = {
      type: "heading",
      attrs: {
        level: block.level || 1,
      },
      content: transformedContent,
    };

    console.log("Heading transform result:", JSON.stringify(result, null, 2));
    return result;
  }

  /**
   * 🔧 ENHANCED: Transform paragraph with debugging
   */
  private transformParagraph(block: ParagraphBlock): JSONContent {
    console.log("=== transformParagraph Debug ===");
    console.log("Input block:", JSON.stringify(block, null, 2));

    const transformedContent = this.transformInlineContent(block.content || []);

    const result = {
      type: "paragraph",
      content: transformedContent,
    };

    console.log("Paragraph transform result:", JSON.stringify(result, null, 2));
    return result;
  }

  private transformList(block: ListBlock): JSONContent {
    // 🔧 FIX 4: Defensive check for block.items
    if (!block.items || !Array.isArray(block.items)) {
      console.warn("ListBlock.items is undefined or not an array:", block);
      return {
        type: "paragraph",
        content: [{ type: "text", text: "" }],
      };
    }

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
        content: this.transformInlineContent(item.content || []), // 🔧 FIX 5: Fallback to empty array
      },
    ];

    // Handle nested lists with defensive check
    if (item.items && Array.isArray(item.items) && item.items.length > 0) {
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
    // 🔧 FIX 6: Defensive checks for table structure
    if (!block.headers?.cells || !Array.isArray(block.headers.cells)) {
      console.warn(
        "TableBlock.headers.cells is undefined or not an array:",
        block
      );
      return {
        type: "paragraph",
        content: [{ type: "text", text: "Invalid table structure" }],
      };
    }

    if (!block.rows || !Array.isArray(block.rows)) {
      console.warn("TableBlock.rows is undefined or not an array:", block);
      return {
        type: "paragraph",
        content: [{ type: "text", text: "Invalid table structure" }],
      };
    }

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
            content: this.transformInlineContent(cell.content || []),
          },
        ],
      })),
    };

    // Create body rows
    const bodyRows: JSONContent[] = block.rows.map((row) => ({
      type: "tableRow",
      content: (row.cells || []).map((cell) => ({
        type: "tableCell",
        attrs: {
          colspan: cell.colspan || 1,
          rowspan: cell.rowspan || 1,
        },
        content: [
          {
            type: "paragraph",
            content: this.transformInlineContent(cell.content || []),
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
    // 🔧 FIX 3: Defensive check for block.content
    if (!block.content || !Array.isArray(block.content)) {
      console.warn(
        "BlockquoteBlock.content is undefined or not an array:",
        block
      );
      return {
        type: "blockquote",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "" }],
          },
        ],
      };
    }

    return {
      type: "blockquote",
      content: block.content.map((childBlock) =>
        this.transformBlock(childBlock)
      ),
    };
  }

  private transformMultipleChoice(block: MultipleChoiceBlock): JSONContent {
    return {
      type: "multipleChoice",
      attrs: {
        question: this.transformInlineContent(block.question || []),
        options: (block.options || []).map((option) => ({
          id: option.id,
          content: this.transformInlineContent(option.content || []),
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

  // 🔧 FIX 7: Add comprehensive error handling for math blocks
  private transformMath(block: MathBlock): JSONContent {
    if (!block.latex) {
      console.warn("MathBlock.latex is undefined:", block);
      return {
        type: "paragraph",
        content: [{ type: "text", text: "[Invalid math block]" }],
      };
    }

    if (block.mathType === "inline") {
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
            },
          },
        ],
      };
    } else {
      return {
        type: "mathDisplay",
        attrs: {
          latex: block.latex,
          rendered: block.rendered,
          error: block.error,
          description: block.description,
          numbered: block.numbered || false,
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
   * 🔧 ENHANCED: Transform inline content with detailed logging
   */
  private transformInlineContent(content: InlineContent[]): JSONContent[] {
    // 🔧 FIX: Add comprehensive debugging
    console.log("=== transformInlineContent Debug ===");
    console.log("Input content:", JSON.stringify(content, null, 2));
    console.log("Content type:", typeof content);
    console.log("Content is array:", Array.isArray(content));
    console.log("Content length:", content?.length || "undefined");

    if (!content || !Array.isArray(content)) {
      console.warn(
        "⚠️  transformInlineContent received invalid content:",
        content
      );
      return [
        {
          type: "text",
          text: "[Content missing or invalid]",
        },
      ];
    }

    if (content.length === 0) {
      console.warn("⚠️  transformInlineContent received empty content array");
      return [
        {
          type: "text",
          text: "[Empty content]",
        },
      ];
    }

    const transformedContent = content.map((item, index) => {
      console.log(
        `Transforming inline item ${index}:`,
        JSON.stringify(item, null, 2)
      );

      switch (item.type) {
        case "text":
          const textResult = this.transformText(item);
          console.log(
            `Text transform result ${index}:`,
            JSON.stringify(textResult, null, 2)
          );
          return textResult;

        case "link":
          const linkResult = this.transformLink(item);
          console.log(
            `Link transform result ${index}:`,
            JSON.stringify(linkResult, null, 2)
          );
          return linkResult;

        case "break":
          return this.transformBreak(item);

        case "math":
          console.log(`Found inline math ${index}:`, item);
          return this.transformMathInline(item as MathInlineContent);

        case "footnoteRef":
          return this.transformFootnoteRef(item as FootnoteReference);

        case "citationRef":
          return this.transformCitationRef(item as CitationReference);

        case "symbol":
          return this.transformSymbol(item as SymbolContent);

        default:
          console.warn(`Unknown inline content type: ${item.type}`, item);
          return {
            type: "text",
            text: (item as any).text || `[Unknown: ${item.type}]`,
          };
      }
    });

    console.log(
      "Final transformed content:",
      JSON.stringify(transformedContent, null, 2)
    );
    return transformedContent;
  }

  /**
   * 🔧 ENHANCED: Transform text with better debugging
   */
  private transformText(item: TextContent | FormattedTextContent): JSONContent {
    console.log("=== transformText Debug ===");
    console.log("Input item:", JSON.stringify(item, null, 2));

    if (!item.text) {
      console.warn("⚠️  Text item missing text property:", item);
      return {
        type: "text",
        text: "[Missing text content]",
      };
    }

    const marks = [];

    if ("formatting" in item && item.formatting) {
      console.log("Processing formatting:", item.formatting);

      if (item.formatting.bold) marks.push({ type: "bold" });
      if (item.formatting.italic) marks.push({ type: "italic" });
      if (item.formatting.underline) marks.push({ type: "underline" });
      if (item.formatting.strikethrough) marks.push({ type: "strike" });
      if (item.formatting.code) marks.push({ type: "code" });
      if (item.formatting.superscript) marks.push({ type: "superscript" });
      if (item.formatting.subscript) marks.push({ type: "subscript" });
    }

    const result = {
      type: "text",
      text: item.text,
      ...(marks.length > 0 && { marks }),
    };

    console.log("Text transform result:", JSON.stringify(result, null, 2));
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
// 🔧 FIX 9: Enhanced error handling wrapper
export const safeCanonicalToTiptapJson = (
  canonicalDoc: CanonicalDocument
):
  | { success: true; data: JSONContent }
  | { success: false; error: string; details?: any } => {
  try {
    // Pre-validate input
    if (!canonicalDoc) {
      return {
        success: false,
        error: "CanonicalDocument is null or undefined",
        details: { input: canonicalDoc },
      };
    }

    if (!canonicalDoc.content) {
      return {
        success: false,
        error: "CanonicalDocument.content is undefined",
        details: {
          document: canonicalDoc,
          contentType: typeof canonicalDoc.content,
        },
      };
    }

    if (!Array.isArray(canonicalDoc.content)) {
      return {
        success: false,
        error: "CanonicalDocument.content is not an array",
        details: {
          contentType: typeof canonicalDoc.content,
          contentValue: canonicalDoc.content,
        },
      };
    }

    const adapter = new CanonicalToTiptapAdapter();
    const result = adapter.transform(canonicalDoc);

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
    console.error("Error in safeCanonicalToTiptapJson:", error);

    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Unknown transformation error",
      details: {
        errorType:
          error instanceof Error ? error.constructor.name : typeof error,
        stack: error instanceof Error ? error.stack : undefined,
        originalError: error,
        adapterError: error instanceof Error ? error.message : String(error),
      },
    };
  }
};
