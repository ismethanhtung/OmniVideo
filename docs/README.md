# OmniVideo Documentation Index

Tài liệu chính thức cho repo OmniVideo (single-user system), định hướng `MVP trước` nhưng kiến trúc mở rộng dài hạn.

## Mục tiêu bộ docs

- Chuẩn hóa cách thiết kế, triển khai, vận hành và mở rộng hệ thống.
- Ép kỷ luật kỹ thuật qua rules rõ ràng, đặc biệt khi phát triển bằng AI agent.
- Đảm bảo mọi thay đổi đều có truy vết (task -> code -> changelog -> vận hành).

## Cấu trúc tài liệu

### Product

- `docs/product/product-charter.md`: tôn chỉ sản phẩm, mục tiêu và nguyên tắc cốt lõi.
- `docs/product/roadmap.md`: roadmap theo phase và milestone đo được.
- `docs/product/scope-boundaries.md`: biên giới scope từng phase.

### Architecture

- `docs/architecture/system-overview.md`: tổng quan kiến trúc hệ thống.
- `docs/architecture/node-architecture.md`: mô hình workspace node-based.
- `docs/architecture/data-model.md`: thiết kế dữ liệu MongoDB metadata-first.
- `docs/architecture/integration-boundaries.md`: chuẩn adapter và biên giới tích hợp.
- `docs/architecture/nextjs-mongodb-conventions.md`: quy ước triển khai kỹ thuật cho stack Next.js + MongoDB.

### Domains

- `docs/domains/source-management.md`: quản lý nguồn nội dung.
- `docs/domains/ai-provider-management.md`: quản lý account/quota/fallback provider.
- `docs/domains/social-account-management.md`: quản lý tài khoản social và publish mapping.
- `docs/domains/storage-strategy.md`: chiến lược lưu trữ binary + metadata.
- `docs/domains/video-pipeline.md`: pipeline video module hóa.
- `docs/domains/multilingual-audio.md`: định hướng audio đa ngôn ngữ (Việt/Anh).
- `docs/domains/affiliate-automation.md`: blueprint affiliate automation (deferred).

### Operations

- `docs/operations/observability.md`: metrics/logs/traces và dashboard vận hành.
- `docs/operations/connection-management.md`: Connection Center cho tất cả tích hợp.
- `docs/operations/incident-playbook.md`: playbook xử lý sự cố.

### Governance

- `docs/governance/engineering-rules.md`
- `docs/governance/product-rules.md`
- `docs/governance/ai-agent-rules.md`
- `docs/governance/task-standard.md`
- `docs/governance/definition-of-ready-done.md`
- `docs/governance/changelog-policy.md`

### Board và thay đổi

- `tasks/README.md`: quy trình task board.
- `tasks/board.md`: board trạng thái chính.
- `tasks/templates/task-template.md`: template task bắt buộc.
- `tasks/backlog-phase-setup.md`: backlog khởi tạo.
- `changelog/changelog.md`: lịch sử thay đổi chính thức.

## Quy tắc đọc tài liệu

1. Bắt đầu từ `product-charter` trước khi đọc chi tiết kỹ thuật.
2. Task nào cũng phải link ít nhất 1 tài liệu domain hoặc architecture liên quan.
3. Không coi docs là tham khảo tùy chọn, docs là một phần của định nghĩa hoàn thành.
