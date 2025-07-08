// UPDATED: 08-07-2025 - Removed VNTK-specific configurations, simplified universal text validation

import { z } from "zod";

// =============================================================================
// OCR Processing Types (Existing)
// =============================================================================

export interface OcrProcessingOptions {
  language?: string;
  enhanceImage?: boolean;
  density?: number;
  format?: 'png' | 'jpg' | 'jpeg';
  width?: number;
  height?: number;
  forceOcr?: boolean; // New option to force OCR on all pages
}

export interface OcrPageResult {
  pageNumber: number;
  text: string;
  confidence?: number;
  processingTime: number;
  method: 'text' | 'ocr';
  error?: string;
}

export interface HybridPdfResult {
  success: boolean;
  data?: {
    text: string;
    metadata: HybridPdfMetadata;
    pageResults: OcrPageResult[];
  };
  error?: string;
  details?: any;
}

export interface HybridPdfMetadata {
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
  // Text quality validation metadata
  validationEnabled: boolean;
  averageConfidence?: number;
  validationTime?: number;
}

// =============================================================================
// Universal Text Quality Validation Types (VNTK removed)
// =============================================================================

export interface TextValidationResult {
  confidence: number;
  isValid: boolean;
  reason: string;
  metrics: {
    charLength: number;
    wordCount: number;
    wordDensity: number; // Universal alternative to syllable density
    entropy: number;
    uniqueCharCount: number;
    repetitivePatterns: boolean;
    averageWordLength: number;
  };
}

export interface ValidationConfig {
  minAbsoluteLength: number;
  minWordCount: number;
  minWordDensity: number; // Universal word density threshold
  minTextEntropy: number;
  minAverageWordLength: number;
  confidenceThreshold: number;
}

// =============================================================================
// Internal Processing Types 
// =============================================================================

export interface PageClassification {
  pageNumber: number;
  hasText: boolean;
  textLength: number;
  needsOcr: boolean;
  text?: string;
  validationResult?: TextValidationResult;
}

export interface ImageConversionResult {
  buffer: Buffer;
  format: string;
  width: number;
  height: number;
  size: number;
}

export interface GeminiVisionRequest {
  image: string; // base64
  prompt: string;
  model?: string;
  maxTokens?: number;
}

export interface GeminiVisionResponse {
  text: string;
  confidence?: number;
  processingTime: number;
}

// =============================================================================
// Configuration Types
// =============================================================================

export interface OcrServiceConfig {
  geminiApiKey: string;
  model: string;
  maxRetries: number;
  timeout: number;
  batchSize: number;
  enableCache: boolean;
  enableTextValidation?: boolean;
  validationConfig?: Partial<ValidationConfig>;
}

export interface Pdf2PicOptions {
  density: number;
  format: 'png' | 'jpg' | 'jpeg';
  width: number;
  height: number;
  quality?: number;
}

export interface ImageOptimizationOptions {
  grayscale?: boolean;
  enhanceContrast?: boolean;
  sharpen?: boolean;
  resize?: {
    width?: number;
    height?: number;
    fit?: 'contain' | 'cover' | 'fill' | 'inside' | 'outside';
  };
  quality?: number;
}

// =============================================================================
// Validation Schemas
// =============================================================================

const OcrProcessingOptionsSchema = z.object({
  language: z.string().optional(),
  enhanceImage: z.boolean().default(true),
  density: z.number().min(72).max(600).default(300),
  format: z.enum(['png', 'jpg', 'jpeg']).default('png'),
  width: z.number().min(100).max(4000).optional(),
  height: z.number().min(100).max(4000).optional(),
  forceOcr: z.boolean().default(false).optional(), // Added forceOcr
});

const HybridPdfResultSchema = z.object({
  success: z.boolean(),
  data: z.object({
    text: z.string(),
    metadata: z.object({
      filename: z.string(),
      fileSize: z.number(),
      pageCount: z.number(),
      totalProcessingTime: z.number(),
      textPages: z.number(),
      ocrPages: z.number(),
      skippedPages: z.number(),
      method: z.enum(['text-only', 'ocr-only', 'hybrid']),
      title: z.string().optional(),
      author: z.string().optional(),
      creator: z.string().optional(),
      validationEnabled: z.boolean(),
      averageConfidence: z.number().optional(),
      validationTime: z.number().optional(),
    }),
    pageResults: z.array(z.object({
      pageNumber: z.number(),
      text: z.string(),
      confidence: z.number().optional(),
      processingTime: z.number(),
      method: z.enum(['text', 'ocr']),
      error: z.string().optional(),
    })),
  }).optional(),
  error: z.string().optional(),
  details: z.any().optional(),
});

const TextValidationResultSchema = z.object({
  confidence: z.number().min(0).max(1),
  isValid: z.boolean(),
  reason: z.string(),
  metrics: z.object({
    charLength: z.number(),
    wordCount: z.number(),
    wordDensity: z.number(),
    entropy: z.number(),
    uniqueCharCount: z.number(),
    repetitivePatterns: z.boolean(),
    averageWordLength: z.number(),
  }),
});

// =============================================================================
// Validation Functions
// =============================================================================

export const validateOcrOptions = (options: unknown): OcrProcessingOptions => {
  return OcrProcessingOptionsSchema.parse(options);
};

export const validateHybridPdfResult = (result: unknown): HybridPdfResult => {
  return HybridPdfResultSchema.parse(result);
};

export const validateTextValidationResult = (result: unknown): TextValidationResult => {
  return TextValidationResultSchema.parse(result);
};

// =============================================================================
// Universal OCR Configuration Constants (VNTK removed)
// =============================================================================

export const OCR_CONFIG = {
  // Gemini Configuration
  DEFAULT_MODEL: 'gemini-2.5-flash',
  MAX_RETRIES: 3,
  TIMEOUT: 30000,
  BATCH_SIZE: 5,
  
  // Image Processing
  DEFAULT_DENSITY: 300,
  DEFAULT_FORMAT: 'png' as const,
  MAX_IMAGE_SIZE: 4000,
  MIN_IMAGE_SIZE: 100,
  
  // Legacy Text Detection Thresholds (kept for backward compatibility)
  MIN_TEXT_LENGTH_FOR_TEXT_BASED: 50,
  MIN_TEXT_LENGTH_PER_PAGE: 20,
  
  // Universal Text Quality Validation Thresholds (VNTK removed)
  ENABLE_TEXT_VALIDATION: true,
  OCR_TRIGGER_CONFIDENCE_THRESHOLD: 0.5,
  MIN_ABSOLUTE_LENGTH: 10,
  MIN_WORD_COUNT: 3,
  MIN_WORD_DENSITY: 0.05, // Universal word density (words per character)
  MIN_TEXT_ENTROPY: 1.5,
  MIN_AVERAGE_WORD_LENGTH: 2.5, // Minimum average word length
  MIN_UNIQUE_CHAR_RATIO: 0.25, // Minimum character diversity ratio
  
  // Quality Settings
  IMAGE_QUALITY: 95,
  JPEG_QUALITY: 90,
  
  // Processing Limits
  MAX_PAGES_PARALLEL: 5,
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_PAGES: 100,
  
  // Performance Settings for Validation
  VALIDATION_TIMEOUT: 5000, // Maximum time for text validation (5s)
  ENABLE_VALIDATION_CACHE: true, // Cache validation results for identical text
  LOG_VALIDATION_DECISIONS: true, // Log OCR trigger decisions for debugging
} as const;

export const OCR_PROMPTS = {
  EXTRACT_TEXT: `Extract ALL text content from this image. Follow these guidelines:

1. **Text Accuracy**: Preserve exact text, including:
   - All punctuation marks
   - Special characters and symbols
   - Numbers and dates
   - Headers and footers

2. **Structure Preservation**: Maintain document structure:
   - Line breaks and paragraphs
   - Lists and bullet points
   - Tables (use markdown format)
   - Headings and subheadings

3. **Layout Handling**: For multi-column layouts:
   - Process columns from left to right
   - Clearly separate content from different columns
   - Maintain reading order

4. **Special Content**: Handle:
   - Tables: Use markdown table format
   - Charts/Graphs: Describe and extract visible text
   - Handwritten notes: Include if legible
   - Watermarks: Ignore

5. **Output Format**: Return only the extracted text content without any commentary or metadata.

Remember: Accuracy is paramount. If text is unclear, make your best attempt but don't invent content.`,

  EXTRACT_STRUCTURED_TEXT: `Extract and structure all text content from this document image. Return the content in a clean, readable format that preserves the document's logical structure.

Focus on:
- Maintaining hierarchical structure (headings, subheadings, paragraphs)
- Preserving lists and numbering
- Keeping table structure intact
- Including all text content accurately

Return only the extracted text without any additional commentary.`,
} as const;

// =============================================================================
// Error Types
// =============================================================================

export class OcrProcessingError extends Error {
  constructor(message: string, public cause?: Error, public pageNumber?: number) {
    super(message);
    this.name = "OcrProcessingError";
  }
}

export class ImageConversionError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = "ImageConversionError";
  }
}

export class GeminiVisionError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = "GeminiVisionError";
  }
}

export class TextValidationError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = "TextValidationError";
  }
}

export class ValidationTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationTimeoutError";
  }
}