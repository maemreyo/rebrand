Tuyệt vời. Sau khi đã có hạ tầng vững chắc để quản lý templates, bước tiếp theo là xây dựng trái tim của ứng dụng: **Module Phân tích và Cấu trúc hóa Nội dung bằng AI**. Module này sẽ biến văn bản thô thành dữ liệu có cấu trúc.

---

### **Phase 2: Module Phân tích và Cấu trúc hóa Nội dung (AI Core)**

**Mục tiêu tổng thể của Phase 2:** Xây dựng một API endpoint đáng tin cậy, có khả năng nhận văn bản thô, sử dụng Gemini AI để chuyển đổi nó thành một cấu trúc JSON được định nghĩa trước, đồng thời áp dụng các biện pháp để tối đa hóa độ chính xác và giảm thiểu "ảo giác".

---

#### **Module 2.1: Adapter Định nghĩa Kiểu dữ liệu (TypeScript Types)**

- **Mục tiêu:** Định nghĩa cấu trúc dữ liệu "chuẩn" (Canonical Data Structure) mà Gemini sẽ được yêu cầu tạo ra. Đây là "ngôn ngữ chung" kết nối giữa AI và các phần khác của hệ thống.

- **Yêu cầu (Requirements):**

  1.  Trong file `/lib/types.ts`, định nghĩa và export các kiểu dữ liệu TypeScript cho từng loại block nội dung mà hệ thống sẽ hỗ trợ.
  2.  Tạo một kiểu cha (`type`) có tên `DocumentBlock` sử dụng union type của TypeScript để bao gồm tất cả các loại block con.
  3.  Các block con cần được định nghĩa ban đầu (có thể mở rộng sau):
      - `HeadingBlock`: `{ type: 'heading'; level: 1 | 2 | 3; content: string; }`
      - `ParagraphBlock`: `{ type: 'paragraph'; content: string; }`
      - `MultipleChoiceQuestionBlock`: `{ type: 'mcq'; question: string; options: string[]; answer: string; }`
      - `ImageListBlock`: `{ type: 'image_list'; items: { url: string; caption: string; }[]; }`
  4.  Định nghĩa một kiểu dữ liệu cho toàn bộ tài liệu: `type AnalyzedDocument = DocumentBlock[];`.

- **Tiêu chí Chấp nhận (Acceptance Criteria):**
  1.  File `/lib/types.ts` chứa các định nghĩa kiểu `HeadingBlock`, `ParagraphBlock`, `MultipleChoiceQuestionBlock`, `ImageListBlock`, `DocumentBlock`, và `AnalyzedDocument`.
  2.  Các kiểu dữ liệu này được export và có thể import để sử dụng ở các module khác (ví dụ: trong API Route và các component frontend).
  3.  Khi khai báo một biến kiểu `AnalyzedDocument`, TypeScript có thể kiểm tra và báo lỗi nếu cấu trúc dữ liệu không khớp (ví dụ: một `HeadingBlock` thiếu thuộc tính `level`).

---

#### **Module 2.2: API Route Phân tích Tài liệu**

- **Mục tiêu:** Tạo một API endpoint an toàn và hiệu quả, nhận văn bản từ người dùng và trả về dữ liệu đã được cấu trúc bởi AI.

- **Yêu cầu (Requirements):**

  1.  Tạo một file API Route mới tại đường dẫn `/app/api/analyze/route.ts`.
  2.  **Triển khai `POST` handler:**
      - **Xác thực người dùng:** Sử dụng Supabase Server Client để đảm bảo chỉ người dùng đã đăng nhập mới có thể gọi endpoint này. Nếu không, trả về lỗi 401 Unauthorized.
      - **Xác thực Request Body:** Sử dụng `zod` để tạo một schema xác thực cho request body. Body phải là một object chứa thuộc tính `text` là một chuỗi không rỗng. Nếu không hợp lệ, trả về lỗi 400 Bad Request.
      - **Khởi tạo AI Client:** Khởi tạo Google AI SDK với API key được lưu an toàn trong biến môi trường (`process.env.GEMINI_API_KEY`).
      - **Thiết kế Prompt (Prompt Engineering):**
        - Tạo một chuỗi prompt chi tiết, bao gồm:
          - Chỉ thị vai trò rõ ràng.
          - Hướng dẫn cụ thể về việc tuân thủ cấu trúc JSON.
          - Cung cấp các định nghĩa kiểu TypeScript (đã tạo ở Module 2.1) làm ví dụ về cấu trúc cần tuân theo.
          - Cung cấp 1-2 ví dụ hoàn chỉnh (few-shot).
          - Yêu cầu đầu ra phải là một chuỗi JSON hợp lệ và không gì khác.
        - Ghép prompt này với `text` từ người dùng.
      - **Cấu hình lời gọi AI:**
        - Gọi đến model Gemini (ví dụ: `gemini-pro`).
        - Cài đặt `temperature` ở mức thấp (ví dụ: `0.1`).
        - **Quan trọng:** Sử dụng chế độ JSON Mode của Gemini (nếu có sẵn cho model bạn chọn) để đảm bảo đầu ra luôn là JSON.
      - **Xử lý kết quả trả về từ AI:**
        - Bọc lời gọi AI trong khối `try...catch`.
        - Lấy chuỗi JSON từ kết quả.
        - **Xác thực JSON:** Sử dụng `JSON.parse()` để chuyển chuỗi thành đối tượng. Sau đó, dùng schema của `zod` (được tạo dựa trên `AnalyzedDocument`) để xác thực cấu trúc của đối tượng này.
        - Nếu `JSON.parse()` thất bại hoặc xác thực `zod` thất bại, hệ thống có thể thử gọi lại AI với thông báo lỗi để nó tự sửa, hoặc trả về lỗi 502 Bad Gateway (lỗi từ dịch vụ bên ngoài).
      - **Trả về kết quả:** Nếu mọi thứ thành công, trả về một `Response` với status 200 và đối tượng `AnalyzedDocument` đã được xác thực trong body.

- **Tiêu chí Chấp nhận (Acceptance Criteria):**
  1.  Gửi một request `POST` đến `/api/analyze` mà không có token xác thực sẽ trả về status `401`.
  2.  Gửi một request `POST` với token hợp lệ nhưng body không hợp lệ (ví dụ: thiếu `text`) sẽ trả về status `400`.
  3.  Gửi một request `POST` hợp lệ với một đoạn văn bản đơn giản sẽ trả về status `200` và một body là một mảng các object khớp với kiểu `AnalyzedDocument`.
  4.  Log của server (hoặc các công cụ giám sát) không ghi nhận lỗi `JSON.parse` khi AI trả về kết quả thành công.
  5.  Hệ thống xử lý được trường hợp AI trả về một chuỗi không phải JSON hoặc JSON sai cấu trúc bằng cách trả về một mã lỗi phù hợp (ví dụ: 502) thay vì làm sập server (lỗi 500).
  6.  API key của Gemini không bị lộ ra phía client-side.
