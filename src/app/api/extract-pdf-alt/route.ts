import { NextRequest, NextResponse } from 'next/server';

// =============================================================================
// Alternative PDF Extractor using pdfjs-dist
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
    };
  };
  error?: string;
  details?: any;
}

export async function POST(request: NextRequest): Promise<NextResponse<ExtractPdfResponse>> {
  const startTime = Date.now();

  try {
    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

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

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({
        success: false,
        error: 'File too large. Maximum size is 10MB.',
      }, { status: 400 });
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Extract text using pdfjs-dist
    let extractedText = '';
    let pageCount = 0;
    let metadata: any = {};

    try {
      // Dynamic import to avoid SSR issues
      const pdfjsLib = await import('pdfjs-dist');
      
      // Load PDF
      const loadingTask = pdfjsLib.getDocument(buffer);
      const pdf = await loadingTask.promise;
      
      pageCount = pdf.numPages;
      
      // Get document metadata
      const meta = await pdf.getMetadata();
      metadata = meta.info;

      // Extract text from all pages
      for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        
        extractedText += pageText + '\n\n';
      }

    } catch (error) {
      console.error('PDF parsing error:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to parse PDF. The file might be corrupted or password-protected.',
        details: error instanceof Error ? error.message : 'PDF parsing failed',
      }, { status: 400 });
    }

    // Validate extracted text
    if (!extractedText || extractedText.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No text found in PDF. The document might be image-based or empty.',
      }, { status: 400 });
    }

    // Clean up extracted text
    const cleanedText = cleanExtractedText(extractedText);
    const extractionTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      data: {
        text: cleanedText,
        metadata: {
          filename: file.name,
          fileSize: file.size,
          pageCount,
          extractionTime,
          title: metadata.Title,
          author: metadata.Author,
          creator: metadata.Creator,
        },
      },
    }, { status: 200 });

  } catch (error) {
    console.error('Unexpected error in extract-pdf-alt endpoint:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' 
        ? (error instanceof Error ? error.message : 'Unknown error')
        : undefined,
    }, { status: 500 });
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

function cleanExtractedText(text: string): string {
  return text
    .replace(/\n{3,}/g, '\n\n')
    .replace(/ {2,}/g, ' ')
    .replace(/[ \t]+$/gm, '')
    .replace(/^[ \t]+/gm, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
}

// =============================================================================
// GET Handler - Health Check
// =============================================================================

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'extract-pdf-alt',
    engine: 'pdfjs-dist',
    timestamp: new Date().toISOString(),
  });
}