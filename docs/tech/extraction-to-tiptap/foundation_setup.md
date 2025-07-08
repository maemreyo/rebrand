# Math Editor Setup Guide - Phase 1: Foundation Setup

## 📋 Current Project Analysis

### ✅ EXISTING TIPTAP DEPENDENCIES
- `@tiptap/pm`: ^2.25.0
- `@tiptap/react`: ^2.25.0
- `@tiptap/starter-kit`: ^2.25.0
- `@tiptap/extension-table`: ^2.25.0
- `@tiptap/extension-table-row`: ^2.25.0
- `@tiptap/extension-table-header`: ^2.25.0
- `@tiptap/extension-table-cell`: ^2.25.0
- `@tiptap/extension-image`: ^2.25.0
- `@tiptap/extension-link`: ^2.25.0

### ✅ KEY FRAMEWORK DEPENDENCIES
- `react`: ^19.0.0
- `next`: 15.3.5
- `@google/genai`: ^1.8.0 (NEW SDK ✅)
- `zod`: ^3.25.74

### 📦 DEPENDENCIES TO INSTALL

```bash
# Core math extensions (FREE)
pnpm add @aarkue/tiptap-math-extension@^1.3.6
pnpm add katex@^0.16.8
pnpm add tiptap-footnotes@^1.0.0

# Enhanced formatting extensions
pnpm add @tiptap/extension-text-align@^2.25.0
pnpm add @tiptap/extension-typography@^2.25.0
pnpm add @tiptap/extension-placeholder@^2.25.0
```

## 🎯 STEP 1.3: Add KaTeX Styles

### Update `src/app/globals.css`

```scss
@import "tailwindcss";
@import "tw-animate-css";

/* Import KaTeX styles for math rendering */
@import 'katex/dist/katex.min.css';

@custom-variant dark (&:is(.dark *));

@theme inline {
  /* existing theme variables... */
}

/* Math-specific styles */
.math-inline {
  display: inline-block;
  padding: 2px 4px;
  margin: 0 1px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 3px;
  font-size: 0.95em;
  transition: background-color 0.2s ease;
}

.math-inline:hover {
  background: rgba(0, 0, 0, 0.1);
}

.math-display {
  display: block;
  margin: 1rem 0;
  padding: 0.5rem;
  text-align: center;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 4px;
  overflow-x: auto;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.math-error {
  color: #dc3545;
  background: rgba(220, 53, 69, 0.1);
  border: 1px solid rgba(220, 53, 69, 0.2);
  border-radius: 4px;
  padding: 4px 8px;
  font-family: monospace;
}

/* Math editor specific styles */
.math-editor-container {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  overflow: hidden;
}

.math-editor-container .ProseMirror {
  outline: none;
  padding: 1rem;
  min-height: 200px;
  line-height: 1.6;
}

.math-editor-container .ProseMirror p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  color: #9ca3af;
  pointer-events: none;
  height: 0;
}

/* Math node decorations */
.Tiptap-mathematics-editor {
  background: rgba(59, 130, 246, 0.1);
  border: 1px dashed #3b82f6;
  border-radius: 4px;
  padding: 2px 4px;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
}

.Tiptap-mathematics-render {
  background: transparent;
  display: inline-block;
}

/* Footnote styles */
.footnote-reference {
  vertical-align: super;
  font-size: 0.8em;
  color: #3b82f6;
  text-decoration: none;
  padding: 0 2px;
}

.footnote-reference:hover {
  background: rgba(59, 130, 246, 0.1);
  border-radius: 2px;
}

ol.footnotes {
  margin-top: 20px;
  padding: 20px 0;
  list-style-type: decimal;
  padding-left: 20px;
}

ol.footnotes:has(li) {
  border-top: 1px solid #e5e7eb;
}

ol.footnotes li {
  margin-bottom: 8px;
  font-size: 0.9em;
  line-height: 1.4;
}

/* Dark mode support */
.dark .math-inline {
  background: rgba(255, 255, 255, 0.1);
}

.dark .math-inline:hover {
  background: rgba(255, 255, 255, 0.15);
}

.dark .math-display {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
}

.dark .math-editor-container {
  border-color: #374151;
  background: #1f2937;
}

.dark .Tiptap-mathematics-editor {
  background: rgba(59, 130, 246, 0.2);
  border-color: #60a5fa;
}

/* Toolbar styles */
.math-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 8px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.dark .math-toolbar {
  background: #374151;
  border-color: #4b5563;
}

.symbol-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 4px;
  padding: 8px;
  max-width: 320px;
}

.symbol-button {
  padding: 4px 8px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  text-align: center;
  transition: all 0.2s ease;
  font-size: 14px;
}

.symbol-button:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
}

.dark .symbol-button {
  background: #4b5563;
  border-color: #6b7280;
  color: white;
}

.dark .symbol-button:hover {
  background: #6b7280;
  border-color: #9ca3af;
}

/* Responsive design */
@media (max-width: 768px) {
  .math-toolbar {
    flex-direction: column;
    gap: 8px;
  }
  
  .symbol-grid {
    grid-template-columns: repeat(6, 1fr);
    max-width: 280px;
  }
  
  .math-display {
    font-size: 0.9em;
    padding: 0.4rem;
  }
}
```

## ✅ VERIFICATION STEPS

### 1. Test KaTeX Import
```bash
# After installing dependencies, test in browser console:
# typeof katex !== 'undefined'
```

### 2. Test Math Extension
```typescript
// Test basic math extension setup
import { MathExtension } from '@aarkue/tiptap-math-extension';
console.log('MathExtension loaded:', MathExtension);
```

### 3. Verify Styles
- Check KaTeX styles load properly
- Test dark mode math rendering
- Verify responsive design

## 📋 NEXT STEPS (Phase 2)

1. **Update document types** (`src/types/document.ts`)
2. **Add math interfaces** (MathBlock, MathInlineContent)
3. **Update Zod schemas** for validation
4. **Test type definitions** with sample content

## 🔧 TROUBLESHOOTING

### Common Issues:
1. **KaTeX CSS not loading**: Ensure import order in globals.css
2. **Math extension errors**: Check Tiptap version compatibility
3. **Style conflicts**: Verify CSS specificity and dark mode variables

### Debug Commands:
```bash
# Check installed versions
pnpm list @aarkue/tiptap-math-extension
pnpm list katex
pnpm list tiptap-footnotes

# Test build
pnpm build
```

---

**Status**: Ready for Phase 2 implementation
**Next**: Update document types and enhance Gemini processing