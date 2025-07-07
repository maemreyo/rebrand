# Project Context: DocRebrander

## 1. Project Overview
DocRebrander is an AI-powered document processing pipeline designed to convert raw text into structured JSON, enable rich text editing, and generate publication-ready PDFs. It aims to streamline the process of transforming unstructured content into professional, editable, and exportable documents.

## 2. Technology Stack
The project leverages a modern web development stack:
- **Frontend**: Next.js (React Framework), TypeScript
- **Styling**: Tailwind CSS (via PostCSS)
- **AI Integration**: Google Gemini AI (for text analysis)
- **Rich Text Editor**: Tiptap (headless editor based on ProseMirror)
- **PDF Generation**: pdfme (JavaScript library for PDF creation)
- **Backend/Database**: Supabase (for template management and potentially other data)
- **Package Manager**: pnpm

## 3. Architecture
DocRebrander employs a **four-stage pipeline pattern** for document processing, emphasizing strict data validation and transformation at each stage:
1.  **Raw Text Analysis**: Unstructured text is processed by Gemini AI to convert it into a standardized JSON format.
2.  **JSON Canonicalization**: A custom transformation ensures a consistent and validated data structure (Canonical JSON).
3.  **Rich Text Editing**: The Tiptap editor provides a visual interface for users to edit and refine the structured content.
4.  **PDF Generation**: The `pdfme` library is used to create publication-ready PDF documents from the edited content.

**Key Design Principles**:
-   **Schema-first approach**: Utilizing TypeScript interfaces and Zod for type safety and data validation.
-   **Adapter pattern**: For seamless data transformation between different systems (e.g., Canonical JSON to Tiptap JSON, Tiptap JSON to pdfme inputs).
-   **Error boundary pattern**: With comprehensive fallback mechanisms for robust error handling.
-   **Performance optimization**: Including caching strategies for document processing.
-   **Separation of Concerns**: Clear distinction between logic, presentation, and data access layers.

## 4. Data Structures
The core of DocRebrander's data handling revolves around the **Canonical JSON Structure**. This standardized format represents documents consistently throughout the pipeline. It includes:
-   `metadata`: Document-level information (title, author, type, language, confidence score).
-   `content`: An array of `CanonicalBlock` types, representing various document elements like headings, paragraphs, lists, tables, images, code blocks, blockquotes, multiple-choice questions, and dividers.
-   `version`, `createdAt`, `updatedAt`: Versioning and timestamp information.

Schema validation is enforced using `Zod` to ensure data integrity and consistency.

## 5. Key Modules and Components
-   `src/app/layout.tsx`: Defines the root layout for the Next.js application.
-   `src/app/page.tsx`: The main entry point for the application's UI, likely containing the `DocRebranderApp` component.
-   `src/lib/supabase.ts`: Configuration and client for interacting with Supabase.
-   `src/lib/utils.ts`: Utility functions (e.g., `cn` for Tailwind CSS class merging).
-   `docs/`: Contains comprehensive documentation on various aspects of the project, including architecture, data structures, Gemini integration, adapters, frontend implementation, deployment, and development flows.
-   `components.json`: Configuration for UI components.
-   `public/`: Static assets like images.

## 6. Development Flows
The project defines several key data flows:
-   **Template Retrieval**: Frontend fetches available document templates from Supabase via a backend API (`/api/templates`).
-   **Content Analysis and Structuring**: Raw text from the user is sent to a backend API (`/api/analyze`), processed by Gemini AI, converted to Canonical JSON, and then adapted to Tiptap's ProseMirror JSON for editing.
-   **PDF Generation**: Edited content from Tiptap is converted to `pdfme` inputs via an adapter, sent to a backend API (`/api/export-pdf`), and then a PDF is generated and returned to the user.

## 7. Contributing Guidelines
For information on how to contribute to the DocRebrander project, including reporting bugs, suggesting enhancements, submitting pull requests, development setup, coding guidelines, and commit message guidelines, please refer to the `CONTRIBUTING.md` file.

## 8. Glossary
A comprehensive list of key terms and concepts used within the DocRebrander project can be found in the `GLOSSARY.md` file.