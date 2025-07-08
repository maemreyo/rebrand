// src/components/MathDocumentEditor.tsx
// FIXED: 2025-07-08 - Fixed infinite loops, improved editor integration, proper event handling

'use client';

import React, { useCallback, useEffect, useImperativeHandle, useState, useRef } from 'react';
import { JSONContent } from '@tiptap/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calculator, 
  FileText, 
  Download, 
  Save, 
  RefreshCw, 
  AlertCircle,
  CheckCircle2,
  Zap,
  BookOpen,
  Settings,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { MathEditor, MathEditorRef, useMathEditor, useMathValidation } from '@/components/MathEditor';
import { MathToolbar } from '@/components/MathToolbar';
import { AcademicToolbar } from '@/components/AcademicToolbar';
import { cn } from '@/lib/utils';

// =============================================================================
// FIXED: Types and Interfaces
// =============================================================================

export interface MathDocumentEditorProps {
  initialContent?: JSONContent;
  onContentChange?: (content: JSONContent) => void;
  onSave?: (content: JSONContent) => Promise<void>;
  onExport?: (content: JSONContent, format: 'pdf' | 'html' | 'json') => Promise<void>;
  className?: string;
  readonly?: boolean;
  showToolbars?: boolean;
  showMathToolbar?: boolean;
  showAcademicToolbar?: boolean;
  showStatusBar?: boolean;
  autoSave?: boolean;
  autoSaveInterval?: number;
  maxLength?: number;
  placeholder?: string;
  enableFootnotes?: boolean;
  enableCitations?: boolean;
  enableTables?: boolean;
  onError?: (error: Error) => void;
}

export interface MathDocumentEditorRef {
  getContent: () => JSONContent;
  setContent: (content: JSONContent) => void;
  save: () => Promise<void>;
  export: (format: 'pdf' | 'html' | 'json') => Promise<void>;
  insertMath: (mathText: string) => void; // FIXED: Changed from (latex, display) to (mathText)
  insertSymbol: (symbol: string) => void;
  focus: () => void;
  blur: () => void;
  clear: () => void;
  undo: () => void;
  redo: () => void;
  toggleFullscreen: () => void;
}

export interface DocumentStats {
  wordCount: number;
  characterCount: number;
  mathInlineCount: number;
  mathDisplayCount: number;
  footnoteCount: number;
  citationCount: number;
  tableCount: number;
  imageCount: number;
  lastModified: Date;
  hasUnsavedChanges: boolean;
}

export interface EditorSettings {
  showLineNumbers: boolean;
  enableSpellCheck: boolean;
  enableAutoSave: boolean;
  theme: 'light' | 'dark' | 'auto';
  fontSize: 'small' | 'medium' | 'large';
  showMinimap: boolean;
}

// =============================================================================
// FIXED: MathDocumentEditor Component
// =============================================================================

export const MathDocumentEditor = React.forwardRef<MathDocumentEditorRef, MathDocumentEditorProps>(
  (
    {
      initialContent,
      onContentChange,
      onSave,
      onExport,
      className,
      readonly = false,
      showToolbars = true,
      showMathToolbar = true,
      showAcademicToolbar = true,
      showStatusBar = true,
      autoSave = false,
      autoSaveInterval = 30000,
      maxLength,
      placeholder = 'Start writing your mathematical document...',
      enableFootnotes = true,
      enableCitations = true,
      enableTables = true,
      onError,
    },
    ref
  ) => {
    // =============================================================================
    // FIXED: State Management with proper initialization
    // =============================================================================

    const mathEditorRef = useRef<MathEditorRef>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    // FIXED: Initialize stats properly
    const [stats, setStats] = useState<DocumentStats>({
      wordCount: 0,
      characterCount: 0,
      mathInlineCount: 0,
      mathDisplayCount: 0,
      footnoteCount: 0,
      citationCount: 0,
      tableCount: 0,
      imageCount: 0,
      lastModified: new Date(),
      hasUnsavedChanges: false,
    });

    const [settings, setSettings] = useState<EditorSettings>({
      showLineNumbers: false,
      enableSpellCheck: true,
      enableAutoSave: autoSave,
      theme: 'auto',
      fontSize: 'medium',
      showMinimap: false,
    });

    // FIXED: Use math editor hook with proper initial content
    const {
      content,
      setContent,
      hasChanges,
      onUpdate: handleEditorUpdate,
      onSave: handleSave,
      onReset,
    } = useMathEditor(initialContent);

    // Use math validation hook
    const { validateLatex, errors: mathErrors, clearErrors } = useMathValidation();

    // FIXED: Debounce ref to prevent infinite loops
    const updateTimeoutRef = useRef<NodeJS.Timeout>();
    const lastContentRef = useRef<string>('');

    // =============================================================================
    // FIXED: Auto-save Effect with proper dependencies
    // =============================================================================

    useEffect(() => {
      if (!settings.enableAutoSave || !hasChanges || readonly) return;

      const timer = setTimeout(async () => {
        try {
          await handleSaveDocument();
        } catch (error) {
          console.warn('Auto-save failed:', error);
        }
      }, autoSaveInterval);

      return () => clearTimeout(timer);
    }, [hasChanges, settings.enableAutoSave, autoSaveInterval, readonly]); // FIXED: Added proper dependencies

    // =============================================================================
    // FIXED: Content Analysis and Statistics
    // =============================================================================

    const analyzeContent = useCallback((content: JSONContent) => {
      try {
        let wordCount = 0;
        let characterCount = 0;
        let mathInlineCount = 0;
        let mathDisplayCount = 0;
        let footnoteCount = 0;
        let citationCount = 0;
        let tableCount = 0;
        let imageCount = 0;

        const traverse = (node: JSONContent) => {
          // Count different node types
          switch (node.type) {
            case 'inlineMath': // FIXED: Use correct node type from @aarkue/tiptap-math-extension
              mathInlineCount++;
              break;
            case 'footnote':
              footnoteCount++;
              break;
            case 'citation':
              citationCount++;
              break;
            case 'table':
              tableCount++;
              break;
            case 'image':
              imageCount++;
              break;
            case 'text':
              if (node.text) {
                const text = node.text;
                characterCount += text.length;
                wordCount += text.split(/\s+/).filter(Boolean).length;
                
                // FIXED: Count display math from text patterns
                const displayMathMatches = text.match(/\$\$[^$]*\$\$/g);
                if (displayMathMatches) {
                  mathDisplayCount += displayMathMatches.length;
                }
              }
              break;
          }

          // Recursively traverse content
          if (node.content) {
            node.content.forEach(traverse);
          }
        };

        traverse(content);

        return {
          wordCount,
          characterCount,
          mathInlineCount,
          mathDisplayCount,
          footnoteCount,
          citationCount,
          tableCount,
          imageCount,
          lastModified: new Date(),
          hasUnsavedChanges: hasChanges,
        };
      } catch (error) {
        console.error('Failed to analyze content:', error);
        return stats; // Return current stats on error
      }
    }, [hasChanges, stats]);

    // =============================================================================
    // FIXED: Event Handlers with proper debouncing
    // =============================================================================

    const handleContentUpdate = useCallback((newContent: JSONContent) => {
      try {
        // FIXED: Prevent infinite loops with content comparison
        const newContentStr = JSON.stringify(newContent);
        if (newContentStr === lastContentRef.current) {
          return; // Content hasn't actually changed
        }
        lastContentRef.current = newContentStr;

        // FIXED: Debounce updates to prevent rapid firing
        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
        }

        updateTimeoutRef.current = setTimeout(() => {
          setContent(newContent);
          handleEditorUpdate(newContent);
          setStats(analyzeContent(newContent));
          setError(null);
          
          // FIXED: Call onContentChange with debouncing
          if (onContentChange) {
            onContentChange(newContent);
          }
        }, 100); // 100ms debounce
      } catch (error) {
        console.error('Failed to update content:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to update content';
        setError(errorMessage);
        onError?.(error instanceof Error ? error : new Error(errorMessage));
      }
    }, [setContent, handleEditorUpdate, analyzeContent, onContentChange, onError]);

    const handleSaveDocument = useCallback(async () => {
      if (!onSave || isSaving) return;

      setIsSaving(true);
      setError(null);

      try {
        const currentContent = handleSave();
        await onSave(currentContent);
        setLastSaved(new Date());
        setStats(prev => ({ ...prev, hasUnsavedChanges: false }));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to save document';
        setError(errorMessage);
        onError?.(error instanceof Error ? error : new Error(errorMessage));
      } finally {
        setIsSaving(false);
      }
    }, [onSave, isSaving, handleSave, onError]);

    const handleExportDocument = useCallback(async (format: 'pdf' | 'html' | 'json') => {
      if (!onExport || isExporting) return;

      setIsExporting(true);
      setError(null);

      try {
        await onExport(content, format);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : `Failed to export as ${format.toUpperCase()}`;
        setError(errorMessage);
        onError?.(error instanceof Error ? error : new Error(errorMessage));
      } finally {
        setIsExporting(false);
      }
    }, [onExport, isExporting, content, onError]);

    // FIXED: Academic content handlers
    const handleInsertFootnote = useCallback(() => {
      try {
        mathEditorRef.current?.insertSymbol('[^1]');
      } catch (error) {
        console.error('Failed to insert footnote:', error);
      }
    }, []);

    const handleInsertCitation = useCallback(() => {
      try {
        mathEditorRef.current?.insertSymbol('[@citation]');
      } catch (error) {
        console.error('Failed to insert citation:', error);
      }
    }, []);

    const handleInsertFigure = useCallback(() => {
      try {
        const url = window.prompt('Enter image URL:');
        if (url) {
          mathEditorRef.current?.insertSymbol(`![Figure](${url})`);
        }
      } catch (error) {
        console.error('Failed to insert figure:', error);
      }
    }, []);

    const handleInsertTable = useCallback((rows: number, cols: number) => {
      try {
        let tableMarkdown = '\n\n';
        
        // Header row
        tableMarkdown += '|' + Array(cols).fill(' Header ').join('|') + '|\n';
        
        // Separator row
        tableMarkdown += '|' + Array(cols).fill('-----').join('|') + '|\n';
        
        // Data rows
        for (let i = 0; i < rows - 1; i++) {
          tableMarkdown += '|' + Array(cols).fill(' Cell ').join('|') + '|\n';
        }
        
        tableMarkdown += '\n';
        mathEditorRef.current?.insertSymbol(tableMarkdown);
      } catch (error) {
        console.error('Failed to insert table:', error);
      }
    }, []);

    const toggleFullscreen = useCallback(() => {
      setIsFullscreen(prev => !prev);
    }, []);

    const handleErrorDismiss = useCallback(() => {
      setError(null);
      clearErrors();
    }, [clearErrors]);

    // =============================================================================
    // FIXED: Imperative Handle
    // =============================================================================

    useImperativeHandle(ref, () => ({
      getContent: () => content,
      setContent: (newContent: JSONContent) => {
        try {
          setContent(newContent);
          setStats(analyzeContent(newContent));
        } catch (error) {
          console.error('Failed to set content:', error);
        }
      },
      save: handleSaveDocument,
      export: handleExportDocument,
      
      // FIXED: insertMath now takes mathText (with delimiters)
      insertMath: (mathText: string) => {
        try {
          mathEditorRef.current?.insertSymbol(mathText);
        } catch (error) {
          console.error('Failed to insert math:', error);
        }
      },
      
      insertSymbol: (symbol: string) => {
        try {
          mathEditorRef.current?.insertSymbol(symbol);
        } catch (error) {
          console.error('Failed to insert symbol:', error);
        }
      },
      
      focus: () => {
        try {
          mathEditorRef.current?.focus();
        } catch (error) {
          console.error('Failed to focus editor:', error);
        }
      },
      
      blur: () => {
        try {
          mathEditorRef.current?.blur();
        } catch (error) {
          console.error('Failed to blur editor:', error);
        }
      },
      
      clear: () => {
        try {
          mathEditorRef.current?.clear();
          onReset();
        } catch (error) {
          console.error('Failed to clear editor:', error);
        }
      },
      
      undo: () => {
        // Handled by editor internally
      },
      
      redo: () => {
        // Handled by editor internally  
      },
      
      toggleFullscreen,
    }), [content, setContent, analyzeContent, handleSaveDocument, handleExportDocument, onReset, toggleFullscreen]);

    // =============================================================================
    // FIXED: Cleanup Effect
    // =============================================================================

    useEffect(() => {
      return () => {
        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
        }
      };
    }, []);

    // =============================================================================
    // Render Methods
    // =============================================================================

    const renderHeader = () => (
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calculator className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Math Document Editor</CardTitle>
            {readonly && (
              <Badge variant="secondary">Read-only</Badge>
            )}
            {hasChanges && (
              <Badge variant="outline" className="text-orange-600">
                Unsaved changes
              </Badge>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {lastSaved && (
              <span className="text-xs text-muted-foreground">
                Last saved: {lastSaved.toLocaleTimeString()}
              </span>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveDocument}
              disabled={!onSave || isSaving || !hasChanges}
              className="flex items-center space-x-1"
            >
              {isSaving ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>Save</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportDocument('pdf')}
              disabled={!onExport || isExporting}
              className="flex items-center space-x-1"
            >
              {isExporting ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span>Export</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        
        {error && (
          <Alert variant="destructive" className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleErrorDismiss}
                className="h-6 w-6 p-0"
              >
                ×
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </CardHeader>
    );

    const renderToolbars = () => {
      if (!showToolbars) return null;

      return (
        <div className="border-b border-border">
          {showMathToolbar && (
            <MathToolbar
              onInsertMath={(mathText) => mathEditorRef.current?.insertSymbol(mathText)} // FIXED: Use insertSymbol for mathText
              onInsertSymbol={(symbol) => mathEditorRef.current?.insertSymbol(symbol)}
              compact={isFullscreen}
            />
          )}
          
          {showAcademicToolbar && mathEditorRef.current && (
            <AcademicToolbar
              editor={null} // FIXED: Will be handled by MathEditor internally
              compact={isFullscreen}
              enableFootnotes={enableFootnotes}
              enableCitations={enableCitations}
              enableTables={enableTables}
              onInsertFootnote={handleInsertFootnote}
              onInsertCitation={handleInsertCitation}
              onInsertFigure={handleInsertFigure}
              onInsertTable={handleInsertTable}
            />
          )}
        </div>
      );
    };

    const renderStatusBar = () => {
      if (!showStatusBar) return null;

      return (
        <div className="flex items-center justify-between p-2 text-xs text-muted-foreground bg-muted/50 border-t border-border">
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1">
              <FileText className="h-3 w-3" />
              <span>{stats.wordCount} words</span>
            </span>
            
            <span className="flex items-center space-x-1">
              <Calculator className="h-3 w-3" />
              <span>{stats.mathInlineCount + stats.mathDisplayCount} equations</span>
            </span>
            
            {stats.footnoteCount > 0 && (
              <span>{stats.footnoteCount} footnotes</span>
            )}
            
            {stats.citationCount > 0 && (
              <span>{stats.citationCount} citations</span>
            )}
            
            {stats.tableCount > 0 && (
              <span>{stats.tableCount} tables</span>
            )}
            
            {maxLength && (
              <span className={cn(
                stats.characterCount > maxLength * 0.9 && 'text-orange-500',
                stats.characterCount > maxLength && 'text-red-500'
              )}>
                {stats.characterCount}/{maxLength} chars
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {settings.enableAutoSave && (
              <span className="flex items-center space-x-1">
                <Zap className="h-3 w-3" />
                <span>Auto-save</span>
              </span>
            )}
            
            {mathErrors.length > 0 && (
              <span className="text-red-500">{mathErrors.length} math errors</span>
            )}
            
            <span className="flex items-center space-x-1">
              <div className={cn(
                'w-2 h-2 rounded-full',
                readonly ? 'bg-gray-400' : 'bg-green-500'
              )} />
              <span>{readonly ? 'Read-only' : 'Editable'}</span>
            </span>
          </div>
        </div>
      );
    };

    // =============================================================================
    // FIXED: Main Render
    // =============================================================================

    const containerClasses = cn(
      'math-document-editor',
      isFullscreen && 'fixed inset-0 z-50 bg-background',
      className
    );

    return (
      <div className={containerClasses}>
        <Card className={cn('h-full', isFullscreen && 'rounded-none border-0')}>
          {renderHeader()}
          
          {renderToolbars()}
          
          <CardContent className="p-0 flex-1 overflow-hidden">
            <MathEditor
              ref={mathEditorRef}
              content={content}
              onUpdate={handleContentUpdate}
              placeholder={placeholder}
              editable={!readonly}
              maxLength={maxLength}
              errorHandler={onError}
              className="h-full border-0 rounded-none"
            />
          </CardContent>
          
          {renderStatusBar()}
        </Card>
      </div>
    );
  }
);

MathDocumentEditor.displayName = 'MathDocumentEditor';

// =============================================================================
// FIXED: Utility Hook for Math Document Editor
// =============================================================================

export const useMathDocumentEditor = (initialContent?: JSONContent) => {
  const editorRef = useRef<MathDocumentEditorRef>(null);
  const [content, setContent] = useState<JSONContent>(
    initialContent || { type: 'doc', content: [] }
  );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // FIXED: Prevent infinite loops with proper content comparison
  const lastContentRef = useRef<string>('');

  const handleContentChange = useCallback((newContent: JSONContent) => {
    const newContentStr = JSON.stringify(newContent);
    if (newContentStr !== lastContentRef.current) {
      lastContentRef.current = newContentStr;
      setContent(newContent);
      setHasUnsavedChanges(true);
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (editorRef.current) {
      await editorRef.current.save();
      setHasUnsavedChanges(false);
    }
  }, []);

  const insertMath = useCallback((mathText: string) => {
    editorRef.current?.insertMath(mathText);
  }, []);

  const insertSymbol = useCallback((symbol: string) => {
    editorRef.current?.insertSymbol(symbol);
  }, []);

  return {
    editorRef,
    content,
    hasUnsavedChanges,
    onContentChange: handleContentChange,
    onSave: handleSave,
    insertMath,
    insertSymbol,
    focus: () => editorRef.current?.focus(),
    clear: () => editorRef.current?.clear(),
    toggleFullscreen: () => editorRef.current?.toggleFullscreen(),
  };
};

// =============================================================================
// Export Everything
// =============================================================================

// export type { 
//   MathDocumentEditorProps, 
//   MathDocumentEditorRef, 
//   DocumentStats, 
//   EditorSettings 
// };