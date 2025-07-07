Chắc chắn rồi. Sau khi đã có dữ liệu cấu trúc từ AI, bước tiếp theo là đưa nó vào một môi trường nơi người dùng có thể xem, kiểm soát và tinh chỉnh. Đây là lúc **Module Editor Nội dung** với Tiptap phát huy tác dụng.

---

### **Phase 3: Module Editor Nội dung (Human-in-the-Loop)**

**Mục tiêu tổng thể của Phase 3:** Cung cấp một giao diện chỉnh sửa văn bản WYSIWYG (What You See Is What You Get) mạnh mẽ, cho phép người dùng tương tác trực quan với nội dung đã được AI cấu trúc hóa. Module này là cầu nối quan trọng giữa quá trình tự động và sự kiểm soát của con người.

---

#### **Module 3.1: Adapter Chuyển đổi Dữ liệu (`geminiJsonToTiptapJson`)**

- **Mục tiêu:** Xây dựng một hàm "phiên dịch" đáng tin cậy để chuyển đổi cấu trúc dữ liệu "chuẩn" từ Gemini thành định dạng JSON mà Tiptap có thể hiểu và hiển thị được (ProseMirror JSON).

- **Yêu cầu (Requirements):**

  1.  Tạo một file mới tại đường dẫn `/lib/adapters.ts` (hoặc thêm vào file đã có).
  2.  Định nghĩa và export một hàm có tên `geminiJsonToTiptapJson` với chữ ký kiểu: `(doc: AnalyzedDocument): Record<string, any>`.
  3.  Hàm này nhận đầu vào là một mảng các `DocumentBlock` (kiểu `AnalyzedDocument` đã định nghĩa).
  4.  Logic của hàm phải duyệt qua từng block trong mảng đầu vào và chuyển đổi nó thành một node tương ứng của ProseMirror/Tiptap.
      - Sử dụng một câu lệnh `switch` trên thuộc tính `block.type`.
      - **Case `'heading'`: ** Chuyển đổi thành một node Tiptap `heading` với `type: 'heading'` và `attrs: { level: block.level }`. Nội dung text sẽ nằm trong mảng `content`.
      - **Case `'paragraph'`: ** Chuyển đổi thành một node Tiptap `paragraph` với `type: 'paragraph'`.
      - **Case `'mcq'`: ** Đây là trường hợp phức tạp, yêu cầu một **Custom Node** trong Tiptap. Hàm này sẽ chuyển đổi thành một node có `type: 'multipleChoiceQuestion'` và các thuộc tính `question`, `options`, `answer` sẽ được đưa vào object `attrs`.
  5.  Hàm phải trả về một đối tượng JSON duy nhất có cấu trúc gốc là `{ type: 'doc', content: [...] }`, trong đó `content` là một mảng chứa các node đã được chuyển đổi.

- **Tiêu chí Chấp nhận (Acceptance Criteria):**
  1.  Hàm `geminiJsonToTiptapJson` tồn tại và được export từ `/lib/adapters.ts`.
  2.  Khi truyền vào một mảng `AnalyzedDocument` mẫu, hàm trả về một đối tượng JSON ProseMirror hợp lệ mà không gây ra lỗi runtime.
  3.  Cấu trúc JSON đầu ra có thể được nạp thành công vào một instance Tiptap Editor bằng lệnh `editor.commands.setContent(result, true)`.
  4.  Hàm xử lý được trường hợp đầu vào là một mảng rỗng, trả về một đối tượng Tiptap document rỗng (`{ type: 'doc', content: [] }`).

---

#### **Module 3.2: Tiptap Custom Node (cho các block phức tạp)**

- **Mục tiêu:** Mở rộng khả năng của Tiptap để nó có thể hiển thị và cho phép chỉnh sửa các loại block nội dung tùy chỉnh, không phải là văn bản tiêu chuẩn, ví dụ như câu hỏi trắc nghiệm (MCQ).

- **Yêu cầu (Requirements):**

  1.  Tạo một file mới tại `/components/tiptap-extensions/MultipleChoiceQuestionNode.ts`.
  2.  Sử dụng hàm `Node.create({})` của Tiptap để định nghĩa một node mới.
  3.  **Cấu hình Node:**

      - `name`: `'multipleChoiceQuestion'`. Tên này phải khớp với `type` được tạo ra trong adapter ở Module 3.1.
      - `group`: `'block'`.
      - `atom`: `true`. Điều này có nghĩa là node này được coi là một khối duy nhất, không thể di chuyển con trỏ vào bên trong nó.
      - `addAttributes()`: Định nghĩa các thuộc tính mà node này sẽ lưu trữ: `question` (string), `options` (array of strings), `answer` (string). Cung cấp giá trị mặc định cho chúng.
      - `parseHTML()`: Định nghĩa cách Tiptap chuyển đổi từ HTML sang node này (không bắt buộc cho flow hiện tại, nhưng quan trọng nếu có chức năng copy-paste).
      - `renderHTML({ HTMLAttributes })`: Định nghĩa cách node này được render thành HTML tĩnh trong editor.
      - `addNodeView()`: **Phần quan trọng nhất.** Sử dụng `ReactNodeViewRenderer` để liên kết node này với một component React (`MultipleChoiceQuestionView.tsx`).

  4.  **Tạo Component View (`/components/tiptap-extensions/MultipleChoiceQuestionView.tsx`):**
      - Đây là một component React (`'use client'`).
      - Nó sẽ nhận các props từ Tiptap như `node`, `updateAttributes`, `deleteNode`.
      - Component này sẽ render giao diện thực tế cho câu hỏi trắc nghiệm, sử dụng các component của Shadcn/ui như `Input` cho câu hỏi và `RadioGroup` cho các lựa chọn.
      - Khi người dùng thay đổi nội dung (ví dụ, sửa text câu hỏi hoặc chọn một đáp án khác), component phải gọi hàm `updateAttributes` để cập nhật dữ liệu trở lại vào Tiptap state.

- **Tiêu chí Chấp nhận (Acceptance Criteria):**
  1.  Custom Node `MultipleChoiceQuestionNode` được tạo và có thể thêm vào danh sách `extensions` của Tiptap Editor.
  2.  Khi nội dung Tiptap chứa một node `multipleChoiceQuestion`, component React `MultipleChoiceQuestionView` được render ra trong editor.
  3.  Người dùng có thể tương tác với các `Input` và `RadioGroup` bên trong component view.
  4.  Mọi thay đổi của người dùng trên view (sửa câu hỏi, chọn đáp án) được phản ánh lại trong dữ liệu JSON của Tiptap (có thể kiểm tra bằng `editor.getJSON()`).

---

#### **Module 3.3: Giao diện Trang Rebranding Chính**

- **Mục tiêu:** Xây dựng giao diện người dùng hoàn chỉnh, kết nối các module lại với nhau thành một luồng làm việc liền mạch.

- **Yêu cầu (Requirements):**

  1.  Tạo component trang chính tại `/app/rebrand/page.tsx`. Đây phải là một component client (`'use client'`) vì nó chứa nhiều tương tác.
  2.  **Bố cục giao diện (sử dụng Shadcn/ui):**
      - **Khu vực Input:** Một `Textarea` lớn để người dùng dán văn bản. Một `Button` "Analyze Document".
      - **Khu vực Cấu hình:** Một `Select` để người dùng chọn template PDF (lấy dữ liệu từ API `/api/templates`).
      - **Khu vực Editor:** Một `Card` hoặc một vùng được định dạng rõ ràng để chứa Tiptap Editor.
      - **Khu vực Hành động:** Một `Button` "Export to PDF", có thể bị vô hiệu hóa (disabled) cho đến khi quá trình phân tích hoàn tất.
  3.  **Quản lý State:**
      - Sử dụng hook `useState` của React để quản lý các trạng thái: `isLoadingAI`, `aiError`, `analyzedContent`, `selectedTemplateId`, ...
  4.  **Luồng Tương tác:**
      - Khi component được mount, gọi API `GET /api/templates` để điền vào `Select` chọn template.
      - Khi người dùng nhấn "Analyze Document":
        - Set `isLoadingAI` thành `true` (để hiển thị spinner hoặc loading state trên button).
        - Gọi API `POST /api/analyze`.
        - Khi nhận được kết quả, gọi adapter `geminiJsonToTiptapJson`.
        - Sử dụng `editor.commands.setContent()` để nạp dữ liệu vào Tiptap.
        - Set `isLoadingAI` thành `false`.
        - Xử lý và hiển thị lỗi nếu có.
      - Khi người dùng nhấn "Export to PDF", logic sẽ được triển khai ở Phase 4.

- **Tiêu chí Chấp nhận (Acceptance Criteria):**
  1.  Giao diện trang Rebrand hiển thị đầy đủ các thành phần như đã mô tả.
  2.  Dropdown chọn template hiển thị chính xác danh sách template của người dùng đang đăng nhập.
  3.  Khi nhấn nút "Analyze Document", một chỉ báo loading xuất hiện, và sau khi hoàn tất, nội dung được hiển thị chính xác trong Tiptap Editor.
  4.  Nếu có lỗi xảy ra trong quá trình phân tích AI, một thông báo lỗi (ví dụ: dùng component `Toast` hoặc `Alert` của Shadcn/ui) được hiển thị cho người dùng.
  5.  Tiptap Editor hoạt động mượt mà, người dùng có thể chỉnh sửa nội dung đã được AI tạo ra.
