# Tài liệu này đóng vai trò như một "hợp đồng" kỹ thuật, đảm bảo các phần của hệ thống có thể kết nối với nhau một cách liền mạch.

---

### **Tài liệu Kỹ thuật: Phối hợp và Luồng dữ liệu giữa các Module**

**Đối tượng:** Đội ngũ phát triển (Frontend, Backend, Fullstack).
**Mục đích:** Mô tả chi tiết cách các module tương tác với nhau, định dạng dữ liệu được truyền đi, và trách nhiệm của từng module trong toàn bộ quy trình "Rebranding Tài liệu".

---

### **Sơ đồ Luồng dữ liệu Tổng thể**

_(Sơ đồ này mô tả trực quan các bước được liệt kê bên dưới)_

---

### **Luồng 1: Chuẩn bị Môi trường làm việc (Lấy Templates)**

- **Mục tiêu:** Cung cấp cho người dùng danh sách các "khuôn mẫu" (templates) mà họ có thể sử dụng để xuất bản tài liệu.

- **Các Module tham gia:**

  1.  **Frontend Component:** `/app/rebrand/page.tsx`
  2.  **Backend API Route:** `/app/api/templates/route.ts` (GET handler)
  3.  **Database Module:** Bảng `templates` trên Supabase

- **Quy trình Phối hợp:**
  1.  **[Frontend]** Ngay khi component `page.tsx` được mount, nó sẽ kích hoạt một lời gọi `fetch` đến API endpoint `GET /api/templates`.
  2.  **[Backend]** API Route `GET /api/templates` nhận được request. Nó sử dụng Supabase Server Client để xác thực người dùng và lấy `user_id`.
  3.  **[Backend -> Database]** Backend thực hiện một câu lệnh `SELECT * FROM templates WHERE user_id = {current_user_id}`.
  4.  **[Database -> Backend]** Supabase trả về một mảng các bản ghi template.
  5.  **[Backend -> Frontend]** Backend trả về một `Response` với status 200, chứa một mảng các đối tượng `PdfTemplate` trong body.
      - **Hợp đồng dữ liệu (Data Contract):** `Promise<PdfTemplate[]>`
      - `type PdfTemplate = { id: string; name: string; ... }`
  6.  **[Frontend]** Frontend nhận được mảng dữ liệu, cập nhật state của mình, và render ra một component `Select` (dropdown) cho người dùng lựa chọn.

---

### **Luồng 2: Phân tích và Cấu trúc hóa Nội dung**

- **Mục tiêu:** Biến văn bản thô của người dùng thành dữ liệu có cấu trúc, sẵn sàng để chỉnh sửa.

- **Các Module tham gia:**

  1.  **Frontend Component:** `/app/rebrand/page.tsx`
  2.  **Backend API Route:** `/app/api/analyze/route.ts` (POST handler)
  3.  **AI Service:** Gemini API
  4.  **Adapter:** `/lib/adapters.ts` (hàm `geminiJsonToTiptapJson`)
  5.  **Frontend Editor:** Tiptap Instance

- **Quy trình Phối hợp:**
  1.  **[Frontend]** Người dùng dán văn bản vào `Textarea` và nhấn nút "Analyze Document". Frontend thu thập text và gọi `fetch` đến `POST /api/analyze`.
      - **Hợp đồng dữ liệu (Gửi đi):** `{ text: string }`
  2.  **[Backend]** API Route `POST /api/analyze` nhận request, xác thực người dùng và request body.
  3.  **[Backend -> AI Service]** Backend tạo prompt, đính kèm text của người dùng, và gửi yêu cầu đến Gemini API.
  4.  **[AI Service -> Backend]** Gemini trả về một chuỗi JSON.
  5.  **[Backend]** Backend thực hiện `JSON.parse()` và xác thực cấu trúc của đối tượng JSON nhận được bằng `zod` dựa trên kiểu `AnalyzedDocument`.
      - **Hợp đồng dữ liệu (Nội bộ):** `AnalyzedDocument` (là một mảng các `DocumentBlock`)
  6.  **[Backend -> Frontend]** Backend trả về một `Response` với status 200, chứa đối tượng `AnalyzedDocument` đã được xác thực.
      - **Hợp đồng dữ liệu (Nhận về):** `Promise<AnalyzedDocument>`
  7.  **[Frontend]** Frontend nhận được `AnalyzedDocument`.
  8.  **[Frontend -> Adapter]** Frontend gọi hàm `geminiJsonToTiptapJson(analyzedDocument)` để chuyển đổi dữ liệu.
      - **Input Contract:** `AnalyzedDocument`
      - **Output Contract:** ProseMirror JSON Object (`{ type: 'doc', content: [...] }`)
  9.  **[Adapter -> Frontend Editor]** Hàm adapter trả về đối tượng JSON cho Tiptap.
  10. **[Frontend Editor]** Frontend sử dụng lệnh `editor.commands.setContent()` để nạp đối tượng JSON này vào Tiptap, hiển thị nội dung cho người dùng chỉnh sửa.

---

### **Luồng 3: Xuất bản Tài liệu ra PDF**

- **Mục tiêu:** Tạo ra file PDF cuối cùng dựa trên nội dung đã được người dùng tinh chỉnh và template đã chọn.

- **Các Module tham gia:**

  1.  **Frontend Component:** `/app/rebrand/page.tsx`
  2.  **Frontend Editor:** Tiptap Instance
  3.  **Adapter:** `/lib/adapters.ts` (hàm `tiptapJsonToPdfmeInputs`)
  4.  **Backend API Route:** `/app/api/export-pdf/route.ts` (POST handler)
  5.  **Database Module:** Bảng `templates` trên Supabase
  6.  **PDF Engine:** `@pdfme/generator`

- **Quy trình Phối hợp:**
  1.  **[Frontend]** Người dùng nhấn nút "Export to PDF".
  2.  **[Frontend -> Frontend Editor]** Frontend gọi `editor.getJSON()` để lấy đối tượng JSON ProseMirror hiện tại từ Tiptap.
  3.  **[Frontend]** Frontend thu thập dữ liệu cần thiết: `tiptapJson` và `selectedTemplateId`. Sau đó, nó gọi `fetch` đến `POST /api/export-pdf`.
      - **Hợp đồng dữ liệu (Gửi đi):** `{ tiptapJson: Record<string, any>; templateId: string; }`
  4.  **[Backend]** API Route `POST /api/export-pdf` nhận request, xác thực người dùng và body.
  5.  **[Backend -> Database]** Backend sử dụng `templateId` để `SELECT` bản ghi template từ Supabase.
  6.  **[Database -> Backend]** Supabase trả về bản ghi template, bao gồm cả cột `template_json`.
  7.  **[Backend -> Adapter]** Backend gọi hàm `tiptapJsonToPdfmeInputs(tiptapJson)` để chuyển đổi.
      - **Input Contract:** ProseMirror JSON Object
      - **Output Contract:** Một object duy nhất chứa dữ liệu đã được nhóm lại, ví dụ: `{ title: string; main_content: any[]; ... }`
  8.  **[Backend]** Backend bọc kết quả từ adapter vào một mảng để tạo thành `inputs` cho `pdfme`: `const inputs = [resultFromAdapter];`.
  9.  **[Backend -> PDF Engine]** Backend gọi hàm `generate({ template: template_json, inputs })` từ thư viện `pdfme`.
  10. **[PDF Engine -> Backend]** `pdfme` trả về một `Uint8Array` chứa dữ liệu của file PDF.
  11. **[Backend -> Frontend]** Backend tạo một `Response` chứa dữ liệu PDF dưới dạng `Buffer` và đặt các header `Content-Type` và `Content-Disposition` phù hợp.
      - **Hợp đồng dữ liệu (Nhận về):** `Promise<Blob>` (dưới dạng một file PDF).
  12. **[Frontend]** Frontend nhận được `Response`, xử lý `Blob` dữ liệu, và kích hoạt trình duyệt để tải file về máy người dùng.

---

### **Tổng kết Trách nhiệm**

- **Frontend (`page.tsx`)**: Chịu trách nhiệm quản lý trạng thái UI, điều phối các lời gọi API, và xử lý tương tác của người dùng. Nó không biết logic nghiệp vụ bên trong của AI hay PDF.
- **Adapters (`adapters.ts`)**: Là các "phiên dịch viên" chuyên biệt. Trách nhiệm duy nhất của chúng là chuyển đổi dữ liệu từ định dạng A sang định dạng B một cách chính xác. Chúng không chứa logic gọi API hay quản lý state.
- **API Routes (`/api/...`)**: Là lớp nghiệp vụ (business logic layer). Chúng chịu trách nhiệm xác thực, tương tác với các dịch vụ bên ngoài (Gemini, Supabase, `pdfme`), và thực thi các quy tắc của ứng dụng. Chúng không biết về UI.
- **Cơ sở dữ liệu (`Supabase`)**: Chịu trách nhiệm lưu trữ dữ liệu một cách bền vững và bảo mật.
- **Các Engines (`Tiptap`, `pdfme`, `Gemini`)**: Là các công cụ chuyên dụng, thực thi các tác vụ cốt lõi theo chỉ thị.
  s
