import { GoogleGenAI } from '@google/genai';
import { CanonicalDocument, DocumentProcessingError, validateCanonicalDocument } from '@/types/document';

// =============================================================================
// Gemini Configuration
// =============================================================================

interface GeminiConfig {
  apiKey: string;
  model: string;
  timeout: number;
  maxRetries: number;
  temperature: number;
  topP: number;
  topK: number;
  maxOutputTokens: number;
}

const DEFAULT_CONFIG: Omit<GeminiConfig, 'apiKey'> = {
  model: 'gemini-2.0-flash',
  timeout: 30000,
  maxRetries: 3,
  temperature: 0.1,
  topP: 0.9,
  topK: 25,
  maxOutputTokens: 8192,
};

// =============================================================================
// Response Schema for Structured Output
// =============================================================================

const CANONICAL_DOCUMENT_SCHEMA = {
  type: "object",
  properties: {
    metadata: {
      type: "object",
      properties: {
        title: { type: "string", nullable: true },
        author: { type: "string", nullable: true },
        subject: { type: "string", nullable: true },
        keywords: {
          type: "array",
          items: { type: "string" },
          nullable: true,
        },
        documentType: {
          type: "string",
          enum: ["report", "article", "form", "contract", "other"],
        },
        language: { type: "string" },
        confidenceScore: { type: "number", minimum: 0, maximum: 1 },
      },
      required: ["documentType", "language", "confidenceScore"],
    },
    content: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          type: {
            type: "string",
            enum: [
              "heading",
              "paragraph",
              "list",
              "table",
              "image",
              "codeBlock",
              "blockquote",
              "multipleChoice",
              "divider",
            ],
          },
        },
        required: ["id", "type"],
      },
    },
    version: { type: "string" },
    createdAt: { type: "string" },
    updatedAt: { type: "string" },
  },
  required: ["metadata", "content", "version", "createdAt", "updatedAt"],
};

// =============================================================================
// Gemini Document Processor Class
// =============================================================================

export class GeminiDocumentProcessor {
  private genAI: GoogleGenAI;
  private config: GeminiConfig;

  constructor(apiKey?: string, config?: Partial<GeminiConfig>) {
    const finalApiKey = apiKey || process.env.GEMINI_API_KEY;
    
    if (!finalApiKey) {
      throw new DocumentProcessingError(
        'Gemini API key is required. Set GEMINI_API_KEY environment variable or pass it to constructor.'
      );
    }

    this.config = { ...DEFAULT_CONFIG, apiKey: finalApiKey, ...config };
    this.genAI = new GoogleGenAI({ apiKey: this.config.apiKey });
  }

  /**
   * Process raw text into canonical document format with fallback strategies
   */
  async processDocumentWithFallbacks(rawText: string): Promise<CanonicalDocument> {
    const strategies = [
      () => this.processDocument(rawText),
      () => this.processWithSimplifiedPrompt(rawText),
      () => this.processWithBasicStructure(rawText),
      () => this.createFallbackDocument(rawText),
    ];

    let lastError: Error | null = null;

    for (const strategy of strategies) {
      try {
        return await strategy();
      } catch (error) {
        lastError = error as Error;
        console.warn('Processing strategy failed:', error);
        continue;
      }
    }

    throw new DocumentProcessingError(
      'All processing strategies failed',
      lastError || undefined
    );
  }

  /**
   * Main document processing method with full AI analysis
   */
  async processDocument(rawText: string): Promise<CanonicalDocument> {
    if (!rawText || rawText.trim().length === 0) {
      throw new DocumentProcessingError('Raw text cannot be empty');
    }

    try {
      const prompt = this.buildAnalysisPrompt(rawText);
      
      const response = await this.genAI.models.generateContent({
        model: this.config.model,
        contents: prompt,
        config: {
          temperature: this.config.temperature,
          topP: this.config.topP,
          topK: this.config.topK,
          maxOutputTokens: this.config.maxOutputTokens,
          responseMimeType: "application/json",
          responseSchema: CANONICAL_DOCUMENT_SCHEMA,
        },
      });

      const jsonString = response.text;
      if (!jsonString) {
        throw new DocumentProcessingError('No response from Gemini AI');
      }

      const parsedDocument = JSON.parse(jsonString);
      return validateCanonicalDocument(parsedDocument);

    } catch (error) {
      if (error instanceof DocumentProcessingError) {
        throw error;
      }
      throw new DocumentProcessingError(
        'Failed to process document with Gemini AI',
        error as Error
      );
    }
  }

  /**
   * Simplified processing with reduced complexity
   */
  private async processWithSimplifiedPrompt(rawText: string): Promise<CanonicalDocument> {
    const simplifiedPrompt = this.buildSimplifiedPrompt(rawText);

    const response = await this.genAI.models.generateContent({
      model: this.config.model,
      contents: simplifiedPrompt,
      config: {
        temperature: 0.2,
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
      },
    });

    const jsonString = response.text;
    if (!jsonString) {
      throw new DocumentProcessingError('No response from simplified processing');
    }

    const parsedDocument = JSON.parse(jsonString);
    return validateCanonicalDocument(parsedDocument);
  }

  /**
   * Basic structure processing as fallback
   */
  private async processWithBasicStructure(rawText: string): Promise<CanonicalDocument> {
    // Simple processing: split by paragraphs and create basic structure
    const paragraphs = rawText.split('\n\n').filter(p => p.trim().length > 0);
    
    const content = paragraphs.map((text, index) => ({
      id: `p-${index + 1}`,
      type: 'paragraph' as const,
      content: [
        {
          type: 'text' as const,
          text: text.trim(),
        },
      ],
    }));

    return {
      metadata: {
        documentType: 'other' as const,
        language: 'en',
        confidenceScore: 0.3,
      },
      content,
      version: '1.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Final fallback: create minimal document
   */
  private createFallbackDocument(rawText: string): CanonicalDocument {
    return {
      metadata: {
        documentType: 'other' as const,
        language: 'en',
        confidenceScore: 0.1,
      },
      content: [
        {
          id: 'p-fallback',
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: rawText,
            },
          ],
        },
      ],
      version: '1.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Build comprehensive analysis prompt
   */
  private buildAnalysisPrompt(rawText: string): string {
    return `
SYSTEM: You are a precise document analysis AI that converts raw text into structured JSON format. Your task is to analyze the provided text and extract it into a canonical document structure.

ROLE: Expert document analyzer specializing in content structure identification and data extraction.

TASK: Convert the following raw text into a structured JSON document following the exact schema provided. Analyze the content to identify document structure, formatting, and semantic elements.

INSTRUCTIONS:
1. Analyze the text to identify document structure (headings, paragraphs, lists, tables, etc.)
2. Extract inline formatting (bold, italic, underline) based on textual cues
3. Identify and structure any tabular data
4. Detect code blocks, quotes, and special content
5. Generate appropriate metadata including document type and confidence score
6. Assign unique IDs to all blocks and elements
7. Maintain original content while improving structure

CONSTRAINTS:
- Return only valid JSON matching the provided schema
- Use null for missing information
- Preserve original text content exactly
- Assign confidence scores based on clarity of structure identification
- Generate ISO 8601 timestamps for createdAt and updatedAt
- Use version "1.0" for initial processing

EXAMPLES:

<example>
<input>
# Financial Report Q4 2024

## Executive Summary
Our company performed **exceptionally well** in Q4 2024, with revenue increasing by 15% compared to the previous quarter.

### Key Metrics
- Revenue: $2.5M
- Profit: $450K
- Customer Growth: 12%
</input>
<output>
{
  "metadata": {
    "title": "Financial Report Q4 2024",
    "documentType": "report",
    "language": "en",
    "confidenceScore": 0.95
  },
  "content": [
    {
      "id": "h1-1",
      "type": "heading",
      "level": 1,
      "content": [
        {
          "type": "text",
          "text": "Financial Report Q4 2024"
        }
      ]
    },
    {
      "id": "h2-1",
      "type": "heading",
      "level": 2,
      "content": [
        {
          "type": "text",
          "text": "Executive Summary"
        }
      ]
    },
    {
      "id": "p-1",
      "type": "paragraph",
      "content": [
        {
          "type": "text",
          "text": "Our company performed "
        },
        {
          "type": "text",
          "text": "exceptionally well",
          "formatting": {
            "bold": true
          }
        },
        {
          "type": "text",
          "text": " in Q4 2024, with revenue increasing by 15% compared to the previous quarter."
        }
      ]
    },
    {
      "id": "h3-1",
      "type": "heading",
      "level": 3,
      "content": [
        {
          "type": "text",
          "text": "Key Metrics"
        }
      ]
    },
    {
      "id": "list-1",
      "type": "list",
      "listType": "bulleted",
      "items": [
        {
          "id": "li-1",
          "content": [
            {
              "type": "text",
              "text": "Revenue: $2.5M"
            }
          ]
        },
        {
          "id": "li-2",
          "content": [
            {
              "type": "text",
              "text": "Profit: $450K"
            }
          ]
        },
        {
          "id": "li-3",
          "content": [
            {
              "type": "text",
              "text": "Customer Growth: 12%"
            }
          ]
        }
      ]
    }
  ],
  "version": "1.0",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
</output>
</example>

INPUT TEXT:
${rawText}

OUTPUT JSON:`;
  }

  /**
   * Build simplified prompt for fallback processing
   */
  private buildSimplifiedPrompt(rawText: string): string {
    return `
Convert this text to structured JSON with metadata and content blocks:

Text: ${rawText}

Return JSON with:
1. metadata: { documentType, language, confidenceScore }
2. content: array of blocks with id, type, and content
3. version, createdAt, updatedAt

Focus on identifying paragraphs, headings, and lists. Keep it simple.
`;
  }
}

// =============================================================================
// Singleton Instance (Optional)
// =============================================================================

let geminiInstance: GeminiDocumentProcessor | null = null;

export const getGeminiProcessor = (apiKey?: string): GeminiDocumentProcessor => {
  if (!geminiInstance) {
    geminiInstance = new GeminiDocumentProcessor(apiKey);
  }
  return geminiInstance;
};

// =============================================================================
// Utility Functions
// =============================================================================

export const validateGeminiApiKey = async (apiKey: string): Promise<boolean> => {
  try {
    const processor = new GeminiDocumentProcessor(apiKey);
    await processor.processDocument('test');
    return true;
  } catch (error) {
    return false;
  }
};

export const estimateProcessingTime = (textLength: number): number => {
  // Rough estimate: 1-3 seconds per 1000 characters
  return Math.max(1000, Math.min(30000, textLength * 2));
};

// =============================================================================
// Export Types
// =============================================================================

export type { GeminiConfig };