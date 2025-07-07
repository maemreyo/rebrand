import { useState, useCallback, useRef } from 'react';
import { JSONContent } from '@tiptap/core';
import { CanonicalDocument } from '@/types/document';
import { PdfTemplate } from '@/types/template';

// =============================================================================
// Hook State Interface
// =============================================================================

interface DocumentProcessingState {
  // Processing states
  isAnalyzing: boolean;
  isGeneratingPdf: boolean;
  isLoadingTemplates: boolean;
  
  // Document data
  rawText: string;
  canonicalDocument: CanonicalDocument | null;
  tiptapContent: JSONContent | null;
  
  // Templates
  templates: PdfTemplate[];
  selectedTemplate: PdfTemplate | null;
  
  // Metadata
  processingMetadata: {
    processingTime?: number;
    textLength?: number;
    blockCount?: number;
    confidenceScore?: number;
  } | null;
  
  // Error handling
  error: string | null;
  lastOperation: string | null;
}

interface DocumentProcessingActions {
  // Text processing
  setRawText: (text: string) => void;
  processText: (text?: string, options?: ProcessingOptions) => Promise<void>;
  clearDocument: () => void;
  
  // Template management
  loadTemplates: () => Promise<void>;
  selectTemplate: (template: PdfTemplate | null) => void;
  
  // PDF generation
  generatePdf: (options?: PdfGenerationOptions) => Promise<void>;
  downloadPdf: (filename?: string) => Promise<void>;
  
  // Content management
  updateTiptapContent: (content: JSONContent) => void;
  
  // Error handling
  clearError: () => void;
  retryLastOperation: () => Promise<void>;
}

interface ProcessingOptions {
  language?: string;
  documentType?: 'report' | 'article' | 'form' | 'contract' | 'other';
  enableFallback?: boolean;
}

interface PdfGenerationOptions {
  templateId?: string;
  filename?: string;
  pageSize?: 'A4' | 'LETTER' | 'A3';
  margin?: number;
  font?: string;
  fontSize?: number;
}

// =============================================================================
// Main Hook
// =============================================================================

export const useDocumentProcessing = (): DocumentProcessingState & DocumentProcessingActions => {
  // State management
  const [state, setState] = useState<DocumentProcessingState>({
    isAnalyzing: false,
    isGeneratingPdf: false,
    isLoadingTemplates: false,
    rawText: '',
    canonicalDocument: null,
    tiptapContent: null,
    templates: [],
    selectedTemplate: null,
    processingMetadata: null,
    error: null,
    lastOperation: null,
  });

  // Refs for retry functionality
  const lastOperationRef = useRef<{
    operation: string;
    args: any[];
  } | null>(null);

  // =============================================================================
  // Text Processing Actions
  // =============================================================================

  const setRawText = useCallback((text: string) => {
    setState(prev => ({
      ...prev,
      rawText: text,
      error: null,
    }));
  }, []);

  const processText = useCallback(async (text?: string, options?: ProcessingOptions) => {
    const textToProcess = text || state.rawText;
    
    if (!textToProcess.trim()) {
      setState(prev => ({
        ...prev,
        error: 'Please enter some text to process',
      }));
      return;
    }

    // Store operation for retry
    lastOperationRef.current = {
      operation: 'processText',
      args: [textToProcess, options],
    };

    setState(prev => ({
      ...prev,
      isAnalyzing: true,
      error: null,
      lastOperation: 'processText',
    }));

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: textToProcess,
          options: options || {},
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Analysis failed');
      }

      setState(prev => ({
        ...prev,
        canonicalDocument: result.data.canonical,
        tiptapContent: result.data.tiptap,
        processingMetadata: result.data.metadata,
        rawText: textToProcess,
        isAnalyzing: false,
        error: null,
      }));

    } catch (error) {
      console.error('Document processing failed:', error);
      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        error: error instanceof Error ? error.message : 'Failed to process document',
      }));
    }
  }, [state.rawText]);

  const clearDocument = useCallback(() => {
    setState(prev => ({
      ...prev,
      rawText: '',
      canonicalDocument: null,
      tiptapContent: null,
      processingMetadata: null,
      error: null,
      lastOperation: null,
    }));
    lastOperationRef.current = null;
  }, []);

  // =============================================================================
  // Template Management Actions
  // =============================================================================

  const loadTemplates = useCallback(async () => {
    setState(prev => ({
      ...prev,
      isLoadingTemplates: true,
      error: null,
      lastOperation: 'loadTemplates',
    }));

    // Store operation for retry
    lastOperationRef.current = {
      operation: 'loadTemplates',
      args: [],
    };

    try {
      const response = await fetch('/api/templates');

      if (!response.ok) {
        throw new Error(`Failed to load templates: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to load templates');
      }

      setState(prev => ({
        ...prev,
        templates: result.data || [],
        isLoadingTemplates: false,
        error: null,
      }));

    } catch (error) {
      console.error('Template loading failed:', error);
      setState(prev => ({
        ...prev,
        isLoadingTemplates: false,
        error: error instanceof Error ? error.message : 'Failed to load templates',
      }));
    }
  }, []);

  const selectTemplate = useCallback((template: PdfTemplate | null) => {
    setState(prev => ({
      ...prev,
      selectedTemplate: template,
      error: null,
    }));
  }, []);

  // =============================================================================
  // PDF Generation Actions
  // =============================================================================

  const generatePdf = useCallback(async (options?: PdfGenerationOptions) => {
    if (!state.tiptapContent) {
      setState(prev => ({
        ...prev,
        error: 'No document content to export. Please process some text first.',
      }));
      return;
    }

    // Store operation for retry
    lastOperationRef.current = {
      operation: 'generatePdf',
      args: [options],
    };

    setState(prev => ({
      ...prev,
      isGeneratingPdf: true,
      error: null,
      lastOperation: 'generatePdf',
    }));

    try {
      const requestBody = {
        tiptapJson: state.tiptapContent,
        templateId: options?.templateId || state.selectedTemplate?.id,
        options: {
          filename: options?.filename || 'document.pdf',
          pageSize: options?.pageSize || 'A4',
          margin: options?.margin || 20,
          font: options?.font || 'NotoSansCJK-Regular',
          fontSize: options?.fontSize || 12,
        },
      };

      const response = await fetch('/api/export-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `PDF generation failed: ${response.statusText}`);
      }

      // Get PDF blob
      const pdfBlob = await response.blob();
      
      // Create download link
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = options?.filename || 'document.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setState(prev => ({
        ...prev,
        isGeneratingPdf: false,
        error: null,
      }));

    } catch (error) {
      console.error('PDF generation failed:', error);
      setState(prev => ({
        ...prev,
        isGeneratingPdf: false,
        error: error instanceof Error ? error.message : 'Failed to generate PDF',
      }));
    }
  }, [state.tiptapContent, state.selectedTemplate]);

  const downloadPdf = useCallback(async (filename?: string) => {
    await generatePdf({ filename });
  }, [generatePdf]);

  // =============================================================================
  // Content Management Actions
  // =============================================================================

  const updateTiptapContent = useCallback((content: JSONContent) => {
    setState(prev => ({
      ...prev,
      tiptapContent: content,
      error: null,
    }));
  }, []);

  // =============================================================================
  // Error Handling Actions
  // =============================================================================

  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null,
    }));
  }, []);

  const retryLastOperation = useCallback(async () => {
    if (!lastOperationRef.current) {
      setState(prev => ({
        ...prev,
        error: 'No operation to retry',
      }));
      return;
    }

    const { operation, args } = lastOperationRef.current;

    switch (operation) {
      case 'processText':
        await processText(...args);
        break;
      case 'loadTemplates':
        await loadTemplates();
        break;
      case 'generatePdf':
        await generatePdf(...args);
        break;
      default:
        setState(prev => ({
          ...prev,
          error: 'Unknown operation to retry',
        }));
    }
  }, [processText, loadTemplates, generatePdf]);

  // =============================================================================
  // Return Hook Interface
  // =============================================================================

  return {
    // State
    ...state,
    
    // Actions
    setRawText,
    processText,
    clearDocument,
    loadTemplates,
    selectTemplate,
    generatePdf,
    downloadPdf,
    updateTiptapContent,
    clearError,
    retryLastOperation,
  };
};

// =============================================================================
// Utility Hooks
// =============================================================================

/**
 * Hook for managing processing progress
 */
export const useProcessingProgress = () => {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'processing' | 'complete' | 'error'>('idle');

  const startProgress = useCallback(() => {
    setStatus('processing');
    setProgress(0);
    
    // Simulate progress
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return prev;
        }
        return prev + Math.random() * 10;
      });
    }, 200);

    return () => clearInterval(interval);
  }, []);

  const completeProgress = useCallback(() => {
    setProgress(100);
    setStatus('complete');
  }, []);

  const errorProgress = useCallback(() => {
    setStatus('error');
  }, []);

  const resetProgress = useCallback(() => {
    setProgress(0);
    setStatus('idle');
  }, []);

  return {
    progress,
    status,
    startProgress,
    completeProgress,
    errorProgress,
    resetProgress,
  };
};

/**
 * Hook for debounced text processing
 */
export const useDebouncedProcessing = (delay: number = 1000) => {
  const [debouncedText, setDebouncedText] = useState('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateText = useCallback((text: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setDebouncedText(text);
    }, delay);
  }, [delay]);

  return {
    debouncedText,
    updateText,
  };
};