# FAST-UX-011 Simplify Inspiration Vault Header and Remove Stats

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

- Task ID: FAST-UX-011
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

- Lý do: User yêu cầu loại bỏ toàn bộ intro copy + stats block ở Inspiration Vault và thay logo/icon thành Idea.
- Bài toán cần giải quyết: UI cần gọn hơn, bỏ logic/render không cần thiết.
- Tài liệu liên quan: `docs/governance/ai-agent-rules.md`, `docs/governance/testing-rules.md`.

## 3. Scope

- In scope: Remove intro/stat blocks + related logic; đổi icon sang idea/lightbulb style.
- Out of scope: Đổi behavior capture/filter/toggle/delete.

## 4. Input / Output

- Input: Feedback UI simplification.
- Output mong đợi: Vault không còn intro/stats block và dùng idea icon.

## 5. Acceptance Criteria

1. UI không còn các nội dung user yêu cầu bỏ.
2. Logic tính stats không còn trong component nếu không dùng.
3. Header icon dùng ý tưởng (idea).

## 6. Technical Plan

1. Refactor `inspiration-vault-panel.tsx`.
2. Dọn import/state/helper không còn dùng.
3. Chạy test/build và cập nhật task/changelog/board.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/features/inspiration-vault/inspiration-vault-panel.tsx`

## 8. Test Plan

1. Unit/Integration cần chạy: `npm run test -- --run src/lib/inspiration-vault/inspiration-vault.test.ts src/components/layout/navigation.test.ts`.
2. Failure cases cần thử: compile/type errors do remove code.
3. Kết quả mong đợi: tests pass, build pass.

## 9. Observability

- Metrics: No change.
- Logs: No change.
- Error codes: No change.

## 10. Risks & Rollback

- Risks: UI có thể quá tối giản.
- Rollback strategy: Revert panel-only changes.

## 11. Deliverables

1. Simplified Inspiration Vault shell.
2. Verification evidence.
3. Changelog entry.

## 12. Changelog Note

- Tóm tắt dòng changelog dự kiến: Remove Inspiration Vault intro/stats blocks and switch icon to idea.

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

- Assumptions: Chỉ remove phần user liệt kê.
- Blockers: None.
- Verification evidence: Targeted tests pass; production build pass.
- Files changed: `src/features/inspiration-vault/inspiration-vault-panel.tsx`, `tasks/FAST-UX-011.md`, `tasks/board.md`, `changelog/changelog.md`.
- Residual risks: None beyond existing repo warnings outside scope.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated: None.
- Test commands executed: `npm run test -- --run src/lib/inspiration-vault/inspiration-vault.test.ts src/components/layout/navigation.test.ts`; `npm run build`.
- Test results summary: Tests pass (2 files / 14 tests). Build pass. Existing warnings remain outside this task scope.
