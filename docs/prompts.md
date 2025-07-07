**Persona & Bối cảnh:**

Bạn là một Kiến trúc sư Giải pháp (Solutions Architect) cấp cao, chuyên về các ứng dụng web fullstack hiện đại. Nhiệm vụ của bạn là nghiên cứu và tạo ra một bản đặc tả kỹ thuật chi tiết cho một dự án có tên "DocRebrander".

**Ngữ cảnh dự án:**

*   **Framework:** Next.js 14+ (sử dụng App Router), TypeScript.
*   **Mục tiêu:** Xây dựng một ứng dụng cho phép người dùng rebrand (thay đổi thương hiệu) một tài liệu.
*   **Luồng làm việc cốt lõi:**
    1.  Người dùng dán văn bản thô từ một tài liệu có sẵn.
    2.  **Gemini AI** phân tích văn bản này và chuyển nó thành một cấu trúc dữ liệu JSON chuẩn hóa (chúng ta sẽ gọi đây là **"Cấu trúc JSON Chuẩn"**).
    3.  Cấu trúc JSON này được nạp vào trình soạn thảo **Tiptap** để người dùng xem lại, chỉnh sửa, và hoàn thiện.
    4.  Khi hoàn tất, dữ liệu từ Tiptap được chuyển đổi và đưa vào thư viện **`pdfme`** (phía Node.js) cùng với một template đã chọn để xuất ra file PDF cuối cùng.

**Nhiệm vụ chính của bạn:**

Nghiên cứu sâu vào tài liệu (documentation) của **Gemini**, **Tiptap**, và **`pdfme`** để thiết kế một luồng dữ liệu liền mạch và mạnh mẽ. Trọng tâm là định nghĩa cấu trúc dữ liệu và các "adapter" (hàm chuyển đổi) giữa các hệ thống này.

---

### **Các Yêu cầu Chi tiết (Detailed Instructions)**

#### **1. Thiết kế "Cấu trúc JSON Chuẩn" (Canonical Data Structure)**

Đây là "ngôn ngữ chung" của toàn bộ ứng dụng. Nó phải đủ mạnh mẽ để mô tả các tài liệu phức tạp.

*   **Yêu cầu:** Dựa trên các block cơ bản dưới đây, hãy nghiên cứu và đề xuất thêm các loại block phổ biến khác để làm cho cấu trúc này hoàn thiện hơn. Cung cấp định nghĩa TypeScript cho từng loại.

*   **Block cơ bản đã có:**
    ```typescript
    // Trong /lib/types.ts

    type HeadingBlock = { type: 'heading'; level: 1 | 2 | 3; content: string; };
    type ParagraphBlock = { type: 'paragraph'; content: string; }; // Cần hỗ trợ inline styles như bold, italic.
    type MultipleChoiceQuestionBlock = { type: 'mcq'; question: string; options: string[]; answer: string; };
    type ImageBlock = { type: 'image'; url: string; caption: string; }; // Đã đổi từ ImageListBlock để đơn giản hơn
    ```
*   **Nhiệm vụ của bạn:**
    *   Làm thế nào để `ParagraphBlock` có thể biểu diễn các định dạng inline (in đậm, in nghiêng, gạch chân)? Hãy đề xuất một cấu trúc con cho `content`.
    *   Đề xuất và định nghĩa thêm các block quan trọng khác như:
        *   `BulletedListBlock` (danh sách gạch đầu dòng)
        *   `NumberedListBlock` (danh sách có thứ tự)
        *   `TableBlock` (bảng biểu)
        *   `BlockquoteBlock` (trích dẫn)
        *   `CodeBlock` (khối mã nguồn)
        *   `DividerBlock` (dòng kẻ phân cách)
    *   Cuối cùng, định nghĩa kiểu `AnalyzedDocument = (HeadingBlock | ParagraphBlock | ... | DividerBlock)[];`.

---

#### **2. Cấu hình Gemini: Input & Output**

*   **Yêu cầu:** Thiết kế một prompt hoàn chỉnh để "dạy" Gemini chuyển đổi văn bản thô thành `AnalyzedDocument`.

*   **Nhiệm vụ của bạn:**
    *   Viết một prompt "few-shot" đầy đủ, có thể copy-paste để sử dụng.
    *   Prompt này phải bao gồm:
        1.  **Chỉ thị vai trò:** "Bạn là một công cụ phân tích và cấu trúc hóa tài liệu..."
        2.  **Yêu cầu về định dạng:** "Đầu ra PHẢI là một chuỗi JSON hợp lệ, không chứa bất kỳ giải thích nào. Sử dụng cấu trúc đã được định nghĩa."
        3.  **Cung cấp định nghĩa TypeScript:** Dán toàn bộ định nghĩa về các loại Block đã thiết kế ở bước 1 vào prompt.
        4.  **Cung cấp ví dụ (Few-shot):** Tạo ra một ví dụ văn bản đầu vào và JSON đầu ra tương ứng, bao gồm ít nhất một bảng (table) và một đoạn văn có chữ in đậm.
    *   Đề xuất các tham số cấu hình khi gọi API Gemini (ví dụ: `temperature: 0.1`, `topK`, và cách sử dụng **JSON Mode** để đảm bảo đầu ra luôn hợp lệ).

---

#### **3. Ánh xạ sang Tiptap: Phân tích Input**

*   **Yêu cầu:** Nghiên cứu cấu trúc JSON của Tiptap/ProseMirror và mô tả cách "Cấu trúc JSON Chuẩn" được ánh xạ sang Tiptap.

*   **Nhiệm vụ của bạn:**
    *   Đối với **từng loại block** đã định nghĩa ở bước 1, hãy cung cấp cấu trúc JSON Tiptap/ProseMirror tương ứng.
    *   Trình bày dưới dạng bảng so sánh song song:
        | Block Chuẩn (Canonical Block) | Cấu trúc JSON của Tiptap/ProseMirror | Ghi chú (Standard/Custom Node?) |
        | :--- | :--- | :--- |
        | `HeadingBlock` | `{ "type": "heading", "attrs": { "level": 1 }, ... }` | Standard Node |
        | `ParagraphBlock` (có inline style) | `{ "type": "paragraph", "content": [{ "type": "text", "text": "Hello ", "marks": [{ "type": "bold" }] }, ...] }` | Standard Node with Marks |
        | `TableBlock` | *...(cấu trúc của node table)...* | Custom Node (hoặc extension `@tiptap/extension-table`) |
        | `MultipleChoiceQuestionBlock` | *...(cấu trúc của node mcq)...* | Custom Node (cần ReactNodeView) |
    *   Giải thích rõ tại sao một số block (như MCQ) cần được triển khai dưới dạng **Custom Node** và yêu cầu `ReactNodeView`.

---

#### **4. Ánh xạ sang `pdfme`: Phân tích Input**

*   **Yêu cầu:** Nghiên cứu tài liệu của `@pdfme/generator` và thiết kế một cấu trúc `template` và `inputs` linh hoạt để có thể render `AnalyzedDocument`.

*   **Nhiệm vụ của bạn:**
    1.  **Thiết kế `pdfme` Template Schema:**
        *   Đề xuất một cấu trúc schema trong `template.schemas` để xử lý một tài liệu có nội dung động. Một cách tiếp cận phổ biến là có các trường tĩnh (`title`, `author`) và một trường động chính.
        *   **Ví dụ:**
            ```json
            "schemas": [{
              "documentTitle": { "type": "text", ... },
              "mainContent": { "type": "dynamic", "position": { "x": 20, "y": 40 }, "width": 170, "height": 230 }
            }]
            ```
    2.  **Thiết kế `pdfme` Inputs:**
        *   Dựa trên template schema trên, hãy mô tả cấu trúc của `inputs` tương ứng.
        *   Quan trọng nhất: `mainContent` sẽ là một mảng các object, mỗi object đại diện cho một block từ Tiptap. Hãy định nghĩa cấu trúc cho các object này.
            ```javascript
            const inputs = [{
              documentTitle: "Báo cáo Quý 4",
              mainContent: [
                { type: 'text', content: 'Đây là đoạn văn.', style: 'paragraph' },
                { type: 'text', content: 'Đây là tiêu đề phụ.', style: 'h2' },
                { type: 'table', headers: [...], rows: [...] },
                // ... các block khác
              ]
            }];
            ```
        *   Giải thích cách `pdfme` có thể được cấu hình để render các `style` khác nhau (như 'paragraph', 'h2') cho cùng một `type` 'text'.

---

#### **5. Thiết kế các Hàm Adapter**

*   **Yêu cầu:** Dựa trên các ánh xạ đã phân tích, viết pseudo-code hoặc TypeScript skeleton chi tiết cho hai hàm adapter quan trọng.

*   **Nhiệm vụ của bạn:**
    1.  **`geminiJsonToTiptapJson(doc: AnalyzedDocument): TiptapJSON`**: Viết logic chuyển đổi, đặc biệt chú ý đến việc xử lý các `marks` (in đậm, in nghiêng) cho `ParagraphBlock`.
    2.  **`tiptapJsonToPdfmeInputs(tiptapDoc: TiptapJSON): PdfmeInput`**: Viết logic chuyển đổi. Hàm này phải thông minh, có khả năng:
        *   Xác định node `heading` cấp 1 đầu tiên để làm `documentTitle`.
        *   Gom tất cả các node còn lại và chuyển đổi chúng thành một mảng cho `mainContent`.
        *   Chuyển đổi cấu trúc bảng của Tiptap thành cấu trúc `headers`/`rows` mà `pdfme` mong đợi.

**Kết quả cuối cùng mong muốn:** Một tài liệu kỹ thuật toàn diện, có thể được sử dụng trực tiếp bởi đội ngũ phát triển để xây dựng ứng dụng một cách nhất quán và hiệu quả.