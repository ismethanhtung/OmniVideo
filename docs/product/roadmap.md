# Roadmap

Roadmap tập trung theo phase, mỗi phase phải có output đo được.

## Phase Setup (Now)

Mục tiêu: dựng nền tảng tài liệu, governance và định nghĩa kiến trúc.

Deliverables:

1. Documentation system hoàn chỉnh trong repo.
2. Rules kỹ thuật/sản phẩm/agent/task/changelog.
3. Backlog phase setup + template task chuẩn.
4. Kiến trúc và data model cho Next.js + MongoDB.

Definition of Success:

1. Agent mới vào repo vẫn chạy đúng quy trình chỉ bằng đọc docs.
2. Mọi task mới đều theo template chuẩn và có acceptance criteria.

## Phase 1 - MVP URL Intake Pipeline

Mục tiêu: tạo flow end-to-end tối thiểu cho 1 URL nguồn.

Phạm vi:

1. Nhận URL và validate.
2. Enqueue job.
3. Worker download asset (qua adapter có thể thay thế).
4. Lưu binary + metadata run/step vào MongoDB.
5. Hiển thị trạng thái run/step/event và lỗi.

Definition of Success:

1. 1 URL đi qua full flow và trả output pointer + metadata trace.
2. Có retry/error handling và logs tối thiểu.

## Phase 2 - Core Management

Mục tiêu: quản trị nền tảng vận hành.

Phạm vi:

1. AI Provider Management: account/model/quota/spend/fallback.
2. Social Account Management: account/permission/health/publish mapping.
3. Connection Center: trạng thái kết nối toàn hệ thống.

Definition of Success:

1. Có thể kiểm tra nhanh hệ thống đang khỏe hay lỗi ở đâu.
2. Có chính sách chọn provider ưu tiên + fallback khi fail.

## Phase 3 - Video Pipeline Modularization

Mục tiêu: chuẩn hóa pipeline theo node module.

Phạm vi:

1. Node contracts rõ input/output/config.
2. Edit node cốt lõi: trim/blur/overlay/audio mix/subtitle timeline.
3. Output node lưu storage + chuẩn bị publish.

Definition of Success:

1. Có thể tạo nhiều flow video mà không hard-code logic riêng lẻ.

## Phase 4 - Workspace Node-Based UI

Mục tiêu: giao diện kéo-thả pipeline dạng graph (n8n-like).

Phạm vi:

1. Graph editor cơ bản.
2. Node catalog.
3. Run pipeline từ graph đã lưu.

Definition of Success:

1. User tự cấu hình pipeline trên UI mà không cần sửa code trực tiếp.

## Phase 5 - Advanced Domains (Deferred)

1. Multilingual audio production (Việt + Anh ưu tiên).
2. Affiliate automation lifecycle (campaign/comment/track/report).
3. API/MCP/CLI exposure cho tích hợp ngoài.

## Prioritization Rule

1. Nếu xung đột giữa đẹp và chạy được ở MVP: chọn chạy được.
2. Nếu xung đột giữa thêm tính năng mới và ổn định nền: chọn ổn định nền.
3. Nếu feature không có traceability/observability: chưa được ưu tiên làm.
