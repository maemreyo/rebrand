import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { GeminiDocumentProcessor } from '@/lib/services/gemini';
import { CanonicalToTiptapAdapter } from '@/lib/adapters/canonical-to-tiptap';
import { 
  CanonicalDocument, 
  DocumentProcessingError,
  validateCanonicalDocument 
} from '@/types/document';

// =============================================================================
// Request/Response Schemas
// =============================================================================

const AnalyzeRequestSchema = z.object({
  text: z.string().min(1, 'Text cannot be empty').max(50000, 'Text too long (max 50k characters)'),
  options: z.object({
    language: z.string().optional(),
    documentType: z.enum(['report', 'article', 'form', 'contract', 'other']).optional(),
    enableFallback: z.boolean().default(true),
  }).optional(),
});

interface AnalyzeResponse {
  success: boolean;
  data?: {
    canonical: CanonicalDocument;
    tiptap: any;
    metadata: {
      processingTime: number;
      textLength: number;
      blockCount: number;
      confidenceScore: number;
    };
  };
  error?: string;
  details?: any;
}

// =============================================================================
// POST Handler - Document Analysis
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse<AnalyzeResponse>> {
  const startTime = Date.now();

  try {
    // Parse and validate request body
    const body = await request.json().catch(() => null);
    
    if (!body) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON in request body',
        },
        { status: 400 }
      );
    }

    const validationResult = AnalyzeRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request format',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { text, options } = validationResult.data;

    // Check API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Server configuration error: Missing AI API key',
        },
        { status: 500 }
      );
    }

    // Initialize processors
    const geminiProcessor = new GeminiDocumentProcessor(apiKey);
    const tiptapAdapter = new CanonicalToTiptapAdapter();

    // Process document with Gemini AI
    let canonicalDocument: CanonicalDocument;
    
    try {
      if (options?.enableFallback !== false) {
        canonicalDocument = await geminiProcessor.processDocumentWithFallbacks(text);
      } else {
        canonicalDocument = await geminiProcessor.processDocument(text);
      }
    } catch (error) {
      console.error('Document processing failed:', error);
      
      return NextResponse.json(
        {
          success: false,
          error: error instanceof DocumentProcessingError 
            ? error.message 
            : 'Failed to process document',
          details: error instanceof Error ? error.message : undefined,
        },
        { status: 500 }
      );
    }

    // Transform to Tiptap format
    let tiptapDocument;
    try {
      tiptapDocument = tiptapAdapter.transform(canonicalDocument);
    } catch (error) {
      console.error('Tiptap transformation failed:', error);
      
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to convert document to editor format',
          details: error instanceof Error ? error.message : undefined,
        },
        { status: 500 }
      );
    }

    // Calculate metadata
    const processingTime = Date.now() - startTime;
    const blockCount = canonicalDocument.content.length;
    const confidenceScore = canonicalDocument.metadata.confidenceScore;

    // Return successful response
    return NextResponse.json(
      {
        success: true,
        data: {
          canonical: canonicalDocument,
          tiptap: tiptapDocument,
          metadata: {
            processingTime,
            textLength: text.length,
            blockCount,
            confidenceScore,
          },
        },
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Unexpected error in analyze endpoint:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' 
          ? (error instanceof Error ? error.message : 'Unknown error')
          : undefined,
      },
      { status: 500 }
    );
  }
}

// =============================================================================
// GET Handler - Health Check
// =============================================================================

export async function GET(): Promise<NextResponse> {
  try {
    // Check if Gemini API key is configured
    const hasApiKey = !!process.env.GEMINI_API_KEY;
    
    return NextResponse.json(
      {
        status: 'ok',
        endpoint: 'analyze',
        configured: hasApiKey,
        timestamp: new Date().toISOString(),
        version: '1.0.0',
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
// OPTIONS Handler - CORS Support
// =============================================================================

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Rate limiting check (simple implementation)
 */
function checkRateLimit(request: NextRequest): boolean {
  // In production, implement proper rate limiting with Redis or similar
  // For now, just return true
  return true;
}

/**
 * Log request for monitoring
 */
function logRequest(
  request: NextRequest, 
  textLength: number, 
  processingTime: number
): void {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[ANALYZE] ${request.method} - ${textLength} chars - ${processingTime}ms`);
  }
}

/**
 * Sanitize text input
 */
function sanitizeText(text: string): string {
  // Remove potentially harmful content
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
    .trim();
}

// =============================================================================
// Error Response Helpers
// =============================================================================

export function createErrorResponse(
  error: string,
  status: number = 400,
  details?: any
): NextResponse<AnalyzeResponse> {
  return NextResponse.json(
    {
      success: false,
      error,
      details,
    },
    { status }
  );
}

export function createSuccessResponse(
  data: AnalyzeResponse['data']
): NextResponse<AnalyzeResponse> {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status: 200 }
  );
}