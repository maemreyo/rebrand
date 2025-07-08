# DocRebrander Research & Implementation TODO

## 🚀 MATH DOCUMENT EDITOR UPGRADE PROJECT

### **Target**: Transform current Gemini + Tiptap system into complete math document editor using 100% FREE resources

---

## ✅ COMPLETED FOUNDATIONS
- **✅ Phase 1**: Critical Foundation - COMPLETE
- **✅ Phase 2**: Core Services - COMPLETE  
- **✅ Phase 3**: React Components & Hooks - COMPLETE
- **✅ Current Status**: Full document processing pipeline with Gemini AI + Tiptap + PDF export

---

## 🎯 MATH EDITOR IMPLEMENTATION PLAN (10 Days)

### **Phase 1: Foundation Setup (Day 1-2)** ✅

#### **Step 1.1: Research & Dependencies Analysis** ✅
- [x] Research @aarkue/tiptap-math-extension v1.3.6 (FREE community extension)
- [x] Research tiptap-footnotes (FREE Buttondown extension)  
- [x] Research KaTeX integration requirements
- [x] Verify compatibility with existing Tiptap v2.25.0

#### **Step 1.2: Install Required Dependencies** ✅
- [x] Install core math extensions:
  - [x] `pnpm add @aarkue/tiptap-math-extension`
  - [x] `pnpm add katex`
  - [x] `pnpm add tiptap-footnotes`
- [x] Install enhanced formatting:
  - [x] `pnpm add @tiptap/extension-text-align`
  - [x] `pnpm add @tiptap/extension-typography`
  - [x] `pnpm add @tiptap/extension-placeholder`
- [x] Verify all dependencies work with existing setup

#### **Step 1.3: Add KaTeX Styles** ✅
- [x] Import KaTeX CSS in globals.css
- [x] Add custom math-specific styles
- [x] Test math rendering setup

### **Phase 2: Update Document Types (Day 3)** ✅

#### **Step 2.1: Enhance `src/types/document.ts`** ✅
- [x] Add MathBlock interface for display equations
- [x] Add FootnoteBlock interface
- [x] Add CitationBlock interface  
- [x] Add MathInlineContent for inline math ($x^2$)
- [x] Add FootnoteReference interface
- [x] Update CanonicalBlock union type
- [x] Update InlineContent union type
- [x] Add validation functions (validateLatex, isMathBlock, etc.)

#### **Step 2.2: Update Zod Schemas** ✅
- [x] Add math-specific schema validation
- [x] Add footnote schema validation
- [x] Update existing validation functions

### **Phase 3: Update Gemini Processing (Day 4)** ✅

#### **Step 3.1: Enhanced Gemini Schema in `src/lib/services/gemini.ts`** ✅
- [x] Add "math", "footnote", "citation" to block type enum
- [x] Add math-specific properties (mathType, latex, numbered)
- [x] Add footnote properties (noteId)
- [x] Add citation properties (citationKey, citationType)

#### **Step 3.2: Enhanced Analysis Prompt** ✅
- [x] Add mathematical expression detection patterns
- [x] Add LaTeX conversion rules
- [x] Add academic structure detection
- [x] Add footnote and citation extraction rules
- [x] Create comprehensive math detection algorithms
- [x] Add fallback strategies for complex content

### **Phase 4: Update Tiptap Adapter (Day 5)**

#### **Step 4.1: Enhance `src/lib/adapters/canonical-to-tiptap.ts`**
- [x] Add transformMath() method for MathBlock
- [x] Add transformFootnote() method  
- [x] Add transformCitation() method
- [x] Add transformMathInline() for inline math
- [x] Add transformFootnoteRef() for footnote references
- [x] Update transformBlock() switch statement
- [x] Update transformInlineContent() method

#### **Step 4.2: Update `src/lib/adapters/tiptap-to-pdfme.ts`**
- [ ] Add math block handling in PDF generation
- [ ] Add footnote handling in PDF generation
- [ ] Test PDF export with math content

### **Phase 5: Math Editor Component (Day 6-7)**

#### **Step 5.1: Create Enhanced Math Editor**
- [ ] Create `src/components/MathEditor.tsx`
- [ ] Configure extensions with MathExtension, Footnotes
- [ ] Setup Document.extend with footnotes support
- [ ] Add KaTeX configuration with macros
- [ ] Add placeholder configuration

#### **Step 5.2: Create Math Toolbar**
- [ ] Create `src/components/MathToolbar.tsx`
- [ ] Add inline math button ($x$)
- [ ] Add display math button ($$x$$)
- [ ] Add symbols dropdown (Greek letters, operators, relations)
- [ ] Add templates dropdown (fractions, integrals, matrices)
- [ ] Add symbol insertion functions

#### **Step 5.3: Create Academic Toolbar**
- [ ] Create `src/components/AcademicToolbar.tsx`
- [ ] Add heading dropdown
- [ ] Add formatting buttons (bold, italic, underline)
- [ ] Add list dropdown
- [ ] Add text alignment buttons
- [ ] Add table insertion
- [ ] Add footnote insertion
- [ ] Add figure insertion
- [ ] Add undo/redo buttons

### **Phase 6: Integration with Current System (Day 8)**

#### **Step 6.1: Update Main Page**
- [ ] Replace existing editor in `src/app/rebrand/page.tsx`
- [ ] Import MathEditor component
- [ ] Update state management for math content
- [ ] Test integration with existing Gemini processing
- [ ] Add export options (JSON, HTML)

#### **Step 6.2: Update API Routes**
- [ ] Verify `src/app/api/analyze/route.ts` works with math content
- [ ] Test math content preservation through pipeline
- [ ] Update export endpoints to handle math properly

### **Phase 7: Testing & Validation (Day 9-10)**

#### **Step 7.1: Math Features Testing**
- [ ] Test inline math rendering ($E = mc^2$)
- [ ] Test display math rendering ($$\int_0^\infty$$)
- [ ] Test Greek letters and symbols
- [ ] Test complex expressions and matrices
- [ ] Test LaTeX error handling
- [ ] Test math in different content blocks

#### **Step 7.2: Academic Features Testing**  
- [ ] Test footnote insertion and numbering
- [ ] Test table creation and editing
- [ ] Test heading hierarchy
- [ ] Test formatting preservation
- [ ] Test undo/redo functionality

#### **Step 7.3: Integration Testing**
- [ ] Test Gemini AI math detection
- [ ] Test math content through full pipeline
- [ ] Test PDF export with math content
- [ ] Test error handling and fallbacks

#### **Step 7.4: Performance Testing**
- [ ] Test with large documents (100+ equations)
- [ ] Test loading performance
- [ ] Test mobile responsiveness
- [ ] Test memory usage

### **Phase 8: Documentation & Deployment (Ongoing)**

#### **Step 8.1: User Guide**
- [ ] Create math input documentation
- [ ] Document academic features
- [ ] Document keyboard shortcuts
- [ ] Create troubleshooting guide

#### **Step 8.2: Production Readiness**
- [ ] Optimize KaTeX loading
- [ ] Add error monitoring
- [ ] Performance optimization
- [ ] Security validation

---

## 🔧 TECHNICAL DECISIONS

### **Math Extensions Choice**
- **Selected**: @aarkue/tiptap-math-extension v1.3.6
- **Reason**: Free, actively maintained, KaTeX-based, good TypeScript support
- **Alternative**: @tiptap-pro/extension-mathematics (paid)

### **Footnotes Extension Choice**  
- **Selected**: tiptap-footnotes (Buttondown)
- **Reason**: Free, well-documented, active community

### **Architecture Approach**
- **Strategy**: Enhance existing system incrementally
- **Goal**: Maintain backward compatibility
- **Priority**: Math rendering > Academic features > Advanced features

---

## 🎯 SUCCESS METRICS

### **Technical Metrics**
- [ ] Math expressions render correctly (99%+ accuracy)
- [ ] Page load time < 3 seconds
- [ ] Support 50+ LaTeX commands  
- [ ] Handle documents with 100+ equations
- [ ] Mobile responsive design

### **User Experience Metrics**
- [ ] Math input workflow < 3 clicks
- [ ] Symbol palette with 100+ symbols
- [ ] Real-time math preview
- [ ] Graceful error handling
- [ ] Academic document structure support

---

## 🚀 IMMEDIATE NEXT STEPS

1. **START**: Install dependencies (Phase 1, Step 1.2)
2. **Research**: Test @aarkue/tiptap-math-extension in isolation
3. **Plan**: Create component architecture diagram
4. **Execute**: Follow 8-phase implementation plan

**ESTIMATED COMPLETION**: 10 days with full math document editor capabilities