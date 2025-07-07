# Next.js Application Implementation

This section details the implementation of the DocRebrander frontend using Next.js, React hooks, and components.

## 5.1 Main Document Processing Hook

```typescript
// hooks/useDocumentProcessing.ts
import { useState, useCallback } from "react";
import { CanonicalDocument } from "@/types/document";
import { JSONContent } from "@tiptap/core";

export const useDocumentProcessing = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canonicalDocument, setCanonicalDocument] =
    useState<CanonicalDocument | null>(null);
  const [tiptapContent, setTiptapContent] = useState<JSONContent | null>(null);

  const processRawText = useCallback(async (rawText: string) => {
    setIsProcessing(true);
    setError(null);

    try {
      const geminiProcessor = new GeminiDocumentProcessor(
        process.env.NEXT_PUBLIC_GEMINI_API_KEY!
      );
      const canonical = await geminiProcessor.processDocumentWithFallbacks(
        rawText
      );

      const tiptapAdapter = new CanonicalToTiptapAdapter();
      const tiptapDoc = tiptapAdapter.transform(canonical);

      setCanonicalDocument(canonical);
      setTiptapContent(tiptapDoc);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Processing failed");
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const generatePDF = useCallback(async (tiptapDoc: JSONContent) => {
    try {
      const pdfmeAdapter = new TiptapToPdfmeAdapter();
      const { template, inputs } = pdfmeAdapter.transform(tiptapDoc);

      const { generate } = await import("@pdfme/generator");
      const pdf = await generate({
        template,
        inputs,
      });

      // Create blob and download
      const blob = new Blob([pdf], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "document.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF generation failed");
    }
  }, []);

  return {
    isProcessing,
    error,
    canonicalDocument,
    tiptapContent,
    processRawText,
    generatePDF,
  };
};
```

## 5.2 Document Editor Component

```typescript
// components/DocumentEditor.tsx
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { JSONContent } from "@tiptap/core";
import { useCallback } from "react";

interface DocumentEditorProps {
  initialContent?: JSONContent;
  onContentChange?: (content: JSONContent) => void;
  onGeneratePDF?: (content: JSONContent) => void;
}

export const DocumentEditor: React.FC<DocumentEditorProps> = ({
  initialContent,
  onContentChange,
  onGeneratePDF,
}) => {
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
    content: initialContent,
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      onContentChange?.(json);
    },
  });

  const handleGeneratePDF = useCallback(() => {
    if (editor) {
      const content = editor.getJSON();
      onGeneratePDF?.(content);
    }
  }, [editor, onGeneratePDF]);

  if (!editor) {
    return <div>Loading editor...</div>;
  }

  return (
    <div className="document-editor">
      <div className="editor-toolbar">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive("bold") ? "is-active" : ""}
        >
          Bold
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive("italic") ? "is-active" : ""}
        >
          Italic
        </button>
        <button
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          className={
            editor.isActive("heading", { level: 1 }) ? "is-active" : ""
          }
        >
          H1
        </button>
        <button
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          className={
            editor.isActive("heading", { level: 2 }) ? "is-active" : ""
          }
        >
          H2
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive("bulletList") ? "is-active" : ""}
        >
          Bullet List
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive("orderedList") ? "is-active" : ""}
        >
          Ordered List
        </button>
        <button
          onClick={() =>
            editor
              .chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run()
          }
        >
          Insert Table
        </button>
        <button onClick={handleGeneratePDF} className="generate-pdf-btn">
          Generate PDF
        </button>
      </div>
      <EditorContent editor={editor} className="editor-content" />
    </div>
  );
};
```

## 5.3 Main Application Component

```typescript
// components/DocRebranderApp.tsx
import { useState } from "react";
import { DocumentEditor } from "./DocumentEditor";
import { useDocumentProcessing } from "@/hooks/useDocumentProcessing";

export const DocRebranderApp: React.FC = () => {
  const [rawText, setRawText] = useState("");
  const {
    isProcessing,
    error,
    canonicalDocument,
    tiptapContent,
    processRawText,
    generatePDF,
  } = useDocumentProcessing();

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rawText.trim()) {
      await processRawText(rawText);
    }
  };

  return (
    <div className="app-container">
      <h1>DocRebrander</h1>

      {!tiptapContent && (
        <div className="input-section">
          <form onSubmit={handleTextSubmit}>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste your raw text here..."
              className="text-input"
              rows={10}
              disabled={isProcessing}
            />
            <button
              type="submit"
              disabled={isProcessing || !rawText.trim()}
              className="process-btn"
            >
              {isProcessing ? "Processing..." : "Process Text"}
            </button>
          </form>
        </div>
      )}

      {error && <div className="error-message">Error: {error}</div>}

      {tiptapContent && (
        <div className="editor-section">
          <h2>Edit Your Document</h2>
          <DocumentEditor
            initialContent={tiptapContent}
            onGeneratePDF={generatePDF}
          />
        </div>
      )}

      {canonicalDocument && (
        <div className="debug-section">
          <h3>Debug Information</h3>
          <details>
            <summary>Canonical Document Structure</summary>
            <pre>{JSON.stringify(canonicalDocument, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  );
};
```
