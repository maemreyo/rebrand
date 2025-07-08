# Phân tích API `/api/analyze`

### **Tổng quan**

API endpoint `/api/analyze` là một Next.js API Route được thiết kế để **phân tích nội dung văn bản (text)**. Chức năng chính của nó là nhận một đoạn văn bản thô, sử dụng AI (cụ thể là Gemini) để chuyển đổi nó thành một cấu trúc dữ liệu có tổ chức (gọi là `CanonicalDocument`), và sau đó chuyển đổi cấu trúc đó sang định dạng tương thích với trình soạn thảo Tiptap.

---

### **1. Khi nào và Làm thế nào API được trigger?**

API này có thể được trigger (kích hoạt) thông qua 3 phương thức HTTP khác nhau:

*   **`POST /api/analyze`**: Đây là phương thức chính để thực hiện việc phân tích.
    *   **Khi nào**: Khi một client (ví dụ: frontend của ứng dụng) muốn phân tích một đoạn văn bản.
    *   **Thế nào**: Client gửi một request HTTP `POST` đến URL `/api/analyze` với body là một đối tượng JSON.

*   **`GET /api/analyze`**: Dùng để kiểm tra "sức khỏe" (health check) của API.
    *   **Khi nào**: Khi cần kiểm tra xem API có đang hoạt động và đã được cấu hình đúng hay chưa.
    *   **Thế nào**: Client gửi một request HTTP `GET` đến URL `/api/analyze` (không cần body). API sẽ trả về trạng thái hoạt động và cho biết khóa API đã được cấu hình hay chưa.

*   **`OPTIONS /api/analyze`**: Dùng để hỗ trợ CORS (Cross-Origin Resource Sharing).
    *   **Khi nào**: Trình duyệt tự động gửi request này trước khi gửi request `POST` từ một domain khác để kiểm tra xem request có được phép hay không.
    *   **Thế nào**: Đây là một cơ chế tự động của trình duyệt, không cần người dùng can thiệp.

---

### **2. Luồng xử lý chính là gì? (POST Request)**

Khi nhận được một request `POST`, API sẽ thực hiện các bước sau:

1.  **Nhận và Parse Request**:
    *   API nhận request và cố gắng parse body của nó thành JSON. Nếu body không phải là JSON hợp lệ, nó sẽ trả về lỗi `400 Bad Request`.

2.  **Xác thực (Validate) Dữ liệu đầu vào**:
    *   Nó sử dụng schema `AnalyzeRequestSchema` (được định nghĩa bằng thư viện `zod`) để kiểm tra xem body của request có đúng định dạng không.
    *   Dữ liệu đầu vào **bắt buộc** phải có trường `text` (string, không rỗng, tối đa 50,000 ký tự).
    *   Có thể có trường `options` (tùy chọn) để tùy chỉnh việc phân tích.

3.  **Kiểm tra Cấu hình Server**:
    *   Kiểm tra xem biến môi trường `GEMINI_API_KEY` có tồn tại không. Nếu không, nó sẽ trả về lỗi `500 Server Error`, cho biết server chưa được cấu hình đúng.

4.  **Khởi tạo Processors**:
    *   Tạo một instance của `GeminiDocumentProcessor` để tương tác với Gemini AI.
    *   Tạo một instance của `CanonicalToTiptapAdapter` để chuyển đổi định dạng dữ liệu.

5.  **Xử lý Văn bản bằng AI (Gemini)**:
    *   Đây là bước cốt lõi. Nó gọi phương thức `processDocumentWithFallbacks(text)` (hoặc `processDocument` nếu fallback bị tắt).
    *   Phương thức này gửi văn bản đầu vào đến Gemini AI.
    *   Gemini AI phân tích văn bản và trả về một cấu trúc JSON có tổ chức gọi là `CanonicalDocument`. Cấu trúc này biểu diễn văn bản dưới dạng các khối (blocks) như tiêu đề, đoạn văn, danh sách, v.v.
    *   Nếu có lỗi trong quá trình này, API sẽ trả về lỗi `500`.

6.  **Chuyển đổi sang định dạng Tiptap**:
    *   Sau khi có `CanonicalDocument`, nó sử dụng `tiptapAdapter` để chuyển đổi cấu trúc này thành định dạng JSON mà trình soạn thảo văn bản Tiptap có thể hiểu và hiển thị được.
    *   Nếu bước này thất bại, API sẽ trả về lỗi `500`.

7.  **Tạo Metadata và Trả về Kết quả**:
    *   Tính toán các thông tin bổ sung (metadata) như: thời gian xử lý, độ dài văn bản, số lượng khối, và điểm tin cậy (confidence score) từ kết quả của AI.
    *   Cuối cùng, nó gửi lại một response JSON với status `200 OK`, chứa cả hai định dạng (`canonical` và `tiptap`) cùng với metadata.

---

### **3. Dữ liệu đầu vào và đầu ra**

#### **Đầu vào (Request Body cho `POST`)**

```json
{
  "text": "Đây là nội dung văn bản cần được phân tích. Nó có thể bao gồm nhiều đoạn.",
  "options": {
    "language": "vi",
    "documentType": "article",
    "enableFallback": true
  }
}
```

#### **Đầu ra (Response Body nếu thành công)**

```json
{
  "success": true,
  "data": {
    "canonical": { /* Đối tượng CanonicalDocument từ Gemini */ },
    "tiptap": { /* Đối tượng JSON cho Tiptap Editor */ },
    "metadata": {
      "processingTime": 1234, // ms
      "textLength": 100,
      "blockCount": 5,
      "confidenceScore": 0.95
    }
  }
}
```

#### **Đầu ra (Response Body nếu thất bại)**

```json
{
  "success": false,
  "error": "Mô tả lỗi, ví dụ: 'Invalid request format'",
  "details": [ /* Chi tiết lỗi từ Zod validation (nếu có) */ ]
}
```


