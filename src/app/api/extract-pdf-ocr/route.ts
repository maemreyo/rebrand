// Enhanced with OCR v2.0 text quality validation system

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  HybridPdfProcessor,
  checkIfPdfNeedsOcr,
} from "@/lib/services/hybrid-pdf-processor";
import { validateTextQuality } from "@/lib/utils/text-validation";
import {
  HybridPdfResult,
  OcrProcessingOptions,
  validateOcrOptions,
  OcrProcessingError,
  TextValidationError,
  OCR_CONFIG,
} from "@/types/ocr";
import { promises as fs } from "fs";
import path from "path";

// =============================================================================
// Development Mock Data Support
// =============================================================================

/**
 * Load mock data for development environment
 */
async function loadMockData(): Promise<EnhancedExtractPdfOcrResponse | null> {
  try {
    if (process.env.NODE_ENV !== "development") {
      return null;
    }

    const mockDataPath = path.join(process.cwd(), "data", "extract-pdf-response.json");
    const mockDataContent = await fs.readFile(mockDataPath, "utf-8");
    const mockData = JSON.parse(mockDataContent);
    
    console.log("🔧 [DEV] Using mock data from extract-pdf-response.json");
    return mockData;
  } catch (error) {
    console.warn("⚠️ [DEV] Could not load mock data:", error);
    return null;
  }
}

/**
 * Check if we should use mock data in development
 */
function shouldUseMockData(): boolean {
  return (
    process.env.NODE_ENV === "development" && 
    process.env.USE_MOCK_PDF_EXTRACTION === "true"
  );
}

// =============================================================================
// Enhanced Request/Response Schemas
// =============================================================================

const ExtractPdfOcrRequestSchema = z.object({
  enableOcr: z.boolean().default(true),
  ocrOptions: z
    .object({
      language: z.string().default("en"),
      enhanceImage: z.boolean().default(true),
      density: z.number().min(72).max(600).default(300),
      format: z.enum(["png", "jpg", "jpeg"]).default("png"),
      width: z.number().min(100).max(4000).optional(),
      height: z.number().min(100).max(4000).optional(),
      forceOcr: z.boolean().default(false), // Add forceOcr to schema
    })
    .optional(),
  progressCallback: z.boolean().default(false),
  // OCR v2.0: Validation options
  validationOptions: z
    .object({
      enableValidation: z.boolean().default(true),
      confidenceThreshold: z.number().min(0).max(1).optional(),
      logDecisions: z.boolean().default(false),
    })
    .optional(),
});

interface EnhancedExtractPdfOcrResponse {
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
      method: "text-only" | "ocr-only" | "hybrid";
      title?: string;
      author?: string;
      creator?: string;
      ocrEnabled: boolean;
      needsOcr: boolean;
      // OCR v2.0: Enhanced validation metadata
      validationEnabled: boolean;
      averageConfidence?: number;
      validationTime?: number;
      triggerReason?: string;
      performanceMetrics?: {
        initialCheckTime: number;
        classificationTime: number;
        ocrTime: number;
        consolidationTime: number;
      };
    };
    pageResults?: Array<{
      pageNumber: number;
      text: string;
      confidence?: number;
      processingTime: number;
      method: "text" | "ocr";
      error?: string;
      // OCR v2.0: Validation result for the page
      validationResult?: {
        confidence: number;
        isValid: boolean;
        reason: string;
        metrics: any;
      };
    }>;
    // OCR v2.0: System performance and debugging info
    validationStats?: {
      totalValidations: number;
      averageValidationTime: number;
      ocrTriggeredByValidation: number;
      fallbackToLegacy: number;
    };
  };
  error?: string;
  details?: any;
}

// =============================================================================
// Enhanced POST Handler with OCR v2.0 Features
// =============================================================================

export async function POST(
  request: NextRequest
): Promise<NextResponse<EnhancedExtractPdfOcrResponse>> {
  const startTime = Date.now();
  const performanceMetrics = {
    initialCheckTime: 0,
    classificationTime: 0,
    ocrTime: 0,
    consolidationTime: 0,
  };

  try {
    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const options = formData.get("options") as string | null;

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: "No file provided",
        },
        { status: 400 }
      );
    }

    // Validate file type
    if (file.type !== "application/pdf") {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid file type. Only PDF files are supported.",
        },
        { status: 400 }
      );
    }

    // Validate file size
    const maxSize = OCR_CONFIG.MAX_FILE_SIZE;
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          success: false,
          error: `File too large. Maximum size is ${Math.round(
            maxSize / 1024 / 1024
          )}MB.`,
        },
        { status: 400 }
      );
    }

    // Parse and validate options
    let requestOptions: any = {
      enableOcr: true,
      validationOptions: { enableValidation: true },
    };
    if (options) {
      try {
        requestOptions = { ...requestOptions, ...JSON.parse(options) };
      } catch {
        console.warn("Invalid options JSON, using defaults");
      }
    }

    const validationResult =
      ExtractPdfOcrRequestSchema.safeParse(requestOptions);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request options",
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { enableOcr, ocrOptions, validationOptions } = validationResult.data;

    // =============================================================================
    // Development Mock Data Support
    // =============================================================================
    
    // Check if we should use mock data in development
    if (shouldUseMockData()) {
      console.log("🔧 [DEV] Development mode detected - attempting to use mock data");
      const mockData = await loadMockData();
      if (mockData) {
        // Update mock data with current file metadata
        if (mockData.data) {
          mockData.data.metadata.filename = file.name;
          mockData.data.metadata.fileSize = file.size;
          mockData.data.metadata.totalProcessingTime = Date.now() - startTime;
        }
        
        console.log("✅ [DEV] Returning mock data for development");
        return NextResponse.json(mockData, { status: 200 });
      } else {
        console.log("⚠️ [DEV] Mock data not available, falling back to normal processing");
      }
    }

    // // TEMPORARY: Force forceOcr to true for testing purposes
    // if (ocrOptions) {
    //   ocrOptions.forceOcr = true;
    // } else {
    //   requestOptions.ocrOptions = { forceOcr: true };
    // }

    // Convert file to buffer
    const pdfBuffer = Buffer.from(await file.arrayBuffer());

    // Check API key availability for OCR
    const apiKey = process.env.GEMINI_API_KEY;
    if (enableOcr && !apiKey) {
      console.warn(
        "Gemini API key not configured, falling back to text-only extraction"
      );
      return await fallbackToTextOnly(
        pdfBuffer,
        file.name,
        startTime,
        performanceMetrics
      );
    }

    // OCR v2.0: Enhanced OCR requirement check with validation
    console.log(
      `🔍 [ENHANCED] Analyzing PDF: ${file.name} (${file.size} bytes)`
    );
    const checkStartTime = Date.now();

    const ocrCheck = await checkIfPdfNeedsOcr(pdfBuffer);
    performanceMetrics.initialCheckTime = Date.now() - checkStartTime;

    console.log(
      `📊 [ENHANCED] Analysis complete: needsOcr=${
        ocrCheck.needsOcr
      }, textLength=${
        ocrCheck.textLength
      }, validation=${!!ocrCheck.validationResult}`
    );
    if (ocrCheck.validationResult) {
      console.log(
        `📊 [ENHANCED] Validation: confidence=${ocrCheck.validationResult.confidence.toFixed(
          3
        )}, reason="${ocrCheck.reason}"`
      );
    }

    // Enhanced logging for debugging
    if (validationOptions?.logDecisions) {
      console.log(`🔍 [DEBUG] OCR Decision Process:`);
      console.log(`   - File: ${file.name}`);
      console.log(`   - Size: ${file.size} bytes`);
      console.log(`   - Text length: ${ocrCheck.textLength} chars`);
      console.log(`   - Needs OCR: ${ocrCheck.needsOcr}`);
      console.log(`   - Reason: ${ocrCheck.reason}`);
      if (ocrCheck.validationResult) {
        console.log(
          `   - Validation confidence: ${ocrCheck.validationResult.confidence.toFixed(
            3
          )}`
        );
        console.log(
          `   - Validation metrics:`,
          ocrCheck.validationResult.metrics
        );
      }
    }

    // If OCR is disabled or not needed, use simple text extraction
    console.log(`[DEBUG] enableOcr: ${enableOcr}, ocrCheck.needsOcr: ${ocrCheck.needsOcr}`);
    if (!enableOcr || !ocrCheck.needsOcr) {
      return await processTextOnlyPdfEnhanced(
        pdfBuffer,
        file.name,
        startTime,
        performanceMetrics,
        ocrCheck
      );
    }

    // OCR v2.0: Process with enhanced hybrid OCR workflow
    console.log(
      `🚀 [ENHANCED] Starting hybrid OCR processing for ${file.name}...`
    );

    const processor = new HybridPdfProcessor(apiKey);

    // Apply validation configuration if provided
    if (validationOptions?.confidenceThreshold) {
      // TODO: Pass confidence threshold to processor config
      console.log(
        `🔧 [CONFIG] Custom confidence threshold: ${validationOptions.confidenceThreshold}`
      );
    }

    // Validate and apply OCR options
    let processedOcrOptions: OcrProcessingOptions | undefined;
    if (ocrOptions) {
      try {
        processedOcrOptions = validateOcrOptions(ocrOptions);
        console.log(`[DEBUG] Processed OCR Options:`, processedOcrOptions);
      } catch (error) {
        console.warn("Invalid OCR options, using defaults:", error);
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
      console.error(
        "❌ [ENHANCED] Hybrid processing failed:",
        hybridResult.error
      );

      // Enhanced fallback with detailed error logging
      console.log("🔄 [ENHANCED] Falling back to text-only extraction...");
      return await fallbackToTextOnlyEnhanced(
        pdfBuffer,
        file.name,
        startTime,
        performanceMetrics,
        hybridResult.error
      );
    }

    // OCR v2.0: Enhanced response with comprehensive metadata
    const response: EnhancedExtractPdfOcrResponse = {
      success: true,
      data: {
        text: hybridResult.data!.text,
        metadata: {
          ...hybridResult.data!.metadata,
          ocrEnabled: true,
          needsOcr: ocrCheck.needsOcr,
          triggerReason: ocrCheck.reason,
          performanceMetrics,
          // Enhanced validation metadata
          validationEnabled:
            hybridResult.data!.metadata.validationEnabled || false,
          averageConfidence: hybridResult.data!.metadata.averageConfidence,
          validationTime: hybridResult.data!.metadata.validationTime,
        },
        pageResults: hybridResult.data!.pageResults.map((result) => ({
          ...result,
          // Add validation results if available
          validationResult: (result as any).validationResult,
        })),
        // OCR v2.0: System performance statistics
        validationStats: {
          totalValidations: hybridResult.data!.pageResults.length,
          averageValidationTime: hybridResult.data!.metadata.validationTime
            ? Math.round(
                hybridResult.data!.metadata.validationTime /
                  hybridResult.data!.pageResults.length
              )
            : 0,
          ocrTriggeredByValidation: hybridResult.data!.metadata.ocrPages || 0,
          fallbackToLegacy: 0, // TODO: Get from processor stats
        },
      },
    };

    const totalTime = Date.now() - startTime;
    console.log(
      `✅ [ENHANCED] PDF extraction complete: ${file.name} (${totalTime}ms)`
    );
    console.log(
      `📊 [PERFORMANCE] Initial: ${performanceMetrics.initialCheckTime}ms, Total: ${totalTime}ms`
    );

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error(
      "❌ [ENHANCED] Unexpected error in extract-pdf-ocr endpoint:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error during enhanced PDF processing",
        details:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.message
              : "Unknown error"
            : undefined,
      },
      { status: 500 }
    );
  }
}

// =============================================================================
// Enhanced Fallback Functions
// =============================================================================

/**
 * Enhanced fallback to text-only extraction with detailed logging
 */
async function fallbackToTextOnlyEnhanced(
  pdfBuffer: Buffer,
  filename: string,
  startTime: number,
  performanceMetrics: any,
  fallbackReason?: string
): Promise<NextResponse<EnhancedExtractPdfOcrResponse>> {
  try {
    console.log(`📄 [ENHANCED] Using text-only extraction for ${filename}...`);
    if (fallbackReason) {
      console.log(`🔄 [FALLBACK] Reason: ${fallbackReason}`);
    }

    // Dynamic import to avoid SSR issues
    const pdf = (await import("pdf-parse")).default;
    const pdfData = await pdf(pdfBuffer);

    const processingTime = Date.now() - startTime;

    // OCR v2.0: Perform validation on extracted text for metadata
    let validationResult;
    let averageConfidence;
    try {
      const textValidation = await validateTextQuality(pdfData.text || "");
      validationResult = textValidation;
      averageConfidence = textValidation.confidence;
      console.log(
        `📊 [VALIDATION] Text quality: confidence=${textValidation.confidence.toFixed(
          3
        )}, valid=${textValidation.isValid}`
      );
    } catch (error) {
      console.warn("Validation failed during fallback:", error);
    }

    const response: EnhancedExtractPdfOcrResponse = {
      success: true,
      data: {
        text: pdfData.text || "",
        metadata: {
          filename,
          fileSize: pdfBuffer.length,
          pageCount: pdfData.numpages,
          totalProcessingTime: processingTime,
          textPages: pdfData.numpages,
          ocrPages: 0,
          skippedPages: 0,
          method: "text-only",
          title: pdfData.info?.Title,
          author: pdfData.info?.Author,
          creator: pdfData.info?.Creator,
          ocrEnabled: !!process.env.GEMINI_API_KEY,
          needsOcr: false,
          // OCR v2.0: Enhanced validation metadata
          validationEnabled: true,
          averageConfidence,
          validationTime: 0,
          triggerReason: fallbackReason || "Text-only processing",
          performanceMetrics,
        },
        validationStats: {
          totalValidations: 1,
          averageValidationTime: 0,
          ocrTriggeredByValidation: 0,
          fallbackToLegacy: 1,
        },
      },
    };

    console.log(
      `✅ [ENHANCED] Text-only extraction complete: ${filename} (${processingTime}ms)`
    );
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("❌ [ENHANCED] Text-only extraction failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to extract text from PDF using enhanced fallback",
        details:
          error instanceof Error ? error.message : "Text extraction failed",
      },
      { status: 500 }
    );
  }
}

/**
 * Enhanced text-only PDF processing with validation
 */
async function processTextOnlyPdfEnhanced(
  pdfBuffer: Buffer,
  filename: string,
  startTime: number,
  performanceMetrics: any,
  ocrCheck: {
    needsOcr: boolean;
    textLength: number;
    pageCount: number;
    validationResult?: any;
    reason: string;
  }
): Promise<NextResponse<EnhancedExtractPdfOcrResponse>> {
  try {
    console.log(
      `📄 [ENHANCED] Processing text-only PDF: ${filename} (${ocrCheck.textLength} chars)`
    );

    const pdf = (await import("pdf-parse")).default;
    const pdfData = await pdf(pdfBuffer);

    const processingTime = Date.now() - startTime;

    const response: EnhancedExtractPdfOcrResponse = {
      success: true,
      data: {
        text: pdfData.text || "",
        metadata: {
          filename,
          fileSize: pdfBuffer.length,
          pageCount: pdfData.numpages,
          totalProcessingTime: processingTime,
          textPages: pdfData.numpages,
          ocrPages: 0,
          skippedPages: 0,
          method: "text-only",
          title: pdfData.info?.Title,
          author: pdfData.info?.Author,
          creator: pdfData.info?.Creator,
          ocrEnabled: true, // OCR was available but not needed
          needsOcr: ocrCheck.needsOcr,
          // OCR v2.0: Enhanced validation metadata
          validationEnabled: !!ocrCheck.validationResult,
          averageConfidence: ocrCheck.validationResult?.confidence,
          validationTime: performanceMetrics.initialCheckTime,
          triggerReason: ocrCheck.reason,
          performanceMetrics,
        },
        validationStats: {
          totalValidations: 1,
          averageValidationTime: performanceMetrics.initialCheckTime,
          ocrTriggeredByValidation: 0,
          fallbackToLegacy: ocrCheck.validationResult ? 0 : 1,
        },
      },
    };

    console.log(
      `✅ [ENHANCED] Text-only processing complete: ${filename} (${processingTime}ms)`
    );
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("❌ [ENHANCED] Text-only processing failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to process PDF using enhanced text-only method",
        details:
          error instanceof Error ? error.message : "PDF processing failed",
      },
      { status: 500 }
    );
  }
}

/**
 * Legacy fallback (for compatibility)
 */
async function fallbackToTextOnly(
  pdfBuffer: Buffer,
  filename: string,
  startTime: number,
  performanceMetrics: any
): Promise<NextResponse<EnhancedExtractPdfOcrResponse>> {
  return await fallbackToTextOnlyEnhanced(
    pdfBuffer,
    filename,
    startTime,
    performanceMetrics,
    "API key not configured"
  );
}

// =============================================================================
// Enhanced GET Handler with OCR v2.0 Capabilities
// =============================================================================

export async function GET(): Promise<NextResponse> {
  try {
    const hasGeminiKey = !!process.env.GEMINI_API_KEY;

    return NextResponse.json(
      {
        status: "ok",
        endpoint: "extract-pdf-ocr",
        timestamp: new Date().toISOString(),
        version: "2.0.0", // OCR v2.0: Updated version
        capabilities: {
          textExtraction: true,
          ocrSupported: hasGeminiKey,
          geminiModel: OCR_CONFIG.DEFAULT_MODEL,
          maxFileSize: `${Math.round(
            OCR_CONFIG.MAX_FILE_SIZE / 1024 / 1024
          )}MB`,
          maxPages: OCR_CONFIG.MAX_PAGES,
          supportedFormats: ["pdf"],
          features: [
            "Intelligent hybrid workflow",
            "Text-based PDF detection",
            "Page-level classification",
            "OCR for scanned pages",
            "Batch processing",
            "Error recovery",
            "Progress tracking",
            // OCR v2.0: OCR v2.0 features
            "Text quality validation",
            "Entropy-based pattern detection",
            "Vietnamese text support",
            "Syllable density analysis",
            "Enhanced confidence scoring",
            "Performance metrics",
            "Validation statistics",
          ],
        },
        config: {
          defaultDensity: OCR_CONFIG.DEFAULT_DENSITY,
          defaultFormat: OCR_CONFIG.DEFAULT_FORMAT,
          maxPagesParallel: OCR_CONFIG.MAX_PAGES_PARALLEL,
          // Legacy thresholds (for compatibility)
          minTextLengthForTextBased: OCR_CONFIG.MIN_TEXT_LENGTH_FOR_TEXT_BASED,
          minTextLengthPerPage: OCR_CONFIG.MIN_TEXT_LENGTH_PER_PAGE,
          // OCR v2.0: OCR v2.0 validation configuration
          validation: {
            enabled: OCR_CONFIG.ENABLE_TEXT_VALIDATION,
            confidenceThreshold: OCR_CONFIG.OCR_TRIGGER_CONFIDENCE_THRESHOLD,
            minWordDensity: OCR_CONFIG.MIN_WORD_DENSITY,
            minTextEntropy: OCR_CONFIG.MIN_TEXT_ENTROPY,
            minWordCount: OCR_CONFIG.MIN_WORD_COUNT,
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        error: "Health check failed",
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
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "X-API-Version": "2.0.0",
      "X-Features": "text-validation,entropy-detection,vietnamese-support",
    },
  });
}

// =============================================================================
// Enhanced Helper Functions
// =============================================================================

/**
 * Enhanced PDF file validation
 */
function validatePdfFileEnhanced(buffer: Buffer): {
  isValid: boolean;
  reason?: string;
} {
  // Check PDF header (should start with %PDF-)
  const header = buffer.subarray(0, 5).toString();
  if (header !== "%PDF-") {
    return { isValid: false, reason: "Invalid PDF header" };
  }

  // Additional validation checks can be added here
  if (buffer.length < 1000) {
    return { isValid: false, reason: "PDF file too small" };
  }

  return { isValid: true };
}

/**
 * Enhanced processing statistics logging
 */
function logEnhancedProcessingStats(
  filename: string,
  fileSize: number,
  pageCount: number,
  method: string,
  processingTime: number,
  validationEnabled: boolean,
  averageConfidence?: number
): void {
  if (process.env.NODE_ENV === "development") {
    console.log(`[PDF-OCR-v2] ${filename}`);
    console.log(`  Size: ${fileSize} bytes, Pages: ${pageCount}`);
    console.log(`  Method: ${method}, Time: ${processingTime}ms`);
    console.log(`  Validation: ${validationEnabled ? "ENABLED" : "DISABLED"}`);
    if (averageConfidence !== undefined) {
      console.log(`  Avg Confidence: ${averageConfidence.toFixed(3)}`);
    }
  }
}

// =============================================================================
// Enhanced Error Classes
// =============================================================================

class EnhancedPdfOcrExtractionError extends Error {
  constructor(
    message: string,
    public cause?: Error,
    public validationResult?: any
  ) {
    super(message);
    this.name = "EnhancedPdfOcrExtractionError";
  }
}

class ValidationConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationConfigError";
  }
}
