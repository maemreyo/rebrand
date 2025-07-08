// UPDATED: 2025-07-08 - Added comprehensive math block and footnote handling for PDF generation

import { Template, Schema } from "@pdfme/common";
import { JSONContent } from "@tiptap/core";

// =============================================================================
// Enhanced Types and Interfaces for Math Support
// =============================================================================

export interface PdfmeDocument {
  template: Template;
  inputs: Record<string, any>[];
}

export interface PdfmeOptions {
  pageWidth?: number;
  pageHeight?: number;
  margin?: number;
  defaultFontSize?: number;
  defaultFont?: string;
  startY?: number;
  mathFontSize?: number;
  footnotesFontSize?: number;
  mathRenderer?: "text" | "image"; // How to render math in PDF
  mathImageDPI?: number; // DPI for math images
  includeMathFallback?: boolean; // Include LaTeX source as fallback
}

export interface PdfGenerationInput {
  [key: string]: any;
}

export interface FootnoteData {
  noteId: string;
  noteNumber: number;
  content: string;
  backref?: string;
}

export interface MathRenderResult {
  type: "text" | "image" | "fallback";
  content: string;
  width?: number;
  height?: number;
  error?: string;
}

// =============================================================================
// Enhanced Main Adapter Class with Math Support
// =============================================================================

export class TiptapToPdfmeAdapter {
  private currentY: number = 20;
  private pageWidth: number = 210; // A4 width in mm
  private pageHeight: number = 297; // A4 height in mm
  private margin: number = 20;
  private defaultFontSize: number = 12;
  private defaultFont: string = "NotoSansCJK-Regular";
  private mathFontSize: number = 10;
  private footnotesFontSize: number = 8;
  private mathRenderer: "text" | "image" = "text";
  private footnotes: FootnoteData[] = [];
  private mathEquationCount: number = 0;

  /**
   * Enhanced transform method with math and footnote support
   */
  transform(tiptapDoc: JSONContent, options?: PdfmeOptions): PdfmeDocument {
    this.resetState(options);
    
    const schemas: Schema[] = [];
    const inputs: Record<string, any> = {};

    // First pass: collect footnotes
    this.collectFootnotes(tiptapDoc);

    // Second pass: transform content
    if (tiptapDoc.content) {
      tiptapDoc.content.forEach((block, index) => {
        const blockResult = this.transformBlock(block, index);
        schemas.push(...blockResult.schemas);
        Object.assign(inputs, blockResult.inputs);
      });
    }

    // Third pass: add footnotes section if any
    if (this.footnotes.length > 0) {
      const footnoteResult = this.renderFootnotesSection();
      schemas.push(...footnoteResult.schemas);
      Object.assign(inputs, footnoteResult.inputs);
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

  /**
   * Reset internal state for new transformation
   */
  private resetState(options?: PdfmeOptions): void {
    if (options) {
      this.pageWidth = options.pageWidth || 210;
      this.pageHeight = options.pageHeight || 297;
      this.margin = options.margin || 20;
      this.defaultFontSize = options.defaultFontSize || 12;
      this.defaultFont = options.defaultFont || "NotoSansCJK-Regular";
      this.mathFontSize = options.mathFontSize || 10;
      this.footnotesFontSize = options.footnotesFontSize || 8;
      this.mathRenderer = options.mathRenderer || "text";
    }

    this.currentY = options?.startY || 20;
    this.footnotes = [];
    this.mathEquationCount = 0;
  }

  /**
   * Collect all footnotes from the document for later rendering
   */
  private collectFootnotes(json: JSONContent): void {
    if (json.type === "footnote" && json.attrs) {
      const footnoteData: FootnoteData = {
        noteId: json.attrs.noteId,
        noteNumber: json.attrs.noteNumber,
        content: this.extractTextFromBlock(json),
        backref: json.attrs.backref,
      };
      this.footnotes.push(footnoteData);
    }

    // Recursively check content
    if (json.content && Array.isArray(json.content)) {
      json.content.forEach(child => this.collectFootnotes(child));
    }
  }

  /**
   * Enhanced block transformation with math and footnote support
   */
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
        return this.transformDivider(block, index);

      // 🧮 NEW: Math and Academic Content Support
      case "mathDisplay":
        return this.transformMathDisplay(block, index);
      case "mathInline":
        return this.transformMathInline(block, index);
      case "footnote":
        return this.transformFootnote(block, index);
      case "citation":
        return this.transformCitation(block, index);
      case "theorem":
        return this.transformTheorem(block, index);
      case "proof":
        return this.transformProof(block, index);

      default:
        // Fallback: treat as paragraph
        return this.transformParagraph(block, index);
    }
  }

  // =============================================================================
  // NEW: Math Content Transformers
  // =============================================================================

  /**
   * Transform display math blocks ($$...$$)
   */
  private transformMathDisplay(
    block: JSONContent,
    index: number
  ): { schemas: Schema[]; inputs: PdfGenerationInput } {
    const fieldName = `math_display_${index}`;
    const latex = block.attrs?.latex || "";
    const error = block.attrs?.error;
    const numbered = block.attrs?.numbered || false;
    
    this.mathEquationCount++;

    // Render math content
    const mathResult = this.renderMathContent(latex, "display");
    
    let displayText = "";
    if (mathResult.type === "text") {
      displayText = mathResult.content;
    } else if (mathResult.type === "fallback") {
      displayText = `[Math: ${latex}]`;
    } else if (mathResult.error) {
      displayText = `[Math Error: ${mathResult.error}]`;
    }

    // Add equation numbering if requested
    if (numbered) {
      displayText = `${displayText} ... (${this.mathEquationCount})`;
    }

    const estimatedHeight = this.estimateTextHeight(displayText, this.mathFontSize);

    const schema: Schema = {
      name: fieldName,
      type: "text",
      position: { x: this.margin, y: this.currentY },
      width: this.pageWidth - this.margin * 2,
      height: estimatedHeight + 10,
      fontSize: this.mathFontSize,
      fontName: this.defaultFont,
      fontColor: "#000000",
      alignment: "center", // Center display math
      verticalAlignment: "top",
      lineHeight: 1.5,
      characterSpacing: 0.5,
    };

    this.currentY += estimatedHeight + 15; // Extra spacing for math

    return {
      schemas: [schema],
      inputs: { [fieldName]: displayText },
    };
  }

  /**
   * Transform inline math ($...$)
   */
  private transformMathInline(
    block: JSONContent,
    index: number
  ): { schemas: Schema[]; inputs: PdfGenerationInput } {
    // For inline math, we handle it within paragraph context
    // This method is mainly for standalone inline math blocks
    const fieldName = `math_inline_${index}`;
    const latex = block.attrs?.latex || "";
    
    const mathResult = this.renderMathContent(latex, "inline");
    const displayText = mathResult.type === "text" ? mathResult.content : `[Math: ${latex}]`;

    const estimatedHeight = this.estimateTextHeight(displayText, this.defaultFontSize);

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
    };

    this.currentY += estimatedHeight + 5;

    return {
      schemas: [schema],
      inputs: { [fieldName]: displayText },
    };
  }

  /**
   * Render mathematical content based on renderer type
   */
  private renderMathContent(latex: string, mathType: "inline" | "display"): MathRenderResult {
    try {
      if (this.mathRenderer === "text") {
        // Convert LaTeX to Unicode/plain text approximation
        const textApproximation = this.latexToTextApproximation(latex);
        return {
          type: "text",
          content: textApproximation,
        };
      } else {
        // For image rendering, we'd need additional libraries
        // For now, return fallback
        return {
          type: "fallback",
          content: `[LaTeX: ${latex}]`,
        };
      }
    } catch (error) {
      return {
        type: "fallback",
        content: `[Math Error: ${latex}]`,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Convert LaTeX to text approximation for PDF
   */
  private latexToTextApproximation(latex: string): string {
    let text = latex;

    // Common LaTeX to Unicode conversions
    const conversions: Record<string, string> = {
      // Greek letters
      "\\alpha": "α", "\\beta": "β", "\\gamma": "γ", "\\delta": "δ",
      "\\epsilon": "ε", "\\zeta": "ζ", "\\eta": "η", "\\theta": "θ",
      "\\iota": "ι", "\\kappa": "κ", "\\lambda": "λ", "\\mu": "μ",
      "\\nu": "ν", "\\xi": "ξ", "\\pi": "π", "\\rho": "ρ",
      "\\sigma": "σ", "\\tau": "τ", "\\upsilon": "υ", "\\phi": "φ",
      "\\chi": "χ", "\\psi": "ψ", "\\omega": "ω",
      
      // Capital Greek
      "\\Alpha": "Α", "\\Beta": "Β", "\\Gamma": "Γ", "\\Delta": "Δ",
      "\\Epsilon": "Ε", "\\Zeta": "Ζ", "\\Eta": "Η", "\\Theta": "Θ",
      "\\Iota": "Ι", "\\Kappa": "Κ", "\\Lambda": "Λ", "\\Mu": "Μ",
      "\\Nu": "Ν", "\\Xi": "Ξ", "\\Pi": "Π", "\\Rho": "Ρ",
      "\\Sigma": "Σ", "\\Tau": "Τ", "\\Upsilon": "Υ", "\\Phi": "Φ",
      "\\Chi": "Χ", "\\Psi": "Ψ", "\\Omega": "Ω",
      
      // Mathematical operators
      "\\sum": "∑", "\\prod": "∏", "\\int": "∫", "\\oint": "∮",
      "\\infty": "∞", "\\partial": "∂", "\\nabla": "∇",
      "\\pm": "±", "\\mp": "∓", "\\times": "×", "\\div": "÷",
      "\\cdot": "·", "\\bullet": "•",
      
      // Relations
      "\\leq": "≤", "\\geq": "≥", "\\neq": "≠", "\\approx": "≈",
      "\\equiv": "≡", "\\sim": "∼", "\\propto": "∝",
      "\\in": "∈", "\\notin": "∉", "\\subset": "⊂", "\\supset": "⊃",
      "\\subseteq": "⊆", "\\supseteq": "⊇", "\\cup": "∪", "\\cap": "∩",
      
      // Arrows
      "\\rightarrow": "→", "\\leftarrow": "←", "\\leftrightarrow": "↔",
      "\\Rightarrow": "⇒", "\\Leftarrow": "⇐", "\\Leftrightarrow": "⇔",
      
      // Special symbols
      "\\forall": "∀", "\\exists": "∃", "\\emptyset": "∅",
      "\\Re": "ℜ", "\\Im": "ℑ", "\\aleph": "ℵ",
    };

    // Apply conversions
    Object.entries(conversions).forEach(([latex, unicode]) => {
      text = text.replace(new RegExp(latex.replace("\\", "\\\\"), "g"), unicode);
    });

    // Handle fractions \\frac{a}{b} -> a/b
    text = text.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1)/($2)");

    // Handle superscripts ^{x} -> ^x or ˣ
    text = text.replace(/\^\\{([^}]+)\\}/g, "^($1)");
    text = text.replace(/\^([a-zA-Z0-9])/g, "^$1");

    // Handle subscripts _{x} -> _x
    text = text.replace(/_\\{([^}]+)\\}/g, "_($1)");
    text = text.replace(/_([a-zA-Z0-9])/g, "_$1");

    // Handle square roots \\sqrt{x} -> √x
    text = text.replace(/\\sqrt\{([^}]+)\}/g, "√($1)");

    // Handle limits \\lim -> lim
    text = text.replace(/\\lim/g, "lim");

    // Clean up remaining LaTeX commands
    text = text.replace(/\\([a-zA-Z]+)/g, "$1");

    // Clean up braces
    text = text.replace(/[{}]/g, "");

    return text;
  }

  // =============================================================================
  // NEW: Academic Content Transformers
  // =============================================================================

  /**
   * Transform footnote references (handled differently than footnote content)
   */
  private transformFootnote(
    block: JSONContent,
    index: number
  ): { schemas: Schema[]; inputs: PdfGenerationInput } {
    // Footnotes are collected and rendered at the bottom
    // This handles footnote reference marks in text
    return { schemas: [], inputs: {} };
  }

  /**
   * Transform citation blocks
   */
  private transformCitation(
    block: JSONContent,
    index: number
  ): { schemas: Schema[]; inputs: PdfGenerationInput } {
    const fieldName = `citation_${index}`;
    const displayText = block.attrs?.displayText || "[Citation]";
    const citationType = block.attrs?.citationType || "numeric";

    const estimatedHeight = this.estimateTextHeight(displayText, this.defaultFontSize);

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
    };

    this.currentY += estimatedHeight + 3;

    return {
      schemas: [schema],
      inputs: { [fieldName]: displayText },
    };
  }

  /**
   * Transform theorem blocks
   */
  private transformTheorem(
    block: JSONContent,
    index: number
  ): { schemas: Schema[]; inputs: PdfGenerationInput } {
    const fieldName = `theorem_${index}`;
    const theoremType = block.attrs?.theoremType || "theorem";
    const theoremNumber = block.attrs?.theoremNumber || "";
    const title = block.attrs?.title || "";
    
    const content = this.extractTextFromBlock(block);
    const header = `${theoremType.charAt(0).toUpperCase() + theoremType.slice(1)}${theoremNumber ? ` ${theoremNumber}` : ""}${title ? ` (${title})` : ""}`;
    const fullText = `${header}: ${content}`;

    const estimatedHeight = this.estimateTextHeight(fullText, this.defaultFontSize);

    const schema: Schema = {
      name: fieldName,
      type: "text",
      position: { x: this.margin, y: this.currentY },
      width: this.pageWidth - this.margin * 2,
      height: estimatedHeight + 10,
      fontSize: this.defaultFontSize,
      fontName: this.defaultFont,
      fontColor: "#000000",
      alignment: "left",
      verticalAlignment: "top",
      lineHeight: 1.4,
    };

    this.currentY += estimatedHeight + 15;

    return {
      schemas: [schema],
      inputs: { [fieldName]: fullText },
    };
  }

  /**
   * Transform proof blocks
   */
  private transformProof(
    block: JSONContent,
    index: number
  ): { schemas: Schema[]; inputs: PdfGenerationInput } {
    const fieldName = `proof_${index}`;
    const proofMethod = block.attrs?.proofMethod || "";
    const qed = block.attrs?.qed || false;
    
    const content = this.extractTextFromBlock(block);
    const header = `Proof${proofMethod ? ` (by ${proofMethod})` : ""}:`;
    const footer = qed ? " ∎" : "";
    const fullText = `${header} ${content}${footer}`;

    const estimatedHeight = this.estimateTextHeight(fullText, this.defaultFontSize);

    const schema: Schema = {
      name: fieldName,
      type: "text",
      position: { x: this.margin + 10, y: this.currentY }, // Slightly indented
      width: this.pageWidth - this.margin * 2 - 10,
      height: estimatedHeight + 5,
      fontSize: this.defaultFontSize,
      fontName: this.defaultFont,
      fontColor: "#000000",
      alignment: "left",
      verticalAlignment: "top",
      lineHeight: 1.3,
    };

    this.currentY += estimatedHeight + 10;

    return {
      schemas: [schema],
      inputs: { [fieldName]: fullText },
    };
  }

  /**
   * Render footnotes section at the bottom of the document
   */
  private renderFootnotesSection(): { schemas: Schema[]; inputs: PdfGenerationInput } {
    if (this.footnotes.length === 0) {
      return { schemas: [], inputs: {} };
    }

    const schemas: Schema[] = [];
    const inputs: PdfGenerationInput = {};

    // Add separator line
    const separatorSchema: Schema = {
      name: "footnotes_separator",
      type: "line",
      position: { x: this.margin, y: this.currentY },
      width: this.pageWidth - this.margin * 2,
      height: 1,
      borderWidth: 1,
      borderColor: "#CCCCCC",
    };

    schemas.push(separatorSchema);
    inputs["footnotes_separator"] = "";
    this.currentY += 10;

    // Add footnotes title
    const titleSchema: Schema = {
      name: "footnotes_title",
      type: "text",
      position: { x: this.margin, y: this.currentY },
      width: this.pageWidth - this.margin * 2,
      height: 15,
      fontSize: this.defaultFontSize,
      fontName: this.defaultFont,
      fontColor: "#000000",
      alignment: "left",
      verticalAlignment: "top",
    };

    schemas.push(titleSchema);
    inputs["footnotes_title"] = "Notes:";
    this.currentY += 20;

    // Add each footnote
    this.footnotes.forEach((footnote, index) => {
      const fieldName = `footnote_${index}`;
      const footnoteText = `${footnote.noteNumber}. ${footnote.content}`;
      const estimatedHeight = this.estimateTextHeight(footnoteText, this.footnotesFontSize);

      const schema: Schema = {
        name: fieldName,
        type: "text",
        position: { x: this.margin, y: this.currentY },
        width: this.pageWidth - this.margin * 2,
        height: estimatedHeight,
        fontSize: this.footnotesFontSize,
        fontName: this.defaultFont,
        fontColor: "#000000",
        alignment: "left",
        verticalAlignment: "top",
        lineHeight: 1.2,
      };

      schemas.push(schema);
      inputs[fieldName] = footnoteText;
      this.currentY += estimatedHeight + 2;
    });

    return { schemas, inputs };
  }

  // =============================================================================
  // Enhanced Existing Transformers (Updated for Math Content)
  // =============================================================================

  /**
   * Enhanced paragraph transformer with inline math support
   */
  private transformParagraph(
    block: JSONContent,
    index: number
  ): { schemas: Schema[]; inputs: PdfGenerationInput } {
    const fieldName = `paragraph_${index}`;
    const text = this.extractTextFromBlockWithMath(block);

    if (!text.trim()) {
      this.currentY += 5; // Small spacing for empty paragraphs
      return { schemas: [], inputs: {} };
    }

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
      lineHeight: 1.4,
    };

    this.currentY += estimatedHeight + 8;

    return {
      schemas: [schema],
      inputs: { [fieldName]: text },
    };
  }

  /**
   * Extract text from block with math content support
   */
  private extractTextFromBlockWithMath(block: JSONContent): string {
    if (block.type === "text") {
      return block.text || "";
    }

    // Handle math inline content
    if (block.type === "mathInline" || block.type === "mathDisplay") {
      const latex = block.attrs?.latex || "";
      return this.latexToTextApproximation(latex);
    }

    // Handle footnote references
    if (block.marks && Array.isArray(block.marks)) {
      const footnoteRef = block.marks.find(mark => mark.type === "footnoteRef");
      if (footnoteRef) {
        return `[${footnoteRef.attrs?.noteNumber || "?"}]`;
      }
    }

    // Handle regular content recursively
    if (block.content && Array.isArray(block.content)) {
      return block.content.map(child => this.extractTextFromBlockWithMath(child)).join(" ");
    }

    return "";
  }

  // =============================================================================
  // Existing Methods (keeping them for compatibility)
  // =============================================================================

  private transformHeading(
    block: JSONContent,
    index: number
  ): { schemas: Schema[]; inputs: PdfGenerationInput } {
    const fieldName = `heading_${index}`;
    const text = this.extractTextFromBlockWithMath(block);
    const level = block.attrs?.level || 1;

    const fontSize = Math.max(this.defaultFontSize + (4 - level) * 2, this.defaultFontSize);
    const estimatedHeight = this.estimateTextHeight(text, fontSize);

    const schema: Schema = {
      name: fieldName,
      type: "text",
      position: { x: this.margin, y: this.currentY },
      width: this.pageWidth - this.margin * 2,
      height: estimatedHeight,
      fontSize: fontSize,
      fontName: this.defaultFont,
      fontColor: "#000000",
      alignment: "left",
      verticalAlignment: "top",
      lineHeight: 1.2,
    };

    this.currentY += estimatedHeight + 12;

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
    const isOrdered = block.type === "orderedList";

    if (block.content && Array.isArray(block.content)) {
      block.content.forEach((item, itemIndex) => {
        const fieldName = `list_${index}_item_${itemIndex}`;
        const text = this.extractTextFromBlockWithMath(item);
        const prefix = isOrdered ? `${itemIndex + 1}. ` : "• ";
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

    this.currentY += 10;
    return { schemas, inputs };
  }

  private transformTable(
    block: JSONContent,
    index: number
  ): { schemas: Schema[]; inputs: PdfGenerationInput } {
    const fieldName = `table_${index}`;
    const tableData = this.extractTableData(block);
    const estimatedHeight = (tableData.length + 1) * 20;

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
    const alt = block.attrs?.alt || "Image";

    const schema: Schema = {
      name: fieldName,
      type: "image",
      position: { x: this.margin, y: this.currentY },
      width: Math.min(150, this.pageWidth - this.margin * 2),
      height: 100,
    };

    this.currentY += 110;

    return {
      schemas: [schema],
      inputs: { [fieldName]: src || alt },
    };
  }

  private transformCodeBlock(
    block: JSONContent,
    index: number
  ): { schemas: Schema[]; inputs: PdfGenerationInput } {
    const fieldName = `code_${index}`;
    const code = this.extractTextFromBlockWithMath(block);
    const language = block.attrs?.language || "";

    const estimatedHeight = this.estimateTextHeight(code, 10);

    const schema: Schema = {
      name: fieldName,
      type: "text",
      position: { x: this.margin, y: this.currentY },
      width: this.pageWidth - this.margin * 2,
      height: estimatedHeight + 10,
      fontSize: 10,
      fontName: "Courier",
      fontColor: "#000000",
      alignment: "left",
      verticalAlignment: "top",
      backgroundColor: "#F5F5F5",
      lineHeight: 1.3,
    };

    this.currentY += estimatedHeight + 15;

    return {
      schemas: [schema],
      inputs: { [fieldName]: code },
    };
  }

  private transformBlockquote(
    block: JSONContent,
    index: number
  ): { schemas: Schema[]; inputs: PdfGenerationInput } {
    const fieldName = `blockquote_${index}`;
    const text = this.extractTextFromBlockWithMath(block);
    const quotedText = `"${text}"`;

    const estimatedHeight = this.estimateTextHeight(quotedText, this.defaultFontSize);

    const schema: Schema = {
      name: fieldName,
      type: "text",
      position: { x: this.margin + 15, y: this.currentY },
      width: this.pageWidth - this.margin * 2 - 30,
      height: estimatedHeight,
      fontSize: this.defaultFontSize,
      fontName: this.defaultFont,
      fontColor: "#666666",
      alignment: "left",
      verticalAlignment: "top",
      lineHeight: 1.4,
    };

    this.currentY += estimatedHeight + 10;

    return {
      schemas: [schema],
      inputs: { [fieldName]: quotedText },
    };
  }

  private transformDivider(
    block: JSONContent,
    index: number
  ): { schemas: Schema[]; inputs: PdfGenerationInput } {
    const fieldName = `divider_${index}`;

    const schema: Schema = {
      name: fieldName,
      type: "line",
      position: { x: this.margin, y: this.currentY },
      width: this.pageWidth - this.margin * 2,
      height: 1,
      borderWidth: 1,
      borderColor: "#CCCCCC",
    };

    this.currentY += 15;

    return {
      schemas: [schema],
      inputs: { [fieldName]: "" },
    };
  }

  // =============================================================================
  // Utility Methods
  // =============================================================================

  private extractTextFromBlock(block: JSONContent): string {
    if (block.type === "text") {
      return block.text || "";
    }

    if (block.content && Array.isArray(block.content)) {
      return block.content.map(child => this.extractTextFromBlock(child)).join(" ");
    }

    return "";
  }

  private extractTableData(block: JSONContent): string[][] {
    const data: string[][] = [];
    
    if (block.content && Array.isArray(block.content)) {
      block.content.forEach(row => {
        if (row.content && Array.isArray(row.content)) {
          const rowData = row.content.map(cell => this.extractTextFromBlock(cell));
          data.push(rowData);
        }
      });
    }

    return data;
  }

  private estimateTextHeight(text: string, fontSize: number): number {
    const lines = Math.ceil(text.length / 80); // Rough estimate
    return lines * (fontSize * 1.5);
  }
}

// =============================================================================
// Enhanced Utility Functions with Math Support
// =============================================================================

/**
 * Main transformation function with enhanced math support
 */
export const tiptapToPdfmeInputs = (
  tiptapDoc: JSONContent,
  options?: PdfmeOptions
): PdfmeDocument => {
  const adapter = new TiptapToPdfmeAdapter();
  return adapter.transform(tiptapDoc, options);
};

/**
 * Estimate page count with math content considerations
 */
export const estimatePageCount = (
  tiptapDoc: JSONContent,
  options?: PdfmeOptions
): number => {
  const text = extractAllTextWithMath(tiptapDoc);
  const pageHeight = options?.pageHeight || 297;
  const margin = options?.margin || 20;
  const fontSize = options?.defaultFontSize || 12;

  const usableHeight = pageHeight - margin * 2;
  const linesPerPage = Math.floor(usableHeight / (fontSize * 1.5));
  const charsPerLine = Math.floor((options?.pageWidth || 210) / (fontSize * 0.6));
  const charsPerPage = linesPerPage * charsPerLine;

  // Account for math equations taking more space
  const mathBlockCount = countMathBlocks(tiptapDoc);
  const extraSpaceForMath = mathBlockCount * (fontSize * 3); // Extra space per math block

  return Math.ceil((text.length / charsPerPage) + (extraSpaceForMath / (usableHeight * charsPerLine)));
};

/**
 * Extract all text including math content
 */
export const extractAllTextWithMath = (json: JSONContent): string => {
  if (json.type === "text") {
    return json.text || "";
  }

  if (json.type === "mathInline" || json.type === "mathDisplay") {
    return json.attrs?.latex || "[Math]";
  }

  if (json.content && Array.isArray(json.content)) {
    return json.content.map(extractAllTextWithMath).join(" ");
  }

  return "";
};

/**
 * Count math blocks in document
 */
export const countMathBlocks = (json: JSONContent): number => {
  let count = 0;

  if (json.type === "mathDisplay" || json.type === "mathInline") {
    count = 1;
  }

  if (json.content && Array.isArray(json.content)) {
    count += json.content.reduce((sum, child) => sum + countMathBlocks(child), 0);
  }

  return count;
};

/**
 * Extract all text from Tiptap JSON (legacy compatibility)
 */
export const extractAllText = (json: JSONContent): string => {
  return extractAllTextWithMath(json);
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
// Enhanced Error Handling
// =============================================================================

export class PdfmeTransformationError extends Error {
  constructor(message: string, public originalBlock?: JSONContent) {
    super(message);
    this.name = "PdfmeTransformationError";
  }
}

export class MathPdfRenderingError extends Error {
  constructor(message: string, public latex?: string, public blockId?: string) {
    super(message);
    this.name = "MathPdfRenderingError";
    this.latex = latex;
    this.blockId = blockId;
  }
}

/**
 * Safe transformation with enhanced error handling
 */
export const safeTiptapToPdfmeInputs = (
  tiptapDoc: JSONContent,
  options?: PdfmeOptions
): { success: true; data: PdfmeDocument } | { success: false; error: string; details?: any } => {
  try {
    const result = tiptapToPdfmeInputs(tiptapDoc, options);
    
    // Validate the result
    if (!validatePdfmeTemplate(result.template)) {
      return {
        success: false,
        error: "Generated pdfme template failed validation",
        details: { hasSchemas: !!result.template.schemas },
      };
    }

    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown transformation error",
      details: error instanceof PdfmeTransformationError ? {
        originalBlock: error.originalBlock,
      } : undefined,
    };
  }
};