# Báo cáo về Rich Text Editor và Tương tác Gemini

## 1. Hiện trạng của Rich Text Editor (Tiptap)

Rich Text Editor trong ứng dụng được triển khai sử dụng thư viện Tiptap, cụ thể là trong file `src/app/rebrand/page.tsx`.

### 1.1. Hạn chế về khả năng chỉnh sửa

*   **Không thể gõ chữ trực tiếp ngay cả khi có nội dung**: Trình soạn thảo được cấu hình với thuộc tính `editable: !!tiptapContent` trong `useEditor`. Tuy nhiên, thuộc tính này chỉ được đánh giá **một lần khi editor được khởi tạo**.
    *   **Vấn đề**: Nếu `tiptapContent` ban đầu là rỗng (null/undefined) khi component mount, editor sẽ được khởi tạo ở trạng thái không thể chỉnh sửa (`editable: false`). Ngay cả khi `tiptapContent` sau đó được cập nhật (ví dụ, sau khi trích xuất PDF bằng OCR hoặc phân tích AI), trạng thái `editable` của editor **không tự động thay đổi** theo. Do đó, người dùng không thể gõ chữ vào editor, mà chỉ có thể sử dụng các nút định dạng có sẵn.
    *   **Ý nghĩa**: Người dùng bị giới hạn trong việc chỉnh sửa nội dung đã được AI xử lý hoặc trích xuất, không thể tự do thêm hoặc sửa đổi văn bản bằng cách gõ phím.

### 1.2. Hạn chế về các tính năng chỉnh sửa (Toolbar)

*   **Số lượng nút chức năng hạn chế**: Thanh công cụ của trình soạn thảo hiện tại chỉ hiển thị các nút cho các chức năng cơ bản như:
    *   **Bold** (`<strong>B</strong>`)
    *   **Italic** (`<em>I</em>`)
    *   **Heading 1** (`H1`)
    *   **Heading 2** (`H2`)
    *   **Bullet List** (`•List`)
    *   **Ordered List** (`1.List`)
*   **Các Extension đã được thêm nhưng chưa có UI**: Mặc dù các Tiptap extension cho `Table`, `TableRow`, `TableHeader`, `TableCell`, `Image`, và `Link` đã được import và cấu hình trong `useEditor`, nhưng hiện tại không có nút tương ứng trên thanh công cụ để người dùng có thể dễ dàng sử dụng các tính năng này (ví dụ: chèn bảng, chèn ảnh, chèn liên kết).
*   **Sự sơ sài**: Thanh công cụ hiện tại chỉ cung cấp các tùy chọn định dạng văn bản cơ bản nhất. Để có một trải nghiệm chỉnh sửa phong phú hơn, cần phải bổ sung thêm các nút cho các tính năng đã có (như bảng, ảnh, link) và xem xét thêm các Tiptap extension khác cho các chức năng nâng cao hơn (ví dụ: undo/redo, align text, font size/color, blockquote, code block, v.v.).

## 2. Tương tác của API `/api/analyze` với Gemini (Prompt Engineering)

API `/api/analyze` sử dụng lớp `GeminiDocumentProcessor` (trong `src/lib/services/gemini.ts`) để giao tiếp với Gemini AI. Có hai chiến lược prompt chính được triển khai:

### 2.1. `buildAnalysisPrompt(rawText: string)` (Prompt chính)

Đây là prompt được ưu tiên sử dụng để phân tích tài liệu. Nó rất chi tiết và có cấu trúc rõ ràng:

*   **Vai trò của AI**: Được định nghĩa là một "AI phân tích tài liệu chính xác" và "chuyên gia phân tích tài liệu chuyên về nhận dạng cấu trúc nội dung và trích xuất dữ liệu."
*   **Nhiệm vụ**: Chuyển đổi văn bản thô thành định dạng JSON có cấu trúc theo một schema cụ thể.
*   **Hướng dẫn chi tiết**: Bao gồm các bước như:
    *   Phân tích cấu trúc tài liệu (tiêu đề, đoạn văn, danh sách, bảng).
    *   Trích xuất định dạng inline (bold, italic) dựa trên các dấu hiệu trong văn bản.
    *   Xác định và cấu trúc dữ liệu dạng bảng.
    *   Phát hiện các khối code, trích dẫn và nội dung đặc biệt.
    *   Tạo metadata phù hợp (loại tài liệu, điểm tin cậy).
    *   Gán ID duy nhất cho tất cả các khối và phần tử.
    *   Duy trì nội dung gốc trong khi cải thiện cấu trúc.
*   **Ràng buộc (Constraints)**: Đảm bảo đầu ra là JSON hợp lệ theo schema, sử dụng `null` cho thông tin thiếu, giữ nguyên nội dung văn bản gốc, gán điểm tin cậy, tạo timestamp ISO 8601, và sử dụng version "1.0".
*   **Ví dụ (Examples)**: Cung cấp một ví dụ đầy đủ về đầu vào và đầu ra JSON mong muốn, giúp Gemini hiểu rõ định dạng và cấu trúc mong đợi của `CanonicalDocument`.

### 2.2. `buildSimplifiedPrompt(rawText: string)` (Prompt dự phòng)

Prompt này được sử dụng như một cơ chế dự phòng nếu prompt chính thất bại. Nó đơn giản hơn nhiều:

*   **Mục tiêu**: Chuyển đổi văn bản thành JSON có cấu trúc với metadata và các khối nội dung, tập trung vào việc xác định các đoạn văn, tiêu đề và danh sách một cách đơn giản.
*   **Nội dung**: Ngắn gọn, chỉ yêu cầu trả về JSON với metadata, mảng `content` (id, type, content), version, createdAt, updatedAt, và tập trung vào các yếu tố cơ bản.

### 2.3. Chiến lược Fallback

Hệ thống sử dụng một chiến lược `processDocumentWithFallbacks` để đảm bảo rằng ngay cả khi prompt chính quá phức tạp hoặc Gemini gặp khó khăn, vẫn có một kết quả được trả về. Các chiến lược được thử theo thứ tự:
1.  `processDocument` (sử dụng `buildAnalysisPrompt`)
2.  `processWithSimplifiedPrompt` (sử dụng `buildSimplifiedPrompt`)
3.  `processWithBasicStructure` (tạo cấu trúc cơ bản dựa trên đoạn văn)
4.  `createFallbackDocument` (tạo tài liệu tối thiểu chỉ với một đoạn văn bản gốc)

## 3. Đánh giá hiện trạng UI và Tính năng

Hiện tại, UI của Rich Text Editor còn khá sơ sài và chưa tận dụng hết khả năng của Tiptap. Việc người dùng không thể gõ trực tiếp vào editor khi mới mở là một hạn chế lớn về trải nghiệm người dùng, vì nó buộc người dùng phải qua bước xử lý AI trước khi có thể chỉnh sửa. Điều này có thể gây nhầm lẫn và hạn chế tính linh hoạt của ứng dụng.

Các tính năng như chèn bảng, hình ảnh, và liên kết đã được hỗ trợ ở cấp độ Tiptap extension nhưng chưa được hiển thị trên UI, làm giảm khả năng chỉnh sửa phong phú mà Tiptap có thể cung cấp.

## 4. Đề xuất cải tiến

Để cải thiện trải nghiệm người dùng và tính năng của Rich Text Editor, có thể xem xét các điểm sau:

1.  **Cho phép chỉnh sửa trực tiếp**: Cấu hình Tiptap editor để luôn `editable` ngay cả khi `tiptapContent` trống. Khi đó, người dùng có thể bắt đầu gõ hoặc dán văn bản trực tiếp vào editor. Khi họ nhấn nút "Process Text with AI", nội dung hiện tại trong editor sẽ được gửi đi xử lý.
2.  **Mở rộng thanh công cụ**: Thêm các nút UI cho các tính năng đã được hỗ trợ bởi Tiptap extensions nhưng chưa có trên thanh công cụ (ví dụ: chèn bảng, chèn ảnh, chèn liên kết).
3.  **Thêm các tính năng chỉnh sửa nâng cao**: Nghiên cứu và tích hợp thêm các Tiptap extension phổ biến khác để cung cấp các chức năng như undo/redo, căn chỉnh văn bản, thay đổi kích thước/màu chữ, blockquote, code block, v.v.
4.  **Cải thiện phản hồi người dùng**: Khi editor không thể chỉnh sửa, hiển thị một thông báo rõ ràng hơn cho người dùng biết lý do và hướng dẫn họ cách kích hoạt editor (ví dụ: "Vui lòng xử lý văn bản trước để kích hoạt trình chỉnh sửa").

Những cải tiến này sẽ giúp Rich Text Editor trở nên mạnh mẽ, linh hoạt và thân thiện hơn với người dùng, tận dụng tối đa khả năng của Tiptap và quá trình xử lý AI của Gemini.