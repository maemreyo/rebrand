import { GoogleGenAI } from "@google/genai";
import {
  CanonicalDocument,
  DocumentProcessingError,
  validateCanonicalDocument,
  MathProcessingError,
} from "@/types/document";

// =============================================================================
// Enhanced Gemini Configuration for Math Processing
// =============================================================================

interface GeminiConfig {
  apiKey: string;
  model: string;
  timeout: number;
  maxRetries: number;
  temperature: number;
  topP: number;
  topK: number;
  maxOutputTokens: number;
  mathDetection: boolean;
  academicMode: boolean;
}

const DEFAULT_CONFIG: Omit<GeminiConfig, "apiKey"> = {
  model: "gemini-2.5-flash",
  timeout: 45000, // Increased for complex math processing
  maxRetries: 3,
  temperature: 0.05, // Lower for more consistent math detection
  topP: 0.9,
  topK: 25,
  maxOutputTokens: 64000, // Increased for complex documents
  mathDetection: true,
  academicMode: true,
};

// =============================================================================
// Enhanced Response Schema for Math Content
// =============================================================================

const ENHANCED_CANONICAL_DOCUMENT_SCHEMA = {
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
          enum: [
            "report",
            "article",
            "form",
            "contract",
            "other",
            "academic",
            "mathematical",
          ],
        },
        language: { type: "string" },
        confidenceScore: { type: "number", minimum: 0, maximum: 1 },
        hasMatematicalContent: { type: "boolean", nullable: true },
        mathComplexity: {
          type: "string",
          enum: ["basic", "intermediate", "advanced"],
          nullable: true,
        },
        footnoteCount: { type: "number", nullable: true },
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
              "math",
              "footnote",
              "citation",
              "theorem",
              "proof", // ← ENHANCED
            ],
          },
          // Math-specific properties
          mathType: {
            type: "string",
            enum: ["inline", "display"],
            nullable: true,
          },
          latex: { type: "string", nullable: true },
          numbered: { type: "boolean", nullable: true },
          complexity: {
            type: "string",
            enum: ["basic", "intermediate", "advanced"],
            nullable: true,
          },

          // Footnote properties
          noteId: { type: "string", nullable: true },
          noteNumber: { type: "number", nullable: true },

          // Citation properties
          citationKey: { type: "string", nullable: true },
          citationType: {
            type: "string",
            enum: ["numeric", "author-year", "footnote"],
            nullable: true,
          },
          displayText: { type: "string", nullable: true },

          // Theorem properties
          theoremType: {
            type: "string",
            enum: [
              "theorem",
              "lemma",
              "corollary",
              "proposition",
              "definition",
            ],
            nullable: true,
          },
          theoremNumber: { type: "string", nullable: true },

          // Proof properties
          proofMethod: {
            type: "string",
            enum: ["direct", "contradiction", "induction", "construction"],
            nullable: true,
          },
          qed: { type: "boolean", nullable: true },
        },
        required: ["id", "type"],
      },
    },
    version: { type: "string" },
    createdAt: { type: "string" },
    updatedAt: { type: "string" },
  },
  required: ["metadata", "content", "version", "createdAt", "updatedAt"],
};

// =============================================================================
// Enhanced Gemini Document Processor Class
// =============================================================================

export class GeminiDocumentProcessor {
  private genAI: GoogleGenAI;
  private config: GeminiConfig;

  constructor(apiKey?: string, config?: Partial<GeminiConfig>) {
    const finalApiKey = apiKey || process.env.GEMINI_API_KEY;

    if (!finalApiKey) {
      throw new DocumentProcessingError(
        "Gemini API key is required. Set GEMINI_API_KEY environment variable or pass it to constructor."
      );
    }

    this.config = { ...DEFAULT_CONFIG, apiKey: finalApiKey, ...config };
    this.genAI = new GoogleGenAI({ apiKey: this.config.apiKey });
  }

  /**
   * Enhanced document processing with math detection and academic structure recognition
   */
  async processDocumentWithFallbacks(
    rawText: string
  ): Promise<CanonicalDocument> {
    const strategies = [
      () => this.processDocumentWithMath(rawText),
      () => this.processWithSimplifiedMathPrompt(rawText),
      () => this.processWithBasicStructure(rawText),
      () => this.createFallbackDocument(rawText),
    ];

    let lastError: Error | null = null;

    for (const strategy of strategies) {
      try {
        return await strategy();
      } catch (error) {
        lastError = error as Error;
        console.warn("Processing strategy failed:", error);
        continue;
      }
    }

    throw new DocumentProcessingError(
      "All processing strategies failed",
      lastError || undefined
    );
  }

  /**
   * 🔧 ENHANCED: More robust document processing with better error handling
   */
  async processDocumentWithMath(rawText: string): Promise<CanonicalDocument> {
    if (!rawText || rawText.trim().length === 0) {
      throw new DocumentProcessingError("Raw text cannot be empty");
    }

    try {
      // Pre-analyze text for math content
      const mathAnalysis = this.analyzeMathContent(rawText);
      const academicAnalysis = this.analyzeAcademicStructure(rawText);

      console.log("=== Pre-analysis Results ===");
      console.log("Math analysis:", mathAnalysis);
      console.log("Academic analysis:", academicAnalysis);

      const prompt = this.buildEnhancedAnalysisPrompt(
        rawText,
        mathAnalysis,
        academicAnalysis
      );

      const response = await this.genAI.models.generateContent({
        model: this.config.model,
        contents: prompt,
        config: {
          temperature: this.config.temperature,
          topP: this.config.topP,
          topK: this.config.topK,
          maxOutputTokens: this.config.maxOutputTokens,
          responseMimeType: "application/json",
          responseSchema: ENHANCED_CANONICAL_DOCUMENT_SCHEMA,
        },
      });

      const jsonString = response.text;
      if (!jsonString) {
        console.error("Gemini API response missing text:", response);
        throw new DocumentProcessingError("No response from Gemini AI");
      }

      console.log("=== Raw Gemini Response ===");
      console.log("Response length:", jsonString.length);
      console.log("First 500 chars:", jsonString.substring(0, 500));

      let parsedDocument;
      try {
        parsedDocument = JSON.parse(jsonString);
        this.postProcessMathContent(parsedDocument, mathAnalysis);
      } catch (parseError) {
        console.error("JSON parsing failed:", parseError);
        console.error("Raw response:", jsonString);
        throw new DocumentProcessingError(
          "Invalid JSON response from Gemini AI"
        );
      }

      console.log("=== Parsed Document Structure ===");
      console.log("Content blocks:", parsedDocument.content?.length || 0);

      // Log all blocks for debugging
      if (parsedDocument.content) {
        parsedDocument.content.forEach((block: any, index: number) => {
          console.log(`Block ${index}:`, {
            type: block.type,
            id: block.id,
            hasLatex: "latex" in block,
            latex: block.latex,
            mathType: block.mathType,
          });
        });
      }

      // 🔧 FIX 6: Enhanced validation with error recovery
      if (mathAnalysis.hasMath) {
        console.log("=== Starting Math Content Validation ===");
        try {
          this.validateMathContent(parsedDocument);
          console.log("✅ Math content validation completed successfully");
        } catch (error) {
          console.error("❌ Math content validation failed:", error);
          // Don't throw - continue with the document
        }
      }

      // Final validation
      return validateCanonicalDocument(parsedDocument);
    } catch (error) {
      console.error("=== processDocumentWithMath Error ===");
      console.error(
        "Error type:",
        error instanceof Error ? error.constructor.name : typeof error
      );
      console.error(
        "Error message:",
        error instanceof Error ? error.message : String(error)
      );

      // 🔧 FIX 7: More specific error handling
      if (error instanceof MathProcessingError) {
        console.log("Attempting to continue without math processing...");
        // Try to process without math detection
        return this.processWithSimplifiedMathPrompt(rawText);
      }

      throw error;
    }
  }

  /**
   * 🔧 ENHANCED: Better math content analysis with actual text patterns
   */
  private analyzeMathContent(text: string): {
    hasMath: boolean;
    inlineCount: number;
    displayCount: number;
    complexity: "basic" | "intermediate" | "advanced";
    detectedPatterns: string[];
    extractedMathExpressions: Array<{
      type: "inline" | "display";
      content: string;
      position: number;
    }>;
  } {
    console.log("=== Enhanced Math Content Analysis ===");
    console.log("Input text length:", text.length);
    console.log("First 500 chars:", text.substring(0, 500));

    const patterns = {
      // Vietnamese math keywords
      vietnameseMathKeywords:
        /(?:toán|phương trình|bài tập|công thức|định lý|chứng minh|giải|tính|tìm|số học|đại số|hình học|giải tích)/gi,

      // Math symbols and expressions
      mathSymbols: /[∑∏∫∂∇∞≤≥≠∈∉⊂⊃∩∪±×÷√π]/g,
      superSubscript: /[₀₁₂₃₄₅₆₇₈₉⁰¹²³⁴⁵⁶⁷⁸⁹]/g,
      greekLetters: /[αβγδεζηθικλμνξπρστυφχψωΑΒΓΔΕΖΗΘΙΚΛΜΝΞΠΡΣΤΥΦΧΨΩ]/g,

      // Dollar notation
      dollarInline: /\$[^$\n]+\$/g,
      dollarDisplay: /\$\$[\s\S]+?\$\$/g,

      // LaTeX commands
      latexCommands: /\\[a-zA-Z]+\{[^}]*\}/g,
      fractions: /\\frac\{[^}]*\}\{[^}]*\}/g,

      // Math expressions patterns
      equations: /\b\w+\s*[=≠<>≤≥]\s*\w+/g,
      functions: /\b(?:sin|cos|tan|log|ln|exp|sqrt|lim|int|sum|prod)\b/gi,

      // Educational math content
      mathProblems: /(?:bài|câu|ví dụ)\s*\d+/gi,
      mathSections: /(?:chương|phần|mục)\s*\d+/gi,
    };

    const detectedPatterns: string[] = [];
    let totalMatches = 0;
    const extractedMathExpressions: Array<{
      type: "inline" | "display";
      content: string;
      position: number;
    }> = [];

    // Analyze each pattern
    Object.entries(patterns).forEach(([name, regex]) => {
      try {
        const matches = text.match(regex);
        if (matches && matches.length > 0) {
          detectedPatterns.push(name);
          totalMatches += matches.length;

          console.log(
            `Pattern "${name}" found ${matches.length} matches:`,
            matches.slice(0, 3)
          );

          // Extract actual expressions for math patterns
          if (name === "dollarInline" || name === "dollarDisplay") {
            matches.forEach((match) => {
              const position = text.indexOf(match);
              extractedMathExpressions.push({
                type: name === "dollarInline" ? "inline" : "display",
                content: match,
                position,
              });
            });
          }
        }
      } catch (error) {
        console.warn(`Error matching pattern ${name}:`, error);
      }
    });

    // Calculate counts
    const inlineCount = (text.match(patterns.dollarInline) || []).length;
    const displayCount = (text.match(patterns.dollarDisplay) || []).length;

    // Determine complexity
    let complexity: "basic" | "intermediate" | "advanced" = "basic";

    if (
      detectedPatterns.includes("vietnameseMathKeywords") &&
      detectedPatterns.includes("equations")
    ) {
      complexity = "intermediate";
    }

    if (
      detectedPatterns.includes("latexCommands") ||
      detectedPatterns.includes("fractions") ||
      totalMatches > 10
    ) {
      complexity = "advanced";
    }

    const result = {
      hasMath: totalMatches > 0,
      inlineCount,
      displayCount,
      complexity,
      detectedPatterns,
      extractedMathExpressions,
    };

    console.log("Math analysis result:", result);
    return result;
  }

  /**
   * 🔧 NEW: Post-process document to ensure math blocks are created
   */
  private postProcessMathContent(document: any, mathAnalysis: any): void {
    console.log("=== Post-processing Math Content ===");
    console.log("Document content blocks:", document.content?.length || 0);
    console.log("Math analysis:", mathAnalysis);

    if (
      !mathAnalysis.hasMath ||
      mathAnalysis.extractedMathExpressions.length === 0
    ) {
      console.log("No math content to post-process");
      return;
    }

    // If we detected math but have no math blocks, create them
    const mathBlocks =
      document.content?.filter((block: any) => block.type === "math") || [];

    if (
      mathBlocks.length === 0 &&
      mathAnalysis.extractedMathExpressions.length > 0
    ) {
      console.log(
        "⚠️  Math detected but no math blocks found, creating math blocks..."
      );

      mathAnalysis.extractedMathExpressions.forEach(
        (expr: any, index: number) => {
          const mathBlock = {
            id: `generated-math-${index}`,
            type: "math",
            mathType: expr.type,
            latex: expr.content.replace(/^\$+|\$+$/g, ""), // Remove $ delimiters
            numbered: false,
            description: `Generated from detected math expression`,
          };

          console.log(`Creating math block ${index}:`, mathBlock);
          document.content.push(mathBlock);
        }
      );

      console.log(
        `✅ Created ${mathAnalysis.extractedMathExpressions.length} math blocks`
      );
    }
  }

  /**
   * 🔧 ENHANCED: More robust academic structure analysis with defensive programming
   */
  private analyzeAcademicStructure(text: string): {
    hasAcademicStructure: boolean;
    hasFootnotes: boolean;
    hasCitations: boolean;
    hasTheorems: boolean;
    detectedElements: string[];
  } {
    try {
      const patterns = {
        // Footnotes
        footnoteMarkers: /\^\d+|\*+|†|‡/g,
        footnoteText: /^\d+\.\s+.+$/gm,

        // Citations
        numericCitations: /\[\d+(?:,\s*\d+)*\]/g,
        authorYearCitations: /\([A-Za-z]+(?:\s+et\s+al\.?)?,?\s+\d{4}\)/g,

        // Theorems and proofs
        theorems:
          /(?:theorem|lemma|corollary|proposition|definition)\s*\d*\.?\s*:/gi,
        proofs: /(?:proof|solution)\.?\s*:/gi,
        qed: /∎|□|QED/g,

        // Academic keywords
        academicKeywords:
          /(?:abstract|introduction|methodology|results|conclusion|references|bibliography)/gi,

        // Figure and table references
        figureRefs: /(?:figure|fig\.?|table|tab\.?)\s*\d+/gi,
        equations: /(?:equation|eq\.?)\s*\(?\d+\.?\d*\)?/gi,
      };

      const detectedElements: string[] = [];
      let hasAcademicMarkers = false;

      Object.entries(patterns).forEach(([name, regex]) => {
        try {
          const matches = text.match(regex);
          if (matches && matches.length > 0) {
            detectedElements.push(name);
            hasAcademicMarkers = true;
          }
        } catch (error) {
          console.warn(`Error matching academic pattern ${name}:`, error);
        }
      });

      const result = {
        hasAcademicStructure: hasAcademicMarkers,
        hasFootnotes:
          detectedElements.includes("footnoteMarkers") ||
          detectedElements.includes("footnoteText"),
        hasCitations:
          detectedElements.includes("numericCitations") ||
          detectedElements.includes("authorYearCitations"),
        hasTheorems:
          detectedElements.includes("theorems") ||
          detectedElements.includes("proofs"),
        detectedElements, // This is guaranteed to be an array
      };

      console.log("=== Academic Analysis Result ===");
      console.log("Result:", result);
      console.log("detectedElements type:", typeof result.detectedElements);
      console.log(
        "detectedElements isArray:",
        Array.isArray(result.detectedElements)
      );

      return result;
    } catch (error) {
      console.error("Error in analyzeAcademicStructure:", error);

      // Return safe fallback
      return {
        hasAcademicStructure: false,
        hasFootnotes: false,
        hasCitations: false,
        hasTheorems: false,
        detectedElements: [], // Safe fallback array
      };
    }
  }

  /**
   * 🔧 FIXED: Build enhanced analysis prompt with defensive array handling
   */
  private buildEnhancedAnalysisPrompt(
    rawText: string,
    mathAnalysis: any,
    academicAnalysis: any
  ): string {
    // 🔧 FIX: Ensure detectedPatterns and detectedElements are arrays
    const mathPatterns = Array.isArray(mathAnalysis?.detectedPatterns)
      ? mathAnalysis.detectedPatterns
      : [];

    const academicElements = Array.isArray(academicAnalysis?.detectedElements)
      ? academicAnalysis.detectedElements
      : [];

    const allDetectedPatterns = [...mathPatterns, ...academicElements];

    console.log("=== Debug buildEnhancedAnalysisPrompt ===");
    console.log("mathAnalysis:", mathAnalysis);
    console.log("mathPatterns (safe):", mathPatterns);
    console.log("academicAnalysis:", academicAnalysis);
    console.log("academicElements (safe):", academicElements);
    console.log("allDetectedPatterns:", allDetectedPatterns);

    return `
SYSTEM: You are a specialized academic and mathematical document analysis AI with expertise in:
- Advanced mathematical notation and LaTeX processing
- Academic document structure recognition (papers, theses, technical reports)
- Scientific writing patterns and citation formats
- Mathematical theorem and proof identification

DOCUMENT ANALYSIS CONTEXT:
- Math content detected: ${mathAnalysis?.hasMath || false}
- Complexity level: ${mathAnalysis?.complexity || "basic"}
- Academic structure: ${academicAnalysis?.hasAcademicStructure || false}
- Detected patterns: ${
      allDetectedPatterns.length > 0 ? allDetectedPatterns.join(", ") : "none"
    }

ENHANCED MATHEMATICAL DETECTION RULES:

1. **Inline Math Patterns** (convert to "math" type with mathType: "inline"):
   - Dollar syntax: $E = mc^2$, $x^2 + y^2 = z^2$
   - Parentheses: \\(\\alpha + \\beta\\), \\(\\sum_{i=1}^n x_i\\)
   - Variable references: x₁, y², α, β, θ, ∑, ∫, ∞, ≤, ≥, ∈, ⊂
   - Simple equations embedded in text

2. **Display Math Patterns** (convert to "math" type with mathType: "display"):
   - Double dollar: $$\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}$$
   - Bracket notation: \\[\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}\\]
   - Equation environments: \\begin{equation}...\\end{equation}
   - Align blocks: \\begin{align}...\\end{align}
   - Numbered equations: Look for "(1)", "Eq. 2.1", etc.

3. **LaTeX Conversion Standards**:
   - Superscripts: x² → x^2, E = mc² → E = mc^2
   - Subscripts: H₂O → H_2O, x₁ → x_1
   - Greek letters: α → \\alpha, β → \\beta, θ → \\theta, π → \\pi
   - Operators: ∑ → \\sum, ∫ → \\int, ∏ → \\prod, ∂ → \\partial
   - Relations: ≤ → \\leq, ≥ → \\geq, ≠ → \\neq, ∈ → \\in, ⊂ → \\subset
   - Special: ∞ → \\infty, ± → \\pm, × → \\times, ÷ → \\div

4. **Academic Structure Detection**:
   - **Theorems**: "Theorem 1:", "Lemma 2.1:", "Corollary:" → theorem block
   - **Proofs**: "Proof:", "Solution:", ending with ∎, □, QED → proof block
   - **Definitions**: "Definition:", "Let x be..." → theorem block (type: definition)
   - **Footnotes**: ¹, ², *, †, ‡ markers → footnote references
   - **Citations**: [1], (Smith, 2023), (Author et al., 2022) → citation references

5. **Numbering and Labels**:
   - Detect equation numbers: "(1)", "(2.1)", "Equation 3"
   - Set numbered: true for explicitly numbered equations
   - Generate labels for cross-references

6. **Math Complexity Assessment**:
   - **Basic**: Simple arithmetic, basic algebra (x + y, x²)
   - **Intermediate**: Calculus, functions, matrices (∫, ∂/∂x, matrices)
   - **Advanced**: Complex analysis, advanced notation (topology, category theory)

ACADEMIC WRITING PATTERNS:

1. **Document Type Classification**:
   - "mathematical" for heavy math content (>10 equations)
   - "academic" for papers with citations and formal structure
   - Original types for other content

2. **Footnote Processing**:
   - Extract footnote markers in text → footnoteRef inline content
   - Create footnote blocks for definitions at bottom
   - Maintain proper numbering sequence

3. **Citation Handling**:
   - Numeric: [1], [2,3] → citationRef with type: "numeric"
   - Author-year: (Smith, 2023) → citationRef with type: "author-year"
   - Preserve original display text

EXAMPLES:

**Input**: "The Pythagorean theorem states that $a^2 + b^2 = c^2$ for any right triangle."
**Output**: paragraph block with inline math content: { type: "math", latex: "a^2 + b^2 = c^2" }

**Input**: "Consider the integral $$\\int_0^1 x^2 dx = \\frac{1}{3}$$"
**Output**: math block: { type: "math", mathType: "display", latex: "\\int_0^1 x^2 dx = \\frac{1}{3}" }

**Input**: "Theorem 1: Every bounded sequence has a convergent subsequence."
**Output**: theorem block: { type: "theorem", theoremType: "theorem", theoremNumber: "1", content: [...] }

**Input**: "This follows from the work of Smith¹ and recent advances²."
**Output**: paragraph with footnote references: { type: "footnoteRef", noteId: "1", displayNumber: "¹" }

PROCESSING INSTRUCTIONS:

1. **Preserve Mathematical Integrity**: Never modify LaTeX content - copy exactly as written
2. **Maintain Document Structure**: Respect original paragraph breaks and formatting
3. **Generate Unique IDs**: Create consistent, unique identifiers for all blocks
4. **Validate LaTeX**: Check for balanced braces and common syntax errors
5. **Academic Context**: Recognize formal academic writing patterns
6. **Error Recovery**: If math parsing fails, create placeholder blocks rather than failing

REQUIRED OUTPUT STRUCTURE:

Return a valid JSON object with the canonical document structure:
- metadata: document classification and analysis results
- content: array of typed blocks (paragraph, heading, math, theorem, etc.)
- version, createdAt, updatedAt: standard document metadata

Ensure all math blocks have valid LaTeX content and appropriate mathType designation.

TEXT TO ANALYZE:
${rawText}
`;
  }

  /**
   * 🔧 ENHANCED: Validate and fix mathematical content in processed document
   */
  private validateMathContent(document: any): void {
    const mathBlocks =
      document.content?.filter((block: any) => block.type === "math") || [];

    // 🔧 FIX: Instead of throwing error, fix or remove invalid math blocks
    const validMathBlocks: any[] = [];
    const invalidMathBlocks: any[] = [];

    mathBlocks.forEach((block: any, index: number) => {
      // 🔧 FIX 1: Log the problematic block for debugging
      console.log(`=== Math Block ${index} Debug ===`);
      console.log("Block structure:", JSON.stringify(block, null, 2));
      console.log("Has latex property:", "latex" in block);
      console.log("LaTeX value:", block.latex);
      console.log("LaTeX type:", typeof block.latex);
      console.log("LaTeX truthy:", !!block.latex);

      // 🔧 FIX 2: Handle different types of missing LaTeX content
      if (!block.latex) {
        console.warn(
          `Math block ${index} missing LaTeX content, attempting to fix...`
        );

        // Try to extract LaTeX from other properties
        const possibleLatex =
          block.content || block.text || block.expression || block.formula;

        if (possibleLatex && typeof possibleLatex === "string") {
          console.log(
            `Recovered LaTeX from alternative property: ${possibleLatex}`
          );
          block.latex = possibleLatex;
        } else if (block.content && Array.isArray(block.content)) {
          // Try to extract text from content array
          const textContent = block.content
            .filter((item: any) => item.type === "text")
            .map((item: any) => item.text)
            .join(" ");

          if (textContent.trim()) {
            console.log(`Recovered LaTeX from content array: ${textContent}`);
            block.latex = textContent.trim();
          }
        }

        // 🔧 FIX 3: If still no LaTeX, provide fallback or convert to paragraph
        if (!block.latex) {
          console.warn(
            `Math block ${index} cannot be recovered, converting to paragraph`
          );

          // Convert to paragraph block instead of throwing error
          const paragraphBlock = {
            id: block.id || `paragraph-${index}`,
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "[Mathematical expression - content not available]",
              },
            ],
          };

          // Mark for removal from math blocks and add to document content
          invalidMathBlocks.push({
            index,
            original: block,
            replacement: paragraphBlock,
          });
          return; // Skip this block from valid math blocks
        }
      }

      // 🔧 FIX 4: Basic LaTeX validation (non-blocking)
      if (block.latex) {
        const braceCount =
          (block.latex.match(/\{/g) || []).length -
          (block.latex.match(/\}/g) || []).length;

        if (braceCount !== 0) {
          console.warn(
            `Math block ${index} has unbalanced braces:`,
            block.latex
          );
          block.error = "Unbalanced braces in LaTeX expression";
          // Don't throw error, just mark with warning
        }

        // Ensure required properties exist
        if (!block.mathType) {
          block.mathType = "display"; // Default to display math
          console.log(
            `Math block ${index} missing mathType, defaulting to 'display'`
          );
        }

        if (!block.id) {
          block.id = `math-${index}-${Date.now()}`;
          console.log(`Math block ${index} missing ID, generated: ${block.id}`);
        }

        validMathBlocks.push(block);
      }
    });

    // 🔧 FIX 5: Replace invalid math blocks with paragraph blocks
    if (invalidMathBlocks.length > 0) {
      console.log(
        `Converting ${invalidMathBlocks.length} invalid math blocks to paragraphs`
      );

      // Replace in document content
      invalidMathBlocks.forEach(({ index, original, replacement }) => {
        const docIndex = document.content.findIndex(
          (block: any) => block === original
        );
        if (docIndex !== -1) {
          document.content[docIndex] = replacement;
        }
      });
    }

    console.log(
      `Math validation complete: ${validMathBlocks.length} valid, ${invalidMathBlocks.length} converted`
    );
  }

  /**
   * Simplified processing for fallback
   */
  private async processWithSimplifiedMathPrompt(
    rawText: string
  ): Promise<CanonicalDocument> {
    const simplifiedPrompt = this.buildSimplifiedMathPrompt(rawText);

    const response = await this.genAI.models.generateContent({
      model: this.config.model,
      contents: simplifiedPrompt,
      config: {
        temperature: 0.2,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      },
    });

    const jsonString = response.text;
    if (!jsonString) {
      throw new DocumentProcessingError(
        "No response from simplified math processing"
      );
    }

    const parsedDocument = JSON.parse(jsonString);
    return validateCanonicalDocument(parsedDocument);
  }

  /**
   * Build simplified math prompt for fallback
   */
  private buildSimplifiedMathPrompt(rawText: string): string {
    return `
Convert this text to structured JSON with focus on mathematical content:

MATH DETECTION:
- Look for $...$ patterns (inline math)
- Look for $$...$$ patterns (display math)
- Convert to LaTeX format

TEXT: ${rawText}

Return JSON with:
1. metadata: { documentType, language, confidenceScore, hasMatematicalContent }
2. content: array of blocks (paragraph, heading, math)
3. version, createdAt, updatedAt

Focus on math detection and preserve mathematical expressions exactly.
`;
  }

  /**
   * Basic structure processing as fallback
   */
  private async processWithBasicStructure(
    rawText: string
  ): Promise<CanonicalDocument> {
    const paragraphs = rawText.split("\n\n").filter((p) => p.trim().length > 0);

    const content = paragraphs.map((text, index) => ({
      id: `p-${index + 1}`,
      type: "paragraph" as const,
      content: [
        {
          type: "text" as const,
          text: text.trim(),
        },
      ],
    }));

    // Check if there's any math content for metadata
    const mathAnalysis = this.analyzeMathContent(rawText);

    return {
      metadata: {
        documentType: mathAnalysis.hasMath
          ? ("mathematical" as const)
          : ("other" as const),
        language: "en",
        confidenceScore: 0.3,
        hasMatematicalContent: mathAnalysis.hasMath,
        mathComplexity: mathAnalysis.complexity,
      },
      content,
      version: "1.0",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Final fallback: create minimal document
   */
  private createFallbackDocument(rawText: string): CanonicalDocument {
    return {
      metadata: {
        documentType: "other" as const,
        language: "en",
        confidenceScore: 0.1,
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

// =============================================================================
// Enhanced Utility Functions
// =============================================================================

let geminiInstance: GeminiDocumentProcessor | null = null;

export const getGeminiProcessor = (
  apiKey?: string
): GeminiDocumentProcessor => {
  if (!geminiInstance) {
    geminiInstance = new GeminiDocumentProcessor(apiKey, {
      mathDetection: true,
      academicMode: true,
    });
  }
  return geminiInstance;
};

export const validateGeminiApiKey = async (
  apiKey: string
): Promise<boolean> => {
  try {
    const processor = new GeminiDocumentProcessor(apiKey);
    await processor.processDocumentWithMath("test $x^2$ equation");
    return true;
  } catch (error) {
    return false;
  }
};

export const estimateProcessingTime = (
  textLength: number,
  hasMath: boolean = false
): number => {
  // Rough estimate: 2-5 seconds per 1000 characters, more for math content
  const baseTime = Math.max(2000, Math.min(45000, textLength * 3));
  return hasMath ? baseTime * 1.5 : baseTime;
};

// Math-specific utility functions
export const extractMathExpressions = (
  text: string
): Array<{
  type: "inline" | "display";
  latex: string;
  position: { start: number; end: number };
}> => {
  const expressions: Array<{
    type: "inline" | "display";
    latex: string;
    position: { start: number; end: number };
  }> = [];

  // Find display math ($$...$$)
  const displayRegex = /\$\$([\s\S]*?)\$\$/g;
  let match;
  while ((match = displayRegex.exec(text)) !== null) {
    expressions.push({
      type: "display",
      latex: match[1].trim(),
      position: { start: match.index, end: match.index + match[0].length },
    });
  }

  // Find inline math ($...$) - avoid conflicts with display math
  const inlineRegex = /(?<!\$)\$([^$\n]+?)\$(?!\$)/g;
  while ((match = inlineRegex.exec(text)) !== null) {
    // Check if this match is not inside a display math block
    const isInsideDisplay = expressions.some(
      (expr) =>
        expr.type === "display" &&
        match!.index >= expr.position.start &&
        match!.index < expr.position.end
    );

    if (!isInsideDisplay) {
      expressions.push({
        type: "inline",
        latex: match[1].trim(),
        position: { start: match.index, end: match.index + match[0].length },
      });
    }
  }

  return expressions.sort((a, b) => a.position.start - b.position.start);
};

export type { GeminiConfig };
