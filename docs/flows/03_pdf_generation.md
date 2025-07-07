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
