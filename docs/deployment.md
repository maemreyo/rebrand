# Production Deployment Considerations

This section outlines important considerations for deploying the DocRebrander application to a production environment, including environment configuration and API routes for server-side processing.

## 8.1 Environment Configuration

```typescript
// lib/config.ts
export const config = {
  gemini: {
    apiKey: process.env.GEMINI_API_KEY!,
    model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
    timeout: parseInt(process.env.GEMINI_TIMEOUT || "30000"),
    maxRetries: parseInt(process.env.GEMINI_MAX_RETRIES || "3"),
  },
  cache: {
    enabled: process.env.NODE_ENV === "production",
    ttl: parseInt(process.env.CACHE_TTL || "86400000"), // 24 hours
  },
  monitoring: {
    enabled: process.env.NODE_ENV === "production",
    sentry: {
      dsn: process.env.SENTRY_DSN,
    },
  },
};

// Validate required environment variables
const requiredEnvVars = ["GEMINI_API_KEY"];
requiredEnvVars.forEach((varName) => {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
});
```

### 8.2 API Routes for Server-Side Processing

```typescript
// pages/api/process-document.ts
import { NextApiRequest, NextApiResponse } from "next";
import { GeminiDocumentProcessor } from "@/lib/gemini-processor";
import { CanonicalToTiptapAdapter } from "@/lib/adapters";
import { validateCanonicalDocument } from "@/lib/validation";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { rawText } = req.body;

    if (!rawText || typeof rawText !== "string") {
      return res.status(400).json({ error: "Invalid input" });
    }

    const processor = new GeminiDocumentProcessor(process.env.GEMINI_API_KEY!);
    const canonicalDoc = await processor.processDocumentWithCaching(rawText);

    const adapter = new CanonicalToTiptapAdapter();
    const tiptapDoc = adapter.transform(canonicalDoc);

    res.status(200).json({
      canonical: canonicalDoc,
      tiptap: tiptapDoc,
    });
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({
      error: "Processing failed",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
```
