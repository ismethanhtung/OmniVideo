# FAST-UX-018 Align Outer Border Spacing for Inspiration Vault and Video Tools Lab

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

- Task ID: FAST-UX-018
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

- Lý do: Viền ngoài `Inspiration Vault` và `Video Tools Lab` đang sát mép hơn các trang khác.
- Bài toán cần giải quyết: Đồng bộ padding/wrapper route để border spacing nhất quán toàn app.
- Tài liệu liên quan: `docs/governance/ai-agent-rules.md`, `docs/governance/testing-rules.md`.

## 3. Scope

- In scope: chỉnh spacing wrapper route cho 2 trang.
- Out of scope: thay đổi logic nội dung panel.

## 4. Input / Output

- Input: feedback không đồng đều border spacing.
- Output mong đợi: 2 trang có khoảng cách viền tương đương các trang khác.

## 5. Acceptance Criteria

1. Inspiration Vault không còn sát mép hơn phần còn lại.
2. Video Tools Lab không còn sát mép hơn phần còn lại.
3. Không ảnh hưởng logic feature.

## 6. Technical Plan

1. Refactor branch layout trong content-router.
2. Giữ full-height behavior cho Inspiration Vault.
3. Build verify + cập nhật artifacts.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/components/layout/content-router.tsx`

## 8. Test Plan

1. Unit/Integration cần chạy: `npm run build`.
2. Failure cases cần thử: compile/type errors.
3. Kết quả mong đợi: build pass.

## 9. Observability

- Metrics: No change.
- Logs: No change.
- Error codes: No change.

## 10. Risks & Rollback

- Risks: none significant.
- Rollback strategy: revert route spacing changes.

## 11. Deliverables

1. Unified border spacing for 2 pages.
2. Build evidence.
3. Changelog/task updates.

## 12. Changelog Note

- Tóm tắt dòng changelog dự kiến: Align outer border spacing for Inspiration Vault and Video Tools Lab with standard page layout.

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

- Assumptions: Chuẩn spacing tham chiếu là wrapper `px-5 py-5`.
- Blockers: None.
- Verification evidence: `npm run build` pass.
- Files changed: `src/components/layout/content-router.tsx`, `tasks/FAST-UX-018.md`, `tasks/board.md`, `changelog/changelog.md`.
- Residual risks: none significant.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated: None.
- Test commands executed: `npm run build`.
- Test results summary: Build pass. Existing warnings remain outside task scope.
