# Báo cáo về Luồng Phân tích Gemini và Các Kiểu Dữ liệu Liên quan

## 1. Tổng quan Luồng Phân tích

Luồng phân tích tài liệu bằng Gemini bắt đầu từ văn bản thô (được trích xuất từ PDF hoặc các nguồn khác) và kết thúc bằng một cấu trúc dữ liệu chuẩn hóa (`CanonicalDocument`) cùng với một phiên bản tương thích với Tiptap Editor.

1.  **Đầu vào**: Văn bản thô.
2.  **Xử lý**: `src/app/api/analyze/route.ts` nhận văn bản thô, sử dụng `GeminiDocumentProcessor` (từ `src/lib/services/gemini.ts`) để gọi Gemini AI.
3.  **Kết quả Gemini**: Gemini trả về một đối tượng JSON tuân thủ `CanonicalDocument` schema.
4.  **Chuyển đổi**: `CanonicalToTiptapAdapter` (được sử dụng trong `src/app/api/analyze/route.ts`) chuyển đổi `CanonicalDocument` sang định dạng JSON của Tiptap.
5.  **Đầu ra API**: `/api/analyze` trả về cả `CanonicalDocument` và dữ liệu Tiptap, cùng với metadata xử lý.

## 2. Các Tệp Liên quan và Hiện trạng

Các tệp chính liên quan đến luồng phân tích và định nghĩa kiểu dữ liệu bao gồm:

*   **`src/app/api/analyze/route.ts`**:
    *   **Mô tả**: Đây là API endpoint chính xử lý yêu cầu phân tích. Nó nhận văn bản thô, điều phối việc gọi `GeminiDocumentProcessor` và `CanonicalToTiptapAdapter`.
    *   **Hiện trạng**:
        *   Định nghĩa `AnalyzeRequestSchema` (sử dụng `zod`) cho đầu vào.
        *   Định nghĩa `AnalyzeResponse` interface, chỉ rõ đầu ra sẽ chứa `canonical: CanonicalDocument` và `tiptap: any`.
        *   Xử lý logic gọi Gemini và chuyển đổi sang Tiptap.
        *   Bao gồm các chiến lược fallback nếu quá trình xử lý chính của Gemini thất bại.

*   **`src/lib/services/gemini.ts`**:
    *   **Mô tả**: Chứa lớp `GeminiDocumentProcessor` chịu trách nhiệm giao tiếp trực tiếp với Gemini AI. Nó xây dựng các prompt và xử lý phản hồi từ Gemini.
    *   **Hiện trạng**:
        *   Định nghĩa `CANONICAL_DOCUMENT_SCHEMA` dưới dạng một đối tượng JSON Schema, mô tả cấu trúc dữ liệu mà Gemini được yêu cầu trả về. Đây là bản đồ trực tiếp cho `CanonicalDocument`.
        *   Triển khai `processDocument` và `processDocumentWithFallbacks` để gửi yêu cầu đến Gemini.
        *   Sử dụng `responseMimeType: "application/json"` và `responseSchema: CANONICAL_DOCUMENT_SCHEMA` để đảm bảo Gemini trả về JSON có cấu trúc.

*   **`src/types/document.ts`**:
    *   **Mô tả**: Định nghĩa tất cả các interface TypeScript cho cấu trúc `CanonicalDocument` và các thành phần con của nó (metadata, các loại khối, nội dung inline). Đây là nguồn chính xác nhất về các kiểu dữ liệu mà bạn sẽ làm việc.
    *   **Hiện trạng (Các Type đã có)**:
        *   **`CanonicalDocument`**: Interface chính cho toàn bộ tài liệu đã được phân tích.
            *   `metadata: DocumentMetadata`
            *   `content: CanonicalBlock[]`
            *   `version: string`
            *   `createdAt: string`
            *   `updatedAt: string`
        *   **`DocumentMetadata`**: Metadata của tài liệu.
            *   `title?: string`, `author?: string`, `subject?: string`, `keywords?: string[]`
            *   `documentType: "report" | "article" | "form" | "contract" | "other"`
            *   `language: string`
            *   `confidenceScore: number`
        *   **`CanonicalBlock`**: Union type của tất cả các loại khối nội dung.
            *   `HeadingBlock` (level 1, 2, 3)
            *   `ParagraphBlock`
            *   `ListBlock` (bulleted, numbered, nested items)
            *   `TableBlock` (headers, rows, cells with colspan/rowspan)
            *   `ImageBlock` (src, alt, caption, width, height)
            *   `CodeBlock` (content, language)
            *   `BlockquoteBlock` (content, citation)
            *   `MultipleChoiceBlock` (question, options)
            *   `DividerBlock` (style)
        *   **`BaseBlock`**: Interface cơ sở cho tất cả các khối, chứa `id` và `type`.
        *   **`InlineContent`**: Union type của các loại nội dung inline trong các khối.
            *   `TextContent` (text)
            *   `FormattedTextContent` (text, formatting: bold, italic, underline, strikethrough, code, superscript, subscript)
            *   `LinkContent` (text, url, title)
            *   `BreakContent` (soft, hard)
        *   **Zod Schemas**: Các schema Zod tương ứng (`CanonicalDocumentSchema`, `DocumentMetadataSchema`, `InlineContentSchema`, `BaseBlockSchema`) được sử dụng để xác thực dữ liệu nhận được từ Gemini.
        *   **Error Classes**: `DocumentProcessingError`, `DocumentValidationError` để xử lý lỗi trong quá trình.

*   **`src/lib/adapters/canonical-to-tiptap.ts`**:
    *   **Mô tả**: Adapter này chịu trách nhiệm chuyển đổi `CanonicalDocument` thành định dạng JSON mà Tiptap Editor có thể hiểu và hiển thị.
    *   **Hiện trạng**: Mặc dù không được đọc chi tiết trong phiên này, sự tồn tại của nó cho thấy có một lớp chuyển đổi giữa định dạng chuẩn hóa của Gemini và định dạng của trình soạn thảo.

*   **`src/app/rebrand/page.tsx`**:
    *   **Mô tả**: Đây là component React/Next.js nơi Rich Text Editor (Tiptap) được hiển thị và tương tác với dữ liệu đã được phân tích.
    *   **Hiện trạng**:
        *   Sử dụng `useEditor` hook của Tiptap.
        *   Nhận `tiptapContent` để hiển thị.
        *   Có các hạn chế về khả năng chỉnh sửa (ví dụ: `editable` chỉ được đánh giá một lần khi khởi tạo) và số lượng nút chức năng trên thanh công cụ.

## 3. Kết luận và Hướng phát triển tiếp

Các kiểu dữ liệu cần thiết để làm việc với kết quả phân tích của Gemini đã được định nghĩa rõ ràng trong `src/types/document.ts` dưới dạng `CanonicalDocument` và các kiểu con của nó. Gemini được cấu hình để trả về dữ liệu theo đúng schema này.

Để phát triển tiếp, bạn sẽ tập trung vào việc sử dụng cấu trúc `CanonicalDocument` này để:
1.  **Hiển thị**: Đảm bảo rằng `CanonicalToTiptapAdapter` chuyển đổi chính xác tất cả các loại khối và nội dung inline sang định dạng Tiptap để hiển thị trong editor.
2.  **Chỉnh sửa**: Cải thiện trải nghiệm người dùng của Tiptap Editor trong `src/app/rebrand/page.tsx` để cho phép chỉnh sửa đầy đủ và hiển thị các công cụ chỉnh sửa cho tất cả các loại khối được Gemini trả về (ví dụ: bảng, hình ảnh, code block).
3.  **Lưu trữ/Xử lý**: Nếu cần lưu trữ hoặc xử lý thêm dữ liệu, `CanonicalDocument` là định dạng chuẩn hóa để làm việc.
