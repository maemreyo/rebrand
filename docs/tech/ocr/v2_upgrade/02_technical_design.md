Tài liệu này không chỉ giải quyết vấn đề ban đầu mà còn tích hợp các giải pháp nâng cao và những lưu ý đặc thù cho việc xử lý tài liệu tiếng Việt.

---

## **Technical Design: Intelligent OCR Triggering System v2.0**

### 1. Bối Cảnh và Vấn Đề

Hệ thống xử lý PDF hiện tại (v1.0) sử dụng một logic đơn giản dựa trên độ dài văn bản (`text.length > 50`) để quyết định khi nào cần kích hoạt OCR. Logic này đã bị "đánh lừa" bởi các file PDF chứa các chuỗi vô nghĩa (ví dụ: `.......`), dẫn đến việc bỏ sót OCR và trả về nội dung không chính xác.

### 2. Phân Tích Nguyên Nhân Gốc Rễ

Vấn đề cốt lõi là hệ thống chỉ kiểm tra **SỐ LƯỢNG** (Quantity) mà không đánh giá **CHẤT LƯỢNG** (Quality) của văn bản.

### 3. Giải Pháp Kỹ Thuật: Hệ Thống Xác Thực Chất Lượng Văn Bản

Chúng ta sẽ thay thế logic cũ bằng một **module xác thực chất lượng văn bản thông minh**. Module này sẽ phân tích nội dung và đưa ra một **điểm số tin cậy (Confidence Score)**. Nếu điểm số thấp hơn một ngưỡng nhất định, hệ thống sẽ kích hoạt OCR.

### 4. Thiết Kế Chi Tiết và Kế Hoạch Triển Khai

**Chiến lược cốt lõi:** Triển khai theo 2 giai đoạn để tối ưu nguồn lực và thời gian.
*   **Giai đoạn 1 (Hiện tại):** Xây dựng một hệ thống **Xác thực dựa trên Quy tắc Heuristic**. Giải pháp này nhanh, chi phí thấp, và hiệu quả để giải quyết vấn đề trước mắt.
*   **Giai đoạn 2 (Tương lai):** Nâng cấp hệ thống bằng **Mô hình Học máy (ML)** để phát hiện văn bản rác (Gibberish Detection) nhằm đạt độ chính xác cao nhất.

---

### **Giai đoạn 1: Xác thực dựa trên Quy tắc Heuristic (Heuristic Rule-based Validation)**

#### **Bước 1: Lựa chọn và Cài đặt các Thư viện**

Chúng ta sẽ chỉ sử dụng các thư viện cần thiết cho việc tính toán các chỉ số cơ bản:

1.  **Tính toán Entropy (Độ ngẫu nhiên):**
    *   **Package:** `fast-password-entropy`
2.  **Phân tích Tiếng Việt (Đếm "tiếng"):**
    *   **Package:** `vntk`

**Lệnh cài đặt:**
```bash
pnpm install fast-password-entropy vntk
```

#### **Bước 2: Xây dựng Module `text-validation.ts`**

Module sẽ tính toán các chỉ số và áp dụng một bộ quy tắc để đưa ra điểm tin cậy.

**Input:** `text: string`
**Output:** `TextValidationResult`

```typescript
// /src/types/ocr.ts (cập nhật)
interface TextValidationResult {
  confidence: number;
  isValid: boolean;
  reason: string;
  metrics: {
    charLength: number;
    syllableCount: number;
    syllableDensity: number; // Metric mới, rất quan trọng
    entropy: number;
  };
}

// /src/lib/utils/text-validation.ts (Logic Heuristic)
import { stringEntropy } from 'fast-password-entropy';
import { wordTokenizer } from 'vntk';

export function validateTextQuality(text: string): TextValidationResult {
  const normalizedText = text.normalize('NFC').trim();
  const charLength = normalizedText.length;

  if (charLength < OCR_CONFIG.MIN_ABSOLUTE_LENGTH) {
    // Trả về không hợp lệ nếu quá ngắn
  }

  const syllableCount = wordTokenizer().tag(normalizedText).length;
  const entropy = stringEntropy(normalizedText);
  const syllableDensity = charLength > 0 ? syllableCount / charLength : 0;

  // Áp dụng bộ quy tắc để tính điểm tin cậy
  let confidence = 1.0;
  let reason = "Valid text";

  // QUY TẮC 1: Mật độ "tiếng" quá thấp -> Dấu hiệu rõ nhất của văn bản rác
  if (syllableDensity < OCR_CONFIG.MIN_SYLLABLE_DENSITY) {
    return { confidence: 0, isValid: false, reason: `Low syllable density (${syllableDensity.toFixed(3)})`, /* ... */ };
  }

  // QUY TẮC 2: Entropy quá thấp -> Dấu hiệu của chuỗi lặp lại
  if (entropy < OCR_CONFIG.MIN_TEXT_ENTROPY) {
    confidence -= 0.6;
    reason = `Low entropy (${entropy.toFixed(2)}) suggests repetitive text.`;
  }
  
  // QUY TẮC 3: Số lượng "tiếng" tối thiểu
  if (syllableCount < OCR_CONFIG.MIN_SYLLABLE_COUNT) {
    confidence -= 0.4;
    reason = `Syllable count (${syllableCount}) is low.`;
  }

  const finalConfidence = Math.max(0, confidence);
  const isValid = finalConfidence > OCR_CONFIG.OCR_TRIGGER_CONFIDENCE_THRESHOLD;

  return { /* ... kết quả ... */ };
}
```

#### **Bước 3: Cập nhật Cấu hình và Tích hợp**

Cập nhật `OCR_CONFIG` với các ngưỡng phù hợp cho giải pháp Heuristic.

```typescript
// /src/config.ts or .env
export const OCR_CONFIG = {
  OCR_TRIGGER_CONFIDENCE_THRESHOLD: 0.5, // Ngưỡng quyết định
  MIN_ABSOLUTE_LENGTH: 10,               // Ngưỡng ký tự tối thiểu
  MIN_SYLLABLE_COUNT: 3,                 // Ngưỡng "tiếng" tối thiểu
  MIN_SYLLABLE_DENSITY: 0.05,            // Mật độ tiếng/ký tự (quan trọng)
  MIN_TEXT_ENTROPY: 1.5,
};
```

---
### **Giai đoạn 2: Nâng cấp với Học máy (Future Enhancement)**

Phần này được giữ lại trong thiết kế để định hướng cho tương lai khi có đủ nguồn lực.

*   **Hành động:** Tích hợp thư viện `@kele23/gibberish`.
*   **Cải tiến:** Huấn luyện một mô hình riêng cho Tiếng Việt để tăng độ chính xác.
*   **Lợi ích:** Có khả năng phát hiện các mẫu văn bản vô nghĩa phức tạp hơn mà giải pháp dựa trên quy tắc có thể bỏ sót.

### 5. Kế Hoạch Kiểm Thử và Xác Minh (Chi tiết)

Mục tiêu của giai đoạn này là đảm bảo logic xác thực mới hoạt động chính xác, hiệu quả và không gây ảnh hưởng tiêu cực đến hiệu năng hệ thống.

#### **5.1. Bộ Dữ Liệu Kiểm Thử (Test Data Set)**

Cần chuẩn bị một bộ dữ liệu PDF đa dạng để bao quát các kịch bản sau:

| Loại PDF | Mô tả | Kết quả Kỳ vọng | Lý do (Dự kiến) |
| :--- | :--- | :--- | :--- |
| **PDF Lỗi (Problematic)** | File chỉ chứa các dòng dấu chấm (`.......`) hoặc ký tự lặp lại (`ababab...`). | **Phải kích hoạt OCR** | `confidence: 0`, `reason: "Low syllable density"` |
| **PDF Rác (Gibberish)** | File chứa các chuỗi ký tự ngẫu nhiên (`asdfjkl;...`). | **Phải kích hoạt OCR** | `confidence: 0`, `reason: "Low syllable density"` |
| **PDF Văn bản Hợp lệ** | Một trang hợp đồng, bài báo Tiếng Việt chuẩn. | **Không kích hoạt OCR** | `confidence > threshold`, `reason: "Valid text"` |
| **PDF Dạng Ảnh Scan** | Một tài liệu được scan hoàn toàn, không có lớp text. | **Phải kích hoạt OCR** | `charLength: 0` (sau khi `pdf-parse` không trích xuất được gì) |
| **PDF Lai (Hybrid)** | Có cả trang chứa text và trang được scan. | **Xử lý đúng từng trang** | Logic `validateTextQuality` được áp dụng cho từng trang. |
| **PDF Cận biên (Ngắn)** | Chứa một câu rất ngắn nhưng hợp lệ (ví dụ: "Đã thanh toán."). | **Không kích hoạt OCR** | `syllableCount` và `charLength` vượt ngưỡng tối thiểu. |
| **PDF Cận biên (Dài)** | Chứa một câu rất dài nhưng vô nghĩa. | **Phải kích hoạt OCR** | `syllableDensity` thấp. |
| **PDF Rỗng** | File PDF không có nội dung. | **Xử lý mượt mà, không lỗi** | Bỏ qua, không kích hoạt OCR. |

#### **5.2. Các Bước Kiểm Thử Chi Tiết**

1.  **Kiểm thử Logic Xác thực:**
    *   **Hành động:** Viết một script kiểm thử riêng (ví dụ: `test-text-validation.js`) để gọi trực tiếp hàm `validateTextQuality` với các chuỗi văn bản mẫu (lấy từ bộ dữ liệu trên).
    *   **Xác minh:**
        *   Đối với chuỗi `........`, kết quả phải là `{ isValid: false, confidence: 0 }`.
        *   Đối với chuỗi "Hợp đồng mua bán nhà đất", kết quả phải là `{ isValid: true, confidence > 0.5 }`.
        *   Kiểm tra các giá trị `metrics` và `reason` để đảm bảo các quy tắc đang được áp dụng đúng.

2.  **Kiểm thử Tích hợp End-to-End:**
    *   **Hành động:** Sử dụng giao diện người dùng hoặc gọi API để tải lên từng file trong "Bộ Dữ Liệu Kiểm Thử".
    *   **Xác minh:**
        *   Theo dõi log của hệ thống để xem output của hàm `validateTextQuality` cho từng trang.
        *   Kiểm tra kết quả cuối cùng: văn bản trích xuất được có đúng là từ OCR hay từ text gốc không?
        *   Kiểm tra metadata trả về (`method: 'text-only'`, `'ocr-only'`, hoặc `'hybrid'`) có khớp với loại PDF đã tải lên không.

#### **5.3. Đo lường và Đánh giá Hiệu năng (Performance Benchmark)**

Logic mới sẽ tốn thêm một chút thời gian xử lý so với việc chỉ kiểm tra `text.length`. Cần đảm bảo chi phí này là không đáng kể.

*   **Hành động:**
    1.  Chuẩn bị một file PDF lớn chỉ chứa văn bản (ví dụ: 50-100 trang).
    2.  Viết một script để xử lý file này 10 lần bằng logic **cũ** và ghi lại tổng thời gian.
    3.  Viết một script để xử lý file này 10 lần bằng logic **mới** và ghi lại tổng thời gian.
*   **Xác minh:**
    *   Tính toán thời gian xử lý trung bình cho mỗi lần chạy.
    *   **Kết quả kỳ vọng:** Thời gian xử lý của logic mới không được vượt quá 15% so với logic cũ. Mức chênh lệch này được coi là chấp nhận được cho sự gia tăng về độ chính xác.

### 6. Kết Luận

Việc triển khai theo **phương pháp Heuristic trước mắt** là một cách tiếp cận thực tế, giúp **giải quyết vấn đề ngay lập tức** với chi phí và thời gian tối ưu. Hệ thống vẫn sẽ trở nên:
*   **Thông minh hơn:** Phân biệt được nội dung có ý nghĩa và nội dung rác phổ biến.
*   **Mạnh mẽ hơn:** Xử lý tốt hơn các trường hợp như `.......`.
*   **Dễ nâng cấp:** Kiến trúc module cho phép dễ dàng tích hợp giải pháp học máy trong tương lai mà không cần thay đổi lớn.
