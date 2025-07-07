// Integrated OCR v2.0 text quality validation system

import pdf from "pdf-parse";
import { fromBuffer } from "pdf2pic";
import { GeminiVisionOCR } from "./gemini-vision-ocr";
import {
  validateTextQuality,
  TextValidationResult,
} from "@/lib/utils/text-validation";
import {
  HybridPdfResult,
  HybridPdfMetadata,
  OcrPageResult,
  PageClassification,
  OcrProcessingOptions,
  OcrProcessingError,
  TextValidationError,
  OCR_CONFIG,
  Pdf2PicOptions,
} from "@/types/ocr";

// =============================================================================
// Enhanced Hybrid PDF Processor - Intelligent Workflow Implementation v2.0
// =============================================================================

export class HybridPdfProcessor {
  private ocrService: GeminiVisionOCR;
  private config: {
    geminiApiKey: string;
    minTextLengthForTextBased: number;
    minTextLengthPerPage: number;
    maxPagesParallel: number;
    enableOptimization: boolean;
    // OCR v2.0: Text validation configuration
    enableTextValidation: boolean;
    validationTimeoutMs: number;
    logValidationDecisions: boolean;
  };

  // OCR v2.0: Performance tracking for validation
  private validationStats = {
    totalValidations: 0,
    totalValidationTime: 0,
    ocrTriggeredByValidation: 0,
    fallbackToLegacyLogic: 0,
  };

  constructor(apiKey?: string, config?: Partial<typeof this.config>) {
    const finalApiKey = apiKey || process.env.GEMINI_API_KEY;

    if (!finalApiKey) {
      throw new OcrProcessingError(
        "Gemini API key is required for OCR functionality"
      );
    }

    this.config = {
      geminiApiKey: finalApiKey,
      minTextLengthForTextBased: OCR_CONFIG.MIN_TEXT_LENGTH_FOR_TEXT_BASED,
      minTextLengthPerPage: OCR_CONFIG.MIN_TEXT_LENGTH_PER_PAGE,
      maxPagesParallel: OCR_CONFIG.MAX_PAGES_PARALLEL,
      enableOptimization: true,
      // OCR v2.0 configuration
      enableTextValidation: OCR_CONFIG.ENABLE_TEXT_VALIDATION,
      validationTimeoutMs: OCR_CONFIG.VALIDATION_TIMEOUT,
      logValidationDecisions: OCR_CONFIG.LOG_VALIDATION_DECISIONS,
      ...config,
    };

    this.ocrService = new GeminiVisionOCR(finalApiKey);
  }

  /**
   * Process PDF using the Enhanced Intelligent Hybrid Workflow v2.0
   * OCR v2.0: Integrated text quality validation for accurate OCR triggering
   */
  async processHybridPdf(
    pdfBuffer: Buffer,
    filename: string,
    options?: OcrProcessingOptions
  ): Promise<HybridPdfResult> {
    const startTime = Date.now();

    try {
      console.log(
        `🔍 Starting Enhanced Hybrid PDF processing v2.0 for: ${filename}`
      );
      console.log(
        `📊 Text validation: ${
          this.config.enableTextValidation ? "ENABLED" : "DISABLED"
        }`
      );

      // Step 1: Enhanced Initial Check with Text Quality Validation
      const initialCheck = await this.performEnhancedInitialCheck(pdfBuffer);

      if (initialCheck.type === "text") {
        console.log(
          `✅ PDF is text-based (validation passed). Processing complete! (${
            Date.now() - startTime
          }ms)`
        );
        return this.createSuccessResult(
          initialCheck.content!,
          filename,
          pdfBuffer.length,
          initialCheck.numpages,
          Date.now() - startTime,
          "text-only",
          [],
          initialCheck.numpages,
          0,
          0,
          initialCheck.validationResult
        );
      }

      console.log(
        `🔍 PDF requires detailed analysis (validation: ${initialCheck.reason}). Starting page-level processing...`
      );

      // Step 2: Enhanced Page-level Classification with Validation
      const pageClassifications = await this.classifyPagesWithValidation(
        pdfBuffer,
        initialCheck.numpages
      );

      // Step 3: OCR for pages that need it
      const ocrResults = await this.processOcrPages(
        pdfBuffer,
        pageClassifications.pagesToOcr,
        options
      );

      // Step 4: Consolidate results with validation metadata
      const finalResult = await this.consolidateResultsWithValidation(
        pageClassifications.pagesWithText,
        ocrResults,
        pageClassifications.validationResults,
        initialCheck.numpages,
        filename,
        pdfBuffer.length,
        Date.now() - startTime
      );

      console.log(
        `✅ Enhanced hybrid processing complete! Total time: ${
          Date.now() - startTime
        }ms`
      );
      this.logValidationStats();
      return finalResult;
    } catch (error) {
      console.error("❌ Enhanced hybrid PDF processing failed:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown processing error",
        details: error,
      };
    }
  }

  // =============================================================================
  // Step 1: Enhanced Initial Check with Text Quality Validation
  // =============================================================================

  /**
   * OCR v2.0: Enhanced initial check with intelligent text quality validation
   */
  private async performEnhancedInitialCheck(pdfBuffer: Buffer): Promise<{
    type: "text" | "scan_or_hybrid";
    content?: string;
    numpages: number;
    reason?: string;
    validationResult?: TextValidationResult;
  }> {
    try {
      const data = await pdf(pdfBuffer);
      const extractedText = data.text || "";

      if (!this.config.enableTextValidation) {
        // Fallback to legacy logic if validation is disabled
        console.log("⚠️ Text validation disabled, using legacy logic");
        this.validationStats.fallbackToLegacyLogic++;

        if (extractedText.length > this.config.minTextLengthForTextBased) {
          return {
            type: "text",
            content: extractedText,
            numpages: data.numpages,
            reason: "Legacy length check passed",
          };
        } else {
          return {
            type: "scan_or_hybrid",
            content: null,
            numpages: data.numpages,
            reason: "Legacy length check failed",
          };
        }
      }

      // OCR v2.0: Perform text quality validation
      const validationResult = await this.performTextValidation(
        extractedText,
        "initial-check"
      );

      if (validationResult.isValid) {
        console.log(
          `📄 Text-based PDF detected via validation (confidence: ${validationResult.confidence.toFixed(
            3
          )})`
        );
        return {
          type: "text",
          content: extractedText,
          numpages: data.numpages,
          reason: validationResult.reason,
          validationResult,
        };
      } else {
        console.log(
          `🖼️ PDF requires OCR via validation (confidence: ${validationResult.confidence.toFixed(
            3
          )}, reason: ${validationResult.reason})`
        );
        this.validationStats.ocrTriggeredByValidation++;
        return {
          type: "scan_or_hybrid",
          content: null,
          numpages: data.numpages,
          reason: validationResult.reason,
          validationResult,
        };
      }
    } catch (error) {
      throw new OcrProcessingError(
        "Failed to perform enhanced initial PDF analysis",
        error as Error
      );
    }
  }

  // =============================================================================
  // Step 2: Enhanced Page-level Classification with Validation
  // =============================================================================

  /**
   * OCR v2.0: Enhanced page classification with text quality validation
   */
  private async classifyPagesWithValidation(
    pdfBuffer: Buffer,
    numPages: number
  ): Promise<{
    pagesWithText: Map<number, string>;
    pagesToOcr: number[];
    classifications: PageClassification[];
    validationResults: Map<number, TextValidationResult>;
  }> {
    console.log(`📊 Enhanced page classification for ${numPages} pages...`);

    const pagesWithText = new Map<number, string>();
    const pagesToOcr: number[] = [];
    const classifications: PageClassification[] = [];
    const validationResults = new Map<number, TextValidationResult>();

    for (let i = 1; i <= numPages; i++) {
      try {
        const options = { max: 1, page_num: i };
        const data = await pdf(pdfBuffer, options);
        const pageText = data.text || "";

        let hasText = false;
        let validationResult: TextValidationResult | undefined;

        if (this.config.enableTextValidation && pageText.length > 0) {
          // OCR v2.0: Use text quality validation for page classification
          validationResult = await this.performTextValidation(
            pageText,
            `page-${i}`
          );
          hasText = validationResult.isValid;
          validationResults.set(i, validationResult);

          console.log(
            `📄 Page ${i}: ${
              hasText ? "Text-based" : "Needs OCR"
            } (confidence: ${validationResult.confidence.toFixed(3)}, chars: ${
              pageText.length
            })`
          );
        } else {
          // Fallback to legacy logic if validation is disabled or no text
          hasText = pageText.trim().length > this.config.minTextLengthPerPage;
          console.log(
            `📄 Page ${i}: ${
              hasText ? "Text-based" : "Needs OCR"
            } (legacy check, chars: ${pageText.length})`
          );
        }

        const classification: PageClassification = {
          pageNumber: i,
          hasText,
          textLength: pageText.length,
          needsOcr: !hasText,
          text: hasText ? pageText : undefined,
          validationResult,
        };

        classifications.push(classification);

        if (hasText) {
          pagesWithText.set(i, pageText);
        } else {
          pagesToOcr.push(i);
        }
      } catch (error) {
        console.warn(`⚠️ Page ${i}: Classification failed, assuming needs OCR`);
        pagesToOcr.push(i);
        classifications.push({
          pageNumber: i,
          hasText: false,
          textLength: 0,
          needsOcr: true,
        });
      }
    }

    console.log(
      `📊 Enhanced classification complete: ${pagesWithText.size} text pages, ${pagesToOcr.length} OCR pages`
    );

    return {
      pagesWithText,
      pagesToOcr,
      classifications,
      validationResults,
    };
  }

  // =============================================================================
  // OCR v2.0: Text Quality Validation Implementation
  // =============================================================================

  /**
   * OCR v2.0: Perform text quality validation with timeout and error handling
   */
  private async performTextValidation(
    text: string,
    context: string
  ): Promise<TextValidationResult> {
    const startTime = Date.now();
    this.validationStats.totalValidations++;

    try {
      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error("Text validation timeout")),
          this.config.validationTimeoutMs
        );
      });

      // Race between validation and timeout
      const validationPromise = validateTextQuality(text);
      const result = await Promise.race([validationPromise, timeoutPromise]);

      const validationTime = Date.now() - startTime;
      this.validationStats.totalValidationTime += validationTime;

      if (this.config.logValidationDecisions) {
        console.log(
          `🔍 [${context}] Validation: confidence=${result.confidence.toFixed(
            3
          )}, valid=${result.isValid}, time=${validationTime}ms`
        );
        console.log(
          `🔍 [${context}] Metrics: chars=${
            result.metrics.charLength
          }, syllables=${
            result.metrics.syllableCount
          }, density=${result.metrics.syllableDensity.toFixed(
            4
          )}, entropy=${result.metrics.entropy.toFixed(2)}`
        );
        console.log(`🔍 [${context}] Reason: ${result.reason}`);
      }

      return result;
    } catch (error) {
      const validationTime = Date.now() - startTime;
      this.validationStats.totalValidationTime += validationTime;

      console.warn(
        `⚠️ [${context}] Text validation failed (${validationTime}ms), falling back to legacy logic:`,
        error
      );
      this.validationStats.fallbackToLegacyLogic++;

      // Fallback to legacy logic
      const isValid = text.length > this.config.minTextLengthForTextBased;
      return {
        confidence: isValid ? 0.6 : 0.2, // Conservative confidence scores
        isValid,
        reason: `Validation failed, legacy check: ${
          isValid ? "passed" : "failed"
        }`,
        metrics: {
          charLength: text.length,
          syllableCount: 0,
          syllableDensity: 0,
          entropy: 0,
          wordCount: 0,
          uniqueCharCount: 0,
          repetitivePatterns: false,
        },
      };
    }
  }

  // =============================================================================
  // Step 3: OCR Processing (Unchanged but with enhanced logging)
  // =============================================================================

  /**
   * Process pages that need OCR (enhanced logging)
   */
  private async processOcrPages(
    pdfBuffer: Buffer,
    pageNumbers: number[],
    options?: OcrProcessingOptions
  ): Promise<Map<number, OcrPageResult>> {
    const ocrResults = new Map<number, OcrPageResult>();

    if (pageNumbers.length === 0) {
      console.log(`✅ No pages need OCR processing`);
      return ocrResults;
    }

    console.log(
      `🖼️ Starting OCR for ${pageNumbers.length} pages (validation-driven)...`
    );

    // PDF to image conversion options
    const conversionOptions: Pdf2PicOptions = {
      density: options?.density || OCR_CONFIG.DEFAULT_DENSITY,
      format: options?.format || OCR_CONFIG.DEFAULT_FORMAT,
      width: options?.width || 2550,
      height: options?.height || 3300,
    };

    // Create converter from buffer
    const convert = fromBuffer(pdfBuffer, conversionOptions);

    // Process pages in batches to manage memory and API limits
    const batchSize = this.config.maxPagesParallel;

    for (let i = 0; i < pageNumbers.length; i += batchSize) {
      const batch = pageNumbers.slice(i, i + batchSize);
      console.log(
        `🔄 Processing OCR batch ${
          Math.floor(i / batchSize) + 1
        }: pages ${batch.join(", ")}`
      );

      await Promise.all(
        batch.map(async (pageNum) => {
          const result = await this.processOcrPage(convert, pageNum, options);
          ocrResults.set(pageNum, result);
        })
      );

      // Brief delay between batches to respect rate limits
      if (i + batchSize < pageNumbers.length) {
        await this.delay(1000);
      }
    }

    console.log(`✅ OCR processing complete for ${pageNumbers.length} pages`);
    return ocrResults;
  }

  /**
   * Process single page OCR (unchanged from original)
   */
  private async processOcrPage(
    convert: any,
    pageNum: number,
    options?: OcrProcessingOptions
  ): Promise<OcrPageResult> {
    const startTime = Date.now();

    try {
      console.log(`🖼️ Converting page ${pageNum} to image...`);

      // Convert PDF page to image buffer
      const imageResult = await convert(pageNum, { responseType: "buffer" });

      console.log(`🤖 Running OCR on page ${pageNum}...`);

      // Perform OCR using Gemini Vision
      const ocrResponse = await this.ocrService.extractTextFromImage(
        imageResult.buffer,
        {
          optimize: this.config.enableOptimization,
          pageNumber: pageNum,
        }
      );

      const processingTime = Date.now() - startTime;

      console.log(
        `✅ Page ${pageNum} OCR complete: ${ocrResponse.text.length} chars (${processingTime}ms)`
      );

      return {
        pageNumber: pageNum,
        text: ocrResponse.text,
        confidence: ocrResponse.confidence,
        processingTime,
        method: "ocr",
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(
        `❌ Page ${pageNum} OCR failed (${processingTime}ms):`,
        error
      );

      return {
        pageNumber: pageNum,
        text: "",
        confidence: 0,
        processingTime,
        method: "ocr",
        error: error instanceof Error ? error.message : "OCR processing failed",
      };
    }
  }

  // =============================================================================
  // Step 4: Enhanced Result Consolidation with Validation Metadata
  // =============================================================================

  /**
   * OCR v2.0: Enhanced result consolidation with validation metadata
   */
  private async consolidateResultsWithValidation(
    pagesWithText: Map<number, string>,
    ocrResults: Map<number, OcrPageResult>,
    validationResults: Map<number, TextValidationResult>,
    totalPages: number,
    filename: string,
    fileSize: number,
    totalProcessingTime: number
  ): Promise<HybridPdfResult> {
    console.log(
      `🔄 Consolidating enhanced results from ${totalPages} pages...`
    );

    let finalContent = "";
    const pageResults: OcrPageResult[] = [];
    let totalConfidence = 0;
    let confidenceCount = 0;

    // Combine results in page order
    for (let i = 1; i <= totalPages; i++) {
      if (pagesWithText.has(i)) {
        // Text-based page
        const text = pagesWithText.get(i)!;
        finalContent += text + "\n\n";

        const validation = validationResults.get(i);
        if (validation) {
          totalConfidence += validation.confidence;
          confidenceCount++;
        }

        pageResults.push({
          pageNumber: i,
          text,
          confidence: validation?.confidence || 1.0,
          processingTime: 0,
          method: "text",
        });
      } else if (ocrResults.has(i)) {
        // OCR page
        const ocrResult = ocrResults.get(i)!;
        finalContent += ocrResult.text + "\n\n";
        pageResults.push(ocrResult);
      } else {
        // Skipped page
        console.warn(`⚠️ Page ${i} was not processed`);
        pageResults.push({
          pageNumber: i,
          text: "",
          confidence: 0,
          processingTime: 0,
          method: "ocr",
          error: "Page was skipped during processing",
        });
      }
    }

    // Determine processing method
    const textPages = pagesWithText.size;
    const ocrPages = ocrResults.size;
    const skippedPages = totalPages - textPages - ocrPages;

    let method: "text-only" | "ocr-only" | "hybrid";
    if (textPages > 0 && ocrPages > 0) {
      method = "hybrid";
    } else if (textPages > 0) {
      method = "text-only";
    } else {
      method = "ocr-only";
    }

    // Calculate average validation confidence
    const averageConfidence =
      confidenceCount > 0 ? totalConfidence / confidenceCount : undefined;

    console.log(
      `📊 Enhanced consolidation complete: ${textPages} text, ${ocrPages} OCR, ${skippedPages} skipped pages`
    );
    if (averageConfidence !== undefined) {
      console.log(
        `📊 Average validation confidence: ${averageConfidence.toFixed(3)}`
      );
    }

    return this.createSuccessResult(
      finalContent.trim(),
      filename,
      fileSize,
      totalPages,
      totalProcessingTime,
      method,
      pageResults,
      textPages,
      ocrPages,
      skippedPages,
      { confidence: averageConfidence || 0 }
    );
  }

  // =============================================================================
  // Helper Methods (Enhanced)
  // =============================================================================

  /**
   * Enhanced success result creation with validation metadata
   */
  private createSuccessResult(
    text: string,
    filename: string,
    fileSize: number,
    pageCount: number,
    totalProcessingTime: number,
    method: "text-only" | "ocr-only" | "hybrid",
    pageResults: OcrPageResult[],
    textPages?: number,
    ocrPages?: number,
    skippedPages?: number,
    validationSummary?: { confidence: number }
  ): HybridPdfResult {
    const metadata: HybridPdfMetadata = {
      filename,
      fileSize,
      pageCount,
      totalProcessingTime,
      textPages: textPages ?? pageCount,
      ocrPages: ocrPages ?? 0,
      skippedPages: skippedPages ?? 0,
      method,
      // OCR v2.0: Validation metadata
      validationEnabled: this.config.enableTextValidation,
      averageConfidence: validationSummary?.confidence,
      validationTime: this.validationStats.totalValidationTime,
    };

    return {
      success: true,
      data: {
        text,
        metadata,
        pageResults,
      },
    };
  }

  /**
   * OCR v2.0: Log validation statistics for monitoring
   */
  private logValidationStats(): void {
    if (this.config.logValidationDecisions) {
      console.log("📊 Validation Statistics:");
      console.log(
        `   Total validations: ${this.validationStats.totalValidations}`
      );
      console.log(
        `   Total validation time: ${this.validationStats.totalValidationTime}ms`
      );
      console.log(
        `   Average validation time: ${
          this.validationStats.totalValidations > 0
            ? Math.round(
                this.validationStats.totalValidationTime /
                  this.validationStats.totalValidations
              )
            : 0
        }ms`
      );
      console.log(
        `   OCR triggered by validation: ${this.validationStats.ocrTriggeredByValidation}`
      );
      console.log(
        `   Fallback to legacy logic: ${this.validationStats.fallbackToLegacyLogic}`
      );
    }
  }

  /**
   * Delay utility (unchanged)
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Cleanup resources (enhanced)
   */
  cleanup(): void {
    this.ocrService.cleanup();

    // Reset validation stats
    this.validationStats = {
      totalValidations: 0,
      totalValidationTime: 0,
      ocrTriggeredByValidation: 0,
      fallbackToLegacyLogic: 0,
    };
  }
}

// =============================================================================
// Factory Functions (Enhanced)
// =============================================================================

let hybridProcessorInstance: HybridPdfProcessor | null = null;

export const getHybridPdfProcessor = (apiKey?: string): HybridPdfProcessor => {
  if (!hybridProcessorInstance) {
    hybridProcessorInstance = new HybridPdfProcessor(apiKey);
  }
  return hybridProcessorInstance;
};

// =============================================================================
// Utility Functions (Enhanced)
// =============================================================================

/**
 * Enhanced function to process hybrid PDF with validation
 */
export const processHybridPdf = async (
  pdfBuffer: Buffer,
  filename: string,
  options?: OcrProcessingOptions,
  apiKey?: string
): Promise<HybridPdfResult> => {
  const processor = getHybridPdfProcessor(apiKey);
  return await processor.processHybridPdf(pdfBuffer, filename, options);
};

/**
 * Enhanced function to check if a PDF needs OCR processing
 */
export const checkIfPdfNeedsOcr = async (
  pdfBuffer: Buffer
): Promise<{
  needsOcr: boolean;
  textLength: number;
  pageCount: number;
  validationResult?: TextValidationResult;
  reason: string;
}> => {
  try {
    const data = await pdf(pdfBuffer);
    const extractedText = data.text || "";

    if (OCR_CONFIG.ENABLE_TEXT_VALIDATION && extractedText.length > 0) {
      // Use new validation system
      const validationResult = await validateTextQuality(extractedText);

      return {
        needsOcr: !validationResult.isValid,
        textLength: extractedText.length,
        pageCount: data.numpages,
        validationResult,
        reason: validationResult.reason,
      };
    } else {
      // Fallback to legacy logic
      const needsOcr =
        !extractedText ||
        extractedText.length < OCR_CONFIG.MIN_TEXT_LENGTH_FOR_TEXT_BASED;

      return {
        needsOcr,
        textLength: extractedText?.length || 0,
        pageCount: data.numpages,
        reason: needsOcr
          ? "Legacy: Text length below threshold"
          : "Legacy: Text length above threshold",
      };
    }
  } catch (error) {
    console.error("Failed to check PDF OCR requirements:", error);
    return {
      needsOcr: true, // Assume needs OCR on error
      textLength: 0,
      pageCount: 0,
      reason: "Error during PDF analysis",
    };
  }
};
