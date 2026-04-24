# Scope Boundaries

## 1. Boundary by Product Intent

In scope:

1. Hệ thống nội bộ cho 1 user.
2. Workflow tạo/xử lý/quản lý video và metadata.
3. Quản lý tài khoản AI/social/storage theo hướng vận hành thực dụng.

Out of scope:

1. Multi-user permission model phức tạp.
2. SaaS billing/multi-tenant.
3. Full enterprise compliance framework.

## 2. Boundary by Current Setup Phase

In scope:

1. Dựng docs, rules, task governance, changelog policy.
2. Thiết kế kiến trúc và data model.
3. Định nghĩa rõ roadmap phase tiếp theo.

Out of scope:

1. Triển khai nghiệp vụ video production đầy đủ.
2. Triển khai affiliate automation production.
3. Tối ưu performance production scale.

## 3. Boundary by MVP Phase 1

In scope:

1. URL intake cho 1 nguồn đầu vào.
2. Queue + worker + metadata + trạng thái run/step.
3. Connection check cơ bản cho DB/storage/downloader.

Out of scope:

1. Workspace graph UI hoàn chỉnh.
2. Đăng đa nền tảng production-ready.
3. Phân tích trend tự động nâng cao.

## 4. Change Control Rule

1. Mọi yêu cầu mới phải ghi rõ phase đích.
2. Nếu yêu cầu mới làm tăng scope > 20% của phase đang chạy, phải tách task mới.
3. Nếu yêu cầu đụng nhiều domain cùng lúc, bắt buộc viết technical note trước khi code.
