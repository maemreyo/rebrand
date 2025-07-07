Tuyệt vời. Đây chính là tư duy của một người xây dựng hệ thống. Dựa trên tất cả những gì chúng ta đã thảo luận, đây là một workflow được tối ưu hóa toàn diện, cân bằng giữa tốc độ, chi phí và độ chính-xác cao nhất.

Chúng ta sẽ gọi nó là **"Workflow Lai Thông Minh" (Intelligent Hybrid Workflow)**.

Mục tiêu cốt lõi của workflow này là: **Không bao giờ dùng đến OCR (đắt và chậm) cho những gì có thể trích xuất trực tiếp (rẻ và nhanh).**

---

### Sơ Đồ Luồng Logic

```
[Bắt đầu] -> Nhận file PDF
    |
    |-> (Bước 1) Trích xuất thử bằng `pdf-parse` cho TOÀN BỘ file
    |
    |-> [KIỂM TRA] -> Văn bản trích xuất có đầy đủ và hợp lý không?
    |      |
    |      |---- (YES) ----> [KẾT THÚC] -> Trả về văn bản (Nhanh, Rẻ, Chính xác 100%)
    |
    |---- (NO / Văn bản rỗng hoặc rất ít) ----> Đây là PDF Scan/Hybrid. Kích hoạt luồng OCR.
           |
           |-> (Bước 2) PHÂN LOẠI TỪNG TRANG:
           |      |-> Dùng `pdf-parse` cho từng trang.
           |      |-> Trang nào có text -> Lưu text.
           |      |-> Trang nào không có text -> Đánh dấu là "cần OCR".
           |
           |-> (Bước 3) XỬ LÝ CÁC TRANG CẦN OCR:
           |      |-> 3a. Dùng `pdf2pic` chuyển các trang này thành ảnh CHẤT LƯỢNG CAO (300 DPI).
           |      |-> 3b. (Tùy chọn) Dùng `sharp` để tối ưu ảnh (grayscale, crop).
           |      |-> 3c. Gửi từng ảnh đến Gemini API để nhận dạng văn bản.
           |
           |-> (Bước 4) TỔNG HỢP KẾT QUẢ:
           |      |-> Sắp xếp lại văn bản từ (Bước 2) và (Bước 3) theo đúng thứ tự trang.
           |
           |-> (Bước 5) DỌN DẸP -> Xóa các file ảnh tạm.
           |
           |-> [KẾT THÚC] -> Trả về văn bản hoàn chỉnh.
```

---

### Chi Tiết Từng Bước Thực Hiện (trong môi trường Next.js Fullstack)

Môi trường Next.js yêu cầu chúng ta xử lý file trong bộ nhớ (in-memory) thay vì đọc/ghi trực tiếp từ hệ thống file như trong môi trường Node.js truyền thống. File PDF sẽ được nhận dưới dạng đối tượng `File` từ một form upload phía client.

#### **Bước 0: Chuẩn Bị Môi Trường**
1.  **Cài đặt `poppler`** trên hệ thống của bạn (cần cho `pdf2pic`).
2.  Cài đặt các thư viện cần thiết bằng `pnpm`:
    ```bash
    pnpm add pdf-parse pdf2pic @google/genai sharp
    ```
    *   `pdf-parse`: Để trích xuất text.
    *   `pdf2pic`: Để chuyển PDF thành ảnh.
    *   `@google/genai`: SDK mới của Gemini.
    *   `sharp`: Để tối ưu ảnh (khuyến khích).

#### **Bước 1: Phân Loại Sơ Bộ (Triage) trong API Route**
Đây là bước "cửa ngõ" để tiết kiệm 90% công sức, được thực hiện ngay trong API route của Next.js.
```typescript
// src/app/api/extract-pdf/route.ts
import { GoogleGenerativeAI } from "@google/genai";
import { NextResponse } from "next/server";
import pdf from "pdf-parse";

// Khởi tạo Gemini Client (nên đặt API key trong .env.local)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

async function initialCheck(pdfBuffer: Buffer) {
    const data = await pdf(pdfBuffer);

    // Nếu văn bản có vẻ ổn (hơn 50 ký tự), giả định nó là text-based.
    if (data.text && data.text.length > 50) {
        console.log("PDF is text-based. Processing complete!");
        return { type: 'text', content: data.text, numpages: data.numpages };
    } else {
        console.log("PDF appears to be scanned or empty. Starting hybrid workflow.");
        return { type: 'scan_or_hybrid', content: null, numpages: data.numpages };
    }
}
```

#### **Bước 2: Phân Loại Từng Trang (Page-level Classification)**
Nếu bước 1 thất bại, chúng ta sẽ đi sâu hơn, vẫn xử lý với Buffer.
```typescript
// (tiếp theo trong file route.ts)
async function classifyPages(pdfBuffer: Buffer, numPages: number) {
    const pagesWithText: { [key: number]: string } = {};
    const pagesToOcr: number[] = [];

    for (let i = 1; i <= numPages; i++) {
        const options = { max: 1, page_num: i }; // Chỉ xử lý trang i
        const data = await pdf(pdfBuffer, options);

        // Đặt một ngưỡng, ví dụ 20 ký tự, để xác định trang có text hay là trang scan.
        if (data.text.trim().length > 20) {
            pagesWithText[i] = data.text;
        } else {
            pagesToOcr.push(i);
        }
    }
    return { pagesWithText, pagesToOcr };
}
```

#### **Bước 3: Luồng OCR cho các trang ảnh**
Đây là luồng xử lý "hạng nặng", được điều chỉnh để làm việc với Buffer.
```typescript
// (tiếp theo trong file route.ts)
import { fromBuffer } from "pdf2pic";
import sharp from "sharp";

// Hàm chuyển đổi Buffer ảnh sang Base64
async function imageBufferToBase64(imageBuffer: Buffer) {
    // Tối ưu ảnh trước khi gửi (ví dụ: grayscale, resize)
    const optimizedImage = await sharp(imageBuffer)
        .grayscale()
        .toBuffer();
    return optimizedImage.toString("base64");
}

async function ocrPages(pdfBuffer: Buffer, pageNumbers: number[]) {
    const ocrResults: { [key: number]: string } = {};
    const conversionOptions = {
        density: 300,
        format: "png",
        width: 2550,
        height: 3300,
    };

    // pdf2pic's fromBuffer trả về một hàm chuyển đổi
    const convert = fromBuffer(pdfBuffer, conversionOptions);
    const geminiModel = genAI.getGenerativeModel({ model: "gemini-pro-vision" });

    // Xử lý song song để tăng tốc
    await Promise.all(pageNumbers.map(async (pageNum) => {
        // Chuyển đổi từng trang và nhận về buffer
        const imageResult = await convert(pageNum, { responseType: "buffer" });
        const imageBase64 = await imageBufferToBase64(imageResult.buffer);

        const result = await geminiModel.generateContent([
            "Extract all text from this image.",
            { inlineData: { data: imageBase64, mimeType: "image/png" } }
        ]);
        
        ocrResults[pageNum] = result.response.text();
    }));

    return ocrResults;
}
```

#### **Bước 4 & 5: Tổng Hợp và Trả về Response**
Cuối cùng, ta ghép tất cả lại trong hàm `POST` của API route.
```typescript
// (Hàm POST chính trong file route.ts)
export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
        }

        const pdfBuffer = Buffer.from(await file.arrayBuffer());

        // Bước 1
        const initial = await initialCheck(pdfBuffer);
        if (initial.type === 'text') {
            return NextResponse.json({ content: initial.content });
        }

        // Bước 2
        const { pagesWithText, pagesToOcr } = await classifyPages(pdfBuffer, initial.numpages);
        
        // Bước 3
        const ocrResults = await ocrPages(pdfBuffer, pagesToOcr);

        // Bước 4: Tổng hợp
        let finalContent = "";
        for (let i = 1; i <= initial.numpages; i++) {
            if (pagesWithText[i]) {
                finalContent += pagesWithText[i] + "\n";
            } else if (ocrResults[i]) {
                finalContent += ocrResults[i] + "\n";
            }
        }

        // Bước 5: Dọn dẹp (không cần vì không lưu file tạm)
        return NextResponse.json({ content: finalContent });

    } catch (error) {
        console.error("Error processing PDF:", error);
        return NextResponse.json({ error: "Failed to process PDF." }, { status: 500 });
    }
}
```

### Tại Sao Workflow Này Tối Ưu?

| Tiêu chí | Lợi ích của Workflow Lai |
| :--- | :--- |
| **Chi phí** | **Tối thiểu hóa.** Chi phí API của Gemini chỉ phát sinh cho những trang THỰC SỰ cần OCR, không lãng phí cho các trang đã có text. |
| **Tốc độ** | **Tối đa hóa.** Các trang text-based được xử lý gần như tức thì. Chỉ những trang scan mới phải chịu độ trễ của việc chuyển đổi ảnh và gọi API. |
| **Độ chính xác** | **Cao nhất.** Giữ lại 100% độ chính xác của văn bản gốc (không có lỗi OCR). Chỉ áp dụng OCR ở những nơi bắt buộc, nơi chất lượng ảnh đã được kiểm soát (DPI cao). |
| **Khả năng mở rộng** | **Bền vững.** Dễ dàng xử lý song song các trang cần OCR, quản lý hàng đợi và xử lý lỗi cho từng trang một cách độc lập. |
| **Tính mạnh mẽ** | **Chống chịu lỗi tốt.** Hệ thống có thể xử lý mượt mà cả 3 loại PDF (text, scan, hybrid) mà không cần can thiệp thủ công. |

Bằng cách áp dụng workflow này, bạn không chỉ đơn thuần là "dùng API", mà đang **thiết kế một quy trình xử lý tài liệu thông minh và hiệu quả**, xứng tầm một ứng dụng chuyên nghiệp.