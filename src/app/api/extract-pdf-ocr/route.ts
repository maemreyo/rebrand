import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { HybridPdfProcessor, checkIfPdfNeedsOcr } from '@/lib/services/hybrid-pdf-processor';
import { 
  HybridPdfResult,
  OcrProcessingOptions,
  validateOcrOptions,
  OcrProcessingError,
  OCR_CONFIG 
} from '@/types/ocr';

// =============================================================================
// Request/Response Schemas
// =============================================================================

const ExtractPdfOcrRequestSchema = z.object({
  enableOcr: z.boolean().default(true),
  ocrOptions: z.object({
    language: z.string().default('en'),
    enhanceImage: z.boolean().default(true),
    density: z.number().min(72).max(600).default(300),
    format: z.enum(['png', 'jpg', 'jpeg']).default('png'),
    width: z.number().min(100).max(4000).optional(),
    height: z.number().min(100).max(4000).optional(),
  }).optional(),
  progressCallback: z.boolean().default(false),
});

interface ExtractPdfOcrResponse {
  success: boolean;
  data?: {
    text: string;
    metadata: {
      filename: string;
      fileSize: number;
      pageCount: number;
      totalProcessingTime: number;
      textPages: number;
      ocrPages: number;
      skippedPages: number;
      method: 'text-only' | 'ocr-only' | 'hybrid';
      title?: string;
      author?: string;
      creator?: string;
      ocrEnabled: boolean;
      needsOcr: boolean;
    };
    pageResults?: Array<{
      pageNumber: number;
      text: string;
      confidence?: number;
      processingTime: number;
      method: 'text' | 'ocr';
      error?: string;
    }>;
  };
  error?: string;
  details?: any;
}

// =============================================================================
// POST Handler - Enhanced PDF Extraction with OCR
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse<ExtractPdfOcrResponse>> {
  const startTime = Date.now();

  try {
    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const options = formData.get('options') as string | null;

    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'No file provided',
      }, { status: 400 });
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json({
        success: false,
        error: 'Invalid file type. Only PDF files are supported.',
      }, { status: 400 });
    }

    // Validate file size
    const maxSize = OCR_CONFIG.MAX_FILE_SIZE;
    if (file.size > maxSize) {
      return NextResponse.json({
        success: false,
        error: `File too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB.`,
      }, { status: 400 });
    }

    // Parse options
    let requestOptions: any = { enableOcr: true };
    if (options) {
      try {
        requestOptions = { ...requestOptions, ...JSON.parse(options) };
      } catch {
        console.warn('Invalid options JSON, using defaults');
      }
    }

    const validationResult = ExtractPdfOcrRequestSchema.safeParse(requestOptions);
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request options',
        details: validationResult.error.errors,
      }, { status: 400 });
    }

    const { enableOcr, ocrOptions } = validationResult.data;

    // Convert file to buffer
    const pdfBuffer = Buffer.from(await file.arrayBuffer());

    // Check API key availability for OCR
    const apiKey = process.env.GEMINI_API_KEY;
    if (enableOcr && !apiKey) {
      console.warn('Gemini API key not configured, falling back to text-only extraction');
      return await fallbackToTextOnly(pdfBuffer, file.name, startTime);
    }

    // Quick check if PDF needs OCR
    console.log(`🔍 Analyzing PDF: ${file.name} (${file.size} bytes)`);
    const ocrCheck = await checkIfPdfNeedsOcr(pdfBuffer);
    
    console.log(`📊 OCR Analysis: needsOcr=${ocrCheck.needsOcr}, textLength=${ocrCheck.textLength}, pages=${ocrCheck.pageCount}`);

    // If OCR is disabled or not needed, use simple text extraction
    if (!enableOcr || !ocrCheck.needsOcr) {
      return await processTextOnlyPdf(pdfBuffer, file.name, startTime, ocrCheck);
    }

    // Process with hybrid OCR workflow
    console.log(`🚀 Starting hybrid OCR processing for ${file.name}...`);
    
    const processor = new HybridPdfProcessor(apiKey);
    
    // Validate and apply OCR options
    let processedOcrOptions: OcrProcessingOptions | undefined;
    if (ocrOptions) {
      try {
        processedOcrOptions = validateOcrOptions(ocrOptions);
      } catch (error) {
        console.warn('Invalid OCR options, using defaults:', error);
      }
    }

    const hybridResult = await processor.processHybridPdf(
      pdfBuffer,
      file.name,
      processedOcrOptions
    );

    // Cleanup resources
    processor.cleanup();

    if (!hybridResult.success) {
      console.error('❌ Hybrid processing failed:', hybridResult.error);
      
      // Fallback to text-only extraction
      console.log('🔄 Falling back to text-only extraction...');
      return await fallbackToTextOnly(pdfBuffer, file.name, startTime);
    }

    // Return successful OCR result
    const response: ExtractPdfOcrResponse = {
      success: true,
      data: {
        text: hybridResult.data!.text,
        metadata: {
          ...hybridResult.data!.metadata,
          ocrEnabled: true,
          needsOcr: ocrCheck.needsOcr,
        },
        pageResults: hybridResult.data!.pageResults,
      },
    };

    console.log(`✅ Enhanced PDF extraction complete: ${file.name} (${Date.now() - startTime}ms)`);
    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Unexpected error in extract-pdf-ocr endpoint:', error);

    return NextResponse.json({
      success: false,
      error: 'Internal server error during PDF processing',
      details: process.env.NODE_ENV === 'development' 
        ? (error instanceof Error ? error.message : 'Unknown error')
        : undefined,
    }, { status: 500 });
  }
}

// =============================================================================
// Fallback Functions
// =============================================================================

/**
 * Fallback to text-only extraction using pdf-parse
 */
async function fallbackToTextOnly(
  pdfBuffer: Buffer,
  filename: string,
  startTime: number
): Promise<NextResponse<ExtractPdfOcrResponse>> {
  try {
    console.log(`📄 Using text-only extraction for ${filename}...`);
    
    // Dynamic import to avoid SSR issues
    const pdf = (await import('pdf-parse')).default;
    const pdfData = await pdf(pdfBuffer);

    const processingTime = Date.now() - startTime;

    const response: ExtractPdfOcrResponse = {
      success: true,
      data: {
        text: pdfData.text || '',
        metadata: {
          filename,
          fileSize: pdfBuffer.length,
          pageCount: pdfData.numpages,
          totalProcessingTime: processingTime,
          textPages: pdfData.numpages,
          ocrPages: 0,
          skippedPages: 0,
          method: 'text-only',
          title: pdfData.info?.Title,
          author: pdfData.info?.Author,
          creator: pdfData.info?.Creator,
          ocrEnabled: false,
          needsOcr: false,
        },
      },
    };

    console.log(`✅ Text-only extraction complete: ${filename} (${processingTime}ms)`);
    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('❌ Text-only extraction failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to extract text from PDF',
      details: error instanceof Error ? error.message : 'Text extraction failed',
    }, { status: 500 });
  }
}

/**
 * Process text-only PDF (when OCR check determines it's not needed)
 */
async function processTextOnlyPdf(
  pdfBuffer: Buffer,
  filename: string,
  startTime: number,
  ocrCheck: { needsOcr: boolean; textLength: number; pageCount: number }
): Promise<NextResponse<ExtractPdfOcrResponse>> {
  try {
    console.log(`📄 Processing text-only PDF: ${filename} (${ocrCheck.textLength} chars)`);
    
    const pdf = (await import('pdf-parse')).default;
    const pdfData = await pdf(pdfBuffer);

    const processingTime = Date.now() - startTime;

    const response: ExtractPdfOcrResponse = {
      success: true,
      data: {
        text: pdfData.text || '',
        metadata: {
          filename,
          fileSize: pdfBuffer.length,
          pageCount: pdfData.numpages,
          totalProcessingTime: processingTime,
          textPages: pdfData.numpages,
          ocrPages: 0,
          skippedPages: 0,
          method: 'text-only',
          title: pdfData.info?.Title,
          author: pdfData.info?.Author,
          creator: pdfData.info?.Creator,
          ocrEnabled: true, // OCR was available but not needed
          needsOcr: ocrCheck.needsOcr,
        },
      },
    };

    console.log(`✅ Text-only processing complete: ${filename} (${processingTime}ms)`);
    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('❌ Text-only processing failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to process PDF',
      details: error instanceof Error ? error.message : 'PDF processing failed',
    }, { status: 500 });
  }
}

// =============================================================================
// GET Handler - Health Check and Capabilities
// =============================================================================

export async function GET(): Promise<NextResponse> {
  try {
    const hasGeminiKey = !!process.env.GEMINI_API_KEY;
    
    return NextResponse.json({
      status: 'ok',
      endpoint: 'extract-pdf-ocr',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      capabilities: {
        textExtraction: true,
        ocrSupported: hasGeminiKey,
        geminiModel: OCR_CONFIG.DEFAULT_MODEL,
        maxFileSize: `${Math.round(OCR_CONFIG.MAX_FILE_SIZE / 1024 / 1024)}MB`,
        maxPages: OCR_CONFIG.MAX_PAGES,
        supportedFormats: ['pdf'],
        features: [
          'Intelligent hybrid workflow',
          'Text-based PDF detection',
          'Page-level classification',
          'OCR for scanned pages',
          'Batch processing',
          'Error recovery',
          'Progress tracking',
        ],
      },
      config: {
        defaultDensity: OCR_CONFIG.DEFAULT_DENSITY,
        defaultFormat: OCR_CONFIG.DEFAULT_FORMAT,
        maxPagesParallel: OCR_CONFIG.MAX_PAGES_PARALLEL,
        minTextLengthForTextBased: OCR_CONFIG.MIN_TEXT_LENGTH_FOR_TEXT_BASED,
        minTextLengthPerPage: OCR_CONFIG.MIN_TEXT_LENGTH_PER_PAGE,
      },
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: 'Health check failed',
    }, { status: 500 });
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
// Helper Functions
// =============================================================================

/**
 * Validate PDF file structure
 */
function validatePdfFile(buffer: Buffer): boolean {
  // Check PDF header (should start with %PDF-)
  const header = buffer.subarray(0, 5).toString();
  return header === '%PDF-';
}

/**
 * Log processing statistics
 */
function logProcessingStats(
  filename: string,
  fileSize: number,
  pageCount: number,
  method: string,
  processingTime: number
): void {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[PDF-OCR] ${filename} - ${fileSize} bytes, ${pageCount} pages, ${method}, ${processingTime}ms`);
  }
}

// =============================================================================
// Error Classes
// =============================================================================

export class PdfOcrExtractionError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = "PdfOcrExtractionError";
  }
}

export class InvalidPdfOcrError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidPdfOcrError";
  }
}

