# Gemini AI Integration and Prompt Engineering

This section details how DocRebrander integrates with Google Gemini AI for raw text analysis and conversion into the canonical JSON format.

## 3.1 Optimal Gemini Configuration

```typescript
import { GoogleGenerativeAI, GenerationConfig } from "@google/generative-ai";

const GEMINI_CONFIG: GenerationConfig = {
  temperature: 0.1,
  topP: 0.9,
  topK: 25,
  maxOutputTokens: 8192,
  responseMimeType: "application/json",
  responseSchema: {
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
  },
};

class GeminiDocumentProcessor {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: GEMINI_CONFIG,
    });
  }

  async processDocument(rawText: string): Promise<CanonicalDocument> {
    const prompt = this.buildAnalysisPrompt(rawText);

    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const jsonString = response.text();

      const parsedDocument = JSON.parse(jsonString);
      return validateCanonicalDocument(parsedDocument);
    } catch (error) {
      throw new DocumentProcessingError(
        "Failed to process document with Gemini AI",
        error
      );
    }
  }

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

## Detailed Analysis
The strong performance can be attributed to several factors:
1. Improved marketing campaigns
2. Enhanced product features
3. Better customer retention

| Department | Q3 Revenue | Q4 Revenue | Growth |
|------------|------------|------------|---------|
| Sales      | $1.2M      | $1.4M      | 16.7%   |
| Marketing  | $800K      | $900K      | 12.5%   |
| Support    | $300K      | $350K      | 16.7%   |
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
    },
    {
      "id": "table-1",
      "type": "table",
      "headers": {
        "id": "row-header",
        "cells": [
          {
            "id": "cell-h1",
            "content": [
              {
                "type": "text",
                "text": "Department"
              }
            ],
            "isHeader": true
          },
          {
            "id": "cell-h2",
            "content": [
              {
                "type": "text",
                "text": "Q3 Revenue"
              }
            ],
            "isHeader": true
          },
          {
            "id": "cell-h3",
            "content": [
              {
                "type": "text",
                "text": "Q4 Revenue"
              }
            ],
            "isHeader": true
          },
          {
            "id": "cell-h4",
            "content": [
              {
                "type": "text",
                "text": "Growth"
              }
            ],
            "isHeader": true
          }
        ]
      },
      "rows": [
        {
          "id": "row-1",
          "cells": [
            {
              "id": "cell-1-1",
              "content": [
                {
                  "type": "text",
                  "text": "Sales"
                }
              ]
            },
            {
              "id": "cell-1-2",
              "content": [
                {
                  "type": "text",
                  "text": "$1.2M"
                }
              ]
            },
            {
              "id": "cell-1-3",
              "content": [
                {
                  "type": "text",
                  "text": "$1.4M"
                }
              ]
            },
            {
              "id": "cell-1-4",
              "content": [
                {
                  "type": "text",
                  "text": "16.7%"
                }
              ]
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
}
```

## 3.2 Error Handling and Fallbacks

```typescript
class DocumentProcessingError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = "DocumentProcessingError";
  }
}

class GeminiDocumentProcessor {
  async processDocumentWithFallbacks(
    rawText: string
  ): Promise<CanonicalDocument> {
    const strategies = [
      () => this.processDocument(rawText),
      () => this.processWithSimplifiedSchema(rawText),
      () => this.processWithBasicStructure(rawText),
      () => this.createFallbackDocument(rawText),
    ];

    for (const strategy of strategies) {
      try {
        return await strategy();
      } catch (error) {
        console.warn("Processing strategy failed:", error);
        continue;
      }
    }

    throw new DocumentProcessingError("All processing strategies failed");
  }

  private async processWithSimplifiedSchema(
    rawText: string
  ): Promise<CanonicalDocument> {
    // Simplified schema with reduced complexity
    const simplifiedConfig = {
      ...GEMINI_CONFIG,
      responseSchema: {
        type: "object",
        properties: {
          metadata: {
            type: "object",
            properties: {
              documentType: {
                type: "string",
                enum: ["report", "article", "form", "contract", "other"],
              },
              language: { type: "string" },
              confidenceScore: { type: "number" },
            },
          },
          content: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                type: { type: "string" },
                content: { type: "array" },
              },
            },
          },
        },
      },
    };

    // Process with simplified schema
    return this.processWithConfig(rawText, simplifiedConfig);
  }

  private createFallbackDocument(rawText: string): CanonicalDocument {
    return {
      metadata: {
        documentType: "other",
        language: "en",
        confidenceScore: 0.5,
      },
      content: [
        {
          id: "p-fallback",
          type: "paragraph",
          content: [
            {
              type: "text",
              text: rawText,
            },
          ],
        },
      ],
      version: "1.0",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}
