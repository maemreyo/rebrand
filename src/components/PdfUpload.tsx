"use client";

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  Loader2,
  File,
  Eye,
  RotateCcw
} from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

interface PdfUploadProps {
  onTextExtracted: (text: string, metadata?: PdfMetadata) => void;
  onError: (error: string) => void;
  disabled?: boolean;
  className?: string;
}

interface PdfMetadata {
  filename: string;
  fileSize: number;
  pageCount: number;
  extractionTime: number;
  title?: string;
  author?: string;
  creator?: string;
  creationDate?: string;
  modDate?: string;
}

interface UploadState {
  isUploading: boolean;
  isExtracting: boolean;
  progress: number;
  file: File | null;
  extractedText: string | null;
  metadata: PdfMetadata | null;
  error: string | null;
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

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      const error = 'File size must be less than 10MB';
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
      }));
      onError(errorMessage);
    }
  }, [disabled, onError]);

  const extractTextFromPdf = async (file: File) => {
    setState(prev => ({ ...prev, isExtracting: true, progress: 20 }));

    try {
      // Create form data
      const formData = new FormData();
      formData.append('file', file);

      setState(prev => ({ ...prev, progress: 40 }));

      // Try main endpoint first, fallback to alternative if needed
      let response = await fetch('/api/extract-pdf', {
        method: 'POST',
        body: formData,
      });

      // If main endpoint fails, try alternative
      if (!response.ok && response.status === 500) {
        console.log('Trying alternative PDF extraction endpoint...');
        response = await fetch('/api/extract-pdf-alt', {
          method: 'POST',
          body: formData,
        });
      }

      setState(prev => ({ ...prev, progress: 60 }));

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      setState(prev => ({ ...prev, progress: 80 }));

      if (!result.success) {
        throw new Error(result.error || 'Text extraction failed');
      }

      const { text, metadata } = result.data;

      setState(prev => ({
        ...prev,
        isUploading: false,
        isExtracting: false,
        progress: 100,
        extractedText: text,
        metadata,
        error: null,
      }));

      // Notify parent component
      onTextExtracted(text, metadata);

    } catch (error) {
      console.error('PDF extraction failed:', error);
      throw error;
    }
  };

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
    });
  };

  const handleRetry = () => {
    if (state.file) {
      setState(prev => ({
        ...prev,
        error: null,
        isUploading: true,
        progress: 0,
      }));
      extractTextFromPdf(state.file);
    }
  };

  const handleUseText = () => {
    if (state.extractedText && state.metadata) {
      onTextExtracted(state.extractedText, state.metadata);
    }
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
              Maximum file size: 10MB
            </p>
          </div>
        )}
      </div>
    </div>
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
          <Loader2 className="h-4 w-4 animate-spin" />
        )}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>
            {state.isUploading && 'Uploading...'}
            {state.isExtracting && 'Extracting text...'}
            {state.progress === 100 && 'Complete'}
          </span>
          <span>{state.progress}%</span>
        </div>
        <Progress value={state.progress} />
      </div>
    </div>
  );

  const renderResult = () => (
    <div className="space-y-4">
      {/* File Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/20">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="font-medium">{state.metadata?.filename}</p>
            <p className="text-sm text-muted-foreground">
              {state.metadata?.pageCount} pages • {formatFileSize(state.metadata?.fileSize || 0)}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleClear}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Metadata */}
      {state.metadata && (
        <div className="grid grid-cols-2 gap-2 p-3 bg-muted rounded-lg">
          <div className="text-sm">
            <span className="text-muted-foreground">Pages:</span>
            <span className="ml-2 font-medium">{state.metadata.pageCount}</span>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Size:</span>
            <span className="ml-2 font-medium">{formatFileSize(state.metadata.fileSize)}</span>
          </div>
          {state.metadata.title && (
            <div className="text-sm col-span-2">
              <span className="text-muted-foreground">Title:</span>
              <span className="ml-2 font-medium">{state.metadata.title}</span>
            </div>
          )}
          {state.metadata.author && (
            <div className="text-sm col-span-2">
              <span className="text-muted-foreground">Author:</span>
              <span className="ml-2 font-medium">{state.metadata.author}</span>
            </div>
          )}
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
          <FileText className="h-4 w-4 mr-2" />
          Use This Text
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
          <p className="font-medium text-destructive">Upload Failed</p>
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
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload PDF Document
        </CardTitle>
        <CardDescription>
          Upload a PDF file to automatically extract and process its text content
        </CardDescription>
      </CardHeader>
      <CardContent>
        {state.error && renderError()}
        {!state.error && !state.file && renderDropzone()}
        {!state.error && state.file && (state.isUploading || state.isExtracting) && renderProgress()}
        {!state.error && state.file && state.extractedText && renderResult()}
      </CardContent>
    </Card>
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

// Import Label component
const Label: React.FC<React.LabelHTMLAttributes<HTMLLabelElement>> = ({ 
  className, 
  ...props 
}) => (
  <label 
    className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`} 
    {...props} 
  />
);

export default PdfUpload;