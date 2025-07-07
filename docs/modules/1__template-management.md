### **Lời nói đầu: Các Nguyên tắc Chỉ đạo**

1.  **TypeScript First:** Toàn bộ codebase sẽ được viết bằng TypeScript. Các kiểu dữ liệu (`types`) sẽ được định nghĩa rõ ràng cho các đối tượng cốt lõi (templates, data models) để đảm bảo an toàn kiểu dữ liệu xuyên suốt ứng dụng.
2.  **Giảm thiểu "ảo giác" (Hallucination) của AI:**
    - **Nhiệt độ (Temperature) thấp:** Sẽ sử dụng `temperature` gần 0 (ví dụ: `0.1`) để AI tập trung vào việc tuân thủ cấu trúc và bám sát văn bản gốc, giảm thiểu sự sáng tạo không cần thiết.
    - **Prompt Engineering nâng cao:**
      - **Few-Shot Prompting:** Cung cấp 2-3 ví dụ hoàn chỉnh về cặp "văn bản đầu vào" -> "JSON đầu ra" ngay trong prompt để AI "học" theo mẫu.
      - **Chỉ thị vai trò (Role Prompting):** Bắt đầu prompt với "Bạn là một trợ lý phân tích tài liệu chuyên nghiệp. Nhiệm vụ của bạn là chuyển đổi văn bản được cung cấp thành cấu trúc JSON một cách chính xác và không thêm bớt thông tin."
      - **Cưỡng chế định dạng đầu ra (Format Enforcement):** Yêu cầu rõ ràng "Đầu ra PHẢI là một chuỗi JSON hợp lệ, không chứa bất kỳ văn bản giải thích nào khác." Một số model mới của Gemini hỗ trợ chế độ JSON Output, chúng ta sẽ tận dụng nó.
    - **Xác thực và Sửa lỗi (Validation & Correction):** Sau khi nhận được kết quả từ AI, sẽ có một bước xác thực (ví dụ: dùng thư viện `zod`) để kiểm tra xem JSON có đúng schema hay không. Nếu sai, có thể thử gọi lại AI với thông báo lỗi để nó tự sửa.

---

### **Kế hoạch Triển khai Chi tiết**

Bắt đầu với giai đoạn nền tảng quan trọng nhất.

### **Phase 1: Module Quản lý Template PDF**

**Mục tiêu tổng thể của Phase 1:** Xây dựng hạ tầng backend vững chắc để lưu trữ, bảo mật và truy xuất các template PDF. Đây là xương sống của toàn bộ hệ thống, cho phép người dùng định nghĩa "khung sườn" cho các tài liệu của họ.

---

#### **Module 1.1: Database Schema (Supabase)**

- **Mục tiêu:** Định nghĩa cấu trúc bảng trong cơ sở dữ liệu Postgres của Supabase để lưu trữ các template `pdfme`.

- **Yêu cầu (Requirements):**

  1.  Tạo một bảng mới có tên `templates`.
  2.  Bảng `templates` phải bao gồm các cột sau với đúng kiểu dữ liệu:
      - `id`: Kiểu `uuid`, được đặt làm khóa chính (Primary Key).
      - `created_at`: Kiểu `timestamp with time zone`, có giá trị mặc định là `now()`.
      - `user_id`: Kiểu `uuid`, phải có một ràng buộc khóa ngoại (Foreign Key) tham chiếu đến cột `id` của bảng `auth.users`. Cột này không được phép null.
      - `name`: Kiểu `text`, dùng để người dùng đặt tên cho template. Không được phép null.
      - `template_json`: Kiểu `jsonb`. Đây là kiểu dữ liệu được tối ưu hóa cho việc truy vấn và lưu trữ JSON trong Postgres. Cột này sẽ chứa toàn bộ đối tượng template được tạo bởi `pdfme`.
  3.  Phải kích hoạt Chính sách Bảo mật Cấp độ Hàng (Row Level Security - RLS) trên bảng `templates`.
  4.  Phải định nghĩa các chính sách RLS để đảm bảo:
      - Người dùng chỉ có thể xem (`SELECT`) các template mà `user_id` khớp với ID của chính họ.
      - Người dùng chỉ có thể tạo (`INSERT`) một template mới với `user_id` là ID của chính họ.
      - Người dùng chỉ có thể cập nhật (`UPDATE`) và xóa (`DELETE`) các template mà họ sở hữu.

- **Tiêu chí Chấp nhận (Acceptance Criteria):**
  1.  Bảng `templates` đã tồn tại trong Supabase Studio.
  2.  Schema của bảng `templates` khớp chính xác với các yêu cầu về tên cột và kiểu dữ liệu đã nêu.
  3.  RLS được bật (Enabled) cho bảng `templates`.
  4.  Tồn tại ít nhất 2 chính sách RLS đã được tạo và kích hoạt:
      - Một chính sách cho phép `SELECT` với điều kiện `auth.uid() = user_id`.
      - Một chính sách cho phép tất cả các hành động (`INSERT`, `UPDATE`, `DELETE`) với điều kiện `auth.uid() = user_id`.
  5.  Khi truy vấn với vai trò `anon` (người dùng chưa đăng nhập), kết quả trả về từ bảng `templates` luôn là một mảng rỗng.
  6.  Khi truy vấn với vai trò `authenticated` (người dùng đã đăng nhập), kết quả chỉ trả về các hàng có `user_id` khớp với ID của người dùng đó.

---

#### **Module 1.2: Adapter Định nghĩa Kiểu dữ liệu (TypeScript Types)**

- **Mục tiêu:** Tạo các định nghĩa kiểu dữ liệu TypeScript tập trung để đảm bảo tính nhất quán và an toàn kiểu trên toàn bộ ứng dụng.

- **Yêu cầu (Requirements):**

  1.  Tạo một file mới tại đường dẫn `/lib/types.ts`.
  2.  Trong file này, định nghĩa và export một `interface` hoặc `type` có tên `PdfTemplate`.
  3.  `PdfTemplate` phải ánh xạ chính xác cấu trúc của bảng `templates` trong Supabase.
      - `id`: `string`
      - `created_at`: `string` (hoặc `Date`)
      - `user_id`: `string`
      - `name`: `string`
      - `template_json`: `any` hoặc một kiểu dữ liệu chi tiết hơn nếu bạn import từ thư viện `@pdfme/common` (ví dụ: `Template`). Bắt đầu với `any` là chấp nhận được.

- **Tiêu chí Chấp nhận (Acceptance Criteria):**
  1.  File `/lib/types.ts` tồn tại trong codebase.
  2.  Kiểu `PdfTemplate` được export từ file này.
  3.  Khi import và sử dụng `PdfTemplate` ở một file khác, trình soạn thảo code (VS Code) có thể nhận dạng và tự động gợi ý các thuộc tính `id`, `name`, v.v.

---

#### **Module 1.3: API Route Quản lý Template**

- **Mục tiêu:** Tạo các điểm cuối (endpoints) API backend để thực hiện các thao tác CRUD (Tạo, Đọc) trên các template PDF.

- **Yêu cầu (Requirements):**

  1.  Tạo một file API Route mới tại đường dẫn `/app/api/templates/route.ts`.
  2.  **Triển khai `GET` handler:**
      - Sử dụng Supabase Server Client để tương tác với cơ sở dữ liệu một cách an toàn từ phía máy chủ.
      - Xác thực phiên làm việc của người dùng để lấy `user_id`. Nếu không có phiên làm việc, trả về lỗi 401 Unauthorized.
      - Thực hiện một câu lệnh `SELECT` đến bảng `templates` để lấy tất cả các bản ghi có `user_id` khớp với người dùng đã xác thực.
      - Nếu thành công, trả về một `Response` với status 200 và một mảng các đối tượng `PdfTemplate` trong body.
      - Nếu có lỗi phía máy chủ, trả về status 500 với một thông báo lỗi.
  3.  **Triển khai `POST` handler:**
      - Xác thực phiên làm việc của người dùng. Nếu không có, trả về lỗi 401 Unauthorized.
      - Phân tích (parse) request body để lấy `name` và `template_json`.
      - **Validation:** Sử dụng một thư viện như `zod` để xác thực request body. `name` phải là một chuỗi không rỗng, và `template_json` phải là một đối tượng. Nếu không hợp lệ, trả về lỗi 400 Bad Request.
      - Thực hiện một câu lệnh `INSERT` vào bảng `templates` với dữ liệu đã được xác thực, đính kèm `user_id` của người dùng.
      - Nếu thành công, trả về một `Response` với status 201 Created và đối tượng template vừa được tạo trong body.
      - Nếu có lỗi (ví dụ: lỗi cơ sở dữ liệu), trả về status 500.

- **Tiêu chí Chấp nhận (Acceptance Criteria):**
  1.  **GET Endpoint:**
      - Gửi một request `GET` đến `/api/templates` với một token xác thực hợp lệ sẽ trả về status `200` và một mảng các template chỉ thuộc về người dùng đó.
      - Gửi một request `GET` mà không có token xác thực sẽ trả về status `401`.
  2.  **POST Endpoint:**
      - Gửi một request `POST` đến `/api/templates` với token xác thực và một body hợp lệ (chứa `name` và `template_json`) sẽ tạo một bản ghi mới trong bảng `templates` của Supabase.
      - Request `POST` thành công trả về status `201` và dữ liệu của template mới.
      - Gửi một request `POST` với một body không hợp lệ (ví dụ: thiếu `name`) sẽ trả về status `400`.
      - Gửi một request `POST` mà không có token xác thực sẽ trả về status `401`.
