import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { 
  PdfTemplate, 
  TemplateRow, 
  validateTemplate, 
  validatePdfTemplate,
  createBasicTextTemplate,
  TemplateValidationError 
} from '@/types/template';

// =============================================================================
// Request/Response Schemas
// =============================================================================

const CreateTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  template_json: z.any(), // Will be validated separately
  is_public: z.boolean().default(false),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const UpdateTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  template_json: z.any().optional(),
  is_public: z.boolean().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

interface TemplatesResponse {
  success: boolean;
  data?: PdfTemplate[] | PdfTemplate;
  error?: string;
  details?: any;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// =============================================================================
// GET Handler - Retrieve Templates
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse<TemplatesResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const category = searchParams.get('category');
    const isPublic = searchParams.get('public') === 'true';
    const search = searchParams.get('search');
    const userId = searchParams.get('user_id'); // For user-specific templates

    // Build query
    let query = supabase
      .from('templates')
      .select('*', { count: 'exact' });

    // Apply filters
    if (isPublic) {
      query = query.eq('is_public', true);
    } else if (userId) {
      query = query.eq('user_id', userId);
    }

    if (category) {
      query = query.eq('category', category);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    // Order by updated_at desc
    query = query.order('updated_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch templates',
          details: error.message,
        },
        { status: 500 }
      );
    }

    // Transform to PdfTemplate format
    const templates: PdfTemplate[] = (data || []).map(transformRowToPdfTemplate);

    const totalPages = Math.ceil((count || 0) / limit);

    return NextResponse.json(
      {
        success: true,
        data: templates,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages,
        },
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Unexpected error in templates GET:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST Handler - Create Template
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse<TemplatesResponse>> {
  try {
    // Parse request body
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

    // Validate basic structure
    const validationResult = CreateTemplateSchema.safeParse(body);
    
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

    const { name, description, template_json, is_public, category, tags } = validationResult.data;

    // Validate template JSON structure
    try {
      validateTemplate(template_json);
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid template JSON structure',
          details: error instanceof Error ? error.message : 'Template validation failed',
        },
        { status: 400 }
      );
    }

    // For now, we'll use a placeholder user_id since auth isn't implemented
    // In production, get this from authentication
    const user_id = 'anonymous'; // TODO: Replace with actual user authentication

    // Insert into database
    const { data, error } = await supabase
      .from('templates')
      .insert({
        name,
        description,
        template_json,
        user_id,
        is_public: is_public || false,
        category,
        tags,
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create template',
          details: error.message,
        },
        { status: 500 }
      );
    }

    const createdTemplate = transformRowToPdfTemplate(data);

    return NextResponse.json(
      {
        success: true,
        data: createdTemplate,
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Unexpected error in templates POST:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// =============================================================================
// PUT Handler - Update Template
// =============================================================================

export async function PUT(request: NextRequest): Promise<NextResponse<TemplatesResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('id');

    if (!templateId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Template ID is required',
        },
        { status: 400 }
      );
    }

    // Parse request body
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

    // Validate update data
    const validationResult = UpdateTemplateSchema.safeParse(body);
    
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

    const updateData = validationResult.data;

    // Validate template JSON if provided
    if (updateData.template_json) {
      try {
        validateTemplate(updateData.template_json);
      } catch (error) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid template JSON structure',
            details: error instanceof Error ? error.message : 'Template validation failed',
          },
          { status: 400 }
        );
      }
    }

    // Update in database
    const { data, error } = await supabase
      .from('templates')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', templateId)
      .select()
      .single();

    if (error) {
      console.error('Supabase update error:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to update template',
          details: error.message,
        },
        { status: 500 }
      );
    }

    const updatedTemplate = transformRowToPdfTemplate(data);

    return NextResponse.json(
      {
        success: true,
        data: updatedTemplate,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Unexpected error in templates PUT:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE Handler - Delete Template
// =============================================================================

export async function DELETE(request: NextRequest): Promise<NextResponse<TemplatesResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('id');

    if (!templateId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Template ID is required',
        },
        { status: 400 }
      );
    }

    // Delete from database
    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('id', templateId);

    if (error) {
      console.error('Supabase delete error:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to delete template',
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: undefined, // No data returned for delete
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Unexpected error in templates DELETE:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Transform database row to PdfTemplate format
 */
function transformRowToPdfTemplate(row: TemplateRow): PdfTemplate {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    template_json: row.template_json,
    user_id: row.user_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Create default templates for new users
 */
export async function createDefaultTemplates(userId: string): Promise<void> {
  const defaultTemplates = [
    {
      name: 'Basic Text Document',
      description: 'Simple template for text documents with title and content',
      template_json: createBasicTextTemplate(),
      user_id: userId,
      is_public: false,
      category: 'text',
    },
  ];

  await supabase.from('templates').insert(defaultTemplates);
}

/**
 * Get template by ID
 */
export async function getTemplateById(id: string): Promise<PdfTemplate | null> {
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return null;
  }

  return transformRowToPdfTemplate(data);
}

// =============================================================================
// Database Schema Helper (for reference)
// =============================================================================

/*
CREATE TABLE templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  template_json JSONB NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_public BOOLEAN DEFAULT FALSE,
  category VARCHAR(100),
  tags TEXT[]
);

CREATE INDEX idx_templates_user_id ON templates(user_id);
CREATE INDEX idx_templates_category ON templates(category);
CREATE INDEX idx_templates_is_public ON templates(is_public);
CREATE INDEX idx_templates_updated_at ON templates(updated_at DESC);
*/