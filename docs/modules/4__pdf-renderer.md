Hoàn hảo. Sau khi người dùng đã có nội dung được tinh chỉnh hoàn hảo trong Tiptap, chúng ta bước vào giai đoạn cuối cùng: **biến dữ liệu trừu tượng đó thành một file PDF hữu hình, chuyên nghiệp**. Đây là lúc `pdfme` thực sự tỏa sáng.

---

### **Phase 4: Module Xuất bản PDF (The Final Output)**

**Mục tiêu tổng thể của Phase 4:** Xây dựng một quy trình backend đáng tin cậy để nhận dữ liệu nội dung từ Tiptap, kết hợp nó với một template PDF đã chọn, và tạo ra một file PDF chất lượng cao để trả về cho người dùng.

---

#### **Module 4.1: Adapter Chuyển đổi Dữ liệu (`tiptapJsonToPdfmeInputs`)**

- **Mục tiêu:** Xây dựng hàm "phiên dịch" cuối cùng, chuyển đổi từ định dạng JSON của Tiptap sang định dạng mảng `inputs` mà `pdfme` yêu cầu. Đây là bước logic phức tạp và quan trọng nhất trong toàn bộ luồng dữ liệu.

- **Yêu cầu (Requirements):**

  1.  Trong file `/lib/adapters.ts`, định nghĩa và export một hàm có tên `tiptapJsonToPdfmeInputs` với chữ ký kiểu: `(tiptapDoc: Record<string, any>): Record<string, any>`.
  2.  Hàm này nhận đầu vào là một đối tượng JSON ProseMirror/Tiptap (có `type: 'doc'` và mảng `content`).
  3.  **Quan trọng:** Logic của hàm này không phải là một phép biến đổi 1-1 đơn giản. Nó phải **trích xuất và nhóm dữ liệu** theo cách mà template `pdfme` mong đợi.
      - **Ví dụ:** Template `pdfme` có thể có một schema như `{ "title": "...", "author": "...", "main_content": [...] }`.
      - Hàm adapter phải duyệt qua mảng `content` của Tiptap:
        - Nếu gặp node `heading` với `level: 1` đầu tiên, nó sẽ lấy `content` của node này và gán cho khóa `title` trong object đầu ra.
        - Các node còn lại (`paragraph`, `mcq`, `heading` level 2,...) sẽ được chuyển đổi thành các object và đẩy vào một mảng, sau đó gán cho khóa `main_content`.
  4.  Hàm phải xử lý việc chuyển đổi cho từng loại node:
      - **`heading` và `paragraph`:** Có thể được chuyển đổi thành một object chung, ví dụ: `{ type: 'text', content: '...', style: 'h2' }`, để template `pdfme` có thể áp dụng các kiểu dáng khác nhau.
      - **`multipleChoiceQuestion`:** Chuyển đổi thành một object `{ type: 'mcq', data: { question: '...', options: [...] } }`.
  5.  Hàm sẽ trả về một **object duy nhất** chứa các khóa (`title`, `main_content`,...) mà template `pdfme` đang chờ đợi. Giá trị của các khóa này là dữ liệu đã được trích xuất và định dạng lại.

- **Tiêu chí Chấp nhận (Acceptance Criteria):**
  1.  Hàm `tiptapJsonToPdfmeInputs` tồn tại và được export từ `/lib/adapters.ts`.
  2.  Khi truyền vào một đối tượng JSON Tiptap mẫu, hàm trả về một object có cấu trúc khớp với schema của một template `pdfme` cụ thể.
  3.  Hàm có thể phân loại và nhóm các loại node khác nhau vào đúng các khóa trong object đầu ra.
  4.  Hàm không gây ra lỗi runtime và xử lý được các trường hợp cạnh (edge cases) như tài liệu không có tiêu đề level 1.

---

#### **Module 4.2: API Route Xuất bản PDF**

- **Mục tiêu:** Tạo API endpoint cuối cùng, nơi tất cả các mảnh ghép được kết hợp lại để tạo ra file PDF.

- **Yêu cầu (Requirements):**

  1.  Tạo một file API Route mới tại `/app/api/export-pdf/route.ts`.
  2.  **Triển khai `POST` handler:**
      - **Xác thực người dùng:** Đảm bảo chỉ người dùng đã đăng nhập mới có thể gọi endpoint.
      - **Xác thực Request Body:** Sử dụng `zod` để xác thực body. Body phải chứa:
        - `tiptapJson`: một object.
        - `templateId`: một chuỗi uuid.
      - **Bước 1: Lấy Template từ DB:**
        - Sử dụng `templateId` nhận được, truy vấn đến Supabase để lấy bản ghi `template` tương ứng.
        - Đảm bảo template này thuộc về người dùng đang thực hiện request (RLS của Supabase sẽ hỗ trợ việc này). Nếu không tìm thấy template, trả về lỗi 404 Not Found.
        - Trích xuất đối tượng `template_json` từ bản ghi.
      - **Bước 2: Chuẩn bị Dữ liệu Inputs:**
        - Gọi hàm adapter `tiptapJsonToPdfmeInputs(tiptapJson)` để chuyển đổi dữ liệu từ Tiptap.
        - **Lưu ý:** `pdfme` yêu cầu `inputs` phải là một **mảng** (thường là một mảng chứa một object). Vì vậy, kết quả từ adapter (một object) cần được bọc trong một mảng: `const inputs = [resultFromAdapter];`.
      - **Bước 3: Tạo PDF:**
        - Import hàm `generate` từ `@pdfme/generator`.
        - Bọc lời gọi trong khối `try...catch`.
        - Gọi `const pdfBytes = await generate({ template: template_json, inputs });`.
      - **Bước 4: Trả về File PDF:**
        - Chuyển đổi `pdfBytes` (là một `Uint8Array`) thành một `Buffer` của Node.js: `Buffer.from(pdfBytes)`.
        - Tạo một đối tượng `Response` mới.
        - Truyền `Buffer` vào làm body của `Response`.
        - Set các HTTP Headers cần thiết:
          - `'Content-Type': 'application/pdf'`
          - `'Content-Disposition': 'attachment; filename="document.pdf"'` (Để trình duyệt gợi ý tải file về).
      - Nếu có lỗi trong quá trình tạo PDF, trả về lỗi 500 Internal Server Error với một thông báo rõ ràng.

- **Tiêu chí Chấp nhận (Acceptance Criteria):**
  1.  Gửi một request `POST` đến `/app/api/export-pdf` với một body hợp lệ sẽ trả về status `200` và trình duyệt sẽ bắt đầu tải về một file có tên `document.pdf`.
  2.  File PDF được tải về có nội dung và layout khớp với dữ liệu từ Tiptap và thiết kế của template đã chọn.
  3.  Gửi request với `templateId` không tồn tại hoặc không thuộc sở hữu của người dùng sẽ trả về lỗi `404`.
  4.  Gửi request với body không hợp lệ (thiếu `tiptapJson` hoặc `templateId`) sẽ trả về lỗi `400`.
  5.  Nếu thư viện `pdfme` gặp lỗi nội bộ, server sẽ trả về lỗi `500` thay vì bị crash.

---

#### **Module 4.3: Tích hợp Frontend (Hoàn thiện)**

- **Mục tiêu:** Kích hoạt nút "Export to PDF" trên giao diện, gọi API và xử lý việc tải file về cho người dùng.

- **Yêu cầu (Requirements):**

  1.  Trong component trang Rebranding (`/app/rebrand/page.tsx`), tìm đến hàm xử lý sự kiện `onClick` của nút "Export to PDF".
  2.  Trong hàm này:
      - Set trạng thái `isExporting` thành `true`.
      - Thu thập dữ liệu cần thiết: `editor.getJSON()` và `selectedTemplateId`.
      - Gọi API `POST /api/export-pdf` bằng `fetch`, truyền dữ liệu vào body.
      - **Xử lý Response:**
        - Kiểm tra `response.ok`. Nếu không, đọc lỗi từ `response.json()` và hiển thị cho người dùng.
        - Nếu `response.ok`, `response.blob()` sẽ trả về dữ liệu file.
        - Sử dụng `URL.createObjectURL(blob)` để tạo một URL tạm thời cho file.
        - Tạo một thẻ `<a>` ẩn trong DOM, gán URL này vào `href`, đặt thuộc tính `download` là "document.pdf", và gọi `link.click()` để kích hoạt việc tải file.
        - Dọn dẹp bằng cách gọi `URL.revokeObjectURL(url)`.
      - Set `isExporting` thành `false` sau khi hoàn tất hoặc gặp lỗi.

- **Tiêu chí Chấp nhận (Acceptance Criteria):**
  1.  Khi người dùng nhấn nút "Export to PDF", một chỉ báo loading xuất hiện.
  2.  Sau một khoảng thời gian, hộp thoại lưu file của trình duyệt xuất hiện.
  3.  File được lưu thành công về máy người dùng.
  4.  Nếu có lỗi từ API, một thông báo lỗi sẽ được hiển thị trên giao diện.
