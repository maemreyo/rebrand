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
  InlineContent,
  TextContent,
  FormattedTextContent,
  LinkContent,
  BreakContent,
  ListItem,
} from "@/types/document";

// =============================================================================
// Main Adapter Class
// =============================================================================

export class CanonicalToTiptapAdapter {
  /**
   * Transform a canonical document to Tiptap JSON format
   */
  transform(canonicalDoc: CanonicalDocument): JSONContent {
    return {
      type: "doc",
      content: canonicalDoc.content.map((block) => this.transformBlock(block)),
    };
  }

  /**
   * Transform a single canonical block to Tiptap format
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
      default:
        // Fallback to paragraph for unknown types
        return this.transformParagraph(block as ParagraphBlock);
    }
  }

  // =============================================================================
  // Block Transformers
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
    const listType = block.listType === "numbered" ? "orderedList" : "bulletList";

    return {
      type: listType,
      content: block.items.map((item) => this.transformListItem(item, block.listType)),
    };
  }

  private transformListItem(item: ListItem, listType: "bulleted" | "numbered"): JSONContent {
    const content: JSONContent[] = [
      {
        type: "paragraph",
        content: this.transformInlineContent(item.content),
      },
    ];

    // Handle nested lists
    if (item.items && item.items.length > 0) {
      const nestedListType = listType === "numbered" ? "orderedList" : "bulletList";
      content.push({
        type: nestedListType,
        content: item.items.map((nestedItem) => this.transformListItem(nestedItem, listType)),
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
      content: block.content.map((childBlock) => this.transformBlock(childBlock)),
    };
  }

  private transformMultipleChoice(block: MultipleChoiceBlock): JSONContent {
    // Custom node for multiple choice questions
    // This might need to be implemented as a custom Tiptap extension
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
  // Inline Content Transformers
  // =============================================================================

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
          // Fallback for unknown types
          return {
            type: "text",
            text: (item as any).text || "",
          };
      }
    });
  }

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
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Transform canonical document to Tiptap JSON (functional approach)
 */
export const canonicalToTiptapJson = (canonicalDoc: CanonicalDocument): JSONContent => {
  const adapter = new CanonicalToTiptapAdapter();
  return adapter.transform(canonicalDoc);
};

/**
 * Transform a single canonical block to Tiptap JSON
 */
export const canonicalBlockToTiptapJson = (block: CanonicalBlock): JSONContent => {
  const adapter = new CanonicalToTiptapAdapter();
  return (adapter as any).transformBlock(block);
};

/**
 * Validate that a Tiptap JSON structure is valid
 */
export const validateTiptapJson = (json: JSONContent): boolean => {
  try {
    // Basic validation - check required properties
    if (!json || typeof json !== "object") return false;
    if (!json.type || typeof json.type !== "string") return false;
    
    // If it has content, validate recursively
    if (json.content && Array.isArray(json.content)) {
      return json.content.every(validateTiptapJson);
    }
    
    return true;
  } catch {
    return false;
  }
};

/**
 * Get all text content from a Tiptap JSON structure
 */
export const extractTextFromTiptapJson = (json: JSONContent): string => {
  if (json.type === "text") {
    return json.text || "";
  }
  
  if (json.content && Array.isArray(json.content)) {
    return json.content.map(extractTextFromTiptapJson).join("");
  }
  
  return "";
};

/**
 * Count blocks in a Tiptap JSON structure
 */
export const countTiptapBlocks = (json: JSONContent): number => {
  let count = 1; // Count the current block
  
  if (json.content && Array.isArray(json.content)) {
    count += json.content.reduce((sum, child) => sum + countTiptapBlocks(child), 0);
  }
  
  return count;
};

// =============================================================================
// Error Handling
// =============================================================================

export class TiptapTransformationError extends Error {
  constructor(message: string, public originalBlock?: CanonicalBlock) {
    super(message);
    this.name = "TiptapTransformationError";
  }
}

/**
 * Safe transformation with error handling
 */
export const safeCanonicalToTiptapJson = (
  canonicalDoc: CanonicalDocument
): { success: true; data: JSONContent } | { success: false; error: string } => {
  try {
    const result = canonicalToTiptapJson(canonicalDoc);
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown transformation error",
    };
  }
};