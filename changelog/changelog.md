# OmniVideo Changelog

## 2026-04-25

### Added

- Thêm `docs/SYSTEM-SUMMARY.md` làm bản tổng hợp chuẩn toàn bộ hệ thống và toàn bộ bộ docs hiện hữu.
- Thêm `docs/architecture/testing-strategy.md` để chuẩn hóa chiến lược test cho stack Next.js + MongoDB.
- Thêm `docs/governance/testing-rules.md` với quy tắc cứng: code change phải có test tương ứng, bugfix phải có regression test.
- Thêm `docs/operations/test-execution-playbook.md` để chuẩn hóa quy trình chạy test và xử lý test failures.

### Changed

- Cập nhật `docs/README.md` để bổ sung điều hướng Master Summary và testing docs.
- Cập nhật `docs/AGENTS.md` và `AGENTS.md` thành onboarding guide đồng bộ với testing rules mới.
- Cập nhật `README.md` để nêu rõ rule bắt buộc: code change phải có test.
- Cập nhật governance docs (`ai-agent-rules`, `definition-of-ready-done`, `engineering-rules`, `task-standard`) theo chuẩn testing bắt buộc.
- Cập nhật `tasks/templates/task-template.md` để thêm progress stamp `[ ]/[x]`, `Task Type`, checklist `feature/bugfix/research`, và `Test Evidence`.
- Cập nhật `tasks/README.md` để chuẩn hóa workflow đóng dấu `[x]` theo tiến độ task.
- Cập nhật `tasks/TASK-SETUP-TASK-001.md` và `tasks/board.md` để phản ánh trạng thái hoàn tất cải tiến template.

### Fixed

- Chuẩn hóa lại DoD/agent protocol để không còn khoảng trống "code xong nhưng thiếu test".
- Chuẩn hóa cách nhìn tiến độ task để giảm bỏ sót bước khi thực thi.

### Notes

- Task IDs: SETUP-DOC-002, SETUP-TASK-001
- Risks: Cần giữ kỷ luật thực thi testing rules và progress stamp khi bước vào phase code implementation.

## 2026-04-24

### Added

- Thiết lập documentation system đầy đủ cho repo trong `docs/` theo các cụm product, architecture, domains, operations, governance.
- Bổ sung bộ governance rules chuẩn hóa cách làm việc cho engineering và AI agents.
- Bổ sung task system hoàn chỉnh trong `tasks/` gồm board, backlog, template và task setup mẫu.
- Bổ sung architecture specs cho stack Next.js + MongoDB, gồm system overview, node architecture, data model, integration boundaries.
- Bổ sung operations docs cho observability, connection center, incident playbook.
- Bổ sung domain specs cho source/provider/social/storage/video pipeline/multilingual audio/affiliate blueprint.

### Changed

- Cập nhật `README.md` thành entrypoint điều hướng tài liệu chính thức.

### Fixed

- Chuẩn hóa lại vị trí changelog chính thức về `changelog/changelog.md` để tránh phân tán tài liệu.

### Notes

- Task IDs: SETUP-DOC-001, SETUP-GOV-001, SETUP-ARCH-001
- Risks: Cần duy trì cập nhật docs đồng bộ với code trong các phase triển khai tiếp theo.
