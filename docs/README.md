# OmniVideo Documentation Index

Tài liệu chính thức cho repo OmniVideo (single-user system), định hướng `MVP trước` nhưng kiến trúc mở rộng dài hạn.

## Mục tiêu bộ docs

- Chuẩn hóa cách thiết kế, triển khai, vận hành và mở rộng hệ thống.
- Ép kỷ luật kỹ thuật qua rules rõ ràng, đặc biệt khi phát triển bằng AI agent.
- Đảm bảo mọi thay đổi đều có truy vết (task -> code -> changelog -> vận hành).

## Bắt đầu đọc từ đâu

1. `docs/SYSTEM-SUMMARY.md` để nắm toàn cảnh.
2. `docs/product/product-charter.md` để nắm mục tiêu/scope.
3. `docs/governance/ai-agent-rules.md` để nắm quy tắc thực thi bắt buộc.

## Cấu trúc tài liệu

### Master Summary

- `docs/SYSTEM-SUMMARY.md`: bản tổng hợp đầy đủ toàn hệ thống.
- `docs/AGENTS.md`: hướng dẫn vào việc nhanh cho AI agents.

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
- `docs/architecture/testing-strategy.md`: chiến lược test chuẩn cho codebase.

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
- `docs/operations/tutorial-docs.md`: hướng dẫn tích hợp dài cho OAuth/social publish và troubleshooting.
- `docs/operations/test-execution-playbook.md`: playbook chạy test và xử lý lỗi test.

### Governance

- `docs/governance/engineering-rules.md`
- `docs/governance/product-rules.md`
- `docs/governance/ai-agent-rules.md`
- `docs/governance/task-standard.md`
- `docs/governance/definition-of-ready-done.md`
- `docs/governance/changelog-policy.md`
- `docs/governance/testing-rules.md`

### Board và thay đổi

- `tasks/README.md`: quy trình task board.
- `tasks/board.md`: board trạng thái chính.
- `tasks/templates/task-template.md`: template task bắt buộc.
- `tasks/backlog-phase-setup.md`: backlog khởi tạo.
- `changelog/changelog.md`: lịch sử thay đổi chính thức.

## Quy tắc đọc tài liệu

1. Bắt đầu từ `SYSTEM-SUMMARY` trước khi đi vào chi tiết.
2. Task nào cũng phải link ít nhất 1 tài liệu domain hoặc architecture liên quan.
3. Không coi docs là tham khảo tùy chọn, docs là một phần của định nghĩa hoàn thành.
