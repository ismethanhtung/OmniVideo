# [SETUP-TASK-001] Tinh chỉnh Task Workflow theo từng phase triển khai

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [ ] Tests added/updated (if code changed)
- [x] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [x] Done

## 1. Metadata

- Task ID: SETUP-TASK-001
- Phase: Setup
- Target Phase: Setup
- Domain: Governance
- Task Type: Docs
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Project Owner
- Status: Done

## 2. Context

- Lý do: Cần thêm workflow task chi tiết khi chuyển từ setup sang phase triển khai code.
- Bài toán cần giải quyết: Chuẩn hóa checklist task theo loại task (feature, bugfix, research) và dạng đóng dấu dễ nhìn.
- Tài liệu liên quan: docs/governance/task-standard.md, docs/governance/definition-of-ready-done.md, tasks/templates/task-template.md.

## 3. Scope

- In scope: Bổ sung checklist template theo task type và progress stamp `[ ]/[x]`.
- Out of scope: Tích hợp tool tự động enforce.

## 4. Input / Output

- Input: Bộ governance/task hiện tại.
- Output mong đợi: Template task trực quan hơn, dễ theo dõi trạng thái.

## 5. Acceptance Criteria

1. Có checklist riêng cho 3 loại task phổ biến (feature, bugfix, research).
2. Có progress stamp `[ ]/[x]` ở đầu task template.
3. Cập nhật tài liệu governance/task liên quan.
4. Cập nhật changelog sau khi hoàn thành.

## 6. Technical Plan

1. Cập nhật taxonomy task type vào template.
2. Viết checklist cho từng loại task.
3. Bổ sung progress stamp section.
4. Đồng bộ board/changelog.

## 7. Code Change Impact

- Có thay đổi code không: No
- Nếu Yes, module impacted: N/A

## 8. Test Plan

1. Kiểm tra template mới vẫn tương thích task hiện có.
2. Kiểm tra checklist dễ đọc và không trùng lặp vô ích.
3. Kiểm tra board/changelog cập nhật đúng.

## 9. Observability

- Metrics: N/A
- Logs: N/A
- Error codes: N/A

## 10. Risks & Rollback

- Risks: Checklist dài hơn có thể tăng thời gian tạo task ban đầu.
- Rollback strategy: Rút gọn checklist nhưng giữ progress stamp.

## 11. Deliverables

1. Cập nhật `tasks/templates/task-template.md`.
2. Cập nhật `tasks/board.md`.
3. Cập nhật `changelog/changelog.md`.

## 12. Changelog Note

- Changed: Task template now supports `[ ]/[x]` progress stamps and task-type checklists.

## 13. Task Type Checklist (Stamp [x])

### 13.1 Feature

- [ ] Có user/system flow rõ ràng
- [ ] Có acceptance criteria đo được
- [ ] Có test cho happy path
- [ ] Có test cho failure path chính

### 13.2 Bugfix

- [ ] Có mô tả cách tái hiện lỗi
- [ ] Có root cause ngắn gọn
- [ ] Có regression test
- [ ] Có xác nhận lỗi cũ không tái diễn

### 13.3 Research

- [x] Có câu hỏi nghiên cứu rõ
- [x] Có kết quả/khuyến nghị cụ thể
- [x] Có quyết định next step
- [x] Có tài liệu tham chiếu

## 14. Execution Notes

- Assumptions: Giữ markdown checklist để dễ thao tác thủ công.
- Blockers: Không.
- Verification evidence: Template đã có progress stamp và checklist theo loại task.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated: N/A (docs-only task)
- Test commands executed: N/A
- Test results summary: Đã kiểm tra nội dung template render đúng dạng checklist markdown.
