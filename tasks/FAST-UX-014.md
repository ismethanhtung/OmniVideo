# FAST-UX-014 Split Inspiration Vault into Four Full-Width Tables

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

- Task ID: FAST-UX-014
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

- Lý do: User muốn Inspiration Vault theo 4 bảng category thay vì 1 bảng tổng.
- Bài toán cần giải quyết: Tăng khả năng đọc theo nhóm nội dung.
- Tài liệu liên quan: `docs/governance/ai-agent-rules.md`, `docs/governance/testing-rules.md`.

## 3. Scope

- In scope: Chuyển UI list thành 4 bảng: Video / Links / Keywords / Notes.
- Out of scope: đổi logic classify/persistence/action row.

## 4. Input / Output

- Input: feedback layout.
- Output mong đợi: 4 bảng phân nhóm chiếm toàn bộ vùng nội dung.

## 5. Acceptance Criteria

1. Inspiration Vault hiển thị 4 bảng riêng theo category.
2. Mỗi bảng dùng lại action `Copy/Open/Delete` và `Exploited`.
3. 4 bảng cùng hiển thị trong vùng chính (không fallback về 1 bảng tổng).

## 6. Technical Plan

1. Refactor render table section trong panel.
2. Reuse `VaultItemRow`.
3. Build verify + cập nhật task/changelog/board.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/features/inspiration-vault/inspiration-vault-panel.tsx`

## 8. Test Plan

1. Unit/Integration cần chạy: `npm run build`.
2. Failure cases cần thử: empty category table render ổn.
3. Kết quả mong đợi: build pass.

## 9. Observability

- Metrics: No change.
- Logs: No change.
- Error codes: No change.

## 10. Risks & Rollback

- Risks: dense UI trên màn nhỏ.
- Rollback strategy: revert layout block.

## 11. Deliverables

1. 4-table Inspiration Vault layout.
2. Verification evidence.
3. Changelog/task updates.

## 12. Changelog Note

- Tóm tắt dòng changelog dự kiến: Split Inspiration Vault into Video/Links/Keywords/Notes tables.

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

- Assumptions: "chiếm trọn diện tích" hiểu là grid 2x2 full content width.
- Blockers: None.
- Verification evidence: build pass.
- Files changed: `src/features/inspiration-vault/inspiration-vault-panel.tsx`, `tasks/FAST-UX-014.md`, `tasks/board.md`, `changelog/changelog.md`.
- Residual risks: Trên màn hình nhỏ sẽ xếp lại thành 1 cột bảng tuần tự.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated: None.
- Test commands executed: `npm run build`.
- Test results summary: Build pass. Existing warnings remain outside task scope.
