// src/components/MathEditor.tsx
// FIXED: 2025-07-08 - Corrected @aarkue/tiptap-math-extension usage

'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useEditor, EditorContent, JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { MathExtension } from '@aarkue/tiptap-math-extension';
import TextAlign from '@tiptap/extension-text-align';
import Typography from '@tiptap/extension-typography';
import Placeholder from '@tiptap/extension-placeholder';
import { cn } from '@/lib/utils';
import 'katex/dist/katex.min.css';

// =============================================================================
// FIXED: Correct Types and Interfaces
// =============================================================================

export interface MathEditorProps {
  content?: JSONContent;
  onUpdate?: (content: JSONContent) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder?: string;
  editable?: boolean;
  className?: string;
  errorHandler?: (error: Error) => void;
  maxLength?: number;
  autofocus?: boolean;
}

export interface MathEditorRef {
  focus: () => void;
  blur: () => void;
  getContent: () => JSONContent;
  setContent: (content: JSONContent) => void;
  insertMath: (latex: string, display?: boolean) => void;
  insertSymbol: (symbol: string) => void;
  clear: () => void;
  isEditable: () => boolean;
  setEditable: (editable: boolean) => void;
}

export interface EditorError {
  type: 'math' | 'general' | 'validation';
  message: string;
  details?: any;
  timestamp: Date;
}

// =============================================================================
// FIXED: Math Editor Component
// =============================================================================

export const MathEditor = React.forwardRef<MathEditorRef, MathEditorProps>(
  (
    {
      content,
      onUpdate,
      onFocus,
      onBlur,
      placeholder = 'Start writing... Use $ for inline math like $E=mc^2$ or $$ for display math',
      editable = true,
      className,
      errorHandler,
      maxLength,
      autofocus = false,
    },
    ref
  ) => {
    // =============================================================================
    // State Management
    // =============================================================================

    const [isReady, setIsReady] = useState(false);
    const [errors, setErrors] = useState<EditorError[]>([]);
    const [mathCount, setMathCount] = useState({ inline: 0, display: 0 });
    const [wordCount, setWordCount] = useState(0);

    // =============================================================================
    // FIXED: Correct Editor Configuration
    // =============================================================================

    const editor = useEditor({
      extensions: [
        // Core extensions
        StarterKit,

        // FIXED: Correct MathExtension configuration
        MathExtension.configure({
          addInlineMath: true, // Enable inlineMath node type
          evaluation: false, // Disable evaluation for now
          delimiters: 'dollar', // Use $ and $$ delimiters
          katexOptions: {
            throwOnError: false,
            errorColor: '#cc0000',
            strict: 'warn',
            trust: false,
            macros: {
              // Common mathematical macros
              '\\RR': '\\mathbb{R}',
              '\\NN': '\\mathbb{N}',
              '\\ZZ': '\\mathbb{Z}',
              '\\QQ': '\\mathbb{Q}',
              '\\CC': '\\mathbb{C}',
              '\\diff': '\\mathrm{d}',
              '\\euler': '\\mathrm{e}',
              '\\imaginary': '\\mathrm{i}',
            },
          },
          renderTextMode: 'raw-latex',
        }),

        // Enhanced formatting extensions
        TextAlign.configure({
          types: ['heading', 'paragraph'],
          alignments: ['left', 'center', 'right', 'justify'],
          defaultAlignment: 'left',
        }),

        Typography.configure({
          openDoubleQuote: '"',
          closeDoubleQuote: '"',
          openSingleQuote: '\'',
          closeSingleQuote: '\'',
          emDash: '—',
          ellipsis: '…',
          oneHalf: '½',
          oneQuarter: '¼',
          threeQuarters: '¾',
          plusMinus: '±',
          notEqual: '≠',
          multiplication: '×',
          superscriptTwo: '²',
          superscriptThree: '³',
        }),

        Placeholder.configure({
          placeholder: ({ node }) => {
            if (node.type.name === 'heading') {
              return 'Enter a heading...';
            }
            return placeholder;
          },
          includeChildren: true,
          showOnlyWhenEditable: true,
          showOnlyCurrent: false,
        }),
      ],

      // FIXED: Proper content initialization
      content: content || {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [],
          },
        ],
      },

      editable,
      autofocus,

      // FIXED: Prevent infinite loops in event handlers
      onUpdate: ({ editor }) => {
        try {
          const json = editor.getJSON();
          updateStats(json);
          // Use setTimeout to prevent infinite loops
          setTimeout(() => {
            onUpdate?.(json);
          }, 0);
        } catch (error) {
          handleError('general', 'Failed to update editor content', error);
        }
      },

      onFocus: () => {
        onFocus?.();
      },

      onBlur: () => {
        onBlur?.();
      },

      onCreate: ({ editor }) => {
        setIsReady(true);
        try {
          updateStats(editor.getJSON());
        } catch (error) {
          handleError('general', 'Failed to initialize editor', error);
        }
      },

      onDestroy: () => {
        setIsReady(false);
      },

      // FIXED: Better error handling
      onTransaction: ({ transaction }) => {
        if (transaction.docChanged && maxLength) {
          const textLength = editor?.storage.characterCount?.characters() || 0;
          if (textLength > maxLength) {
            handleError('validation', `Document exceeds maximum length of ${maxLength} characters`, {
              currentLength: textLength,
              maxLength,
            });
          }
        }
      },
    });

    // =============================================================================
    // Error Handling Functions
    // =============================================================================

    const handleError = useCallback((type: EditorError['type'], message: string, details?: any) => {
      const error: EditorError = {
        type,
        message,
        details,
        timestamp: new Date(),
      };
      
      setErrors(prev => [...prev.slice(-4), error]); // Keep last 5 errors
      errorHandler?.(new Error(message));
    }, [errorHandler]);

    const clearErrors = useCallback(() => {
      setErrors([]);
    }, []);

    // =============================================================================
    // Statistics and Analytics
    // =============================================================================

    const updateStats = useCallback((json: JSONContent) => {
      try {
        let inlineMath = 0;
        let displayMath = 0;
        let words = 0;

        const traverse = (node: JSONContent) => {
          // FIXED: Count correct node types from @aarkue/tiptap-math-extension
          if (node.type === 'inlineMath') {
            inlineMath++;
          }

          if (node.type === 'text' && node.text) {
            words += node.text.split(/\s+/).filter(Boolean).length;
            
            // Count $$ patterns in text for display math
            const displayMathMatches = node.text.match(/\$\$[^$]*\$\$/g);
            if (displayMathMatches) {
              displayMath += displayMathMatches.length;
            }
          }

          if (node.content) {
            node.content.forEach(traverse);
          }
        };

        traverse(json);

        setMathCount({ inline: inlineMath, display: displayMath });
        setWordCount(words);
      } catch (error) {
        handleError('general', 'Failed to update statistics', error);
      }
    }, [handleError]);

    // =============================================================================
    // FIXED: Imperative Handle with Correct Math Insertion
    // =============================================================================

    React.useImperativeHandle(ref, () => ({
      focus: () => editor?.commands.focus(),
      blur: () => editor?.commands.blur(),
      getContent: () => editor?.getJSON() || { type: 'doc', content: [] },
      setContent: (content: JSONContent) => {
        try {
          editor?.commands.setContent(content);
        } catch (error) {
          handleError('general', 'Failed to set content', error);
        }
      },
      
      // FIXED: Correct math insertion method
      insertMath: (latex: string, display = false) => {
        try {
          if (!editor) return;
          
          // FIXED: Insert text with proper delimiters
          const mathText = display ? `$$${latex}$$` : `$${latex}$`;
          editor.chain().focus().insertContent(mathText).run();
        } catch (error) {
          handleError('math', 'Failed to insert math', { latex, display, error });
        }
      },
      
      insertSymbol: (symbol: string) => {
        try {
          editor?.chain().focus().insertContent(symbol).run();
        } catch (error) {
          handleError('general', 'Failed to insert symbol', { symbol, error });
        }
      },
      
      clear: () => {
        try {
          editor?.commands.clearContent();
          clearErrors();
        } catch (error) {
          handleError('general', 'Failed to clear content', error);
        }
      },
      
      isEditable: () => editor?.isEditable ?? false,
      setEditable: (editable: boolean) => {
        try {
          editor?.setEditable(editable);
        } catch (error) {
          handleError('general', 'Failed to set editable state', { editable, error });
        }
      },
    }), [editor, clearErrors, handleError]);

    // =============================================================================
    // FIXED: Keyboard Shortcuts
    // =============================================================================

    useEffect(() => {
      if (!editor) return;

      const handleKeyDown = (event: KeyboardEvent) => {
        try {
          // Ctrl/Cmd + M for inline math
          if ((event.ctrlKey || event.metaKey) && event.key === 'm' && !event.shiftKey) {
            event.preventDefault();
            editor.chain().focus().insertContent('$\\text{math}$').run();
            return;
          }

          // Ctrl/Cmd + Shift + M for display math
          if ((event.ctrlKey || event.metaKey) && event.key === 'M' && event.shiftKey) {
            event.preventDefault();
            editor.chain().focus().insertContent('$$\\text{display math}$$').run();
            return;
          }

          // Escape to exit editing
          if (event.key === 'Escape') {
            editor.commands.blur();
            return;
          }
        } catch (error) {
          handleError('general', 'Keyboard shortcut error', error);
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [editor, handleError]);

    // =============================================================================
    // FIXED: Cleanup Effect
    // =============================================================================

    useEffect(() => {
      return () => {
        // Clean up editor instance
        if (editor && !editor.isDestroyed) {
          try {
            editor.destroy();
          } catch (error) {
            console.warn('Error destroying editor:', error);
          }
        }
      };
    }, [editor]);

    // =============================================================================
    // FIXED: Render Methods
    // =============================================================================

    const renderErrorNotification = () => {
      if (errors.length === 0) return null;

      const latestError = errors[errors.length - 1];

      return (
        <div className="mb-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-red-600 dark:text-red-400 text-sm font-medium">
                {latestError.type === 'math' ? '⚠️ Math Error' : '❌ Error'}
              </span>
              <span className="text-red-600 dark:text-red-400 text-sm">
                {latestError.message}
              </span>
            </div>
            <button
              onClick={clearErrors}
              className="text-red-400 hover:text-red-600 text-sm"
            >
              ✕
            </button>
          </div>
        </div>
      );
    };

    const renderStatusBar = () => (
      <div className="flex items-center justify-between p-2 text-xs text-muted-foreground bg-muted/50 border-t border-border">
        <div className="flex items-center space-x-4">
          <span>{wordCount} words</span>
          <span>{mathCount.inline} inline math</span>
          <span>{mathCount.display} display math</span>
          {maxLength && (
            <span className={cn(
              wordCount > maxLength * 0.9 && 'text-orange-500',
              wordCount > maxLength && 'text-red-500 font-medium'
            )}>
              {wordCount}/{maxLength}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {!isReady && <span className="text-blue-500">Loading...</span>}
          {errors.length > 0 && (
            <span className="text-red-500">{errors.length} error(s)</span>
          )}
          <span className={cn(
            'w-2 h-2 rounded-full',
            isReady ? 'bg-green-500' : 'bg-gray-400'
          )} />
        </div>
      </div>
    );

    // =============================================================================
    // FIXED: Main Render
    // =============================================================================

    if (!editor) {
      return (
        <div className="h-64 flex items-center justify-center border border-dashed border-gray-300 rounded-lg">
          <div className="text-center space-y-2">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">Loading math editor...</p>
          </div>
        </div>
      );
    }

    return (
      <div className={cn(
        'math-editor-container border border-border rounded-lg overflow-hidden',
        'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
        className
      )}>
        {/* Error notifications */}
        {renderErrorNotification()}

        {/* FIXED: Editor content with proper styling */}
        <div className="relative">
          <EditorContent 
            editor={editor}
            className={cn(
              'prose prose-sm max-w-none p-4 min-h-[200px] focus:outline-none',
              'prose-headings:mt-4 prose-headings:mb-2',
              'prose-p:my-2',
              'prose-pre:bg-muted prose-pre:border prose-pre:border-border',
              'prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded',
              'dark:prose-invert',
              !editable && 'cursor-default'
            )}
          />

          {/* Loading overlay */}
          {!isReady && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Status bar */}
        {renderStatusBar()}
      </div>
    );
  }
);

MathEditor.displayName = 'MathEditor';

// =============================================================================
// FIXED: Utility Hooks
// =============================================================================

export const useMathEditor = (initialContent?: JSONContent) => {
  const [content, setContent] = useState<JSONContent>(
    initialContent || { type: 'doc', content: [] }
  );
  const [isEditing, setIsEditing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // FIXED: Prevent infinite loops with useCallback
  const handleUpdate = useCallback((newContent: JSONContent) => {
    setContent(prev => {
      // Only update if content actually changed
      if (JSON.stringify(prev) !== JSON.stringify(newContent)) {
        setHasChanges(true);
        return newContent;
      }
      return prev;
    });
  }, []);

  const handleSave = useCallback(() => {
    setHasChanges(false);
    return content;
  }, [content]);

  const handleReset = useCallback(() => {
    setContent(initialContent || { type: 'doc', content: [] });
    setHasChanges(false);
  }, [initialContent]);

  return {
    content,
    setContent,
    isEditing,
    setIsEditing,
    hasChanges,
    onUpdate: handleUpdate,
    onSave: handleSave,
    onReset: handleReset,
  };
};

// =============================================================================
// FIXED: Math Validation Hook
// =============================================================================

export const useMathValidation = () => {
  const [errors, setErrors] = useState<string[]>([]);

  const validateLatex = useCallback((latex: string): boolean => {
    try {
      if (!latex.trim()) {
        setErrors(['Empty LaTeX expression']);
        return false;
      }
      
      // Check balanced braces
      let braceCount = 0;
      for (const char of latex) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
        if (braceCount < 0) {
          setErrors(['Unmatched closing brace']);
          return false;
        }
      }
      
      if (braceCount !== 0) {
        setErrors(['Unmatched opening brace']);
        return false;
      }

      setErrors([]);
      return true;
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'Unknown validation error']);
      return false;
    }
  }, []);

  const clearErrors = useCallback(() => setErrors([]), []);

  return { validateLatex, errors, clearErrors };
};

// =============================================================================
// Export Types
// =============================================================================

// export type { MathEditorProps, MathEditorRef, EditorError };