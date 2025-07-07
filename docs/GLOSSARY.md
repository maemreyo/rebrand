# Glossary of Terms

This glossary defines key terms and concepts used within the DocRebrander project.

*   **Adapter Pattern**: A software design pattern that allows the interface of an existing class to be used as another interface. In DocRebrander, adapters are used to transform data between different formats (e.g., Canonical JSON to Tiptap JSON).

*   **Canonical Document**: The standardized JSON structure representing a document within the DocRebrander system. This is the central, consistent data format.

*   **Gemini AI**: Google's large language model used by DocRebrander for analyzing raw text and converting it into a structured, canonical JSON format.

*   **JSON Canonicalization**: The process of transforming raw, unstructured text into the standardized, schema-defined Canonical JSON structure.

*   **pdfme**: A JavaScript library used by DocRebrander for generating PDF documents from structured data.

*   **Pipeline Pattern**: A design pattern where a series of processing steps are applied sequentially to data. DocRebrander uses a four-stage pipeline for document processing.

*   **Prompt Engineering**: The art and science of crafting effective prompts for large language models (like Gemini AI) to guide their behavior and elicit desired outputs.

*   **ProseMirror JSON**: The JSON format used by the Tiptap rich text editor to represent document content.

*   **Schema-first Approach**: A development methodology where data schemas (e.g., TypeScript interfaces, Zod schemas) are defined first, driving the structure and validation of data throughout the application.

*   **Supabase**: A backend-as-a-service platform used by DocRebrander for database management (e.g., storing templates) and authentication.

*   **Tiptap**: A headless, framework-agnostic rich text editor for JavaScript. DocRebrander uses Tiptap for providing visual editing capabilities for the canonical document content.
