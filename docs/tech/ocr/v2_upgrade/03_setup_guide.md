# OCR v2.0 Installation and Setup Guide

## 1. Install Required Dependencies

Run the following command to install the new dependencies for OCR v2.0:

```bash
pnpm add fast-password-entropy vntk @types/fast-password-entropy
```

### Dependency Details:

- **fast-password-entropy**: `^1.1.1` - Fast entropy calculation for text randomness analysis
- **vntk**: `^1.3.10` - Vietnamese Natural Language Toolkit for syllable/word segmentation
- **@types/fast-password-entropy**: `^1.1.3` - TypeScript definitions

## 2. Updated Package.json

Your package.json should include these new dependencies:

```json
{
  "dependencies": {
    "fast-password-entropy": "^1.1.1",
    "vntk": "^1.3.10",
    "@types/fast-password-entropy": "^1.1.3"
  }
}
```

## 3. Environment Configuration

No additional environment variables are required. The system will gracefully fallback to legacy logic if the new dependencies are not available.

## 4. Feature Flags (Optional)

You can control the OCR v2.0 features through configuration in `/src/types/ocr.ts`:

```typescript
export const OCR_CONFIG = {
  // Enable/disable text validation system
  ENABLE_TEXT_VALIDATION: true,

  // Confidence threshold for OCR triggering
  OCR_TRIGGER_CONFIDENCE_THRESHOLD: 0.5,

  // Vietnamese text analysis thresholds
  MIN_SYLLABLE_DENSITY: 0.05,
  MIN_TEXT_ENTROPY: 1.5,
  MIN_WORD_COUNT: 3,

  // Performance settings
  VALIDATION_TIMEOUT: 5000,
  LOG_VALIDATION_DECISIONS: true,
};
```

## 5. Testing the Installation

### Test with Problematic PDF

1. Create a PDF containing only dots: "......."
2. Upload through the API
3. Verify it triggers OCR (should see logs: "OCR triggered by validation")

### Test with Valid Text PDF

1. Upload a normal text-based PDF
2. Verify it uses text extraction (should see: "Text-based PDF detected via validation")

## 6. Debugging and Monitoring

### Enable Debug Logging

Set `LOG_VALIDATION_DECISIONS: true` in OCR_CONFIG to see detailed validation logs:

```
🔍 [page-1] Validation: confidence=0.000, valid=false, time=15ms
🔍 [page-1] Metrics: chars=50, syllables=0, density=0.0000, entropy=0.00
🔍 [page-1] Reason: Critical: Very low syllable density (0.0000). Likely meaningless content.
```

### API Health Check

Check the enhanced API capabilities:

```bash
curl GET /api/extract-pdf-ocr
```

Response will include OCR v2.0 features:

```json
{
  "version": "2.0.0",
  "features": [
    "Text quality validation",
    "Entropy-based pattern detection",
    "Vietnamese text support",
    "Syllable density analysis"
  ],
  "config": {
    "validation": {
      "enabled": true,
      "confidenceThreshold": 0.5,
      "minSyllableDensity": 0.05
    }
  }
}
```

## 7. Performance Impact

Expected performance impact:

- **Text validation**: +10-50ms per page
- **Memory usage**: Minimal increase
- **API calls**: No additional external calls
- **Overall impact**: <15% processing time increase

## 8. Backward Compatibility

- ✅ Existing API endpoints unchanged
- ✅ Legacy response format maintained
- ✅ Graceful fallback if dependencies unavailable
- ✅ No breaking changes to existing integrations

## 9. Troubleshooting

### Issue: Dependencies not installing

```bash
# Clear pnpm cache and reinstall
pnpm store prune
pnpm install
```

### Issue: vntk build errors (Windows)

```bash
# Install build tools for Windows
npm install -g windows-build-tools
```

### Issue: Validation not working

Check logs for:

```
⚠️ Text validation disabled, using legacy logic
⚠️ vntk not available, using fallback word segmentation
```

### Issue: Performance concerns

Disable validation temporarily:

```typescript
const OCR_CONFIG = {
  ENABLE_TEXT_VALIDATION: false, // Fallback to legacy
};
```

## 10. Migration Steps

1. **Install dependencies** (Step 1)
2. **Deploy new code** (all files provided)
3. **Test with sample PDFs** (problematic and normal)
4. **Monitor performance** (check logs and response times)
5. **Enable full validation** (set `LOG_VALIDATION_DECISIONS: true`)

## 11. Rollback Plan

If issues arise, you can quickly rollback by:

1. Setting `ENABLE_TEXT_VALIDATION: false` in OCR_CONFIG
2. The system will immediately fallback to legacy logic
3. No data loss or API changes required

## 12. Success Metrics

After deployment, you should see:

- ✅ Dots-only PDFs now trigger OCR correctly
- ✅ Valid text PDFs still process quickly
- ✅ Enhanced metadata in API responses
- ✅ Detailed validation logs for debugging
- ✅ Performance impact <15%

## 13. Next Steps

Once OCR v2.0 is stable:

- Consider implementing Phase 2 (ML-based validation)
- Add custom validation rules for specific document types
- Implement validation result caching for performance
- Add webhook notifications for processing results
