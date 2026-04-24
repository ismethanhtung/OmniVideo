# OmniVideo

OmniVideo là hệ thống nội bộ (single-user) để thu thập nguồn nội dung, xử lý pipeline video và quản lý tài nguyên vận hành theo hướng `MVP-first`.

Stack định hướng hiện tại:

- Next.js (App Router) + TypeScript
- MongoDB (metadata-first)

## Project Status

Repo đang ở **Phase Setup**: ưu tiên hoàn thiện tài liệu, rules, task governance và kiến trúc nền trước khi triển khai business logic lớn.

## Getting Started

1. Tạo `.env.local` từ `.env.example`.
2. Điền biến môi trường:
    - `MONGODB_URI`
    - `MONGODB_DB_NAME`
3. Khi có source code app hoàn chỉnh, chạy:

```bash
npm install
npm run dev
```

## Documentation

- Master summary: `docs/SYSTEM-SUMMARY.md`
- Docs index: `docs/README.md`

Cụm tài liệu chính:

- Product: `docs/product/*`
- Architecture: `docs/architecture/*`
- Domains: `docs/domains/*`
- Operations: `docs/operations/*`
- Governance: `docs/governance/*`

## Task Management

- Board: `tasks/board.md`
- Backlog setup: `tasks/backlog-phase-setup.md`
- Template task: `tasks/templates/task-template.md`
- Quy trình task: `tasks/README.md`

## Changelog

- Chính thức: `changelog/changelog.md`

## Working Rules (Mandatory)

1. Mọi thay đổi phải gắn Task ID.
2. Mọi task phải có acceptance criteria và test plan.
3. Code change phải có test mới hoặc cập nhật test tương ứng.
4. Mọi task hoàn tất phải cập nhật changelog.
5. Không merge thay đổi lớn nếu chưa cập nhật docs liên quan.
