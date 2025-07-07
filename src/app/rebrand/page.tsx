"use client";

import React, { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';

import { useDocumentProcessing } from '@/hooks/useDocumentProcessing';
import { PdfUpload } from '@/components/PdfUpload';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';

import { 
  FileText, 
  Zap, 
  Download, 
  Settings, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2,
  Upload,
  Eye,
  Loader2
} from 'lucide-react';

// =============================================================================
// Main Component
// =============================================================================

export default function RebrandPage() {
  const {
    // State
    isAnalyzing,
    isGeneratingPdf,
    isLoadingTemplates,
    rawText,
    canonicalDocument,
    tiptapContent,
    templates,
    selectedTemplate,
    processingMetadata,
    error,
    lastOperation,
    
    // Actions
    setRawText,
    processText,
    clearDocument,
    loadTemplates,
    selectTemplate,
    generatePdf,
    updateTiptapContent,
    clearError,
    retryLastOperation,
  } = useDocumentProcessing();

  // Local state for UI
  const [activeTab, setActiveTab] = useState<'input' | 'editor' | 'preview'>('input');
  const [inputMode, setInputMode] = useState<'text' | 'pdf'>('text');
  const [processingOptions, setProcessingOptions] = useState({
    language: 'en',
    documentType: 'other' as const,
    enableFallback: true,
  });
  const [pdfOptions, setPdfOptions] = useState({
    filename: 'document.pdf',
    pageSize: 'A4' as const,
    margin: 20,
    font: 'NotoSansCJK-Regular',
    fontSize: 12,
  });

  // Tiptap editor setup
  const editor = useEditor({
    extensions: [
      StarterKit,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Image,
      Link.configure({
        openOnClick: false,
      }),
    ],
    content: tiptapContent,
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      updateTiptapContent(json);
    },
    editable: !!tiptapContent,
  });

  // Effects
  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    if (editor && tiptapContent) {
      editor.commands.setContent(tiptapContent);
      if (activeTab === 'input') {
        setActiveTab('editor');
      }
    }
  }, [editor, tiptapContent, activeTab]);

  // =============================================================================
  // Event Handlers
  // =============================================================================

  const handleProcessText = async () => {
    if (!rawText.trim()) return;
    await processText(rawText, processingOptions);
  };

  const handlePdfTextExtracted = async (text: string, metadata?: any) => {
    // Set the extracted text
    setRawText(text);
    
    // Auto-process the extracted text
    await processText(text, processingOptions);
    
    // Switch to editor tab
    setActiveTab('editor');
  };

  const handlePdfError = (error: string) => {
    // Error is handled by the PdfUpload component
    console.error('PDF upload error:', error);
  };

  const handleGeneratePdf = async () => {
    await generatePdf({
      templateId: selectedTemplate?.id,
      ...pdfOptions,
    });
  };

  const handleClearAll = () => {
    clearDocument();
    setActiveTab('input');
    setInputMode('text');
    if (editor) {
      editor.commands.clearContent();
    }
  };

  // =============================================================================
  // Render Functions
  // =============================================================================

  const renderProcessingProgress = () => {
    if (!isAnalyzing && !isGeneratingPdf) return null;

    return (
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            <div className="flex-1">
              <p className="text-sm font-medium">
                {isAnalyzing && 'Analyzing document with AI...'}
                {isGeneratingPdf && 'Generating PDF...'}
              </p>
              <Progress value={45} className="mt-2" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderError = () => {
    if (!error) return null;

    return (
      <Card className="mb-6 border-destructive">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-4">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">Error</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
              <div className="flex space-x-2 mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={retryLastOperation}
                  disabled={!lastOperation}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
                <Button size="sm" variant="ghost" onClick={clearError}>
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderMetadata = () => {
    if (!processingMetadata) return null;

    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm">Processing Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Processing Time</p>
              <p className="font-medium">{processingMetadata.processingTime}ms</p>
            </div>
            <div>
              <p className="text-muted-foreground">Text Length</p>
              <p className="font-medium">{processingMetadata.textLength} chars</p>
            </div>
            <div>
              <p className="text-muted-foreground">Blocks Found</p>
              <p className="font-medium">{processingMetadata.blockCount}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Confidence</p>
              <Badge variant={processingMetadata.confidenceScore > 0.8 ? 'default' : 'secondary'}>
                {Math.round((processingMetadata.confidenceScore || 0) * 100)}%
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderInputTab = () => (
    <div className="space-y-6">
      {/* Input Mode Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Choose Input Method
          </CardTitle>
          <CardDescription>
            Select how you want to provide your document content
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            <Button
              variant={inputMode === 'text' ? 'default' : 'outline'}
              onClick={() => setInputMode('text')}
              className="flex-1"
            >
              <FileText className="h-4 w-4 mr-2" />
              Paste Text
            </Button>
            <Button
              variant={inputMode === 'pdf' ? 'default' : 'outline'}
              onClick={() => setInputMode('pdf')}
              className="flex-1"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Text Input Mode */}
      {inputMode === 'text' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Paste Your Text
            </CardTitle>
            <CardDescription>
              Paste your raw text here. Our AI will analyze and structure it automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Paste your document text here..."
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={12}
              className="min-h-[300px]"
            />
            
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="document-type">Document Type</Label>
                <Select
                  value={processingOptions.documentType}
                  onValueChange={(value: any) => 
                    setProcessingOptions(prev => ({ ...prev, documentType: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="report">Report</SelectItem>
                    <SelectItem value="article">Article</SelectItem>
                    <SelectItem value="form">Form</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex-1">
                <Label htmlFor="language">Language</Label>
                <Select
                  value={processingOptions.language}
                  onValueChange={(value) => 
                    setProcessingOptions(prev => ({ ...prev, language: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="vi">Vietnamese</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="enable-fallback"
                checked={processingOptions.enableFallback}
                onCheckedChange={(checked) =>
                  setProcessingOptions(prev => ({ ...prev, enableFallback: checked }))
                }
              />
              <Label htmlFor="enable-fallback">Enable fallback processing</Label>
            </div>

            <div className="flex space-x-2">
              <Button
                onClick={handleProcessText}
                disabled={!rawText.trim() || isAnalyzing}
                className="flex-1"
              >
                {isAnalyzing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                Process Text with AI
              </Button>
              
              {(canonicalDocument || tiptapContent) && (
                <Button variant="outline" onClick={handleClearAll}>
                  Clear All
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* PDF Upload Mode */}
      {inputMode === 'pdf' && (
        <PdfUpload
          onTextExtracted={handlePdfTextExtracted}
          onError={handlePdfError}
          disabled={isAnalyzing}
        />
      )}

      {/* Processing Options for PDF Mode */}
      {inputMode === 'pdf' && rawText && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Processing Options</CardTitle>
            <CardDescription>
              Configure how the extracted text should be processed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="document-type-pdf">Document Type</Label>
                <Select
                  value={processingOptions.documentType}
                  onValueChange={(value: any) => 
                    setProcessingOptions(prev => ({ ...prev, documentType: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="report">Report</SelectItem>
                    <SelectItem value="article">Article</SelectItem>
                    <SelectItem value="form">Form</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex-1">
                <Label htmlFor="language-pdf">Language</Label>
                <Select
                  value={processingOptions.language}
                  onValueChange={(value) => 
                    setProcessingOptions(prev => ({ ...prev, language: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="vi">Vietnamese</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="enable-fallback-pdf"
                checked={processingOptions.enableFallback}
                onCheckedChange={(checked) =>
                  setProcessingOptions(prev => ({ ...prev, enableFallback: checked }))
                }
              />
              <Label htmlFor="enable-fallback-pdf">Enable fallback processing</Label>
            </div>

            <Button
              onClick={handleProcessText}
              disabled={!rawText.trim() || isAnalyzing}
              className="w-full"
            >
              {isAnalyzing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              Process Extracted Text with AI
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderEditorTab = () => {
    if (!editor || !tiptapContent) {
      return (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Process some text first to access the editor
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Rich Text Editor
          </CardTitle>
          <CardDescription>
            Edit your structured document. Changes are automatically saved.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            {/* Editor Toolbar */}
            <div className="border-b p-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={editor.isActive('bold') ? 'default' : 'outline'}
                onClick={() => editor.chain().focus().toggleBold().run()}
              >
                <strong>B</strong>
              </Button>
              <Button
                size="sm"
                variant={editor.isActive('italic') ? 'default' : 'outline'}
                onClick={() => editor.chain().focus().toggleItalic().run()}
              >
                <em>I</em>
              </Button>
              <Button
                size="sm"
                variant={editor.isActive('heading', { level: 1 }) ? 'default' : 'outline'}
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              >
                H1
              </Button>
              <Button
                size="sm"
                variant={editor.isActive('heading', { level: 2 }) ? 'default' : 'outline'}
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              >
                H2
              </Button>
              <Button
                size="sm"
                variant={editor.isActive('bulletList') ? 'default' : 'outline'}
                onClick={() => editor.chain().focus().toggleBulletList().run()}
              >
                •List
              </Button>
              <Button
                size="sm"
                variant={editor.isActive('orderedList') ? 'default' : 'outline'}
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
              >
                1.List
              </Button>
            </div>
            
            {/* Editor Content */}
            <div className="p-4 min-h-[400px]">
              <EditorContent editor={editor} />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderPreviewTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            PDF Export Settings
          </CardTitle>
          <CardDescription>
            Configure your PDF output settings and download options.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="filename">Filename</Label>
              <Input
                id="filename"
                value={pdfOptions.filename}
                onChange={(e) => setPdfOptions(prev => ({ ...prev, filename: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="page-size">Page Size</Label>
              <Select
                value={pdfOptions.pageSize}
                onValueChange={(value: any) => 
                  setPdfOptions(prev => ({ ...prev, pageSize: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A4">A4</SelectItem>
                  <SelectItem value="LETTER">Letter</SelectItem>
                  <SelectItem value="A3">A3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="margin">Margin (mm)</Label>
              <Input
                id="margin"
                type="number"
                min="5"
                max="50"
                value={pdfOptions.margin}
                onChange={(e) => setPdfOptions(prev => ({ ...prev, margin: parseInt(e.target.value) }))}
              />
            </div>
            
            <div>
              <Label htmlFor="font-size">Font Size</Label>
              <Input
                id="font-size"
                type="number"
                min="8"
                max="24"
                value={pdfOptions.fontSize}
                onChange={(e) => setPdfOptions(prev => ({ ...prev, fontSize: parseInt(e.target.value) }))}
              />
            </div>
          </div>

          {templates.length > 0 && (
            <div>
              <Label htmlFor="template">PDF Template (Optional)</Label>
              <Select
                value={selectedTemplate?.id || 'none'}
                onValueChange={(value) => {
                  const template = value === 'none' ? null : templates.find(t => t.id === value);
                  selectTemplate(template || null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Default Template</SelectItem>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button
            onClick={handleGeneratePdf}
            disabled={!tiptapContent || isGeneratingPdf}
            className="w-full"
            size="lg"
          >
            {isGeneratingPdf ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Generate & Download PDF
          </Button>
        </CardContent>
      </Card>

      {canonicalDocument && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Document Structure Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs bg-muted rounded p-4 overflow-auto max-h-60">
              <pre>{JSON.stringify(canonicalDocument, null, 2)}</pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // =============================================================================
  // Main Render
  // =============================================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Document Rebrander
          </h1>
          <p className="text-muted-foreground">
            Transform raw text into beautiful, structured documents with AI
          </p>
        </div>

        {/* Progress and Error Messages */}
        {renderProcessingProgress()}
        {renderError()}
        {renderMetadata()}

        {/* Main Interface */}
        <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="input" className="flex items-center gap-2">
              {inputMode === 'text' ? <FileText className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
              {inputMode === 'text' ? 'Paste Text' : 'Upload PDF'}
            </TabsTrigger>
            <TabsTrigger 
              value="editor" 
              className="flex items-center gap-2"
              disabled={!tiptapContent}
            >
              <FileText className="h-4 w-4" />
              Edit Document
            </TabsTrigger>
            <TabsTrigger 
              value="preview" 
              className="flex items-center gap-2"
              disabled={!tiptapContent}
            >
              <Download className="h-4 w-4" />
              Export PDF
            </TabsTrigger>
          </TabsList>

          <TabsContent value="input">{renderInputTab()}</TabsContent>
          <TabsContent value="editor">{renderEditorTab()}</TabsContent>
          <TabsContent value="preview">{renderPreviewTab()}</TabsContent>
        </Tabs>
      </div>
    </div>
  );
}