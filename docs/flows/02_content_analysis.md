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
