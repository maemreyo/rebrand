import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { JSONContent } from '@tiptap/core';
import { generate } from '@pdfme/generator';
import { TiptapToPdfmeAdapter } from '@/lib/adapters/tiptap-to-pdfme';
import { getTemplateById } from '@/app/api/templates/route';
import { 
  Template, 
  PdfGenerationError, 
  validateTemplate,
  createBasicTextTemplate 
} from '@/types/template';

// =============================================================================
// Request Schema
// =============================================================================

const ExportPdfRequestSchema = z.object({
  tiptapJson: z.any(), // JSONContent from Tiptap
  templateId: z.string().optional(),
  customTemplate: z.any().optional(), // Custom template JSON
  options: z.object({
    filename: z.string().default('document.pdf'),
    pageSize: z.enum(['A4', 'LETTER', 'A3']).default('A4'),
    margin: z.number().min(5).max(50).default(20),
    font: z.string().default('NotoSansCJK-Regular'),
    fontSize: z.number().min(8).max(24).default(12),
  }).optional(),
});

interface ExportPdfResponse {
  success: boolean;
  data?: {
    filename: string;
    size: number;
    pageCount: number;
    generationTime: number;
  };
  error?: string;
  details?: any;
}

// =============================================================================
// POST Handler - Export PDF
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
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

    const validationResult = ExportPdfRequestSchema.safeParse(body);
    
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

    const { tiptapJson, templateId, customTemplate, options } = validationResult.data;

    // Validate Tiptap JSON structure
    if (!tiptapJson || !tiptapJson.type || tiptapJson.type !== 'doc') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid Tiptap JSON structure',
        },
        { status: 400 }
      );
    }

    // Get or create template
    let template: Template;
    
    if (customTemplate) {
      // Use custom template
      try {
        template = validateTemplate(customTemplate);
      } catch (error) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid custom template',
            details: error instanceof Error ? error.message : 'Template validation failed',
          },
          { status: 400 }
        );
      }
    } else if (templateId) {
      // Get template from database
      const templateData = await getTemplateById(templateId);
      if (!templateData) {
        return NextResponse.json(
          {
            success: false,
            error: 'Template not found',
          },
          { status: 404 }
        );
      }
      template = templateData.template_json;
    } else {
      // Use default template
      template = createBasicTextTemplate({
        pageWidth: getPageDimensions(options?.pageSize || 'A4').width,
        pageHeight: getPageDimensions(options?.pageSize || 'A4').height,
        margin: options?.margin || 20,
        defaultFont: options?.font || 'NotoSansCJK-Regular',
        defaultFontSize: options?.fontSize || 12,
      });
    }

    // Transform Tiptap JSON to pdfme format
    let pdfmeDocument;
    try {
      const adapter = new TiptapToPdfmeAdapter({
        pageWidth: getPageDimensions(options?.pageSize || 'A4').width,
        pageHeight: getPageDimensions(options?.pageSize || 'A4').height,
        margin: options?.margin || 20,
        defaultFont: options?.font || 'NotoSansCJK-Regular',
        defaultFontSize: options?.fontSize || 12,
      });

      pdfmeDocument = adapter.transform(tiptapJson);
    } catch (error) {
      console.error('Tiptap to pdfme transformation failed:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to transform document for PDF generation',
          details: error instanceof Error ? error.message : 'Transformation failed',
        },
        { status: 500 }
      );
    }

    // Generate PDF using pdfme
    let pdfBuffer: Uint8Array;
    try {
      // If we have content from Tiptap, use the generated template and inputs
      // Otherwise, use the provided template with empty inputs
      const finalTemplate = pdfmeDocument.template.schemas[0].length > 0 
        ? pdfmeDocument.template 
        : template;
      
      const finalInputs = pdfmeDocument.inputs.length > 0 && Object.keys(pdfmeDocument.inputs[0]).length > 0
        ? pdfmeDocument.inputs
        : [{}];

      pdfBuffer = await generate({
        template: finalTemplate,
        inputs: finalInputs,
      });
    } catch (error) {
      console.error('PDF generation failed:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to generate PDF',
          details: error instanceof Error ? error.message : 'PDF generation failed',
        },
        { status: 500 }
      );
    }

    // Calculate metadata
    const generationTime = Date.now() - startTime;
    const pdfSize = pdfBuffer.byteLength;
    const pageCount = estimatePageCount(pdfSize);

    // Return PDF as response
    const filename = options?.filename || 'document.pdf';
    
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': pdfSize.toString(),
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Generation-Time': generationTime.toString(),
        'X-PDF-Size': pdfSize.toString(),
        'X-Page-Count': pageCount.toString(),
      },
    });

  } catch (error) {
    console.error('Unexpected error in export-pdf endpoint:', error);

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
// Alternative POST Handler - JSON Response (for frontend handling)
// =============================================================================

export async function generatePdfAsBase64(
  tiptapJson: JSONContent,
  templateId?: string,
  customTemplate?: Template,
  options?: any
): Promise<{ success: true; data: string } | { success: false; error: string }> {
  try {
    // Similar logic as above but return base64 string instead of binary response
    
    let template: Template;
    
    if (customTemplate) {
      template = validateTemplate(customTemplate);
    } else if (templateId) {
      const templateData = await getTemplateById(templateId);
      if (!templateData) {
        return { success: false, error: 'Template not found' };
      }
      template = templateData.template_json;
    } else {
      template = createBasicTextTemplate();
    }

    const adapter = new TiptapToPdfmeAdapter(options);
    const pdfmeDocument = adapter.transform(tiptapJson);

    const finalTemplate = pdfmeDocument.template.schemas[0].length > 0 
      ? pdfmeDocument.template 
      : template;
    
    const finalInputs = pdfmeDocument.inputs.length > 0 && Object.keys(pdfmeDocument.inputs[0]).length > 0
      ? pdfmeDocument.inputs
      : [{}];

    const pdfBuffer = await generate({
      template: finalTemplate,
      inputs: finalInputs,
    });

    // Convert to base64
    const base64 = Buffer.from(pdfBuffer).toString('base64');
    
    return { success: true, data: base64 };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'PDF generation failed' 
    };
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
        endpoint: 'export-pdf',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        supportedFormats: ['pdf'],
        supportedPageSizes: ['A4', 'LETTER', 'A3'],
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
// Utility Functions
// =============================================================================

/**
 * Get page dimensions for different page sizes
 */
function getPageDimensions(pageSize: 'A4' | 'LETTER' | 'A3'): { width: number; height: number } {
  const dimensions = {
    A4: { width: 210, height: 297 },
    LETTER: { width: 216, height: 279 },
    A3: { width: 297, height: 420 },
  };
  
  return dimensions[pageSize];
}

/**
 * Estimate page count from PDF file size (rough estimate)
 */
function estimatePageCount(pdfSize: number): number {
  // Very rough estimate: ~50KB per page on average
  return Math.max(1, Math.round(pdfSize / 50000));
}

/**
 * Validate file size limits
 */
function validateFileSize(size: number): boolean {
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  return size <= MAX_SIZE;
}

/**
 * Generate safe filename
 */
function generateSafeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Log PDF generation for monitoring
 */
function logPdfGeneration(
  size: number,
  pageCount: number,
  generationTime: number
): void {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[PDF-EXPORT] Generated ${pageCount} pages, ${size} bytes in ${generationTime}ms`);
  }
}

// =============================================================================
// Error Response Helpers
// =============================================================================

export function createPdfErrorResponse(
  error: string,
  status: number = 400,
  details?: any
): NextResponse<ExportPdfResponse> {
  return NextResponse.json(
    {
      success: false,
      error,
      details,
    },
    { status }
  );
}

// =============================================================================
// Custom Error Classes
// =============================================================================

export class PdfExportError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = "PdfExportError";
  }
}

export class TemplateNotFoundError extends Error {
  constructor(templateId: string) {
    super(`Template with ID ${templateId} not found`);
    this.name = "TemplateNotFoundError";
  }
}