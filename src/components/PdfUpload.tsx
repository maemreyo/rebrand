"use client";

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Upload, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  Loader2,
  File,
  Eye,
  RotateCcw,
  Zap,
  Image as ImageIcon,
  Brain,
  Clock,
  Settings2
} from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

interface PdfUploadProps {
  onTextExtracted: (text: string, metadata?: EnhancedPdfMetadata) => void;
  onError: (error: string) => void;
  disabled?: boolean;
  className?: string;
}

interface EnhancedPdfMetadata {
  filename: string;
  fileSize: number;
  pageCount: number;
  totalProcessingTime: number;
  textPages: number;
  ocrPages: number;
  skippedPages: number;
  method: 'text-only' | 'ocr-only' | 'hybrid';
  ocrEnabled: boolean;
  needsOcr: boolean;
  title?: string;
  author?: string;
  creator?: string;
}

interface OcrOptions {
  language: string;
  enhanceImage: boolean;
  density: number;
  format: 'png' | 'jpg' | 'jpeg';
}

interface UploadState {
  isUploading: boolean;
  isExtracting: boolean;
  progress: number;
  file: File | null;
  extractedText: string | null;
  metadata: EnhancedPdfMetadata | null;
  error: string | null;
  processingPhase: string | null;
  enableOcr: boolean;
  ocrOptions: OcrOptions;
  showAdvanced: boolean;
}

// =============================================================================
// Main Component
// =============================================================================

export const PdfUpload: React.FC<PdfUploadProps> = ({
  onTextExtracted,
  onError,
  disabled = false,
  className,
}) => {
  const [state, setState] = useState<UploadState>({
    isUploading: false,
    isExtracting: false,
    progress: 0,
    file: null,
    extractedText: null,
    metadata: null,
    error: null,
    processingPhase: null,
    enableOcr: true,
    ocrOptions: {
      language: 'en',
      enhanceImage: true,
      density: 300,
      format: 'png',
    },
    showAdvanced: false,
  });

  // =============================================================================
  // File Upload Logic
  // =============================================================================

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (disabled) return;

    const file = acceptedFiles[0];
    if (!file) return;

    // Validate file type
    if (file.type !== 'application/pdf') {
      const error = 'Please select a PDF file';
      setState(prev => ({ ...prev, error }));
      onError(error);
      return;
    }

    // Validate file size (50MB limit for OCR processing)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      const error = 'File size must be less than 50MB for OCR processing';
      setState(prev => ({ ...prev, error }));
      onError(error);
      return;
    }

    // Start upload process
    setState(prev => ({
      ...prev,
      file,
      isUploading: true,
      isExtracting: false,
      progress: 0,
      error: null,
      extractedText: null,
      metadata: null,
      processingPhase: 'Uploading...',
    }));

    try {
      await extractTextFromPdf(file);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process PDF';
      setState(prev => ({
        ...prev,
        isUploading: false,
        isExtracting: false,
        error: errorMessage,
        processingPhase: null,
      }));
      onError(errorMessage);
    }
  }, [disabled, onError]);

  const extractTextFromPdf = useCallback(async (file: File) => {
    setState(prev => ({ 
      ...prev, 
      isExtracting: true, 
      progress: 10,
      processingPhase: 'Analyzing PDF structure...'
    }));

    try {
      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('options', JSON.stringify({
        enableOcr: state.enableOcr,
        ocrOptions: state.ocrOptions,
      }));

      setState(prev => ({ 
        ...prev, 
        progress: 30,
        processingPhase: state.enableOcr ? 'Checking if OCR is needed...' : 'Extracting text...'
      }));

      // Call the enhanced OCR endpoint
      const response = await fetch('/api/extract-pdf-ocr', {
        method: 'POST',
        body: formData,
      });

      setState(prev => ({ ...prev, progress: 70 }));

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      setState(prev => ({ 
        ...prev, 
        progress: 90,
        processingPhase: 'Finalizing...'
      }));

      if (!result.success) {
        throw new Error(result.error || 'Text extraction failed');
      }

      const { text, metadata } = result.data;

      // Determine processing phase message
      let phaseMessage = 'Processing complete';
      if (metadata.method === 'hybrid') {
        phaseMessage = `Hybrid processing: ${metadata.textPages} text pages, ${metadata.ocrPages} OCR pages`;
      } else if (metadata.method === 'ocr-only') {
        phaseMessage = `OCR processing: ${metadata.ocrPages} pages processed`;
      } else {
        phaseMessage = `Text extraction: ${metadata.textPages} pages processed`;
      }

      setState(prev => ({
        ...prev,
        isUploading: false,
        isExtracting: false,
        progress: 100,
        extractedText: text,
        metadata,
        error: null,
        processingPhase: phaseMessage,
      }));

      // Notify parent component
      onTextExtracted(text, metadata);

    } catch (error) {
      console.error('PDF extraction failed:', error);
      setState(prev => ({
        ...prev,
        processingPhase: 'Processing failed',
      }));
      throw error;
    }
  }, [state.enableOcr, state.ocrOptions, onTextExtracted]);

  // =============================================================================
  // Event Handlers
  // =============================================================================

  const handleClear = () => {
    setState({
      isUploading: false,
      isExtracting: false,
      progress: 0,
      file: null,
      extractedText: null,
      metadata: null,
      error: null,
      processingPhase: null,
      enableOcr: state.enableOcr,
      ocrOptions: state.ocrOptions,
      showAdvanced: state.showAdvanced,
    });
  };

  const handleRetry = () => {
    if (state.file) {
      setState(prev => ({
        ...prev,
        error: null,
        isUploading: true,
        progress: 0,
        processingPhase: 'Retrying...',
      }));
      extractTextFromPdf(state.file);
    }
  };

  const handleUseText = () => {
    if (state.extractedText && state.metadata) {
      onTextExtracted(state.extractedText, state.metadata);
    }
  };

  const handleOcrToggle = (enabled: boolean) => {
    setState(prev => ({ ...prev, enableOcr: enabled }));
  };

  const handleOcrOptionChange = (key: keyof OcrOptions, value: any) => {
    setState(prev => ({
      ...prev,
      ocrOptions: { ...prev.ocrOptions, [key]: value },
    }));
  };

  // =============================================================================
  // Dropzone Configuration
  // =============================================================================

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
    disabled: disabled || state.isUploading || state.isExtracting,
  });

  // =============================================================================
  // Render Helpers
  // =============================================================================

  const renderDropzone = () => (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
        ${isDragActive 
          ? 'border-primary bg-primary/5' 
          : 'border-muted-foreground/25 hover:border-muted-foreground/50'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input {...getInputProps()} />
      
      <div className="flex flex-col items-center space-y-4">
        <div className="p-3 rounded-full bg-muted">
          <Upload className="h-8 w-8 text-muted-foreground" />
        </div>
        
        {isDragActive ? (
          <div>
            <p className="text-lg font-medium">Drop your PDF here</p>
            <p className="text-sm text-muted-foreground">Release to upload</p>
          </div>
        ) : (
          <div>
            <p className="text-lg font-medium">Drag & drop a PDF file here</p>
            <p className="text-sm text-muted-foreground">
              or <span className="text-primary underline">click to browse</span>
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Maximum file size: 50MB • OCR {state.enableOcr ? 'enabled' : 'disabled'}
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const renderSettings = () => (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Settings2 className="h-4 w-4" />
          Processing Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="enable-ocr" className="text-sm font-medium">
              Enable OCR for Scanned PDFs
            </Label>
            <p className="text-xs text-muted-foreground">
              Automatically detects and processes scanned pages using AI
            </p>
          </div>
          <Switch
            id="enable-ocr"
            checked={state.enableOcr}
            onCheckedChange={handleOcrToggle}
          />
        </div>

        {state.enableOcr && (
          <div className="space-y-3 pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setState(prev => ({ ...prev, showAdvanced: !prev.showAdvanced }))}
              className="h-auto p-0 text-xs"
            >
              {state.showAdvanced ? 'Hide' : 'Show'} Advanced OCR Settings
            </Button>

            {state.showAdvanced && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Language</Label>
                  <Select
                    value={state.ocrOptions.language}
                    onValueChange={(value) => handleOcrOptionChange('language', value)}
                  >
                    <SelectTrigger className="h-8">
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

                <div>
                  <Label className="text-xs">Image Quality</Label>
                  <Select
                    value={state.ocrOptions.density.toString()}
                    onValueChange={(value) => handleOcrOptionChange('density', parseInt(value))}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="150">Low (150 DPI)</SelectItem>
                      <SelectItem value="300">Standard (300 DPI)</SelectItem>
                      <SelectItem value="600">High (600 DPI)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="enhance-image"
                      checked={state.ocrOptions.enhanceImage}
                      onCheckedChange={(checked) => handleOcrOptionChange('enhanceImage', checked)}
                    />
                    <Label htmlFor="enhance-image" className="text-xs">
                      Enhance image quality for better OCR results
                    </Label>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderProgress = () => (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <div className="p-2 rounded-full bg-primary/10">
          <File className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-medium">{state.file?.name}</p>
          <p className="text-sm text-muted-foreground">
            {formatFileSize(state.file?.size || 0)}
          </p>
        </div>
        {(state.isUploading || state.isExtracting) && (
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {state.enableOcr && (
              <div className="flex items-center space-x-1">
                <Brain className="h-3 w-3 text-blue-500" />
                <span className="text-xs text-muted-foreground">AI</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>{state.processingPhase || 'Processing...'}</span>
          <span>{state.progress}%</span>
        </div>
        <Progress value={state.progress} />
      </div>
    </div>
  );

  const renderResult = () => (
    <div className="space-y-4">
      {/* File Info with Processing Method */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/20">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="font-medium">{state.metadata?.filename}</p>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <span>{state.metadata?.pageCount} pages</span>
              <span>•</span>
              <span>{formatFileSize(state.metadata?.fileSize || 0)}</span>
              <span>•</span>
              <span>{state.metadata?.totalProcessingTime}ms</span>
            </div>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleClear}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Processing Method Info */}
      {state.metadata && (
        <div className="grid grid-cols-2 gap-2 p-3 bg-muted rounded-lg">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Badge variant={state.metadata.method === 'hybrid' ? 'default' : 'secondary'}>
                {state.metadata.method.toUpperCase()}
              </Badge>
              {state.metadata.ocrEnabled && (
                <div className="flex items-center space-x-1">
                  <Brain className="h-3 w-3 text-blue-500" />
                  <span className="text-xs text-blue-500">AI</span>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="flex items-center space-x-1">
                <FileText className="h-3 w-3" />
                <span>{state.metadata.textPages} text</span>
              </div>
              <div className="flex items-center space-x-1">
                <ImageIcon className="h-3 w-3" />
                <span>{state.metadata.ocrPages} OCR</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span>{Math.round(state.metadata.totalProcessingTime / 1000)}s</span>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            {state.metadata.title && (
              <div className="text-xs">
                <span className="text-muted-foreground">Title:</span>
                <span className="ml-1 font-medium">{state.metadata.title}</span>
              </div>
            )}
            {state.metadata.author && (
              <div className="text-xs">
                <span className="text-muted-foreground">Author:</span>
                <span className="ml-1 font-medium">{state.metadata.author}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Text Preview */}
      {state.extractedText && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Extracted Text Preview</Label>
            <Badge variant="secondary">
              {state.extractedText.length.toLocaleString()} characters
            </Badge>
          </div>
          <div className="p-3 bg-muted rounded-lg max-h-32 overflow-y-auto text-sm">
            <p className="whitespace-pre-wrap">
              {state.extractedText.substring(0, 300)}
              {state.extractedText.length > 300 && '...'}
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex space-x-2">
        <Button onClick={handleUseText} className="flex-1">
          <Zap className="h-4 w-4 mr-2" />
          Process with AI
        </Button>
        <Button variant="outline" onClick={handleClear}>
          <Upload className="h-4 w-4 mr-2" />
          Upload New
        </Button>
      </div>
    </div>
  );

  const renderError = () => (
    <div className="space-y-4">
      <div className="flex items-start space-x-3 p-4 border border-destructive/50 rounded-lg bg-destructive/5">
        <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
        <div className="flex-1">
          <p className="font-medium text-destructive">Processing Failed</p>
          <p className="text-sm text-destructive/80 mt-1">{state.error}</p>
        </div>
      </div>

      <div className="flex space-x-2">
        {state.file && (
          <Button variant="outline" onClick={handleRetry}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        )}
        <Button variant="ghost" onClick={handleClear}>
          <X className="h-4 w-4 mr-2" />
          Clear
        </Button>
      </div>
    </div>
  );

  // =============================================================================
  // Main Render
  // =============================================================================

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload PDF Document
          </CardTitle>
          <CardDescription>
            Upload a PDF file to extract text automatically. OCR support included for scanned documents.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!state.file && renderSettings()}
          
          {state.error && renderError()}
          {!state.error && !state.file && renderDropzone()}
          {!state.error && state.file && (state.isUploading || state.isExtracting) && renderProgress()}
          {!state.error && state.file && state.extractedText && renderResult()}
        </CardContent>
      </Card>
    </div>
  );
};

// =============================================================================
// Utility Functions
// =============================================================================

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default PdfUpload;