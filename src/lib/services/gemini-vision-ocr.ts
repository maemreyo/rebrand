import { GoogleGenAI } from '@google/genai';
import sharp from 'sharp';
import {
  OcrServiceConfig,
  GeminiVisionRequest,
  GeminiVisionResponse,
  ImageConversionResult,
  ImageOptimizationOptions,
  OcrProcessingError,
  ImageConversionError,
  GeminiVisionError,
  OCR_CONFIG,
  OCR_PROMPTS,
} from '@/types/ocr';

// =============================================================================
// Gemini Vision OCR Service
// =============================================================================

export class GeminiVisionOCR {
  private genAI: GoogleGenAI;
  private config: OcrServiceConfig;
  private retryCount: Map<string, number> = new Map();

  constructor(apiKey?: string, config?: Partial<OcrServiceConfig>) {
    const finalApiKey = apiKey || process.env.GEMINI_API_KEY;
    
    if (!finalApiKey) {
      throw new OcrProcessingError(
        'Gemini API key is required. Set GEMINI_API_KEY environment variable or pass it to constructor.'
      );
    }

    this.config = {
      geminiApiKey: finalApiKey,
      model: OCR_CONFIG.DEFAULT_MODEL,
      maxRetries: OCR_CONFIG.MAX_RETRIES,
      timeout: OCR_CONFIG.TIMEOUT,
      batchSize: OCR_CONFIG.BATCH_SIZE,
      enableCache: true,
      ...config,
    };

    this.genAI = new GoogleGenAI({ apiKey: this.config.geminiApiKey });
  }

  /**
   * Extract text from a single image buffer using Gemini Vision API
   */
  async extractTextFromImage(
    imageBuffer: Buffer,
    options?: { 
      prompt?: string; 
      optimize?: boolean;
      pageNumber?: number;
    }
  ): Promise<GeminiVisionResponse> {
    const startTime = Date.now();
    const pageNumber = options?.pageNumber || 1;
    
    try {
      // Optimize image if requested
      let processedBuffer = imageBuffer;
      if (options?.optimize !== false) {
        processedBuffer = await this.optimizeImageForOCR(imageBuffer);
      }

      // Convert to base64
      const base64Image = await this.imageBufferToBase64(processedBuffer);

      // Prepare request
      const prompt = options?.prompt || OCR_PROMPTS.EXTRACT_TEXT;
      const request: GeminiVisionRequest = {
        image: base64Image,
        prompt,
        model: this.config.model,
        maxTokens: 8192,
      };

      // Extract text with retries
      const text = await this.extractWithRetries(request, pageNumber);
      
      const processingTime = Date.now() - startTime;
      
      return {
        text,
        processingTime,
        confidence: this.estimateConfidence(text),
      };

    } catch (error) {
      throw new OcrProcessingError(
        `Failed to extract text from image (page ${pageNumber})`,
        error as Error,
        pageNumber
      );
    }
  }

  /**
   * Extract text from multiple images in batch
   */
  async extractTextFromImages(
    imageBuffers: Buffer[],
    options?: {
      prompt?: string;
      optimize?: boolean;
      startPageNumber?: number;
    }
  ): Promise<GeminiVisionResponse[]> {
    const startPageNumber = options?.startPageNumber || 1;
    const results: GeminiVisionResponse[] = [];
    
    // Process in batches to avoid rate limits
    for (let i = 0; i < imageBuffers.length; i += this.config.batchSize) {
      const batch = imageBuffers.slice(i, i + this.config.batchSize);
      const batchPromises = batch.map((buffer, index) => 
        this.extractTextFromImage(buffer, {
          ...options,
          pageNumber: startPageNumber + i + index,
        })
      );

      try {
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      } catch (error) {
        console.error(`Batch processing failed for images ${i}-${i + batch.length - 1}:`, error);
        
        // Try processing individually as fallback
        for (let j = 0; j < batch.length; j++) {
          try {
            const result = await this.extractTextFromImage(batch[j], {
              ...options,
              pageNumber: startPageNumber + i + j,
            });
            results.push(result);
          } catch (individualError) {
            console.error(`Failed to process page ${startPageNumber + i + j}:`, individualError);
            results.push({
              text: '',
              processingTime: 0,
              confidence: 0,
            });
          }
        }
      }

      // Add delay between batches to respect rate limits
      if (i + this.config.batchSize < imageBuffers.length) {
        await this.delay(1000);
      }
    }

    return results;
  }

  // =============================================================================
  // Image Processing Utilities
  // =============================================================================

  /**
   * Optimize image for better OCR results
   */
  async optimizeImageForOCR(
    imageBuffer: Buffer,
    options?: ImageOptimizationOptions
  ): Promise<Buffer> {
    try {
      let pipeline = sharp(imageBuffer);

      // Convert to grayscale for better text recognition
      if (options?.grayscale !== false) {
        pipeline = pipeline.greyscale();
      }

      // Enhance contrast
      if (options?.enhanceContrast !== false) {
        pipeline = pipeline.normalize();
      }

      // Resize if specified
      if (options?.resize) {
        pipeline = pipeline.resize(options.resize);
      }

      // Sharpen image for better text clarity
      if (options?.sharpen !== false) {
        pipeline = pipeline.sharpen();
      }

      // Set quality for output
      const format = await this.getImageFormat(imageBuffer);
      if (format === 'jpeg') {
        pipeline = pipeline.jpeg({ 
          quality: options?.quality || OCR_CONFIG.IMAGE_QUALITY 
        });
      } else {
        pipeline = pipeline.png({ 
          quality: options?.quality || OCR_CONFIG.IMAGE_QUALITY 
        });
      }

      return await pipeline.toBuffer();
    } catch (error) {
      throw new ImageConversionError(
        'Failed to optimize image for OCR',
        error as Error
      );
    }
  }

  /**
   * Convert image buffer to base64 string
   */
  async imageBufferToBase64(imageBuffer: Buffer): Promise<string> {
    try {
      // Validate image
      const metadata = await sharp(imageBuffer).metadata();
      
      if (!metadata.width || !metadata.height) {
        throw new Error('Invalid image metadata');
      }

      if (metadata.width > OCR_CONFIG.MAX_IMAGE_SIZE || metadata.height > OCR_CONFIG.MAX_IMAGE_SIZE) {
        // Resize large images
        const optimized = await sharp(imageBuffer)
          .resize(OCR_CONFIG.MAX_IMAGE_SIZE, OCR_CONFIG.MAX_IMAGE_SIZE, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .toBuffer();
        
        return optimized.toString('base64');
      }

      return imageBuffer.toString('base64');
    } catch (error) {
      throw new ImageConversionError(
        'Failed to convert image to base64',
        error as Error
      );
    }
  }

  // =============================================================================
  // Gemini API Interaction
  // =============================================================================

  /**
   * Extract text using Gemini Vision with retry mechanism
   */
  private async extractWithRetries(
    request: GeminiVisionRequest,
    pageNumber: number
  ): Promise<string> {
    const retryKey = `page_${pageNumber}`;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await this.callGeminiVision(request);
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < this.config.maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.warn(`OCR attempt ${attempt + 1} failed for page ${pageNumber}, retrying in ${delay}ms:`, error);
          await this.delay(delay);
        }
      }
    }

    throw new GeminiVisionError(
      `Failed to extract text after ${this.config.maxRetries + 1} attempts for page ${pageNumber}`,
      lastError || undefined
    );
  }

  /**
   * Call Gemini Vision API
   */
  private async callGeminiVision(request: GeminiVisionRequest): Promise<string> {
    try {
      const model = this.genAI.getGenerativeModel({ 
        model: request.model || this.config.model 
      });

      const result = await model.generateContent([
        request.prompt,
        {
          inlineData: {
            data: request.image,
            mimeType: 'image/png',
          },
        },
      ]);

      const response = result.response;
      const text = response.text();

      if (!text || text.trim().length === 0) {
        throw new Error('Empty response from Gemini Vision API');
      }

      return text.trim();
    } catch (error) {
      throw new GeminiVisionError(
        'Gemini Vision API call failed',
        error as Error
      );
    }
  }

  // =============================================================================
  // Helper Methods
  // =============================================================================

  /**
   * Get image format from buffer
   */
  private async getImageFormat(buffer: Buffer): Promise<string> {
    try {
      const metadata = await sharp(buffer).metadata();
      return metadata.format || 'png';
    } catch {
      return 'png';
    }
  }

  /**
   * Estimate confidence score based on text characteristics
   */
  private estimateConfidence(text: string): number {
    if (!text || text.length === 0) return 0;
    
    // Simple heuristics for confidence estimation
    let score = 0.5; // Base score
    
    // Length factor
    if (text.length > 100) score += 0.2;
    if (text.length > 500) score += 0.1;
    
    // Character variety
    const hasAlphabetic = /[a-zA-Z]/.test(text);
    const hasNumeric = /[0-9]/.test(text);
    const hasPunctuation = /[.,!?;:]/.test(text);
    
    if (hasAlphabetic) score += 0.1;
    if (hasNumeric) score += 0.05;
    if (hasPunctuation) score += 0.05;
    
    // Structure indicators
    if (/\n/.test(text)) score += 0.05; // Has line breaks
    if (/\s{2,}/.test(text)) score += 0.05; // Has spacing structure
    
    return Math.min(score, 1.0);
  }

  /**
   * Delay utility for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get conversion result metadata
   */
  async getImageMetadata(buffer: Buffer): Promise<ImageConversionResult> {
    try {
      const metadata = await sharp(buffer).metadata();
      
      return {
        buffer,
        format: metadata.format || 'unknown',
        width: metadata.width || 0,
        height: metadata.height || 0,
        size: buffer.length,
      };
    } catch (error) {
      throw new ImageConversionError(
        'Failed to get image metadata',
        error as Error
      );
    }
  }

  /**
   * Clean up resources (if needed for future caching implementation)
   */
  cleanup(): void {
    this.retryCount.clear();
  }
}

// =============================================================================
// Factory Function
// =============================================================================

let geminiOcrInstance: GeminiVisionOCR | null = null;

export const getGeminiVisionOCR = (apiKey?: string): GeminiVisionOCR => {
  if (!geminiOcrInstance) {
    geminiOcrInstance = new GeminiVisionOCR(apiKey);
  }
  return geminiOcrInstance;
};

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Simple function to extract text from single image
 */
export const extractTextFromImage = async (
  imageBuffer: Buffer,
  apiKey?: string
): Promise<string> => {
  const ocr = getGeminiVisionOCR(apiKey);
  const result = await ocr.extractTextFromImage(imageBuffer);
  return result.text;
};

/**
 * Extract text from multiple images
 */
export const extractTextFromImages = async (
  imageBuffers: Buffer[],
  apiKey?: string
): Promise<string[]> => {
  const ocr = getGeminiVisionOCR(apiKey);
  const results = await ocr.extractTextFromImages(imageBuffers);
  return results.map(result => result.text);
};