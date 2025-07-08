# Development Mock Mode for PDF Extraction

## Overview

The PDF extraction API (`/api/extract-pdf-ocr`) supports a development mock mode that allows you to use predefined mock data instead of making actual API calls to Gemini AI. This is useful for:

- **Development without API costs**: Avoid consuming Gemini API credits during development
- **Consistent testing**: Use the same data across different test runs
- **Offline development**: Work without internet connection or API dependencies
- **Performance testing**: Test the frontend with predictable response times

## Setup

### 1. Enable Mock Mode

You can enable mock mode using any of these methods:

**Option A: Using npm scripts (Recommended)**
```bash
# Enable mock mode
pnpm mock:pdf:on

# Disable mock mode
pnpm mock:pdf:off

# Toggle current state
pnpm mock:pdf:toggle
```

**Option B: Manual environment variable**
```bash
# In your .env file
USE_MOCK_PDF_EXTRACTION=true
```

**Option C: Using the toggle script directly**
```bash
# Enable mock mode
node scripts/toggle-mock-pdf.js on

# Disable mock mode
node scripts/toggle-mock-pdf.js off

# Toggle current state
node scripts/toggle-mock-pdf.js toggle

# Check current state
node scripts/toggle-mock-pdf.js
```

### 2. Restart Development Server

After enabling mock mode, restart your development server:

```bash
pnpm dev
```

## How It Works

### Mock Data Source

The mock data is loaded from `data/extract-pdf-response.json`. This file contains a complete, real response from the PDF extraction API, including:

- Extracted text content
- Metadata (file info, processing times, etc.)
- Page-by-page results
- OCR processing information
- Validation statistics

### Conditional Logic

The mock mode only works when:
1. `NODE_ENV=development` (development environment)
2. `USE_MOCK_PDF_EXTRACTION=true` (mock mode enabled)

In production or when mock mode is disabled, the API will always use the real Gemini API.

### Dynamic Metadata

When mock mode is active, the API will:
- Use the mock text content and structure
- Update the filename to match the uploaded file
- Update the file size to match the uploaded file
- Update the processing time to reflect the actual mock response time

## Usage Examples

### Testing the Frontend

1. Enable mock mode:
   ```bash
   pnpm mock:pdf:on
   ```

2. Upload any PDF file through the web interface
3. The API will return the mock data instead of processing the PDF
4. The frontend will receive consistent, predictable data

### Development Workflow

```bash
# Start development with mock mode
pnpm mock:pdf:on
pnpm dev

# Develop and test your frontend changes
# All PDF uploads will use mock data

# When ready to test with real API
pnpm mock:pdf:off
# Restart dev server to apply changes
```

## Mock Data Structure

The mock data follows the same structure as the real API response:

```json
{
  "success": true,
  "data": {
    "text": "Extracted text content...",
    "metadata": {
      "filename": "document.pdf",
      "fileSize": 1473639,
      "pageCount": 4,
      "totalProcessingTime": 25014,
      "textPages": 0,
      "ocrPages": 4,
      "skippedPages": 0,
      "method": "ocr-only",
      "validationEnabled": true,
      "averageConfidence": 0,
      "validationTime": 0,
      "ocrEnabled": true,
      "needsOcr": true,
      "triggerReason": "OCR trigger reason",
      "performanceMetrics": { ... }
    },
    "pageResults": [
      {
        "pageNumber": 1,
        "text": "Page content...",
        "confidence": 1,
        "processingTime": 16985,
        "method": "ocr"
      }
    ],
    "validationStats": { ... }
  }
}
```

## Console Output

When mock mode is active, you'll see these console messages:

```
🔧 [DEV] Development mode detected - attempting to use mock data
🔧 [DEV] Using mock data from extract-pdf-response.json
✅ [DEV] Returning mock data for development
```

When mock mode is disabled or unavailable:

```
⚠️ [DEV] Mock data not available, falling back to normal processing
```

## Benefits

### For Development
- **Faster iteration**: No waiting for API calls
- **Consistent data**: Same response every time
- **Cost savings**: No API usage during development
- **Offline capability**: Work without internet

### For Testing
- **Predictable results**: Test frontend logic with known data
- **Performance testing**: Measure frontend performance without API latency
- **Error handling**: Test error scenarios by modifying mock data

## Customizing Mock Data

To customize the mock data:

1. Edit `data/extract-pdf-response.json`
2. Modify the text content, metadata, or structure as needed
3. Ensure the JSON structure matches the expected API response format
4. Test your changes with mock mode enabled

## Troubleshooting

### Mock Mode Not Working

Check these conditions:
1. Is `NODE_ENV=development`?
2. Is `USE_MOCK_PDF_EXTRACTION=true`?
3. Does `data/extract-pdf-response.json` exist and contain valid JSON?
4. Did you restart the development server after enabling mock mode?

### Console Warnings

- `⚠️ [DEV] Could not load mock data`: Check if the mock data file exists and is valid JSON
- `⚠️ [DEV] Mock data not available`: The system will fall back to normal processing

## Best Practices

1. **Use mock mode for frontend development**: Enable it when working on UI/UX
2. **Disable for API testing**: Turn it off when testing the actual OCR functionality
3. **Keep mock data updated**: Ensure it represents realistic API responses
4. **Test both modes**: Verify your code works with both mock and real data
5. **Don't commit mock mode enabled**: Keep `USE_MOCK_PDF_EXTRACTION=false` in version control

## Commands Reference

```bash
# Enable mock mode
pnpm mock:pdf:on

# Disable mock mode
pnpm mock:pdf:off

# Toggle current state
pnpm mock:pdf:toggle

# Check current state
node scripts/toggle-mock-pdf.js

# Development with mock mode
pnpm mock:pdf:on && pnpm dev
```