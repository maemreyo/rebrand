import { z } from "zod";

// =============================================================================
// PDF Template Types (Based on pdfme)
// =============================================================================

export interface PdfTemplate {
  id: string;
  name: string;
  description?: string;
  template_json: Template;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Template {
  basePdf?: string | Uint8Array;
  schemas: Schema[][];
  sampledata?: Record<string, any>[];
  columns?: string[];
}

export interface Schema {
  name: string;
  type: string;
  position: Position;
  width: number;
  height: number;
  rotate?: number;
  opacity?: number;
  readOnly?: boolean;
  required?: boolean;
  
  // Text-specific properties
  fontSize?: number;
  fontName?: string;
  fontColor?: string;
  backgroundColor?: string;
  alignment?: "left" | "center" | "right";
  verticalAlignment?: "top" | "middle" | "bottom";
  lineHeight?: number;
  characterSpacing?: number;
  
  // Table-specific properties
  borderWidth?: number;
  borderColor?: string;
  padding?: number;
  
  // Image-specific properties
  fit?: "contain" | "cover" | "fill";
  
  // Additional properties
  [key: string]: any;
}

export interface Position {
  x: number;
  y: number;
}

// =============================================================================
// pdfme Options and Configuration
// =============================================================================

export interface PdfmeOptions {
  startY?: number;
  pageWidth?: number;
  pageHeight?: number;
  margin?: number;
  font?: {
    [key: string]: string;
  };
}

export interface PdfGenerationInput {
  [fieldName: string]: string | number | boolean | any[];
}

export interface PdfGenerationOptions {
  template: Template;
  inputs: PdfGenerationInput[];
  options?: PdfmeOptions;
}

// =============================================================================
// Supabase Template Database Schema
// =============================================================================

export interface TemplateRow {
  id: string;
  name: string;
  description?: string;
  template_json: Template;
  user_id: string;
  created_at: string;
  updated_at: string;
  is_public: boolean;
  category?: string;
  tags?: string[];
}

// =============================================================================
// Template Validation Schemas
// =============================================================================

const PositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

const SchemaSchema = z.object({
  name: z.string(),
  type: z.string(),
  position: PositionSchema,
  width: z.number(),
  height: z.number(),
  rotate: z.number().optional(),
  opacity: z.number().min(0).max(1).optional(),
  readOnly: z.boolean().optional(),
  required: z.boolean().optional(),
  fontSize: z.number().optional(),
  fontName: z.string().optional(),
  fontColor: z.string().optional(),
  backgroundColor: z.string().optional(),
  alignment: z.enum(["left", "center", "right"]).optional(),
  verticalAlignment: z.enum(["top", "middle", "bottom"]).optional(),
  lineHeight: z.number().optional(),
  characterSpacing: z.number().optional(),
  borderWidth: z.number().optional(),
  borderColor: z.string().optional(),
  padding: z.number().optional(),
  fit: z.enum(["contain", "cover", "fill"]).optional(),
});

const TemplateSchema = z.object({
  basePdf: z.union([z.string(), z.instanceof(Uint8Array)]).optional(),
  schemas: z.array(z.array(SchemaSchema)),
  sampledata: z.array(z.record(z.any())).optional(),
  columns: z.array(z.string()).optional(),
});

const PdfTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  template_json: TemplateSchema,
  user_id: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

const TemplateRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  template_json: TemplateSchema,
  user_id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  is_public: z.boolean(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// =============================================================================
// Validation Functions
// =============================================================================

export const validateTemplate = (template: unknown): Template => {
  return TemplateSchema.parse(template);
};

export const validatePdfTemplate = (template: unknown): PdfTemplate => {
  return PdfTemplateSchema.parse(template);
};

export const validateTemplateRow = (row: unknown): TemplateRow => {
  return TemplateRowSchema.parse(row);
};

export const validateSchema = (schema: unknown): Schema => {
  return SchemaSchema.parse(schema);
};

// =============================================================================
// Template Utility Functions
// =============================================================================

export const createEmptyTemplate = (): Template => {
  return {
    schemas: [[]],
    sampledata: [{}],
  };
};

export const createBasicTextTemplate = (): Template => {
  return {
    schemas: [
      [
        {
          name: "title",
          type: "text",
          position: { x: 20, y: 20 },
          width: 170,
          height: 15,
          fontSize: 18,
          fontName: "NotoSansCJK-Regular",
          alignment: "center",
        },
        {
          name: "content",
          type: "text",
          position: { x: 20, y: 50 },
          width: 170,
          height: 200,
          fontSize: 12,
          fontName: "NotoSansCJK-Regular",
          lineHeight: 1.5,
        },
      ],
    ],
    sampledata: [
      {
        title: "Sample Document",
        content: "This is sample content for the document.",
      },
    ],
  };
};

export const generateSchemaId = (): string => {
  return `schema_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const getTemplateFieldNames = (template: Template): string[] => {
  const fieldNames = new Set<string>();
  
  template.schemas.forEach(page => {
    page.forEach(schema => {
      fieldNames.add(schema.name);
    });
  });
  
  return Array.from(fieldNames);
};

export const validateTemplateInputs = (
  template: Template, 
  inputs: PdfGenerationInput[]
): boolean => {
  const fieldNames = getTemplateFieldNames(template);
  
  return inputs.every(input => {
    return fieldNames.every(fieldName => {
      return fieldName in input;
    });
  });
};

// =============================================================================
// Error Classes
// =============================================================================

export class TemplateValidationError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = "TemplateValidationError";
    this.details = details;
  }
}

export class PdfGenerationError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = "PdfGenerationError";
  }
}

// =============================================================================
// Constants
// =============================================================================

export const BLANK_PDF = "data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKL01lZGlhQm94IFswIDAgNTk1IDg0Ml0KPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovUmVzb3VyY2VzIDw8Cj4+Cj4+CmVuZG9iagp4cmVmCjAgNAowMDAwMDAwMDAwIDY1NTM1IGYKMDAwMDAwMDAwOSAwMDAwMCBuCjAwMDAwMDAwNTggMDAwMDAgbgowMDAwMDAwMTI1IDAwMDAwIG4KdHJhaWxlcgo8PAovU2l6ZSA0Ci9Sb290IDEgMCBSCj4+CnN0YXJ0eHJlZgoxNzgKJSVFT0Y=";

export const DEFAULT_PAGE_SIZE = {
  A4: { width: 210, height: 297 },
  LETTER: { width: 216, height: 279 },
  A3: { width: 297, height: 420 },
};

export const DEFAULT_FONTS = {
  "NotoSansCJK-Regular": "NotoSansCJK-Regular",
  "Helvetica": "Helvetica",
  "Times-Roman": "Times-Roman",
  "Courier": "Courier",
};