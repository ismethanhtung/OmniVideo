# OmniVideo

OmniVideo là hệ thống cá nhân để quản lý nguồn nội dung, ingest video, xử lý pipeline video và chuẩn bị hướng mở rộng thành workspace node-based.

## Trạng thái hiện tại
- `v0 setup`: docs-first, UI-second.
- Stack kỹ thuật: `Next.js (App Router) + MongoDB Atlas`.
- Chưa bật auth ở v0 (internal prototype).

## Mục tiêu MVP hiện tại
- Luồng tối giản: paste link video -> ingest job -> lưu metadata + storage reference -> trả link truy xuất.
- Quản lý task/rules/changelog rõ ràng để phát triển ổn định.

## Cấu trúc tài liệu
- Kế hoạch tổng: `docs/plan.md`
- Kiến trúc: `docs/architecture/*`
- Domain: `docs/domains/*`
- Dữ liệu + API: `docs/data/*`, `docs/api/*`
- Vận hành: `docs/ops/*`
- Chính sách: `docs/policy/*`
- Quản lý dự án: `docs/project/*`

## Thiết lập môi trường (v0)
- Biến môi trường bắt buộc:
  - `MONGODB_URI`
  - `MONGODB_DB_NAME`

Chi tiết xem `docs/ops/env-setup.md`.
# OmniVideo
