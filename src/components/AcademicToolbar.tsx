// CREATED: 2025-07-08 - Academic toolbar with formatting, structure, and citation tools

'use client';

import React, { useCallback, useState } from 'react';
import { Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Superscript,
  Subscript,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Quote,
  Table,
  Image,
  Link,
  FileText,
  Hash,
  Undo,
  Redo,
  Type,
  Palette,
  ChevronDown,
  Plus,
  BookOpen,
  NotebookPen,
  FileQuestionMark,
  StickyNote,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// Types and Interfaces
// =============================================================================

export interface AcademicToolbarProps {
  editor: Editor | null;
  className?: string;
  compact?: boolean;
  showLabels?: boolean;
  enableFootnotes?: boolean;
  enableCitations?: boolean;
  enableTables?: boolean;
  onInsertFootnote?: () => void;
  onInsertCitation?: () => void;
  onInsertFigure?: () => void;
  onInsertTable?: (rows: number, cols: number) => void;
}

export interface HeadingLevel {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  label: string;
  description: string;
  fontSize: string;
}

export interface ListType {
  type: 'bulletList' | 'orderedList';
  label: string;
  icon: React.ReactNode;
  description: string;
}

export interface TextColor {
  name: string;
  value: string;
  category: 'basic' | 'semantic' | 'academic';
}

export interface TableSize {
  rows: number;
  cols: number;
  label: string;
  description?: string;
}

// =============================================================================
// Configuration Data
// =============================================================================

const HEADING_LEVELS: HeadingLevel[] = [
  { level: 1, label: 'Title', description: 'Main document title', fontSize: '2xl' },
  { level: 2, label: 'Section', description: 'Major section heading', fontSize: 'xl' },
  { level: 3, label: 'Subsection', description: 'Subsection heading', fontSize: 'lg' },
  { level: 4, label: 'Subsubsection', description: 'Minor heading', fontSize: 'base' },
  { level: 5, label: 'Paragraph', description: 'Paragraph heading', fontSize: 'sm' },
  { level: 6, label: 'Subparagraph', description: 'Small heading', fontSize: 'xs' },
];

const LIST_TYPES: ListType[] = [
  {
    type: 'bulletList',
    label: 'Bullet List',
    icon: <List className="h-4 w-4" />,
    description: 'Unordered list with bullets',
  },
  {
    type: 'orderedList',
    label: 'Numbered List',
    icon: <ListOrdered className="h-4 w-4" />,
    description: 'Ordered list with numbers',
  },
];

const TEXT_COLORS: TextColor[] = [
  // Basic colors
  { name: 'Black', value: '#000000', category: 'basic' },
  { name: 'Gray', value: '#6B7280', category: 'basic' },
  { name: 'Red', value: '#DC2626', category: 'basic' },
  { name: 'Blue', value: '#2563EB', category: 'basic' },
  { name: 'Green', value: '#059669', category: 'basic' },
  { name: 'Orange', value: '#EA580C', category: 'basic' },
  { name: 'Purple', value: '#7C3AED', category: 'basic' },
  
  // Semantic colors
  { name: 'Error', value: '#EF4444', category: 'semantic' },
  { name: 'Warning', value: '#F59E0B', category: 'semantic' },
  { name: 'Success', value: '#10B981', category: 'semantic' },
  { name: 'Info', value: '#3B82F6', category: 'semantic' },
  
  // Academic colors
  { name: 'Citation', value: '#8B5CF6', category: 'academic' },
  { name: 'Highlight', value: '#FCD34D', category: 'academic' },
  { name: 'Note', value: '#06B6D4', category: 'academic' },
];

const TABLE_SIZES: TableSize[] = [
  { rows: 2, cols: 2, label: '2×2', description: 'Small table' },
  { rows: 3, cols: 3, label: '3×3', description: 'Medium table' },
  { rows: 4, cols: 4, label: '4×4', description: 'Large table' },
  { rows: 2, cols: 3, label: '2×3', description: 'Wide table' },
  { rows: 3, cols: 2, label: '3×2', description: 'Tall table' },
  { rows: 1, cols: 5, label: '1×5', description: 'Header row' },
];

// =============================================================================
// AcademicToolbar Component
// =============================================================================

export const AcademicToolbar: React.FC<AcademicToolbarProps> = ({
  editor,
  className,
  compact = false,
  showLabels = true,
  enableFootnotes = true,
  enableCitations = true,
  enableTables = true,
  onInsertFootnote,
  onInsertCitation,
  onInsertFigure,
  onInsertTable,
}) => {
  // =============================================================================
  // State Management
  // =============================================================================

  const [selectedTextColor, setSelectedTextColor] = useState('#000000');

  // =============================================================================
  // Helper Functions
  // =============================================================================

  const isActive = useCallback((name: string, attributes?: Record<string, any>) => {
    if (!editor) return false;
    return attributes 
      ? editor.isActive(name, attributes)
      : editor.isActive(name);
  }, [editor]);

  const canExecute = useCallback((commandName: string) => {
    if (!editor) return false;
    return editor.can().chain().focus()[commandName as keyof typeof editor.commands]();
  }, [editor]);

  // =============================================================================
  // Command Handlers
  // =============================================================================

  const handleHeadingChange = useCallback((level: string) => {
    if (!editor) return;
    
    if (level === 'paragraph') {
      editor.chain().focus().setParagraph().run();
    } else {
      const headingLevel = parseInt(level) as 1 | 2 | 3 | 4 | 5 | 6;
      editor.chain().focus().toggleHeading({ level: headingLevel }).run();
    }
  }, [editor]);

  const handleTextAlign = useCallback((alignment: 'left' | 'center' | 'right' | 'justify') => {
    if (!editor) return;
    editor.chain().focus().setTextAlign(alignment).run();
  }, [editor]);

  const handleListToggle = useCallback((listType: 'bulletList' | 'orderedList') => {
    if (!editor) return;
    
    if (listType === 'bulletList') {
      editor.chain().focus().toggleBulletList().run();
    } else {
      editor.chain().focus().toggleOrderedList().run();
    }
  }, [editor]);

  const handleColorChange = useCallback((color: string) => {
    if (!editor) return;
    setSelectedTextColor(color);
    editor.chain().focus().setColor(color).run();
  }, [editor]);

  const handleTableInsert = useCallback((rows: number, cols: number) => {
    if (!editor) return;
    
    if (onInsertTable) {
      onInsertTable(rows, cols);
    } else {
      editor.chain().focus().insertTable({ 
        rows, 
        cols, 
        withHeaderRow: true 
      }).run();
    }
  }, [editor, onInsertTable]);

  const handleLinkInsert = useCallback(() => {
    if (!editor) return;
    
    const url = window.prompt('Enter URL:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  }, [editor]);

  const handleImageInsert = useCallback(() => {
    if (!editor) return;
    
    if (onInsertFigure) {
      onInsertFigure();
    } else {
      const url = window.prompt('Enter image URL:');
      if (url) {
        editor.chain().focus().setImage({ src: url }).run();
      }
    }
  }, [editor, onInsertFigure]);

  // =============================================================================
  // Current State Getters
  // =============================================================================

  const getCurrentHeading = useCallback(() => {
    if (!editor) return 'paragraph';
    
    for (let level = 1; level <= 6; level++) {
      if (editor.isActive('heading', { level })) {
        return level.toString();
      }
    }
    return 'paragraph';
  }, [editor]);

  const getCurrentAlignment = useCallback(() => {
    if (!editor) return 'left';
    
    if (editor.isActive({ textAlign: 'center' })) return 'center';
    if (editor.isActive({ textAlign: 'right' })) return 'right';
    if (editor.isActive({ textAlign: 'justify' })) return 'justify';
    return 'left';
  }, [editor]);

  // =============================================================================
  // Render Methods
  // =============================================================================

  const renderHeadingSelector = () => (
    <Select value={getCurrentHeading()} onValueChange={handleHeadingChange}>
      <SelectTrigger className={cn("w-32", compact && "w-24 h-8")}>
        <SelectValue placeholder="Style" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="paragraph">
          <div className="flex items-center space-x-2">
            <Type className="h-4 w-4" />
            <span>Paragraph</span>
          </div>
        </SelectItem>
        {HEADING_LEVELS.map(heading => (
          <SelectItem key={heading.level} value={heading.level.toString()}>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-2">
                <Hash className="h-4 w-4" />
                <span>{heading.label}</span>
              </div>
              <Badge variant="outline" className="ml-2 text-xs">
                H{heading.level}
              </Badge>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const renderFormattingButtons = () => (
    <div className="flex items-center space-x-1">
      <Button
        variant={isActive('bold') ? 'default' : 'outline'}
        size={compact ? 'sm' : 'default'}
        onClick={() => editor?.chain().focus().toggleBold().run()}
        disabled={!canExecute('toggleBold')}
        title="Bold (Ctrl+B)"
      >
        <Bold className="h-4 w-4" />
      </Button>
      
      <Button
        variant={isActive('italic') ? 'default' : 'outline'}
        size={compact ? 'sm' : 'default'}
        onClick={() => editor?.chain().focus().toggleItalic().run()}
        disabled={!canExecute('toggleItalic')}
        title="Italic (Ctrl+I)"
      >
        <Italic className="h-4 w-4" />
      </Button>
      
      <Button
        variant={isActive('underline') ? 'default' : 'outline'}
        size={compact ? 'sm' : 'default'}
        onClick={() => editor?.chain().focus().toggleUnderline().run()}
        disabled={!canExecute('toggleUnderline')}
        title="Underline (Ctrl+U)"
      >
        <Underline className="h-4 w-4" />
      </Button>
      
      <Button
        variant={isActive('strike') ? 'default' : 'outline'}
        size={compact ? 'sm' : 'default'}
        onClick={() => editor?.chain().focus().toggleStrike().run()}
        disabled={!canExecute('toggleStrike')}
        title="Strikethrough"
      >
        <Strikethrough className="h-4 w-4" />
      </Button>
      
      <Button
        variant={isActive('code') ? 'default' : 'outline'}
        size={compact ? 'sm' : 'default'}
        onClick={() => editor?.chain().focus().toggleCode().run()}
        disabled={!canExecute('toggleCode')}
        title="Inline Code"
      >
        <Code className="h-4 w-4" />
      </Button>
    </div>
  );

  const renderScriptButtons = () => (
    <div className="flex items-center space-x-1">
      <Button
        variant={isActive('superscript') ? 'default' : 'outline'}
        size={compact ? 'sm' : 'default'}
        onClick={() => editor?.chain().focus().toggleSuperscript().run()}
        disabled={!canExecute('toggleSuperscript')}
        title="Superscript"
      >
        <Superscript className="h-4 w-4" />
      </Button>
      
      <Button
        variant={isActive('subscript') ? 'default' : 'outline'}
        size={compact ? 'sm' : 'default'}
        onClick={() => editor?.chain().focus().toggleSubscript().run()}
        disabled={!canExecute('toggleSubscript')}
        title="Subscript"
      >
        <Subscript className="h-4 w-4" />
      </Button>
    </div>
  );

  const renderAlignmentButtons = () => (
    <div className="flex items-center space-x-1">
      <Button
        variant={getCurrentAlignment() === 'left' ? 'default' : 'outline'}
        size={compact ? 'sm' : 'default'}
        onClick={() => handleTextAlign('left')}
        title="Align Left"
      >
        <AlignLeft className="h-4 w-4" />
      </Button>
      
      <Button
        variant={getCurrentAlignment() === 'center' ? 'default' : 'outline'}
        size={compact ? 'sm' : 'default'}
        onClick={() => handleTextAlign('center')}
        title="Align Center"
      >
        <AlignCenter className="h-4 w-4" />
      </Button>
      
      <Button
        variant={getCurrentAlignment() === 'right' ? 'default' : 'outline'}
        size={compact ? 'sm' : 'default'}
        onClick={() => handleTextAlign('right')}
        title="Align Right"
      >
        <AlignRight className="h-4 w-4" />
      </Button>
      
      <Button
        variant={getCurrentAlignment() === 'justify' ? 'default' : 'outline'}
        size={compact ? 'sm' : 'default'}
        onClick={() => handleTextAlign('justify')}
        title="Justify"
      >
        <AlignJustify className="h-4 w-4" />
      </Button>
    </div>
  );

  const renderListButtons = () => (
    <div className="flex items-center space-x-1">
      <Button
        variant={isActive('bulletList') ? 'default' : 'outline'}
        size={compact ? 'sm' : 'default'}
        onClick={() => handleListToggle('bulletList')}
        title="Bullet List"
      >
        <List className="h-4 w-4" />
      </Button>
      
      <Button
        variant={isActive('orderedList') ? 'default' : 'outline'}
        size={compact ? 'sm' : 'default'}
        onClick={() => handleListToggle('orderedList')}
        title="Numbered List"
      >
        <ListOrdered className="h-4 w-4" />
      </Button>
      
      <Button
        variant={isActive('blockquote') ? 'default' : 'outline'}
        size={compact ? 'sm' : 'default'}
        onClick={() => editor?.chain().focus().toggleBlockquote().run()}
        disabled={!canExecute('toggleBlockquote')}
        title="Blockquote"
      >
        <Quote className="h-4 w-4" />
      </Button>
    </div>
  );

  const renderColorDropdown = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size={compact ? 'sm' : 'default'}
          className="flex items-center space-x-1"
        >
          <Palette className="h-4 w-4" />
          <div 
            className="w-3 h-3 rounded-sm border border-border" 
            style={{ backgroundColor: selectedTextColor }}
          />
          {showLabels && !compact && <ChevronDown className="h-3 w-3" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48">
        {(['basic', 'semantic', 'academic'] as const).map(category => (
          <div key={category}>
            <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase">
              {category}
            </div>
            {TEXT_COLORS.filter(color => color.category === category).map(color => (
              <DropdownMenuItem
                key={color.value}
                onClick={() => handleColorChange(color.value)}
                className="flex items-center space-x-2"
              >
                <div 
                  className="w-4 h-4 rounded border border-border"
                  style={{ backgroundColor: color.value }}
                />
                <span>{color.name}</span>
                {selectedTextColor === color.value && (
                  <Badge variant="secondary" className="ml-auto text-xs">Active</Badge>
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const renderInsertDropdown = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size={compact ? 'sm' : 'default'}
          className="flex items-center space-x-1"
        >
          <Plus className="h-4 w-4" />
          {showLabels && !compact && <span>Insert</span>}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48">
        <DropdownMenuItem onClick={handleLinkInsert}>
          <Link className="h-4 w-4 mr-2" />
          Link
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleImageInsert}>
          <Image className="h-4 w-4 mr-2" />
          Figure/Image
        </DropdownMenuItem>
        
        {enableTables && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Table className="h-4 w-4 mr-2" />
              Table
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {TABLE_SIZES.map(size => (
                <DropdownMenuItem
                  key={`${size.rows}x${size.cols}`}
                  onClick={() => handleTableInsert(size.rows, size.cols)}
                >
                  <div className="flex items-center justify-between w-full">
                    <span>{size.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {size.description}
                    </span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}
        
        <DropdownMenuSeparator />
        
        {enableFootnotes && (
          <DropdownMenuItem onClick={onInsertFootnote}>
            <FootNote className="h-4 w-4 mr-2" />
            Footnote
          </DropdownMenuItem>
        )}
        
        {enableCitations && (
          <DropdownMenuItem onClick={onInsertCitation}>
            <FileQuestionMark className="h-4 w-4 mr-2" />
            Citation
          </DropdownMenuItem>
        )}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={() => editor?.chain().focus().setCodeBlock().run()}
          disabled={!canExecute('setCodeBlock')}
        >
          <Code className="h-4 w-4 mr-2" />
          Code Block
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => editor?.chain().focus().setHorizontalRule().run()}
          disabled={!canExecute('setHorizontalRule')}
        >
          <Separator className="h-4 w-4 mr-2" />
          Horizontal Rule
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const renderUndoRedoButtons = () => (
    <div className="flex items-center space-x-1">
      <Button
        variant="outline"
        size={compact ? 'sm' : 'default'}
        onClick={() => editor?.chain().focus().undo().run()}
        disabled={!canExecute('undo')}
        title="Undo (Ctrl+Z)"
      >
        <Undo className="h-4 w-4" />
      </Button>
      
      <Button
        variant="outline"
        size={compact ? 'sm' : 'default'}
        onClick={() => editor?.chain().focus().redo().run()}
        disabled={!canExecute('redo')}
        title="Redo (Ctrl+Y)"
      >
        <Redo className="h-4 w-4" />
      </Button>
    </div>
  );

  // =============================================================================
  // Main Render
  // =============================================================================

  if (!editor) {
    return (
      <div className={cn(
        'academic-toolbar flex items-center justify-center h-12 bg-muted/50 border-b border-border',
        className
      )}>
        <div className="text-sm text-muted-foreground">Loading toolbar...</div>
      </div>
    );
  }

  return (
    <div className={cn(
      'academic-toolbar flex items-center space-x-2 p-2 bg-muted/50 border-b border-border overflow-x-auto',
      compact && 'py-1 space-x-1',
      className
    )}>
      {/* Document Structure */}
      <div className="flex items-center space-x-2">
        {renderHeadingSelector()}
      </div>
      
      <Separator orientation="vertical" className="h-6" />
      
      {/* Text Formatting */}
      {renderFormattingButtons()}
      
      <Separator orientation="vertical" className="h-6" />
      
      {/* Script Formatting */}
      {renderScriptButtons()}
      
      <Separator orientation="vertical" className="h-6" />
      
      {/* Text Alignment */}
      {renderAlignmentButtons()}
      
      <Separator orientation="vertical" className="h-6" />
      
      {/* Lists and Quotes */}
      {renderListButtons()}
      
      <Separator orientation="vertical" className="h-6" />
      
      {/* Text Color */}
      {renderColorDropdown()}
      
      <Separator orientation="vertical" className="h-6" />
      
      {/* Insert Elements */}
      {renderInsertDropdown()}
      
      <Separator orientation="vertical" className="h-6" />
      
      {/* Undo/Redo */}
      {renderUndoRedoButtons()}
      
      {/* Status Indicator */}
      <div className="ml-auto flex items-center space-x-2">
        <div className="flex items-center space-x-1">
          <div className={cn(
            'w-2 h-2 rounded-full',
            editor.isEditable ? 'bg-green-500' : 'bg-gray-400'
          )} />
          {showLabels && !compact && (
            <span className="text-xs text-muted-foreground">
              {editor.isEditable ? 'Editable' : 'Read-only'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// Utility Hook for Academic Toolbar
// =============================================================================

export const useAcademicToolbar = (editor: Editor | null) => {
  const [currentHeading, setCurrentHeading] = useState('paragraph');
  const [currentAlignment, setCurrentAlignment] = useState('left');
  const [activeFormats, setActiveFormats] = useState<string[]>([]);

  React.useEffect(() => {
    if (!editor) return;

    const updateState = () => {
      // Update heading
      let heading = 'paragraph';
      for (let level = 1; level <= 6; level++) {
        if (editor.isActive('heading', { level })) {
          heading = level.toString();
          break;
        }
      }
      setCurrentHeading(heading);

      // Update alignment
      let alignment = 'left';
      if (editor.isActive({ textAlign: 'center' })) alignment = 'center';
      else if (editor.isActive({ textAlign: 'right' })) alignment = 'right';
      else if (editor.isActive({ textAlign: 'justify' })) alignment = 'justify';
      setCurrentAlignment(alignment);

      // Update active formats
      const formats: string[] = [];
      if (editor.isActive('bold')) formats.push('bold');
      if (editor.isActive('italic')) formats.push('italic');
      if (editor.isActive('underline')) formats.push('underline');
      if (editor.isActive('strike')) formats.push('strike');
      if (editor.isActive('code')) formats.push('code');
      if (editor.isActive('superscript')) formats.push('superscript');
      if (editor.isActive('subscript')) formats.push('subscript');
      setActiveFormats(formats);
    };

    editor.on('selectionUpdate', updateState);
    editor.on('transaction', updateState);

    return () => {
      editor.off('selectionUpdate', updateState);
      editor.off('transaction', updateState);
    };
  }, [editor]);

  return {
    currentHeading,
    currentAlignment,
    activeFormats,
    isActive: (name: string, attributes?: Record<string, any>) =>
      editor?.isActive(name, attributes) ?? false,
    canExecute: (commandName: string) =>
      editor?.can().chain().focus()[commandName as keyof typeof editor.commands]() ?? false,
  };
};

// =============================================================================
// Export Everything
// =============================================================================

export { HEADING_LEVELS, LIST_TYPES, TEXT_COLORS, TABLE_SIZES };
export type { HeadingLevel, ListType, TextColor, TableSize };