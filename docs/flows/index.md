# Development Flows

This document outlines the key data flows and interactions between different modules within the DocRebrander application. It serves as a technical "contract" to ensure seamless integration and clear responsibilities.

## Table of Contents

*   [Flow 1: Template Retrieval](01_template_retrieval.md)
*   [Flow 2: Content Analysis and Structuring](02_content_analysis.md)
*   [Flow 3: PDF Generation](03_pdf_generation.md)

## Module Responsibilities Summary

- **Frontend (`page.tsx`)**: Chịu trách nhiệm quản lý trạng thái UI, điều phối các lời gọi API, và xử lý tương tác của người dùng. Nó không biết logic nghiệp vụ bên trong của AI hay PDF.
- **Adapters (`adapters.ts`)**: Là các "phiên dịch viên" chuyên biệt. Trách nhiệm duy nhất của chúng là chuyển đổi dữ liệu từ định dạng A sang định dạng B một cách chính xác. Chúng không chứa logic gọi API hay quản lý state.
- **API Routes (`/api/...`)**: Là lớp nghiệp vụ (business logic layer). Chúng chịu trách nhiệm xác thực, tương tác với các dịch vụ bên ngoài (Gemini, Supabase, `pdfme`), và thực thi các quy tắc của ứng dụng. Chúng không biết về UI.
- **Cơ sở dữ liệu (`Supabase`)**: Chịu trách nhiệm lưu trữ dữ liệu một cách bền vững và bảo mật.
- **Các Engines (`Tiptap`, `pdfme`, `Gemini`)**: Là các công cụ chuyên dụng, thực thi các tác vụ cốt lõi theo chỉ thị.