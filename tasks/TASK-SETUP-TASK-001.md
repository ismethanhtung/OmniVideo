# [SETUP-TASK-001] Tinh chỉnh Task Workflow theo từng phase triển khai

## 1. Metadata

- Task ID: SETUP-TASK-001
- Phase: Setup
- Target Phase: Setup
- Domain: Governance
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Project Owner
- Status: Todo

## 2. Context

- Lý do: Cần thêm workflow task chi tiết khi chuyển từ setup sang phase triển khai code.
- Bài toán cần giải quyết: Chuẩn hóa checklist task theo loại task (feature, bugfix, research).
- Tài liệu liên quan: docs/governance/task-standard.md, docs/governance/definition-of-ready-done.md.

## 3. Scope

- In scope: Bổ sung checklist template theo task type.
- Out of scope: Tích hợp tool tự động enforce.

## 4. Input / Output

- Input: Bộ governance hiện tại.
- Output mong đợi: Workflow task chuẩn hơn cho giai đoạn code chính thức.

## 5. Acceptance Criteria

1. Có checklist riêng cho 3 loại task phổ biến.
2. Cập nhật tài liệu governance tương ứng.
3. Cập nhật changelog sau khi hoàn thành.

## 6. Technical Plan

1. Định nghĩa taxonomy task type.
2. Viết checklist cho từng loại.
3. Gắn checklist vào template task.

## 7. Test Plan

1. Kiểm tra template mới vẫn tương thích task hiện có.
2. Kiểm tra checklist không trùng lặp vô ích.

## 8. Observability

- Metrics: N/A
- Logs: N/A
- Error codes: N/A

## 9. Risks & Rollback

- Risks: Checklist quá dài gây chậm execution.
- Rollback strategy: Thu gọn về checklist tối thiểu.

## 10. Deliverables

1. Cập nhật docs governance.
2. Cập nhật task template.

## 11. Changelog Note

- Changed: Task workflow refined for implementation phases.

## 12. Execution Notes

- Assumptions: Phase setup đã hoàn tất.
- Blockers: Chưa có.
- Verification evidence: Chưa có.
