import { GoogleGenAI } from '@google/genai';
import { 
  CanonicalDocument, 
  DocumentProcessingError, 
  validateCanonicalDocument,
  MathProcessingError
} from '@/types/document';

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

const DEFAULT_CONFIG: Omit<GeminiConfig, 'apiKey'> = {
  model: 'gemini-2.5-flash',
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
          enum: ["report", "article", "form", "contract", "other", "academic", "mathematical"],
        },
        language: { type: "string" },
        confidenceScore: { type: "number", minimum: 0, maximum: 1 },
        hasMatematicalContent: { type: "boolean", nullable: true },
        mathComplexity: { 
          type: "string", 
          enum: ["basic", "intermediate", "advanced"],
          nullable: true 
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
              "heading", "paragraph", "list", "table", "image", 
              "codeBlock", "blockquote", "multipleChoice", "divider",
              "math", "footnote", "citation", "theorem", "proof"  // ← ENHANCED
            ],
          },
          // Math-specific properties
          mathType: { 
            type: "string", 
            enum: ["inline", "display"],
            nullable: true 
          },
          latex: { type: "string", nullable: true },
          numbered: { type: "boolean", nullable: true },
          complexity: {
            type: "string",
            enum: ["basic", "intermediate", "advanced"],
            nullable: true
          },
          
          // Footnote properties
          noteId: { type: "string", nullable: true },
          noteNumber: { type: "number", nullable: true },
          
          // Citation properties
          citationKey: { type: "string", nullable: true },
          citationType: { 
            type: "string", 
            enum: ["numeric", "author-year", "footnote"],
            nullable: true 
          },
          displayText: { type: "string", nullable: true },
          
          // Theorem properties
          theoremType: {
            type: "string",
            enum: ["theorem", "lemma", "corollary", "proposition", "definition"],
            nullable: true
          },
          theoremNumber: { type: "string", nullable: true },
          
          // Proof properties
          proofMethod: {
            type: "string",
            enum: ["direct", "contradiction", "induction", "construction"],
            nullable: true
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
        'Gemini API key is required. Set GEMINI_API_KEY environment variable or pass it to constructor.'
      );
    }

    this.config = { ...DEFAULT_CONFIG, apiKey: finalApiKey, ...config };
    this.genAI = new GoogleGenAI({ apiKey: this.config.apiKey });
  }

  /**
   * Enhanced document processing with math detection and academic structure recognition
   */
  async processDocumentWithFallbacks(rawText: string): Promise<CanonicalDocument> {
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
        console.warn('Processing strategy failed:', error);
        continue;
      }
    }

    throw new DocumentProcessingError(
      'All processing strategies failed',
      lastError || undefined
    );
  }

  /**
   * Main enhanced document processing with math and academic content detection
   */
  async processDocumentWithMath(rawText: string): Promise<CanonicalDocument> {
    if (!rawText || rawText.trim().length === 0) {
      throw new DocumentProcessingError('Raw text cannot be empty');
    }

    try {
      // Pre-analyze text for math content
      const mathAnalysis = this.analyzeMathContent(rawText);
      const academicAnalysis = this.analyzeAcademicStructure(rawText);
      
      const prompt = this.buildEnhancedAnalysisPrompt(rawText, mathAnalysis, academicAnalysis);
      
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
        console.error('Gemini API response missing text:', response);
        throw new DocumentProcessingError('No response from Gemini AI');
      }

      const parsedDocument = JSON.parse(jsonString);
      
      // Validate math content if present
      if (mathAnalysis.hasMath) {
        this.validateMathContent(parsedDocument);
      }
      
      return validateCanonicalDocument(parsedDocument);

    } catch (error) {
      if (error instanceof DocumentProcessingError || error instanceof MathProcessingError) {
        throw error;
      }
      throw new DocumentProcessingError(
        'Failed to process document with enhanced Gemini AI',
        error as Error
      );
    }
  }

  /**
   * Analyze mathematical content in raw text
   */
  private analyzeMathContent(text: string): {
    hasMath: boolean;
    inlineCount: number;
    displayCount: number;
    complexity: "basic" | "intermediate" | "advanced";
    detectedPatterns: string[];
  } {
    const patterns = {
      // Dollar notation: $x^2$ and $$equation$$
      dollarInline: /\$[^$\n]+\$/g,
      dollarDisplay: /\$\$[\s\S]+?\$\$/g,
      
      // Bracket notation: \(x^2\) and \[equation\]
      bracketInline: /\\\([^\\]+\\\)/g,
      bracketDisplay: /\\\[[\s\S]+?\\\]/g,
      
      // Mathematical symbols
      greekLetters: /[αβγδεζηθικλμνξπρστυφχψωΑΒΓΔΕΖΗΘΙΚΛΜΝΞΠΡΣΤΥΦΧΨΩ]/g,
      mathOperators: /[∑∏∫∂∇∞≤≥≠∈∉⊂⊃∩∪±×÷√]/g,
      superSubscript: /[₀₁₂₃₄₅₆₇₈₉⁰¹²³⁴⁵⁶⁷⁸⁹]/g,
      
      // LaTeX commands
      latexCommands: /\\[a-zA-Z]+\{[^}]*\}/g,
      fractions: /\\frac\{[^}]*\}\{[^}]*\}/g,
      integrals: /\\int(_[^}]*\})?(\^[^}]*\})?/g,
      sums: /\\sum(_[^}]*\})?(\^[^}]*\})?/g,
      
      // Mathematical environments
      mathEnvironments: /\\begin\{(equation|align|gather|matrix|cases)\}[\s\S]*?\\end\{\1\}/g,
    };

    const detectedPatterns: string[] = [];
    let totalMatches = 0;

    // Count matches for each pattern
    Object.entries(patterns).forEach(([name, regex]) => {
      const matches = text.match(regex);
      if (matches && matches.length > 0) {
        detectedPatterns.push(name);
        totalMatches += matches.length;
      }
    });

    const inlineCount = (text.match(patterns.dollarInline) || []).length + 
                       (text.match(patterns.bracketInline) || []).length;
    const displayCount = (text.match(patterns.dollarDisplay) || []).length + 
                        (text.match(patterns.bracketDisplay) || []).length +
                        (text.match(patterns.mathEnvironments) || []).length;

    let complexity: "basic" | "intermediate" | "advanced" = "basic";
    if (detectedPatterns.includes('fractions') || detectedPatterns.includes('integrals')) {
      complexity = "intermediate";
    }
    if (detectedPatterns.includes('mathEnvironments') || totalMatches > 10) {
      complexity = "advanced";
    }

    return {
      hasMath: totalMatches > 0,
      inlineCount,
      displayCount,
      complexity,
      detectedPatterns,
    };
  }

  /**
   * Analyze academic structure in raw text
   */
  private analyzeAcademicStructure(text: string): {
    hasAcademicStructure: boolean;
    hasFootnotes: boolean;
    hasCitations: boolean;
    hasTheorems: boolean;
    detectedElements: string[];
  } {
    const patterns = {
      // Footnotes
      footnoteMarkers: /\^\d+|\*+|†|‡/g,
      footnoteText: /^\d+\.?\s+.+$/gm,
      
      // Citations
      numericCitations: /\[\d+(?:,\s*\d+)*\]/g,
      authorYearCitations: /\([A-Za-z]+(?:\s+et\s+al\.?)?,?\s+\d{4}\)/g,
      
      // Theorems and proofs
      theorems: /(?:theorem|lemma|corollary|proposition|definition)\s*\d*\.?\s*:/gi,
      proofs: /(?:proof|solution)\.?\s*:/gi,
      qed: /∎|□|QED/g,
      
      // Academic keywords
      academicKeywords: /(?:abstract|introduction|methodology|results|conclusion|references|bibliography)/gi,
      
      // Figure and table references
      figureRefs: /(?:figure|fig\.?|table|tab\.?)\s*\d+/gi,
      equations: /(?:equation|eq\.?)\s*\(?\d+\.?\d*\)?/gi,
    };

    const detectedElements: string[] = [];
    let hasAcademicMarkers = false;

    Object.entries(patterns).forEach(([name, regex]) => {
      const matches = text.match(regex);
      if (matches && matches.length > 0) {
        detectedElements.push(name);
        hasAcademicMarkers = true;
      }
    });

    return {
      hasAcademicStructure: hasAcademicMarkers,
      hasFootnotes: detectedElements.includes('footnoteMarkers') || detectedElements.includes('footnoteText'),
      hasCitations: detectedElements.includes('numericCitations') || detectedElements.includes('authorYearCitations'),
      hasTheorems: detectedElements.includes('theorems') || detectedElements.includes('proofs'),
      detectedElements,
    };
  }

  /**
   * Build enhanced analysis prompt with math and academic awareness
   */
  private buildEnhancedAnalysisPrompt(
    rawText: string, 
    mathAnalysis: any, 
    academicAnalysis: any
  ): string {
    return `
SYSTEM: You are a specialized academic and mathematical document analysis AI with expertise in:
- Advanced mathematical notation and LaTeX processing
- Academic document structure recognition (papers, theses, technical reports)
- Scientific writing patterns and citation formats
- Mathematical theorem and proof identification

DOCUMENT ANALYSIS CONTEXT:
- Math content detected: ${mathAnalysis.hasMath}
- Complexity level: ${mathAnalysis.complexity}
- Academic structure: ${academicAnalysis.hasAcademicStructure}
- Detected patterns: ${[...mathAnalysis.detectedPatterns, ...academicAnalysis.detectedElements].join(', ')}

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
**Output**: paragraph with footnote references: { type: "footnoteRef", noteId: "fn1", noteNumber: 1 }

CONTENT PRESERVATION:
- Preserve ALL mathematical expressions exactly
- Maintain academic structure and hierarchy
- Keep original numbering and references
- Preserve inline formatting and emphasis

ERROR HANDLING:
- For invalid LaTeX: set error field with description
- For ambiguous math: prefer inline over display
- For unclear citations: preserve original text format

INPUT TEXT:
${rawText}

RETURN: Complete structured JSON document following the enhanced schema exactly, with proper math detection, academic structure recognition, and LaTeX conversion.
`;
  }

  /**
   * Validate mathematical content in processed document
   */
  private validateMathContent(document: any): void {
    const mathBlocks = document.content?.filter((block: any) => block.type === 'math') || [];
    
    mathBlocks.forEach((block: any, index: number) => {
      if (!block.latex) {
        throw new MathProcessingError(
          `Math block ${index} missing LaTeX content`,
          block.latex
        );
      }
      
      // Basic LaTeX validation
      const braceCount = (block.latex.match(/\{/g) || []).length - 
                        (block.latex.match(/\}/g) || []).length;
      
      if (braceCount !== 0) {
        console.warn(`Math block ${index} has unbalanced braces:`, block.latex);
        block.error = 'Unbalanced braces in LaTeX expression';
      }
    });
  }

  /**
   * Simplified processing for fallback
   */
  private async processWithSimplifiedMathPrompt(rawText: string): Promise<CanonicalDocument> {
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
      throw new DocumentProcessingError('No response from simplified math processing');
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
  private async processWithBasicStructure(rawText: string): Promise<CanonicalDocument> {
    const paragraphs = rawText.split('\n\n').filter(p => p.trim().length > 0);
    
    const content = paragraphs.map((text, index) => ({
      id: `p-${index + 1}`,
      type: 'paragraph' as const,
      content: [
        {
          type: 'text' as const,
          text: text.trim(),
        },
      ],
    }));

    // Check if there's any math content for metadata
    const mathAnalysis = this.analyzeMathContent(rawText);

    return {
      metadata: {
        documentType: mathAnalysis.hasMath ? 'mathematical' as const : 'other' as const,
        language: 'en',
        confidenceScore: 0.3,
        hasMatematicalContent: mathAnalysis.hasMath,
        mathComplexity: mathAnalysis.complexity,
      },
      content,
      version: '1.0',
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
        documentType: 'other' as const,
        language: 'en',
        confidenceScore: 0.1,
      },
      content: [
        {
          id: 'p-fallback',
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: rawText,
            },
          ],
        },
      ],
      version: '1.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}

// =============================================================================
// Enhanced Utility Functions
// =============================================================================

let geminiInstance: GeminiDocumentProcessor | null = null;

export const getGeminiProcessor = (apiKey?: string): GeminiDocumentProcessor => {
  if (!geminiInstance) {
    geminiInstance = new GeminiDocumentProcessor(apiKey, {
      mathDetection: true,
      academicMode: true,
    });
  }
  return geminiInstance;
};

export const validateGeminiApiKey = async (apiKey: string): Promise<boolean> => {
  try {
    const processor = new GeminiDocumentProcessor(apiKey);
    await processor.processDocumentWithMath('test $x^2$ equation');
    return true;
  } catch (error) {
    return false;
  }
};

export const estimateProcessingTime = (textLength: number, hasMath: boolean = false): number => {
  // Rough estimate: 2-5 seconds per 1000 characters, more for math content
  const baseTime = Math.max(2000, Math.min(45000, textLength * 3));
  return hasMath ? baseTime * 1.5 : baseTime;
};

// Math-specific utility functions
export const extractMathExpressions = (text: string): Array<{
  type: 'inline' | 'display';
  latex: string;
  position: { start: number; end: number };
}> => {
  const expressions: Array<{
    type: 'inline' | 'display';
    latex: string;
    position: { start: number; end: number };
  }> = [];

  // Find display math ($$...$$)
  const displayRegex = /\$\$([\s\S]*?)\$\$/g;
  let match;
  while ((match = displayRegex.exec(text)) !== null) {
    expressions.push({
      type: 'display',
      latex: match[1].trim(),
      position: { start: match.index, end: match.index + match[0].length }
    });
  }

  // Find inline math ($...$) - avoid conflicts with display math
  const inlineRegex = /(?<!\$)\$([^$\n]+?)\$(?!\$)/g;
  while ((match = inlineRegex.exec(text)) !== null) {
    // Check if this match is not inside a display math block
    const isInsideDisplay = expressions.some(expr => 
      expr.type === 'display' && 
      match!.index >= expr.position.start && 
      match!.index < expr.position.end
    );
    
    if (!isInsideDisplay) {
      expressions.push({
        type: 'inline',
        latex: match[1].trim(),
        position: { start: match.index, end: match.index + match[0].length }
      });
    }
  }

  return expressions.sort((a, b) => a.position.start - b.position.start);
};

export type { GeminiConfig };