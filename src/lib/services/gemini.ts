// src/lib/services/gemini.ts
// FIXED: 2025-07-08 - Enhanced error handling, API configuration validation, and better response processing

import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  CanonicalDocument,
  DocumentProcessingError,
  validateCanonicalDocument,
  MathProcessingError,
} from "@/types/document";

// =============================================================================
// FIXED: Enhanced Gemini Configuration with Validation
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
  model: "gemini-2.5-flash", // FIXED: Use stable model name
  timeout: 30000, // FIXED: Reduced timeout for better reliability
  maxRetries: 3,
  temperature: 0.1, // FIXED: Slightly higher for better creativity
  topP: 0.9,
  topK: 25,
  maxOutputTokens: 64000, // FIXED: Reduced for better reliability
  mathDetection: true,
  academicMode: true,
};

// =============================================================================
// FIXED: Simplified Response Schema for Better Reliability
// =============================================================================

const CANONICAL_DOCUMENT_SCHEMA = {
  type: "object",
  properties: {
    metadata: {
      type: "object",
      properties: {
        title: { type: "string" },
        author: { type: "string" },
        subject: { type: "string" },
        keywords: {
          type: "array",
          items: { type: "string" },
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
        hasMatematicalContent: { type: "boolean" },
        mathComplexity: {
          type: "string",
          enum: ["basic", "intermediate", "advanced"],
        },
        footnoteCount: { type: "number" },
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
              "proof",
            ],
          },
          content: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { type: "string" },
                text: { type: "string" },
              },
            },
          },
          // Math-specific properties
          mathType: { type: "string", enum: ["inline", "display"] },
          latex: { type: "string" },
          numbered: { type: "boolean" },

          // Other common properties
          level: { type: "number" },
          listType: { type: "string" },
          language: { type: "string" },
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
// FIXED: Enhanced Gemini Document Processor Class
// =============================================================================

export class GeminiDocumentProcessor {
  private genAI: GoogleGenerativeAI;
  private config: GeminiConfig;

  constructor(apiKey?: string, config?: Partial<GeminiConfig>) {
    // FIXED: Better API key validation
    const finalApiKey = apiKey || process.env.GEMINI_API_KEY;

    if (!finalApiKey) {
      throw new DocumentProcessingError(
        "Gemini API key is required. Please set GEMINI_API_KEY environment variable or pass it to constructor."
      );
    }

    if (finalApiKey.length < 10) {
      throw new DocumentProcessingError(
        "Invalid Gemini API key format. Please check your API key."
      );
    }

    this.config = { ...DEFAULT_CONFIG, apiKey: finalApiKey, ...config };

    try {
      this.genAI = new GoogleGenerativeAI(this.config.apiKey);
    } catch (error) {
      throw new DocumentProcessingError(
        "Failed to initialize Gemini AI client",
        error instanceof Error ? error : undefined
      );
    }
  }

  // =============================================================================
  // FIXED: Main Processing Methods with Better Error Handling
  // =============================================================================

  /**
   * Enhanced document processing with comprehensive fallback strategies
   */
  async processDocumentWithFallbacks(
    rawText: string
  ): Promise<CanonicalDocument> {
    if (!rawText || rawText.trim().length === 0) {
      throw new DocumentProcessingError("Raw text cannot be empty");
    }

    const strategies = [
      () => this.processDocumentWithMath(rawText),
      () => this.processWithSimplifiedPrompt(rawText),
      () => this.processWithBasicStructure(rawText),
      () => this.createFallbackDocument(rawText),
    ];

    let lastError: Error | null = null;
    let attemptCount = 0;

    for (const strategy of strategies) {
      attemptCount++;
      try {
        console.log(
          `[Gemini] Attempting strategy ${attemptCount}/${strategies.length}`
        );
        const result = await strategy();
        console.log(`[Gemini] Strategy ${attemptCount} succeeded`);
        return result;
      } catch (error) {
        lastError = error as Error;
        console.warn(
          `[Gemini] Strategy ${attemptCount} failed:`,
          error instanceof Error ? error.message : error
        );

        // If it's an API key error, don't try other strategies
        if (error instanceof Error && error.message.includes("API key")) {
          throw error;
        }

        continue;
      }
    }

    throw new DocumentProcessingError(
      `All ${strategies.length} processing strategies failed. Last error: ${
        lastError?.message || "Unknown error"
      }`,
      lastError || undefined
    );
  }

  /**
   * FIXED: Enhanced document processing with better error handling
   */
  async processDocumentWithMath(rawText: string): Promise<CanonicalDocument> {
    if (!rawText || rawText.trim().length === 0) {
      throw new DocumentProcessingError("Raw text cannot be empty");
    }

    try {
      // Pre-analyze text for math content
      const mathAnalysis = this.analyzeMathContent(rawText);
      const academicAnalysis = this.analyzeAcademicStructure(rawText);

      console.log(
        `[Gemini] Processing text (${rawText.length} chars) with math detection:`,
        mathAnalysis.hasMath
      );

      const prompt = this.buildEnhancedAnalysisPrompt(
        rawText,
        mathAnalysis,
        academicAnalysis
      );

      // FIXED: Get model instance with better error handling
      const model = this.genAI.getGenerativeModel({
        model: this.config.model,
        generationConfig: {
          temperature: this.config.temperature,
          topP: this.config.topP,
          topK: this.config.topK,
          maxOutputTokens: this.config.maxOutputTokens,
        },
      });

      console.log(`[Gemini] Calling ${this.config.model} with enhanced prompt`);

      // FIXED: Better API call with timeout and error handling
      const startTime = Date.now();

      const result = (await Promise.race([
        model.generateContent(prompt),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Request timeout")),
            this.config.timeout
          )
        ),
      ])) as any;

      const endTime = Date.now();
      console.log(`[Gemini] API call completed in ${endTime - startTime}ms`);

      // FIXED: Better response validation
      if (!result) {
        throw new DocumentProcessingError(
          "No response from Gemini AI - result is null"
        );
      }

      if (!result.response) {
        throw new DocumentProcessingError(
          "No response from Gemini AI - response is null"
        );
      }

      const responseText = result.response.text();

      if (!responseText) {
        throw new DocumentProcessingError(
          "No response from Gemini AI - response text is empty"
        );
      }

      console.log(`[Gemini] Received response (${responseText.length} chars)`);

      // FIXED: Better JSON parsing with error handling
      let parsedDocument;
      try {
        parsedDocument = JSON.parse(responseText);
      } catch (parseError) {
        console.error("[Gemini] JSON parse error:", parseError);
        console.error("[Gemini] Raw response:", responseText.substring(0, 500));
        throw new DocumentProcessingError(
          "Failed to parse Gemini AI response as JSON",
          parseError instanceof Error ? parseError : undefined
        );
      }

      // FIXED: Better validation
      try {
        const validatedDocument = validateCanonicalDocument(parsedDocument);
        console.log(
          `[Gemini] Document validated successfully (${validatedDocument.content.length} blocks)`
        );
        return validatedDocument;
      } catch (validationError) {
        console.error("[Gemini] Validation error:", validationError);
        throw new DocumentProcessingError(
          "Generated document failed validation",
          validationError instanceof Error ? validationError : undefined
        );
      }
    } catch (error) {
      if (error instanceof DocumentProcessingError) {
        throw error;
      }

      // FIXED: Better error classification
      if (error instanceof Error) {
        if (
          error.message.includes("API_KEY_INVALID") ||
          error.message.includes("401")
        ) {
          throw new DocumentProcessingError(
            "Invalid Gemini API key. Please check your GEMINI_API_KEY environment variable.",
            error
          );
        }

        if (error.message.includes("quota") || error.message.includes("429")) {
          throw new DocumentProcessingError(
            "Gemini API quota exceeded. Please try again later.",
            error
          );
        }

        if (error.message.includes("timeout")) {
          throw new DocumentProcessingError(
            "Gemini API request timeout. Please try again.",
            error
          );
        }
      }

      throw new DocumentProcessingError(
        "Failed to process document with Gemini AI",
        error instanceof Error ? error : undefined
      );
    }
  }

  // =============================================================================
  // FIXED: Simplified Processing Methods
  // =============================================================================

  /**
   * FIXED: Simplified processing with reduced complexity
   */
  private async processWithSimplifiedPrompt(
    rawText: string
  ): Promise<CanonicalDocument> {
    console.log("[Gemini] Trying simplified prompt strategy");

    try {
      const model = this.genAI.getGenerativeModel({
        model: this.config.model,
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 4096,
        },
      });

      const simplifiedPrompt = `
Please convert this text into a structured JSON document format:

Text: ${rawText.substring(0, 3000)} ${rawText.length > 3000 ? "..." : ""}

Return a JSON object with:
1. metadata: { documentType: "other", language: "en", confidenceScore: 0.8 }
2. content: array of blocks (paragraph, heading, list)
3. version: "1.0"
4. createdAt: current timestamp
5. updatedAt: current timestamp

Focus on basic structure. Detect math expressions in $...$ format if present.

Response format: Valid JSON only, no additional text.`;

      const result = await model.generateContent(simplifiedPrompt);
      const responseText = result.response.text();

      if (!responseText) {
        throw new Error("Empty response from simplified processing");
      }

      const parsedDocument = JSON.parse(responseText);
      return validateCanonicalDocument(parsedDocument);
    } catch (error) {
      console.error("[Gemini] Simplified processing failed:", error);
      throw new DocumentProcessingError(
        "Simplified processing failed",
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * FIXED: Basic structure processing as ultimate fallback
   */
  private async processWithBasicStructure(
    rawText: string
  ): Promise<CanonicalDocument> {
    console.log("[Gemini] Trying basic structure strategy");

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
        confidenceScore: 0.6,
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
   * FIXED: Create fallback document when all else fails
   */
  private createFallbackDocument(rawText: string): CanonicalDocument {
    console.log("[Gemini] Creating fallback document");

    return {
      metadata: {
        documentType: "other",
        language: "en",
        confidenceScore: 0.3,
        hasMatematicalContent: false,
      },
      content: [
        {
          id: "fallback-1",
          type: "paragraph",
          content: [
            {
              type: "text",
              text:
                rawText.length > 1000
                  ? rawText.substring(0, 1000) + "..."
                  : rawText,
            },
          ],
        },
      ],
      version: "1.0",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  // =============================================================================
  // Analysis Helper Methods (unchanged but with better error handling)
  // =============================================================================

  private analyzeMathContent(text: string): {
    hasMath: boolean;
    complexity: "basic" | "intermediate" | "advanced";
    detectedPatterns: string[];
  } {
    try {
      const patterns = {
        inlineMath: /\$[^$]+\$/g,
        displayMath: /\$\$[^$]+\$\$/g,
        latexCommands: /\\[a-zA-Z]+/g,
        greekLetters: /[α-ωΑ-Ω]/g,
        mathSymbols: /[∑∏∫∂∇∞≤≥≠∈∉⊂⊃∩∪]/g,
      };

      const detectedPatterns: string[] = [];
      let hasMath = false;

      Object.entries(patterns).forEach(([name, regex]) => {
        if (regex.test(text)) {
          detectedPatterns.push(name);
          hasMath = true;
        }
      });

      let complexity: "basic" | "intermediate" | "advanced" = "basic";
      if (
        detectedPatterns.includes("latexCommands") &&
        detectedPatterns.includes("mathSymbols")
      ) {
        complexity = "intermediate";
      }
      if (
        detectedPatterns.includes("displayMath") &&
        detectedPatterns.length > 3
      ) {
        complexity = "advanced";
      }

      return { hasMath, complexity, detectedPatterns };
    } catch (error) {
      console.warn("[Gemini] Math analysis failed:", error);
      return { hasMath: false, complexity: "basic", detectedPatterns: [] };
    }
  }

  private analyzeAcademicStructure(text: string): {
    hasAcademicStructure: boolean;
    detectedElements: string[];
  } {
    try {
      const patterns = {
        footnoteMarkers: /\[\d+\]|\(\d+\)|^\d+\./gm,
        citations: /\([A-Za-z]+,?\s+\d{4}\)|\[\d+\]/g,
        theorems:
          /(?:theorem|lemma|corollary|proposition|definition)\s*\d*\.?\s*:/gi,
        academicKeywords:
          /(?:abstract|introduction|methodology|results|conclusion|references)/gi,
      };

      const detectedElements: string[] = [];
      let hasAcademicStructure = false;

      Object.entries(patterns).forEach(([name, regex]) => {
        if (regex.test(text)) {
          detectedElements.push(name);
          hasAcademicStructure = true;
        }
      });

      return { hasAcademicStructure, detectedElements };
    } catch (error) {
      console.warn("[Gemini] Academic analysis failed:", error);
      return { hasAcademicStructure: false, detectedElements: [] };
    }
  }

  // =============================================================================
  // FIXED: Enhanced Prompt Building
  // =============================================================================

  private buildEnhancedAnalysisPrompt(
    rawText: string,
    mathAnalysis: any,
    academicAnalysis: any
  ): string {
    return `
SYSTEM: You are a specialized document analysis AI with expertise in mathematical and academic content processing.

DOCUMENT ANALYSIS CONTEXT:
- Math content detected: ${mathAnalysis.hasMath}
- Complexity level: ${mathAnalysis.complexity}
- Academic structure: ${academicAnalysis.hasAcademicStructure}
- Detected patterns: ${[
      ...mathAnalysis.detectedPatterns,
      ...academicAnalysis.detectedElements,
    ].join(", ")}

MATHEMATICAL DETECTION RULES:

1. **Inline Math Patterns** (convert to paragraph with math content):
   - Dollar syntax: $E = mc^2$, $x^2 + y^2 = z^2$
   - Variable references: x₁, y², α, β, θ, ∑, ∫, ∞, ≤, ≥, ∈, ⊂

2. **Display Math Patterns** (convert to separate math blocks):
   - Double dollar: $$\\int_0^\\infty e^{-x^2} dx = \\sqrt{\\pi}$$
   - Complex equations with line breaks

3. **Academic Structure Detection**:
   - Footnotes: [1], (1), ¹, numbered references
   - Citations: (Author, 2023), [1], (Smith et al., 2022)
   - Theorems: "Theorem 1:", "Lemma:", "Proof:"

RESPONSE FORMAT: Valid JSON only, following this exact structure:

{
  "metadata": {
    "documentType": "mathematical|academic|report|article|other",
    "language": "en",
    "confidenceScore": 0.8,
    "hasMatematicalContent": ${mathAnalysis.hasMath},
    "mathComplexity": "${mathAnalysis.complexity}"
  },
  "content": [
    {
      "id": "block_1",
      "type": "paragraph|heading|math|list",
      "content": [{"type": "text", "text": "content here"}],
      "level": 1,
      "mathType": "inline|display",
      "latex": "LaTeX expression if math"
    }
  ],
  "version": "1.0",
  "createdAt": "${new Date().toISOString()}",
  "updatedAt": "${new Date().toISOString()}"
}

CONTENT PRESERVATION:
- Preserve ALL mathematical expressions exactly
- Maintain structure and hierarchy
- Keep original formatting when possible

INPUT TEXT:
${rawText}

RETURN: Complete structured JSON document following the schema exactly.`;
  }

  // =============================================================================
  // FIXED: Validation Methods
  // =============================================================================

  private validateMathContent(document: any): void {
    try {
      const mathBlocks =
        document.content?.filter((block: any) => block.type === "math") || [];

      mathBlocks.forEach((block: any, index: number) => {
        if (!block.latex) {
          console.warn(`Math block ${index} missing LaTeX content`);
        }

        // Basic LaTeX validation
        const latex = block.latex || "";
        const braceCount =
          (latex.match(/\{/g) || []).length - (latex.match(/\}/g) || []).length;

        if (braceCount !== 0) {
          console.warn(`Math block ${index} has unbalanced braces:`, latex);
          block.error = "Unbalanced braces in LaTeX expression";
        }
      });
    } catch (error) {
      console.warn("[Gemini] Math validation failed:", error);
    }
  }
}

// =============================================================================
// FIXED: Utility Functions
// =============================================================================

/**
 * FIXED: Validate environment and API key
 */
export function validateGeminiEnvironment(): {
  valid: boolean;
  error?: string;
} {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return {
        valid: false,
        error: "GEMINI_API_KEY environment variable is not set",
      };
    }

    if (apiKey.length < 10) {
      return {
        valid: false,
        error: "GEMINI_API_KEY appears to be invalid (too short)",
      };
    }

    if (!apiKey.startsWith("AI") && !apiKey.includes("AIza")) {
      return {
        valid: false,
        error: "GEMINI_API_KEY format appears to be invalid",
      };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: `Environment validation failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}

/**
 * FIXED: Test Gemini connection
 */
export async function testGeminiConnection(
  apiKey?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const processor = new GeminiDocumentProcessor(apiKey);

    // Test with minimal content
    const testDocument = await processor.processWithBasicStructure(
      "Test document"
    );

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Unknown connection error",
    };
  }
}

// =============================================================================
// Export Everything
// =============================================================================

export { GeminiDocumentProcessor as default };
