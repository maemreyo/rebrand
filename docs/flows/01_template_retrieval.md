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
