import pdf from 'pdf-parse';
import { fromBuffer } from 'pdf2pic';
import { GeminiVisionOCR } from './gemini-vision-ocr';
import {
  HybridPdfResult,
  HybridPdfMetadata,
  OcrPageResult,
  PageClassification,
  OcrProcessingOptions,
  OcrProcessingError,
  OCR_CONFIG,
  Pdf2PicOptions,
} from '@/types/ocr';

// =============================================================================
// Hybrid PDF Processor - Intelligent Workflow Implementation
// =============================================================================

export class HybridPdfProcessor {
  private ocrService: GeminiVisionOCR;
  private config: {
    geminiApiKey: string;
    minTextLengthForTextBased: number;
    minTextLengthPerPage: number;
    maxPagesParallel: number;
    enableOptimization: boolean;
  };

  constructor(apiKey?: string, config?: Partial<typeof this.config>) {
    const finalApiKey = apiKey || process.env.GEMINI_API_KEY;
    
    if (!finalApiKey) {
      throw new OcrProcessingError(
        'Gemini API key is required for OCR functionality'
      );
    }

    this.config = {
      geminiApiKey: finalApiKey,
      minTextLengthForTextBased: OCR_CONFIG.MIN_TEXT_LENGTH_FOR_TEXT_BASED,
      minTextLengthPerPage: OCR_CONFIG.MIN_TEXT_LENGTH_PER_PAGE,
      maxPagesParallel: OCR_CONFIG.MAX_PAGES_PARALLEL,
      enableOptimization: true,
      ...config,
    };

    this.ocrService = new GeminiVisionOCR(finalApiKey);
  }

  /**
   * Process PDF using the Intelligent Hybrid Workflow
   * Step 1: Initial check -> Step 2: Page classification -> Step 3: OCR -> Step 4: Consolidation
   */
  async processHybridPdf(
    pdfBuffer: Buffer,
    filename: string,
    options?: OcrProcessingOptions
  ): Promise<HybridPdfResult> {
    const startTime = Date.now();
    
    try {
      console.log(`🔍 Starting Intelligent Hybrid PDF processing for: ${filename}`);
      
      // Step 1: Initial Check (Triage) - Try to extract all text at once
      const initialCheck = await this.performInitialCheck(pdfBuffer);
      
      if (initialCheck.type === 'text') {
        console.log(`✅ PDF is text-based. Processing complete! (${Date.now() - startTime}ms)`);
        return this.createSuccessResult(
          initialCheck.content!,
          filename,
          pdfBuffer.length,
          initialCheck.numpages,
          Date.now() - startTime,
          'text-only',
          []
        );
      }

      console.log(`🔍 PDF appears to be scanned or hybrid. Starting detailed analysis...`);
      
      // Step 2: Page-level Classification
      const pageClassifications = await this.classifyPages(pdfBuffer, initialCheck.numpages);
      
      // Step 3: OCR for pages that need it
      const ocrResults = await this.processOcrPages(
        pdfBuffer, 
        pageClassifications.pagesToOcr,
        options
      );
      
      // Step 4: Consolidate results
      const finalResult = await this.consolidateResults(
        pageClassifications.pagesWithText,
        ocrResults,
        initialCheck.numpages,
        filename,
        pdfBuffer.length,
        Date.now() - startTime
      );

      console.log(`✅ Hybrid processing complete! Total time: ${Date.now() - startTime}ms`);
      return finalResult;

    } catch (error) {
      console.error('❌ Hybrid PDF processing failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown processing error',
        details: error,
      };
    }
  }

  // =============================================================================
  // Step 1: Initial Check (Triage)
  // =============================================================================

  /**
   * Step 1: Perform initial check to determine if PDF is text-based
   */
  private async performInitialCheck(pdfBuffer: Buffer): Promise<{
    type: 'text' | 'scan_or_hybrid';
    content?: string;
    numpages: number;
  }> {
    try {
      const data = await pdf(pdfBuffer);
      
      // If text content is substantial, consider it text-based
      if (data.text && data.text.length > this.config.minTextLengthForTextBased) {
        console.log(`📄 Text-based PDF detected (${data.text.length} characters)`);
        return {
          type: 'text',
          content: data.text,
          numpages: data.numpages,
        };
      } else {
        console.log(`🖼️ Scanned/hybrid PDF detected (${data.text?.length || 0} characters)`);
        return {
          type: 'scan_or_hybrid',
          content: null,
          numpages: data.numpages,
        };
      }
    } catch (error) {
      throw new OcrProcessingError(
        'Failed to perform initial PDF analysis',
        error as Error
      );
    }
  }

  // =============================================================================
  // Step 2: Page-level Classification
  // =============================================================================

  /**
   * Step 2: Classify each page as text-based or needing OCR
   */
  private async classifyPages(
    pdfBuffer: Buffer, 
    numPages: number
  ): Promise<{
    pagesWithText: Map<number, string>;
    pagesToOcr: number[];
    classifications: PageClassification[];
  }> {
    console.log(`📊 Classifying ${numPages} pages...`);
    
    const pagesWithText = new Map<number, string>();
    const pagesToOcr: number[] = [];
    const classifications: PageClassification[] = [];

    for (let i = 1; i <= numPages; i++) {
      try {
        const options = { max: 1, page_num: i };
        const data = await pdf(pdfBuffer, options);
        
        const hasText = data.text.trim().length > this.config.minTextLengthPerPage;
        const classification: PageClassification = {
          pageNumber: i,
          hasText,
          textLength: data.text.length,
          needsOcr: !hasText,
          text: hasText ? data.text : undefined,
        };
        
        classifications.push(classification);
        
        if (hasText) {
          pagesWithText.set(i, data.text);
          console.log(`✅ Page ${i}: Text-based (${data.text.length} chars)`);
        } else {
          pagesToOcr.push(i);
          console.log(`🖼️ Page ${i}: Needs OCR (${data.text.length} chars)`);
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

    console.log(`📊 Classification complete: ${pagesWithText.size} text pages, ${pagesToOcr.length} OCR pages`);
    
    return {
      pagesWithText,
      pagesToOcr,
      classifications,
    };
  }

  // =============================================================================
  // Step 3: OCR Processing
  // =============================================================================

  /**
   * Step 3: Process pages that need OCR
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

    console.log(`🖼️ Starting OCR for ${pageNumbers.length} pages...`);

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
      console.log(`🔄 Processing OCR batch ${Math.floor(i / batchSize) + 1}: pages ${batch.join(', ')}`);
      
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
   * Process single page OCR
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
      const imageResult = await convert(pageNum, { responseType: 'buffer' });
      
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
      
      console.log(`✅ Page ${pageNum} OCR complete: ${ocrResponse.text.length} chars (${processingTime}ms)`);
      
      return {
        pageNumber: pageNum,
        text: ocrResponse.text,
        confidence: ocrResponse.confidence,
        processingTime,
        method: 'ocr',
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`❌ Page ${pageNum} OCR failed (${processingTime}ms):`, error);
      
      return {
        pageNumber: pageNum,
        text: '',
        confidence: 0,
        processingTime,
        method: 'ocr',
        error: error instanceof Error ? error.message : 'OCR processing failed',
      };
    }
  }

  // =============================================================================
  // Step 4 & 5: Consolidation and Cleanup
  // =============================================================================

  /**
   * Step 4: Consolidate results from text pages and OCR pages
   */
  private async consolidateResults(
    pagesWithText: Map<number, string>,
    ocrResults: Map<number, OcrPageResult>,
    totalPages: number,
    filename: string,
    fileSize: number,
    totalProcessingTime: number
  ): Promise<HybridPdfResult> {
    console.log(`🔄 Consolidating results from ${totalPages} pages...`);
    
    let finalContent = '';
    const pageResults: OcrPageResult[] = [];

    // Combine results in page order
    for (let i = 1; i <= totalPages; i++) {
      if (pagesWithText.has(i)) {
        // Text-based page
        const text = pagesWithText.get(i)!;
        finalContent += text + '\n\n';
        
        pageResults.push({
          pageNumber: i,
          text,
          confidence: 1.0,
          processingTime: 0,
          method: 'text',
        });
      } else if (ocrResults.has(i)) {
        // OCR page
        const ocrResult = ocrResults.get(i)!;
        finalContent += ocrResult.text + '\n\n';
        pageResults.push(ocrResult);
      } else {
        // Skipped page
        console.warn(`⚠️ Page ${i} was not processed`);
        pageResults.push({
          pageNumber: i,
          text: '',
          confidence: 0,
          processingTime: 0,
          method: 'ocr',
          error: 'Page was skipped during processing',
        });
      }
    }

    // Determine processing method
    const textPages = pagesWithText.size;
    const ocrPages = ocrResults.size;
    const skippedPages = totalPages - textPages - ocrPages;
    
    let method: 'text-only' | 'ocr-only' | 'hybrid';
    if (textPages > 0 && ocrPages > 0) {
      method = 'hybrid';
    } else if (textPages > 0) {
      method = 'text-only';
    } else {
      method = 'ocr-only';
    }

    console.log(`📊 Consolidation complete: ${textPages} text, ${ocrPages} OCR, ${skippedPages} skipped pages`);

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
      skippedPages
    );
  }

  // =============================================================================
  // Helper Methods
  // =============================================================================

  /**
   * Create success result object
   */
  private createSuccessResult(
    text: string,
    filename: string,
    fileSize: number,
    pageCount: number,
    totalProcessingTime: number,
    method: 'text-only' | 'ocr-only' | 'hybrid',
    pageResults: OcrPageResult[],
    textPages?: number,
    ocrPages?: number,
    skippedPages?: number
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
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.ocrService.cleanup();
  }
}

// =============================================================================
// Factory Function
// =============================================================================

let hybridProcessorInstance: HybridPdfProcessor | null = null;

export const getHybridPdfProcessor = (apiKey?: string): HybridPdfProcessor => {
  if (!hybridProcessorInstance) {
    hybridProcessorInstance = new HybridPdfProcessor(apiKey);
  }
  return hybridProcessorInstance;
};

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Simple function to process hybrid PDF
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
 * Check if a PDF needs OCR processing
 */
export const checkIfPdfNeedsOcr = async (
  pdfBuffer: Buffer
): Promise<{ needsOcr: boolean; textLength: number; pageCount: number }> => {
  try {
    const data = await pdf(pdfBuffer);
    const needsOcr = !data.text || data.text.length < OCR_CONFIG.MIN_TEXT_LENGTH_FOR_TEXT_BASED;
    
    return {
      needsOcr,
      textLength: data.text?.length || 0,
      pageCount: data.numpages,
    };
  } catch (error) {
    console.error('Failed to check PDF OCR requirements:', error);
    return {
      needsOcr: true, // Assume needs OCR on error
      textLength: 0,
      pageCount: 0,
    };
  }
};