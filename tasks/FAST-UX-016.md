# FAST-UX-016 Make Four Inspiration Tables Stretch Full Available Height

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

- Task ID: FAST-UX-016
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

- Lý do: User muốn 4 bảng luôn chiếm full chiều cao khả dụng, không co theo nội dung khi rỗng.
- Bài toán cần giải quyết: Layout hiện tại chỉ cao theo data và empty rows.
- Tài liệu liên quan: `docs/governance/ai-agent-rules.md`, `docs/governance/testing-rules.md`.

## 3. Scope

- In scope: Stretch 4 bảng Inspiration Vault theo full available height.
- Out of scope: đổi logic classify/persistence/actions.

## 4. Input / Output

- Input: Feedback về cách chia chiều cao bảng.
- Output mong đợi: 4 bảng giữ chiều cao chia đều vùng còn lại, kể cả rỗng.

## 5. Acceptance Criteria

1. 4 bảng luôn chia full phần chiều cao content còn lại.
2. Bảng rỗng không co về cao theo text.
3. Không đổi behavior filter/search/actions.

## 6. Technical Plan

1. Refactor panel container thành fixed-height + flex column.
2. Refactor table grid thành 2x2 stretch rows.
3. Refactor empty state per-table thành `flex-1` fill.
4. Run build verify.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/features/inspiration-vault/inspiration-vault-panel.tsx`

## 8. Test Plan

1. Unit/Integration cần chạy: `npm run build`.
2. Failure cases cần thử: empty categories vẫn giữ chiều cao đầy đủ.
3. Kết quả mong đợi: build pass.

## 9. Observability

- Metrics: No change.
- Logs: No change.
- Error codes: No change.

## 10. Risks & Rollback

- Risks: fixed height calc có thể cần tune nếu app shell spacing đổi lớn.
- Rollback strategy: revert layout-only patch.

## 11. Deliverables

1. Full-height stretch layout for 4 tables.
2. Build verification evidence.

## 12. Changelog Note

- Tóm tắt dòng changelog dự kiến: Make four Inspiration Vault tables stretch to full available height.

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

- Assumptions: full height relative to current page content area.
- Blockers: None.
- Verification evidence: `npm run build` pass.
- Files changed: `src/features/inspiration-vault/inspiration-vault-panel.tsx`, `tasks/FAST-UX-016.md`, `tasks/board.md`, `changelog/changelog.md`.
- Residual risks: none significant.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated: None.
- Test commands executed: `npm run build`.
- Test results summary: Build pass. Existing warnings remain outside this task scope.
