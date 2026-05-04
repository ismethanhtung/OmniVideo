# FAST-UX-015 Simplify Inspiration Vault Tables

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [x] Done

## 1. Metadata

- Task ID: FAST-UX-015
- Phase: P2
- Target Phase: P2
- Domain: UX
- Task Type: Refactor
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: User
- Status: Done

## 2. Context

- Lý do: User muốn bảng gọn hơn và luôn hiện 4 bảng cả khi trống.
- Bài toán cần giải quyết: bỏ cột Reference, bỏ nút Open, và không dùng empty-state tổng.
- Tài liệu liên quan: `docs/governance/ai-agent-rules.md`, `docs/governance/testing-rules.md`.

## 3. Scope

- In scope: update layout/actions of 4 inspiration tables.
- Out of scope: thay đổi logic classify/persistence.

## 4. Input / Output

- Input: UX feedback.
- Output mong đợi: 4 bảng luôn hiện full area với cột/actions rút gọn.

## 5. Acceptance Criteria

1. Không còn cột `Reference`.
2. Không còn nút `Open`.
3. 4 bảng luôn render kể cả khi rỗng.

## 6. Technical Plan

1. Refactor table headers/rows.
2. Remove global empty branch.
3. Build verify + update artifacts.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/features/inspiration-vault/inspiration-vault-panel.tsx`

## 8. Test Plan

1. Unit/Integration cần chạy: `npm run build`.
2. Failure cases cần thử: empty categories still render.
3. Kết quả mong đợi: build pass.

## 9. Observability

- Metrics: No change.
- Logs: No change.
- Error codes: No change.

## 10. Risks & Rollback

- Risks: None significant.
- Rollback strategy: revert table layout changes.

## 11. Deliverables

1. Simplified 4-table layout.
2. Build evidence.
3. Changelog/task updates.

## 12. Changelog Note

- Tóm tắt dòng changelog dự kiến: Remove reference/open and keep four inspiration tables persistent even when empty.

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

- [ ] Có câu hỏi nghiên cứu rõ
- [ ] Có kết quả/khuyến nghị cụ thể
- [ ] Có quyết định next step
- [ ] Có tài liệu tham chiếu

## 14. Execution Notes

- Assumptions: keep existing search/filter/status behavior.
- Blockers: None.
- Verification evidence: build pass.
- Files changed: `src/features/inspiration-vault/inspiration-vault-panel.tsx`, `tasks/FAST-UX-015.md`, `tasks/board.md`, `changelog/changelog.md`.
- Residual risks: None.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated: None.
- Test commands executed: `npm run build`.
- Test results summary: Build pass. Existing warnings remain outside task scope.
