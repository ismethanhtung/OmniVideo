# Product Charter

## 1. Product Statement

OmniVideo là hệ thống nội bộ phục vụ một người vận hành cá nhân, dùng để thu thập nguồn nội dung, biến đổi thành video theo pipeline linh hoạt, lưu trữ có truy vết, và chuẩn bị cho xuất bản đa nền tảng.

## 2. Product Goals

1. Rút ngắn thời gian từ ý tưởng/link nguồn đến output video usable.
2. Quản lý tập trung nguồn, tài nguyên AI, tài khoản social, và lịch sử xử lý.
3. Tạo nền tảng node-based để mở rộng automation mà không phá kiến trúc.
4. Đảm bảo quan sát hệ thống rõ ràng: biết đang lỗi ở đâu, vì sao, retry thế nào.

## 3. Product Principles

1. Single-user first: tối ưu workflow cá nhân, không tối ưu đa người dùng ở giai đoạn đầu.
2. MVP first: ưu tiên end-to-end chạy được trước, tối ưu sâu sau.
3. Extensibility first: module hóa để dễ thêm node/provider/platform.
4. Metadata-first: mọi output phải truy vết được về source + flow + account + timestamp.
5. Reliability first: tích hợp nào cũng có health check, timeout, retry policy rõ ràng.

## 4. Primary Users

- User duy nhất: owner/vận hành chính.
- AI agents: tác nhân hỗ trợ code/docs/task dưới quy tắc governance trong repo.

## 5. Core Capabilities

1. Intake đa nguồn: URL, text/script, file, feed.
2. Pipeline xử lý: scene breakdown, visual/audio generation, edit/transforms.
3. Quản trị tài nguyên: AI provider account, social account, storage assets.
4. Quan sát vận hành: trạng thái run/step, lỗi, latency, retry.
5. Chuẩn hóa phát triển: docs/rules/tasks/changelog bắt buộc.

## 6. Non-Goals (Current Phase)

1. Không xây multi-tenant hoặc marketplace.
2. Không tối ưu hệ permission phức tạp cho nhiều team.
3. Không triển khai đầy đủ affiliate automation production trong phase setup.

## 7. Success Criteria (Setup + MVP-Ready)

1. Có bộ docs và governance đầy đủ, dùng được ngay trong repo.
2. Có định nghĩa kỹ thuật rõ cho MVP URL Intake Pipeline.
3. Có task board + template task + DoR/DoD + changelog policy hoạt động.
4. Có kiến trúc Next.js + MongoDB metadata-first nhất quán.

## 8. Constraints

1. Stack chính: Next.js + MongoDB.
2. Phát triển ban đầu ưu tiên tốc độ triển khai nhưng không hy sinh data integrity.
3. Tích hợp bên thứ ba (AI/social/storage) luôn được đóng gói qua adapter.

## 9. Compliance Baseline

1. Chỉ xử lý và phân phối nội dung khi có quyền sử dụng phù hợp.
2. Không thiết kế tính năng nhằm né cơ chế kiểm duyệt bản quyền hoặc vi phạm chính sách nền tảng.
3. Lưu metadata chứng minh nguồn và quyền sử dụng khi có yêu cầu.
