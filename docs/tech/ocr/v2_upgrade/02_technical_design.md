Tài liệu này không chỉ giải quyết vấn đề ban đầu mà còn tích hợp các giải pháp nâng cao và những lưu ý đặc thù cho việc xử lý tài liệu tiếng Việt.

---

## **Technical Design: Intelligent OCR Triggering System v2.0**

### 1. Bối Cảnh và Vấn Đề

Hệ thống xử lý PDF hiện tại (v1.0) sử dụng một logic đơn giản để quyết định khi nào cần kích hoạt OCR: kiểm tra độ dài của văn bản trích xuất được. Cụ thể, nếu `text.length > 50`, hệ thống giả định đó là một file PDF dạng văn bản (text-based) và bỏ qua bước OCR.

**Vấn đề cốt lõi:** Logic này đã bị "đánh lừa" bởi các file PDF chứa các chuỗi vô nghĩa nhưng có độ dài lớn, chẳng hạn như các dòng dấu chấm (`.......`). Điều này dẫn đến việc hệ thống phân loại sai một file PDF dạng ảnh thành dạng văn bản, trả về nội dung rác và không bao giờ thực hiện OCR, khiến quá trình trích xuất thông tin thất bại hoàn toàn.

### 2. Phân Tích Nguyên Nhân Gốc Rễ

Vấn đề không nằm ở việc triển khai mà ở chính chiến lược tiếp cận:

*   **Kiểm tra dựa trên SỐ LƯỢNG (Quantity), không phải CHẤT LƯỢNG (Quality):** Hệ thống chỉ quan tâm "có bao nhiêu ký tự" mà không hiểu "ký tự đó có mang ý nghĩa hay không".
*   **Thiếu khả năng nhận diện mẫu (Pattern Detection):** Hệ thống không được trang bị để phát hiện các mẫu dữ liệu vô nghĩa, lặp đi lặp lại.

### 3. Giải Pháp Kỹ Thuật: Hệ Thống Xác Thực Chất Lượng Văn Bản

Để giải quyết triệt để, chúng ta sẽ thay thế logic kiểm tra độ dài đơn thuần bằng một **module xác thực chất lượng văn bản thông minh**. Module này sẽ phân tích nội dung văn bản được trích xuất và đưa ra một **điểm số tin cậy (Confidence Score)**, thay vì một quyết định `true/false` cứng nhắc.

Luồng xử lý mới sẽ như sau:
1.  Trích xuất văn bản thô từ một trang/file PDF.
2.  Đưa văn bản thô qua **Module Xác Thực Chất Lượng**.
3.  Module trả về một điểm tin cậy (ví dụ: `0.85`).
4.  Hệ thống so sánh điểm này với một ngưỡng có thể cấu hình (`OCR_TRIGGER_CONFIDENCE_THRESHOLD`).
    *   Nếu `confidence > threshold`, coi đây là văn bản hợp lệ.
    *   Nếu `confidence <= threshold`, kích hoạt luồng OCR.

### 4. Thiết Kế Chi Tiết và Kế Hoạch Triển Khai

#### **Giai đoạn 1: Xây dựng Module Xác thực Chất lượng Văn bản (`text-validation.ts`)**

Đây là trái tim của giải pháp. Module sẽ export một hàm chính: `validateTextQuality`.

**Input:** `text: string`
**Output:** `TextValidationResult`

```typescript
// /src/types/ocr.ts
interface TextValidationResult {
  confidence: number; // Điểm tin cậy từ 0.0 đến 1.0
  isValid: boolean;     // Kết quả cuối cùng dựa trên ngưỡng
  reason: string;       // Lý do đưa ra kết luận (hữu ích cho việc debug)
  metrics: {
    normalizedLength: number;
    syllableCount: number;    // Đếm "tiếng" cho tiếng Việt
    uniqueChars: number;
    entropy: number;
  };
}```

**Các bước xử lý bên trong `validateTextQuality`:**

1.  **Chuẩn Hóa Unicode (Cực kỳ quan trọng cho Tiếng Việt):**
    *   **Hành động:** Chuẩn hóa chuỗi đầu vào về dạng NFC (Precomposed).
    *   **Lý do:** Đảm bảo tính nhất quán và loại bỏ lỗi so sánh/tính toán do các cách biểu diễn ký tự khác nhau.
    *   **Code:** `const normalizedText = text.normalize('NFC');`

2.  **Tính Toán Các Metric:**
    *   **Syllable Count (Thay cho Word Count):**
        *   **Hành động:** Sử dụng Regex hỗ trợ Unicode để đếm các "tiếng" (chuỗi ký tự chữ/số).
        *   **Lý do:** Regex `/\s+/` không đúng cho tiếng Việt. Cách tiếp cận này thực tế và đủ tốt cho bài toán phân loại.
        *   **Code:** `const syllables = normalizedText.match(/[\p{L}\p{N}]{2,}/gu) || []; const syllableCount = syllables.length;`
    *   **Unique Characters:**
        *   **Hành động:** Đếm số lượng ký tự duy nhất.
        *   **Lý do:** Giúp phát hiện các chuỗi lặp lại như `........`.
        *   **Code:** `const uniqueChars = new Set(normalizedText).size;`
    *   **Entropy (Tính ngẫu nhiên/hỗn loạn):**
        *   **Hành động:** Tính toán entropy Shannon của chuỗi.
        *   **Lý do:** Văn bản thực sự có entropy cao hơn các chuỗi lặp lại. Một hàm tính entropy chuẩn sẽ được triển khai.

3.  **Tính Toán Điểm Tin Cậy (Confidence Score):**
    *   **Hành động:** Áp dụng một công thức có trọng số dựa trên các metric và các ngưỡng cấu hình để ra một điểm số từ 0.0 đến 1.0. Đây là logic cốt lõi cần được tinh chỉnh qua thực tế.
    *   **Ví dụ logic:** Bắt đầu với điểm 1.0, trừ điểm nếu vi phạm các ngưỡng. Ví dụ: nếu `syllableCount < MIN_SYLLABLE_COUNT`, trừ `0.4` điểm; nếu `uniqueChars < MIN_UNIQUE_CHARS`, trừ `0.5` điểm, v.v.

#### **Giai đoạn 2: Cập nhật Cấu hình Hệ thống**

Bổ sung các biến môi trường hoặc hằng số cấu hình mới để hệ thống linh hoạt.

```typescript
// /src/config.ts or .env
export const OCR_CONFIG = {
  // Ngưỡng quyết định cuối cùng
  OCR_TRIGGER_CONFIDENCE_THRESHOLD: 0.5,
  
  // Các ngưỡng để tính toán điểm tin cậy
  MIN_SYLLABLE_COUNT: 8,
  MIN_UNIQUE_CHARS: 15,
  MIN_TEXT_ENTROPY: 2.5,
};
```

#### **Giai đoạn 3: Tích hợp vào `HybridPdfProcessor`**

Cập nhật lại logic phân loại ban đầu và phân loại từng trang.

**Code cũ:**
`if (data.text && data.text.length > 50) { ... }`

**Code mới:**
```typescript
import { validateTextQuality } from './utils/text-validation';
import { OCR_CONFIG } from '../config';

// ... bên trong performInitialCheck hoặc classifyPages

const validationResult = validateTextQuality(data.text);

// Ghi log để tiện debug
console.log(`Validation for page ${i}:`, validationResult);

if (validationResult.confidence > OCR_CONFIG.OCR_TRIGGER_CONFIDENCE_THRESHOLD) {
    // Là văn bản hợp lệ
    return { type: 'text', content: data.text, ... };
} else {
    // Cần OCR, ghi rõ lý do
    console.log(`Triggering OCR for page ${i}. Reason: ${validationResult.reason}`);
    return { type: 'scan_or_hybrid', ... };
}
```

#### **Giai đoạn 4: Tối ưu Prompt cho Gemini API**

Khi luồng OCR được kích hoạt, đảm bảo prompt gửi đến Gemini được tối ưu cho tiếng Việt.

**Prompt cũ:** "Extract text from this image."

**Prompt mới, mạnh mẽ hơn:**
`"Hãy nhận dạng và trích xuất toàn bộ văn bản trong hình ảnh này. Văn bản được viết bằng tiếng Việt có dấu. Vui lòng giữ nguyên dấu và định dạng gốc một cách chính xác nhất có thể."`

### 5. Kế Hoạch Kiểm Thử và Xác Minh

Cần chuẩn bị một bộ dữ liệu PDF đa dạng để kiểm thử, bao gồm:
1.  **PDF Lỗi (Problematic):** File chỉ chứa các dòng dấu chấm (`.......`). -> **Kỳ vọng:** Phải kích hoạt OCR.
2.  **PDF Văn Bản Tiếng Việt Hợp Lệ:** Một trang hợp đồng, bài báo. -> **Kỳ vọng:** Không kích hoạt OCR.
3.  **PDF Dạng Ảnh Scan:** Một tài liệu được scan hoàn toàn. -> **Kỳ vọng:** Phải kích hoạt OCR.
4.  **PDF Lai (Hybrid):** Có cả text và hình ảnh. -> **Kỳ vọng:** Xử lý chính xác từng trang.
5.  **PDF Cận Biên (Edge Case):** Chứa một câu rất ngắn nhưng hợp lệ ("Đã thanh toán."). -> **Kỳ vọng:** Không kích hoạt OCR (cần tinh chỉnh ngưỡng để đạt được điều này).
6.  **PDF Rỗng:** File PDF không có nội dung. -> **Kỳ vọng:** Xử lý mượt mà, không gây lỗi.

### 6. Kết Luận

Việc chuyển đổi sang hệ thống xác thực chất lượng dựa trên điểm tin cậy sẽ giúp hệ thống trở nên:
*   **Thông minh hơn:** Có khả năng phân biệt nội dung có ý nghĩa và nội dung rác.
*   **Mạnh mẽ hơn:** Xử lý tốt hơn các tài liệu tiếng Việt và các trường hợp đặc biệt.
*   **Dễ bảo trì hơn:** Logic phức tạp được đóng gói trong một module riêng, các ngưỡng xử lý có thể được tinh chỉnh dễ dàng qua cấu hình.

Đây là một bước tiến quan trọng để nâng cao độ chính xác và độ tin cậy của toàn bộ luồng xử lý tài liệu.