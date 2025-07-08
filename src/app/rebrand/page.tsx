// UPDATED: 2025-07-08 - Integrated MathDocumentEditor with existing functionality

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { JSONContent } from "@tiptap/react";

import { useDocumentProcessing } from "@/hooks/useDocumentProcessing";
import {
  MathDocumentEditor,
  MathDocumentEditorRef,
  useMathDocumentEditor,
} from "@/components/MathDocumentEditor";
import { PdfUpload } from "@/components/PdfUpload";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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
  Loader2,
  Calculator,
  BookOpen,
  Sigma,
  Brain,
  FileDown,
  Save,
  RotateCcw,
} from "lucide-react";

// =============================================================================
// Types and Interfaces
// =============================================================================

interface ProcessingOptions {
  language: string;
  documentType:
    | "report"
    | "article"
    | "form"
    | "contract"
    | "other"
    | "academic"
    | "mathematical";
  enableFallback: boolean;
  mathDetection: boolean;
  academicMode: boolean;
}

interface PdfOptions {
  filename: string;
  pageSize: "A4" | "LETTER" | "A3";
  margin: number;
  font: string;
  fontSize: number;
  includeMath: boolean;
  mathRenderer: "text" | "image";
}

interface ExportOptions {
  format: "pdf" | "html" | "json" | "latex";
  includeMetadata: boolean;
  preserveMath: boolean;
}

// =============================================================================
// Main Component
// =============================================================================

export default function RebrandPage() {
  // =============================================================================
  // Document Processing Hook
  // =============================================================================

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

  // =============================================================================
  // Math Document Editor Hook
  // =============================================================================

  const {
    editorRef,
    content: editorContent,
    hasUnsavedChanges,
    onContentChange: handleEditorContentChange,
    onSave: handleEditorSave,
    insertMath,
    insertSymbol,
    focus: focusEditor,
    clear: clearEditor,
    toggleFullscreen,
  } = useMathDocumentEditor(tiptapContent);

  // =============================================================================
  // Local State Management
  // =============================================================================

  const [activeTab, setActiveTab] = useState<"input" | "editor" | "preview">(
    "input"
  );
  const [inputMode, setInputMode] = useState<"text" | "pdf">("text");
  const [showMathDemo, setShowMathDemo] = useState(false);

  const [processingOptions, setProcessingOptions] = useState<ProcessingOptions>(
    {
      language: "en",
      documentType: "mathematical",
      enableFallback: true,
      mathDetection: true,
      academicMode: true,
    }
  );

  const [pdfOptions, setPdfOptions] = useState<PdfOptions>({
    filename: "math-document.pdf",
    pageSize: "A4",
    margin: 20,
    font: "NotoSansCJK-Regular",
    fontSize: 12,
    includeMath: true,
    mathRenderer: "text",
  });

  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: "pdf",
    includeMetadata: true,
    preserveMath: true,
  });

  // =============================================================================
  // Effects
  // =============================================================================

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // Sync processed content with math editor
  useEffect(() => {
    if (tiptapContent && editorRef.current) {
      editorRef.current.setContent(tiptapContent);
      if (activeTab === "input") {
        setActiveTab("editor");
      }
    }
  }, [tiptapContent, activeTab]);

  // Update document processing content when editor changes
  useEffect(() => {
    if (editorContent && editorContent !== tiptapContent) {
      updateTiptapContent(editorContent);
    }
  }, [editorContent, tiptapContent, updateTiptapContent]);

  // =============================================================================
  // Event Handlers
  // =============================================================================

  const handleProcessText = useCallback(async () => {
    if (!rawText.trim()) return;
    await processText(rawText, processingOptions);
  }, [rawText, processText, processingOptions]);

  const handlePdfTextExtracted = useCallback(
    async (text: string, metadata?: any) => {
      setRawText(text);
      // Auto-process if math content detected
      if (
        processingOptions.mathDetection &&
        (text.includes("$") ||
          text.includes("\\") ||
          /[α-ωΑ-Ω∫∑∏∂∇]/.test(text))
      ) {
        await processText(text, {
          ...processingOptions,
          documentType: "mathematical",
        });
      }
    },
    [setRawText, processText, processingOptions]
  );

  const handleSaveDocument = useCallback(async () => {
    try {
      await handleEditorSave();
      // Could also save to backend/database here
    } catch (error) {
      console.error("Failed to save document:", error);
    }
  }, [handleEditorSave]);

  const handleExportDocument = useCallback(
    async (format: "pdf" | "html" | "json" | "latex") => {
      if (!editorContent) return;

      try {
        switch (format) {
          case "pdf":
            await generatePdf(pdfOptions);
            break;
          case "json":
            const jsonData = JSON.stringify(editorContent, null, 2);
            downloadFile(
              jsonData,
              `${pdfOptions.filename.replace(".pdf", ".json")}`,
              "application/json"
            );
            break;
          case "html":
            // Convert to HTML (would need additional conversion logic)
            const htmlContent = `<html><body><div>${JSON.stringify(
              editorContent
            )}</div></body></html>`;
            downloadFile(
              htmlContent,
              `${pdfOptions.filename.replace(".pdf", ".html")}`,
              "text/html"
            );
            break;
          case "latex":
            // Convert to LaTeX (would need additional conversion logic)
            const latexContent = convertToLatex(editorContent);
            downloadFile(
              latexContent,
              `${pdfOptions.filename.replace(".pdf", ".tex")}`,
              "text/plain"
            );
            break;
        }
      } catch (error) {
        console.error(`Failed to export as ${format}:`, error);
      }
    },
    [editorContent, generatePdf, pdfOptions]
  );

  const handleDemoMath = useCallback(() => {
    const demoContent = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Mathematical Document Demo" }],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "This document demonstrates math capabilities. Inline math: ",
            },
            {
              type: "text",
              text: "$E = mc^2$",
              marks: [{ type: "mathInline", attrs: { latex: "E = mc^2" } }],
            },
            { type: "text", text: " and display math below:" },
          ],
        },
        {
          type: "mathDisplay",
          attrs: {
            latex: "\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}",
            numbered: true,
            label: "eq:gaussian",
          },
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Greek letters: α, β, γ, Σ, Π, Ω" }],
        },
      ],
    };

    editorRef.current?.setContent(demoContent);
    setActiveTab("editor");
  }, []);

  const handleClearAll = useCallback(() => {
    clearDocument();
    clearEditor();
    setRawText("");
    setActiveTab("input");
  }, [clearDocument, clearEditor, setRawText]);

  // =============================================================================
  // Utility Functions
  // =============================================================================

  const downloadFile = (
    content: string,
    filename: string,
    mimeType: string
  ) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const convertToLatex = (content: JSONContent): string => {
    // Simplified LaTeX conversion - would need more sophisticated implementation
    let latex =
      "\\documentclass{article}\n\\usepackage{amsmath}\n\\usepackage{amssymb}\n\\begin{document}\n\n";

    // Basic conversion logic would go here
    latex += "% Generated from MathDocumentEditor\n";
    latex +=
      "% Content: " + JSON.stringify(content, null, 2).replace(/\n/g, "\n% ");

    latex += "\n\n\\end{document}";
    return latex;
  };

  // =============================================================================
  // Render Methods
  // =============================================================================

  const renderStatusBar = () => {
    if (!processingMetadata && !error && !hasUnsavedChanges) return null;

    return (
      <div className="mb-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={retryLastOperation}
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Retry
                </Button>
                <Button variant="ghost" size="sm" onClick={clearError}>
                  ×
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {processingMetadata && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium">
                      Document Processed Successfully
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {processingMetadata.processingTime}ms •
                      {processingMetadata.blockCount} blocks •
                      {processingMetadata.math_detected
                        ? "🧮 Math content detected"
                        : "No math content"}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Badge
                    variant={
                      processingMetadata.math_detected ? "default" : "secondary"
                    }
                  >
                    {processingMetadata.document_type}
                  </Badge>
                  {processingMetadata.math_detected && (
                    <Badge variant="outline" className="bg-blue-50">
                      <Calculator className="h-3 w-3 mr-1" />
                      Math
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {hasUnsavedChanges && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <span className="text-orange-800">
                    You have unsaved changes
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveDocument}
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save Now
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderInputTab = () => (
    <div className="space-y-6">
      {/* Quick Demo Section */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Zap className="h-5 w-5" />
            Math Document Editor
          </CardTitle>
          <CardDescription className="text-blue-700">
            Advanced mathematical document editor with LaTeX support, symbol
            insertion, and academic formatting.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            <Button onClick={handleDemoMath} variant="default">
              <Calculator className="h-4 w-4 mr-2" />
              Try Math Demo
            </Button>
            <Button onClick={() => setShowMathDemo(true)} variant="outline">
              <BookOpen className="h-4 w-4 mr-2" />
              View Features
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Input Mode Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Document Input</CardTitle>
          <CardDescription>
            Choose how you want to input your document content
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={inputMode}
            onValueChange={(value) => setInputMode(value as "text" | "pdf")}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="text">Text Input</TabsTrigger>
              <TabsTrigger value="pdf">PDF Upload</TabsTrigger>
            </TabsList>

            <TabsContent value="text" className="space-y-4 mt-4">
              <div>
                <Label htmlFor="raw-text">Paste your text content</Label>
                <Textarea
                  id="raw-text"
                  placeholder="Paste your document text here... Math expressions like $E=mc^2$ will be automatically detected and converted to proper LaTeX formatting."
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  className="min-h-[200px] mt-2"
                />
              </div>
            </TabsContent>

            <TabsContent value="pdf" className="mt-4">
              <PdfUpload
                onTextExtracted={handlePdfTextExtracted}
                onError={(error) =>
                  console.error("PDF processing error:", error)
                }
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Processing Options */}
      {rawText && (
        <Card>
          <CardHeader>
            <CardTitle>Processing Options</CardTitle>
            <CardDescription>
              Configure how your document will be analyzed and processed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="doc-type">Document Type</Label>
                <Select
                  value={processingOptions.documentType}
                  onValueChange={(value) =>
                    setProcessingOptions((prev) => ({
                      ...prev,
                      documentType: value as ProcessingOptions["documentType"],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mathematical">Mathematical</SelectItem>
                    <SelectItem value="academic">Academic Paper</SelectItem>
                    <SelectItem value="article">Article</SelectItem>
                    <SelectItem value="report">Report</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="language">Language</Label>
                <Select
                  value={processingOptions.language}
                  onValueChange={(value) =>
                    setProcessingOptions((prev) => ({
                      ...prev,
                      language: value,
                    }))
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

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Switch
                  id="math-detection"
                  checked={processingOptions.mathDetection}
                  onCheckedChange={(checked) =>
                    setProcessingOptions((prev) => ({
                      ...prev,
                      mathDetection: checked,
                    }))
                  }
                />
                <Label
                  htmlFor="math-detection"
                  className="flex items-center space-x-2"
                >
                  <Calculator className="h-4 w-4" />
                  <span>Enhanced math detection</span>
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="academic-mode"
                  checked={processingOptions.academicMode}
                  onCheckedChange={(checked) =>
                    setProcessingOptions((prev) => ({
                      ...prev,
                      academicMode: checked,
                    }))
                  }
                />
                <Label
                  htmlFor="academic-mode"
                  className="flex items-center space-x-2"
                >
                  <BookOpen className="h-4 w-4" />
                  <span>Academic structure recognition</span>
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="enable-fallback"
                  checked={processingOptions.enableFallback}
                  onCheckedChange={(checked) =>
                    setProcessingOptions((prev) => ({
                      ...prev,
                      enableFallback: checked,
                    }))
                  }
                />
                <Label htmlFor="enable-fallback">
                  Enable fallback processing
                </Label>
              </div>
            </div>

            <Button
              onClick={handleProcessText}
              disabled={!rawText.trim() || isAnalyzing}
              className="w-full"
            >
              {isAnalyzing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Brain className="h-4 w-4 mr-2" />
              )}
              Process with AI (
              {processingOptions.mathDetection ? "Math Mode" : "Standard Mode"})
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderEditorTab = () => {
    if (!tiptapContent && !editorContent) {
      return (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Calculator className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Math Document Editor</h3>
              <p className="text-muted-foreground mb-4">
                Process some text first or try the math demo to access the
                editor
              </p>
              <div className="flex space-x-2 justify-center">
                <Button onClick={handleDemoMath} variant="default">
                  <Sigma className="h-4 w-4 mr-2" />
                  Try Math Demo
                </Button>
                <Button onClick={() => setActiveTab("input")} variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Content
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        <MathDocumentEditor
          ref={editorRef}
          initialContent={tiptapContent || editorContent}
          onContentChange={handleEditorContentChange}
          onSave={handleSaveDocument}
          onExport={handleExportDocument}
          placeholder="Start writing your mathematical document... Use $ for inline math and $$ for display math."
          showToolbars={true}
          showMathToolbar={true}
          showAcademicToolbar={true}
          showStatusBar={true}
          autoSave={false}
          maxLength={50000}
          enableFootnotes={true}
          enableCitations={true}
          enableTables={true}
          onError={(error) => console.error("Editor error:", error)}
        />
      </div>
    );
  };

  const renderPreviewTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Export & Download
          </CardTitle>
          <CardDescription>
            Configure export settings and download your mathematical document
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Export Format Selection */}
          <div>
            <Label>Export Format</Label>
            <div className="grid grid-cols-2 gap-4 mt-2">
              {(["pdf", "html", "json", "latex"] as const).map((format) => (
                <Button
                  key={format}
                  variant={
                    exportOptions.format === format ? "default" : "outline"
                  }
                  onClick={() =>
                    setExportOptions((prev) => ({ ...prev, format }))
                  }
                  className="justify-start"
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  {format.toUpperCase()}
                </Button>
              ))}
            </div>
          </div>

          {/* PDF-specific options */}
          {exportOptions.format === "pdf" && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <h4 className="font-medium">PDF Options</h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="filename">Filename</Label>
                  <Input
                    id="filename"
                    value={pdfOptions.filename}
                    onChange={(e) =>
                      setPdfOptions((prev) => ({
                        ...prev,
                        filename: e.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="page-size">Page Size</Label>
                  <Select
                    value={pdfOptions.pageSize}
                    onValueChange={(value) =>
                      setPdfOptions((prev) => ({
                        ...prev,
                        pageSize: value as PdfOptions["pageSize"],
                      }))
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
                  <Label htmlFor="font-size">Font Size</Label>
                  <Input
                    id="font-size"
                    type="number"
                    min="8"
                    max="24"
                    value={pdfOptions.fontSize}
                    onChange={(e) =>
                      setPdfOptions((prev) => ({
                        ...prev,
                        fontSize: parseInt(e.target.value),
                      }))
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="margin">Margin (mm)</Label>
                  <Input
                    id="margin"
                    type="number"
                    min="5"
                    max="50"
                    value={pdfOptions.margin}
                    onChange={(e) =>
                      setPdfOptions((prev) => ({
                        ...prev,
                        margin: parseInt(e.target.value),
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="include-math"
                    checked={pdfOptions.includeMath}
                    onCheckedChange={(checked) =>
                      setPdfOptions((prev) => ({
                        ...prev,
                        includeMath: checked,
                      }))
                    }
                  />
                  <Label htmlFor="include-math">
                    Include mathematical expressions
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="preserve-math"
                    checked={exportOptions.preserveMath}
                    onCheckedChange={(checked) =>
                      setExportOptions((prev) => ({
                        ...prev,
                        preserveMath: checked,
                      }))
                    }
                  />
                  <Label htmlFor="preserve-math">
                    Preserve LaTeX formatting
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="include-metadata"
                    checked={exportOptions.includeMetadata}
                    onCheckedChange={(checked) =>
                      setExportOptions((prev) => ({
                        ...prev,
                        includeMetadata: checked,
                      }))
                    }
                  />
                  <Label htmlFor="include-metadata">
                    Include document metadata
                  </Label>
                </div>
              </div>
            </div>
          )}

          {/* Export Actions */}
          <div className="flex space-x-4">
            <Button
              onClick={() => handleExportDocument(exportOptions.format)}
              disabled={!editorContent || isGeneratingPdf}
              className="flex-1"
            >
              {isGeneratingPdf ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Export as {exportOptions.format.toUpperCase()}
            </Button>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Advanced
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Advanced Export Settings</DialogTitle>
                  <DialogDescription>
                    Configure advanced options for document export
                  </DialogDescription>
                </DialogHeader>
                {/* Advanced settings would go here */}
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Additional export options will be available here in future
                    updates.
                  </p>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Document Statistics */}
      {editorContent && (
        <Card>
          <CardHeader>
            <CardTitle>Document Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                Word count: <span className="font-medium">Loading...</span>
              </div>
              <div>
                Math expressions:{" "}
                <span className="font-medium">Loading...</span>
              </div>
              <div>
                Pages (estimated):{" "}
                <span className="font-medium">Loading...</span>
              </div>
              <div>
                File size: <span className="font-medium">Loading...</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderMathFeaturesDialog = () => (
    <Dialog open={showMathDemo} onOpenChange={setShowMathDemo}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Calculator className="h-5 w-5" />
            <span>Math Document Editor Features</span>
          </DialogTitle>
          <DialogDescription>
            Comprehensive mathematical document editing capabilities
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">Math Support</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Inline math: $E=mc^2$</li>
                <li>• Display math: $$\int f(x)dx$$</li>
                <li>• 100+ LaTeX symbols</li>
                <li>• Greek letters: α, β, π, Σ</li>
                <li>• Operators: ∫, ∑, ∏, ∂, ∇</li>
                <li>• Fractions, matrices, limits</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Academic Features</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Footnotes and citations</li>
                <li>• Theorem environments</li>
                <li>• Table creation and editing</li>
                <li>• Figure insertion</li>
                <li>• Bibliography support</li>
                <li>• Academic formatting</li>
              </ul>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button onClick={handleDemoMath} className="flex-1">
              <Sigma className="h-4 w-4 mr-2" />
              Try Math Demo
            </Button>
            <Button variant="outline" onClick={() => setShowMathDemo(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  // =============================================================================
  // Main Render
  // =============================================================================

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Math Document Editor</h1>
          <p className="text-muted-foreground">
            Advanced mathematical document processing with AI and LaTeX support
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleClearAll}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Clear All
          </Button>
          <Button variant="outline" onClick={toggleFullscreen}>
            <Calculator className="h-4 w-4 mr-2" />
            Focus Mode
          </Button>
        </div>
      </div>

      {renderStatusBar()}

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as typeof activeTab)}
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="input" className="flex items-center space-x-2">
            <Upload className="h-4 w-4" />
            <span>Input</span>
          </TabsTrigger>
          <TabsTrigger value="editor" className="flex items-center space-x-2">
            <Calculator className="h-4 w-4" />
            <span>Editor</span>
            {hasUnsavedChanges && (
              <div className="w-2 h-2 bg-orange-500 rounded-full" />
            )}
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center space-x-2">
            <Eye className="h-4 w-4" />
            <span>Export</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="input">{renderInputTab()}</TabsContent>
        <TabsContent value="editor">{renderEditorTab()}</TabsContent>
        <TabsContent value="preview">{renderPreviewTab()}</TabsContent>
      </Tabs>

      {renderMathFeaturesDialog()}
    </div>
  );
}
