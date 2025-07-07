import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// =============================================================================
// Request/Response Schemas
// =============================================================================

interface ExtractPdfResponse {
  success: boolean;
  data?: {
    text: string;
    metadata: {
      filename: string;
      fileSize: number;
      pageCount: number;
      extractionTime: number;
      title?: string;
      author?: string;
      creator?: string;
      creationDate?: string;
      modDate?: string;
    };
  };
  error?: string;
  details?: any;
}

// =============================================================================
// POST Handler - Extract Text from PDF
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse<ExtractPdfResponse>> {
  const startTime = Date.now();

  try {
    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: 'No file provided',
        },
        { status: 400 }
      );
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid file type. Only PDF files are supported.',
        },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          success: false,
          error: 'File too large. Maximum size is 10MB.',
        },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Extract text using pdf-parse with dynamic import
    let pdfData;
    try {
      // Dynamic import to avoid SSR issues
      const pdfParse = (await import('pdf-parse')).default;
      
      pdfData = await pdfParse(buffer, {
        // Options for pdf-parse
        max: 0, // Parse all pages (0 = unlimited)
      });
    } catch (error) {
      console.error('PDF parsing error:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to parse PDF. The file might be corrupted or password-protected.',
          details: error instanceof Error ? error.message : 'PDF parsing failed',
        },
        { status: 400 }
      );
    }

    // Validate extracted text
    if (!pdfData.text || pdfData.text.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No text found in PDF. The document might be image-based or empty.',
        },
        { status: 400 }
      );
    }

    // Clean up extracted text
    const cleanedText = cleanExtractedText(pdfData.text);

    // Calculate metadata
    const extractionTime = Date.now() - startTime;

    // Return successful response
    return NextResponse.json(
      {
        success: true,
        data: {
          text: cleanedText,
          metadata: {
            filename: file.name,
            fileSize: file.size,
            pageCount: pdfData.numpages,
            extractionTime,
            title: pdfData.info?.Title,
            author: pdfData.info?.Author,
            creator: pdfData.info?.Creator,
            creationDate: pdfData.info?.CreationDate,
            modDate: pdfData.info?.ModDate,
          },
        },
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Unexpected error in extract-pdf endpoint:', error);

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
    return NextResponse.json(
      {
        status: 'ok',
        endpoint: 'extract-pdf',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        supportedFormats: ['pdf'],
        maxFileSize: '10MB',
        features: [
          'Text extraction',
          'Metadata extraction', 
          'Multi-page support',
          'Error handling',
        ],
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
 * Clean extracted text by removing excessive whitespace and formatting issues
 */
function cleanExtractedText(text: string): string {
  return text
    // Remove excessive line breaks
    .replace(/\n{3,}/g, '\n\n')
    // Remove excessive spaces
    .replace(/ {2,}/g, ' ')
    // Remove trailing whitespace from lines
    .replace(/[ \t]+$/gm, '')
    // Remove leading whitespace from lines (but preserve paragraph structure)
    .replace(/^[ \t]+/gm, '')
    // Clean up special characters that might cause issues
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Normalize line endings
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Trim the entire text
    .trim();
}

/**
 * Validate PDF file structure
 */
function validatePdfFile(buffer: Buffer): boolean {
  // Check PDF header (should start with %PDF-)
  const header = buffer.subarray(0, 5).toString();
  return header === '%PDF-';
}

/**
 * Estimate text quality/readability
 */
function calculateTextQuality(text: string): {
  quality: 'high' | 'medium' | 'low';
  score: number;
  issues: string[];
} {
  const issues: string[] = [];
  let score = 100;

  // Check for excessive line breaks
  const lineBreakRatio = (text.match(/\n/g) || []).length / text.length;
  if (lineBreakRatio > 0.1) {
    issues.push('Excessive line breaks detected');
    score -= 20;
  }

  // Check for garbled text (excessive special characters)
  const specialCharRatio = (text.match(/[^\w\s.,!?;:()\-"']/g) || []).length / text.length;
  if (specialCharRatio > 0.05) {
    issues.push('Possible garbled or encoded text');
    score -= 30;
  }

  // Check for very short words (might indicate OCR issues)
  const words = text.split(/\s+/);
  const shortWords = words.filter(word => word.length === 1 && !/[a-zA-Z]/.test(word));
  if (shortWords.length / words.length > 0.1) {
    issues.push('Many single-character fragments detected');
    score -= 25;
  }

  // Determine quality level
  let quality: 'high' | 'medium' | 'low';
  if (score >= 80) quality = 'high';
  else if (score >= 50) quality = 'medium';
  else quality = 'low';

  return { quality, score, issues };
}

/**
 * Extract additional information from PDF metadata
 */
function extractPdfInfo(info: any): Record<string, any> {
  const extractedInfo: Record<string, any> = {};

  // Common PDF metadata fields
  const fields = [
    'Title', 'Author', 'Subject', 'Keywords', 'Creator', 'Producer',
    'CreationDate', 'ModDate', 'Trapped', 'PDFFormatVersion'
  ];

  fields.forEach(field => {
    if (info && info[field]) {
      extractedInfo[field] = info[field];
    }
  });

  return extractedInfo;
}

/**
 * Log PDF processing for monitoring
 */
function logPdfProcessing(
  filename: string,
  fileSize: number,
  pageCount: number,
  textLength: number,
  extractionTime: number
): void {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[PDF-EXTRACT] ${filename} - ${fileSize} bytes, ${pageCount} pages, ${textLength} chars in ${extractionTime}ms`);
  }
}

// =============================================================================
// Error Classes
// =============================================================================

export class PdfExtractionError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = "PdfExtractionError";
  }
}

export class InvalidPdfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidPdfError";
  }
}

export class FileSizeError extends Error {
  constructor(size: number, maxSize: number) {
    super(`File size ${size} bytes exceeds maximum ${maxSize} bytes`);
    this.name = "FileSizeError";
  }
}