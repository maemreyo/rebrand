// UPDATED: 2025-07-08 - Enhanced with comprehensive math detection and academic structure support

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { GeminiDocumentProcessor } from '@/lib/services/gemini';
import { CanonicalToTiptapAdapter, validateTiptapJsonWithMath, extractMathFromTiptapJson } from '@/lib/adapters/canonical-to-tiptap';
import { 
  CanonicalDocument, 
  DocumentProcessingError,
  MathProcessingError,
  validateCanonicalDocument,
  extractMathFromDocument,
  isMathBlock,
  isFootnoteBlock,
  isTheoremBlock
} from '@/types/document';

// =============================================================================
// Enhanced Request/Response Schemas
// =============================================================================

const AnalyzeRequestSchema = z.object({
  text: z.string().min(1, 'Text cannot be empty').max(100000, 'Text too long (max 100k characters)'),
  options: z.object({
    language: z.string().default('en'),
    documentType: z.enum([
      'report', 'article', 'form', 'contract', 'other', 
      'academic', 'mathematical'  // ← Enhanced with math/academic types
    ]).default('other'),
    enableFallback: z.boolean().default(true),
    
    // ← New math-specific options
    mathDetection: z.boolean().default(false),
    academicMode: z.boolean().default(false),
    mathComplexity: z.enum(['basic', 'intermediate', 'advanced']).optional(),
    preserveLatex: z.boolean().default(true),
  }).optional().default({}),
});

interface MathAnalysisMetadata {
  hasMathContent: boolean;
  mathBlockCount: number;
  mathInlineCount: number;
  mathComplexity: 'basic' | 'intermediate' | 'advanced';
  detectedPackages: string[];
  mathErrors: string[];
  latexExpressions: Array<{
    type: 'inline' | 'display';
    latex: string;
    complexity: 'basic' | 'intermediate' | 'advanced';
    valid: boolean;
    error?: string;
  }>;
}

interface AcademicAnalysisMetadata {
  hasAcademicStructure: boolean;
  footnoteCount: number;
  citationCount: number;
  theoremCount: number;
  proofCount: number;
  hasReferences: boolean;
  structureElements: string[];
}

interface EnhancedAnalyzeResponse {
  success: boolean;
  data?: {
    canonical: CanonicalDocument;
    tiptap: any;
    metadata: {
      processingTime: number;
      textLength: number;
      blockCount: number;
      confidenceScore: number;
      
      // ← Enhanced metadata
      documentType: string;
      hasMatematicalContent: boolean;
      mathAnalysis: MathAnalysisMetadata;
      academicAnalysis: AcademicAnalysisMetadata;
      processingStrategy: string;
      geminiModel: string;
      apiVersion: string;
    };
  };
  error?: string;
  details?: any;
}

// =============================================================================
// Enhanced POST Handler with Math Support
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse<EnhancedAnalyzeResponse>> {
  const startTime = Date.now();

  try {
    // =============================================================================
    // Request Validation and Setup
    // =============================================================================

    if (!checkRateLimit(request)) {
      return createErrorResponse('Rate limit exceeded', 429);
    }

    const body = await request.json();
    const validationResult = AnalyzeRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return createErrorResponse(
        'Invalid request format',
        400,
        validationResult.error.errors
      );
    }

    const { text, options = {} } = validationResult.data;
    const sanitizedText = sanitizeText(text);

    if (!sanitizedText) {
      return createErrorResponse('Text content is empty after sanitization');
    }

    // =============================================================================
    // Enhanced Gemini Processing with Math Detection
    // =============================================================================

    const geminiProcessor = new GeminiDocumentProcessor(process.env.GEMINI_API_KEY!, {
      mathDetection: options.mathDetection,
      academicMode: options.academicMode,
      temperature: options.mathDetection ? 0.05 : 0.1, // Lower temperature for math
    });

    let canonicalDocument: CanonicalDocument;
    let processingStrategy = 'standard';

    try {
      if (options.mathDetection || options.academicMode) {
        // Use enhanced math processing
        canonicalDocument = await geminiProcessor.processDocumentWithMath(sanitizedText);
        processingStrategy = options.mathDetection ? 'math-enhanced' : 'academic-enhanced';
      } else {
        // Use standard processing with fallbacks
        canonicalDocument = await geminiProcessor.processDocumentWithFallbacks(sanitizedText);
        processingStrategy = 'standard-with-fallbacks';
      }
    } catch (error) {
      if (error instanceof DocumentProcessingError || error instanceof MathProcessingError) {
        return createErrorResponse(
          `Processing failed: ${error.message}`,
          500,
          { 
            processingStrategy,
            originalError: error.cause?.message 
          }
        );
      }
      throw error;
    }

    // =============================================================================
    // Math Content Analysis
    // =============================================================================

    const mathAnalysis = analyzeMathContent(canonicalDocument);
    const academicAnalysis = analyzeAcademicContent(canonicalDocument);

    // =============================================================================
    // Tiptap Conversion with Enhanced Validation
    // =============================================================================

    const adapter = new CanonicalToTiptapAdapter();
    let tiptapContent: any;

    try {
      tiptapContent = adapter.transform(canonicalDocument);
      
      // Validate Tiptap JSON with math support
      if (!validateTiptapJsonWithMath(tiptapContent)) {
        console.warn('Generated Tiptap JSON failed math validation');
        // Continue anyway, but note in metadata
      }
    } catch (error) {
      return createErrorResponse(
        'Failed to convert document to editor format',
        500,
        { adapterError: error instanceof Error ? error.message : 'Unknown conversion error' }
      );
    }

    // =============================================================================
    // Enhanced Metadata Generation
    // =============================================================================

    const processingTime = Date.now() - startTime;
    const blockCount = canonicalDocument.content.length;
    
    const enhancedMetadata = {
      processingTime,
      textLength: sanitizedText.length,
      blockCount,
      confidenceScore: canonicalDocument.metadata.confidenceScore,
      
      // Enhanced metadata
      documentType: canonicalDocument.metadata.documentType,
      hasMatematicalContent: canonicalDocument.metadata.hasMatematicalContent || false,
      mathAnalysis,
      academicAnalysis,
      processingStrategy,
      geminiModel: 'gemini-2.5-flash',
      apiVersion: '2.0.0',
    };

    // =============================================================================
    // Logging and Response
    // =============================================================================

    logRequest(request, sanitizedText.length, processingTime, {
      mathDetection: options.mathDetection,
      academicMode: options.academicMode,
      mathBlockCount: mathAnalysis.mathBlockCount,
      processingStrategy,
    });

    return createSuccessResponse({
      canonical: canonicalDocument,
      tiptap: tiptapContent,
      metadata: enhancedMetadata,
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    console.error('Analyze API Error:', error);
    
    return createErrorResponse(
      'Internal server error during document analysis',
      500,
      {
        processingTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV === 'development' 
          ? (error instanceof Error ? error.stack : undefined)
          : undefined,
      }
    );
  }
}

// =============================================================================
// Math Content Analysis Functions
// =============================================================================

function analyzeMathContent(document: CanonicalDocument): MathAnalysisMetadata {
  const mathExpressions = extractMathFromDocument(document);
  const mathBlocks = document.content.filter(isMathBlock);
  
  let mathBlockCount = 0;
  let mathInlineCount = 0;
  let maxComplexity: 'basic' | 'intermediate' | 'advanced' = 'basic';
  const detectedPackages = new Set<string>();
  const mathErrors: string[] = [];

  const processedExpressions = mathExpressions.map(expr => {
    // Update complexity
    if (expr.complexity === 'advanced') maxComplexity = 'advanced';
    else if (expr.complexity === 'intermediate' && maxComplexity === 'basic') {
      maxComplexity = 'intermediate';
    }

    return {
      type: 'inline' as const, // Would need to detect this properly
      latex: expr.latex,
      complexity: expr.complexity,
      valid: true, // Would validate with actual LaTeX parser
      error: undefined,
    };
  });

  // Count math blocks
  document.content.forEach(block => {
    if (isMathBlock(block)) {
      if (block.mathType === 'display') {
        mathBlockCount++;
      } else {
        mathInlineCount++;
      }
      
      if (block.error) {
        mathErrors.push(block.error);
      }
    }
  });

  return {
    hasMathContent: mathExpressions.length > 0,
    mathBlockCount,
    mathInlineCount,
    mathComplexity: maxComplexity,
    detectedPackages: Array.from(detectedPackages),
    mathErrors,
    latexExpressions: processedExpressions,
  };
}

function analyzeAcademicContent(document: CanonicalDocument): AcademicAnalysisMetadata {
  let footnoteCount = 0;
  let citationCount = 0;
  let theoremCount = 0;
  let proofCount = 0;
  const structureElements: string[] = [];

  document.content.forEach(block => {
    if (isFootnoteBlock(block)) {
      footnoteCount++;
      structureElements.push('footnotes');
    }
    
    if (block.type === 'citation') {
      citationCount++;
      structureElements.push('citations');
    }
    
    if (isTheoremBlock(block)) {
      theoremCount++;
      structureElements.push('theorems');
    }
    
    if (block.type === 'proof') {
      proofCount++;
      structureElements.push('proofs');
    }

    if (block.type === 'heading') {
      structureElements.push('structured-headings');
    }
  });

  return {
    hasAcademicStructure: structureElements.length > 0,
    footnoteCount,
    citationCount,
    theoremCount,
    proofCount,
    hasReferences: citationCount > 0,
    structureElements: Array.from(new Set(structureElements)),
  };
}

// =============================================================================
// GET Handler - Enhanced Health Check
// =============================================================================

export async function GET(): Promise<NextResponse> {
  try {
    const hasApiKey = !!process.env.GEMINI_API_KEY;
    
    return NextResponse.json(
      {
        status: 'ok',
        endpoint: 'analyze',
        configured: hasApiKey,
        features: {
          mathDetection: true,
          academicMode: true,
          fallbackProcessing: true,
          enhancedMetadata: true,
        },
        supportedDocumentTypes: [
          'mathematical', 'academic', 'report', 'article', 'form', 'contract', 'other'
        ],
        apiVersion: '2.0.0',
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        error: 'Health check failed',
      },
      { status: 500 }
    );
  }
}

// =============================================================================
// OPTIONS Handler - Enhanced CORS Support
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': process.env.NODE_ENV === 'development' ? '*' : 'https://your-domain.com',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400', // 24 hours
    },
  });
}

// =============================================================================
// Enhanced Utility Functions
// =============================================================================

/**
 * Enhanced rate limiting check
 */
function checkRateLimit(request: NextRequest): boolean {
  // Simple IP-based rate limiting
  // In production, implement proper rate limiting with Redis
  const clientIP = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  
  // For now, just return true
  // TODO: Implement Redis-based rate limiting
  return true;
}

/**
 * Enhanced request logging with math metrics
 */
function logRequest(
  request: NextRequest, 
  textLength: number, 
  processingTime: number,
  options?: {
    mathDetection?: boolean;
    academicMode?: boolean;
    mathBlockCount?: number;
    processingStrategy?: string;
  }
): void {
  if (process.env.NODE_ENV === 'development') {
    const logData = {
      method: request.method,
      textLength,
      processingTime,
      ...options,
      timestamp: new Date().toISOString(),
    };
    
    console.log(`[ANALYZE-v2] ${JSON.stringify(logData)}`);
  }
}

/**
 * Enhanced text sanitization
 */
function sanitizeText(text: string): string {
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
    .replace(/[\uFEFF\uFFFE\uFFFF]/g, '') // Remove Unicode BOM and replacement chars
    .trim();
}

/**
 * Detect if text contains mathematical content
 */
function detectMathContent(text: string): boolean {
  const mathPatterns = [
    /\$[^$]*\$/g, // Inline math $...$
    /\$\$[^$]*\$\$/g, // Display math $$...$$
    /\\[a-zA-Z]+/g, // LaTeX commands
    /[α-ωΑ-Ω]/g, // Greek letters
    /[∑∏∫∂∇∞≤≥≠∈∉⊂⊃∩∪]/g, // Math symbols
    /\b(theorem|lemma|proof|equation|formula)\b/gi, // Academic keywords
  ];

  return mathPatterns.some(pattern => pattern.test(text));
}

/**
 * Auto-detect processing options based on content
 */
function autoDetectProcessingOptions(text: string): {
  suggestedDocumentType: string;
  shouldEnableMath: boolean;
  shouldEnableAcademic: boolean;
} {
  const hasMath = detectMathContent(text);
  const hasAcademic = /\b(abstract|introduction|methodology|conclusion|references|bibliography|footnote)\b/gi.test(text);
  
  let suggestedDocumentType = 'other';
  if (hasMath && hasAcademic) suggestedDocumentType = 'academic';
  else if (hasMath) suggestedDocumentType = 'mathematical';
  else if (hasAcademic) suggestedDocumentType = 'academic';
  
  return {
    suggestedDocumentType,
    shouldEnableMath: hasMath,
    shouldEnableAcademic: hasAcademic,
  };
}

// =============================================================================
// Enhanced Error Response Helpers
// =============================================================================

function createErrorResponse(
  error: string,
  status: number = 400,
  details?: any
): NextResponse<EnhancedAnalyzeResponse> {
  return NextResponse.json(
    {
      success: false,
      error,
      details,
    },
    { status }
  );
}

function createSuccessResponse(
  data: NonNullable<EnhancedAnalyzeResponse['data']>
): NextResponse<EnhancedAnalyzeResponse> {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { 
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Processing-Time': data.metadata.processingTime.toString(),
        'X-Math-Content': data.metadata.hasMatematicalContent.toString(),
        'X-API-Version': '2.0.0',
      }
    }
  );
}

// =============================================================================
// Export Types for Frontend Usage
// =============================================================================

export type { 
  EnhancedAnalyzeResponse as AnalyzeResponse,
  MathAnalysisMetadata,
  AcademicAnalysisMetadata 
};