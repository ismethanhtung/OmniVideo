# FAST-ACCESS-004 Fix View Mode error visibility without eager Inspiration warnings

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

- Task ID: FAST-ACCESS-004
- Phase: P2
- Target Phase: P2
- Domain: Access Control / UX
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: User
- Status: Done

## 2. Context

- Lý do: User báo Inspiration Vault đỏ ngay khi chưa thao tác, trong khi nhiều panel như Publish Records, Storage Library, Social Accounts hiển thị lỗi View Mode/failed bằng text xám.
- Bài toán cần giải quyết: chỉ hiện cảnh báo đỏ ở Inspiration Vault sau hành động bị khóa, và các status/error failed do action bị chặn phải có màu đỏ rõ ràng.
- Tài liệu liên quan: `docs/operations/public-demo-mode.md`, `docs/governance/versioning-rules.md`.

## 3. Scope

- In scope: Inspiration Vault locked feedback timing; failed status/message red treatment in affected social/storage/video-intake panels; patch version bump; tests/changelog/board.
- Out of scope: redesign full notification system or toast framework.

## 4. Input / Output

- Input: Public visitor in View Mode triggers data-changing actions.
- Output mong đợi: no eager red warning before action; blocked/failed messages are visually red and legible.

## 5. Acceptance Criteria

1. Inspiration Vault does not render the red View Mode warning until a locked action is attempted.
2. Publish Records, Storage Library, Social Accounts, Storage Providers, Published Content, Platform Tasks, Video Intake, and Local Upload Intake render failed status/messages in red instead of muted gray.
3. Existing specific View Mode messages remain intact and are not replaced by the short note alone.
4. Version bumps from `0.4.0` to `0.4.1` as a patch bugfix release.
5. Targeted tests, full tests, and build pass.

## 6. Technical Plan

1. Change Inspiration Vault banner condition from demo-mode presence to `lockedMessage`.
2. Add small local `cn` helpers where needed and switch failed status/message/error-code classes to rose/red tones.
3. Add regression source-contract tests for the touched panels.
4. Bump patch version and update changelog/board after verification.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/features/inspiration-vault`, `src/features/social`, `src/features/storage`, `src/features/video-intake`.

## 8. Test Plan

1. Unit/source-contract cần chạy: touched panel tests.
2. Failure cases cần thử: failed View Mode/write-blocked messages should not be muted; Inspiration warning should not show before locked action.
3. Kết quả mong đợi: targeted tests, full tests, and production build pass.

## 9. Observability

- Metrics: No new metrics.
- Logs: No log changes.
- Error codes: existing `DEMO_WRITE_DISABLED` and related View Mode codes remain unchanged.

## 10. Risks & Rollback

- Risks: Some future custom panel may still render its own failed text in muted styling.
- Rollback strategy: revert panel class changes and patch version if release is not shipped.

## 11. Deliverables

1. Corrected Inspiration Vault locked-warning timing.
2. Red failed/error message treatment across the affected panels.
3. Patch version/changelog/task updates.

## 12. Changelog Note

- Tóm tắt dòng changelog dự kiến: Fix View Mode warning timing and failed error color visibility across data-changing panels.

## 13. Task Type Checklist (Stamp [x])

### 13.1 Feature

- [ ] Có user/system flow rõ ràng
- [ ] Có acceptance criteria đo được
- [ ] Có test cho happy path
- [ ] Có test cho failure path chính

### 13.2 Bugfix

- [x] Có mô tả cách tái hiện lỗi
- [x] Có root cause ngắn gọn
- [x] Có regression test
- [x] Có xác nhận lỗi cũ không tái diễn

### 13.3 Research

- [ ] Có câu hỏi nghiên cứu rõ
- [ ] Có kết quả/khuyến nghị cụ thể
- [ ] Có quyết định next step

## 14. Execution Notes

- Assumptions: Failed status rows should be red even when the source is not specifically `DEMO_WRITE_DISABLED`, because users need error visibility and View Mode blocked writes flow through these failed states.
- Blockers: None.
- Verification evidence: Targeted tests pass; full test suite pass; build pass with existing Turbopack warning outside scope.
- Version bump: patch bump `0.4.0` -> `0.4.1` because this is a runtime bugfix without public API contract changes.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated: `src/features/inspiration-vault/inspiration-vault-panel.test.ts`, `src/features/storage/storage-library-panel.test.ts`, `src/features/storage/storage-providers-panel.test.ts`, `src/features/social/social-accounts-panel.test.ts`, `src/features/social/publish-records-panel.test.ts`, `src/features/video-intake/video-intake-panel.test.ts`, `src/features/video-intake/local-upload-intake-panel.test.ts`.
- Test commands executed: `npm run test -- --run src/features/inspiration-vault/inspiration-vault-panel.test.ts src/features/storage/storage-library-panel.test.ts src/features/storage/storage-providers-panel.test.ts src/features/social/social-accounts-panel.test.ts src/features/social/publish-records-panel.test.ts src/features/video-intake/video-intake-panel.test.ts src/features/video-intake/local-upload-intake-panel.test.ts`; `npm test`; `npm run build`.
- Test results summary: Targeted tests pass (7 files / 12 tests). Full test suite pass (85 files / 368 tests). Build pass; existing Turbopack NFT warning remains outside scope in `src/app/api/video-processing/edit/route.ts` import trace.
