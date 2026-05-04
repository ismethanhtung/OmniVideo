# FAST-UX-010 Align Inspiration Vault Shell Styling

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

- Task ID: FAST-UX-010
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

- Lý do: Inspiration Vault đã có chức năng đúng nhưng shell/layout chưa khớp phong cách các trang còn lại, thiếu border ngoài cùng.
- Bài toán cần giải quyết: Cần align page wrapper/header/status/body theo visual pattern hiện có.
- Tài liệu liên quan: `docs/governance/ai-agent-rules.md`, `docs/governance/testing-rules.md`, `src/features/storage/storage-library-panel.tsx`, `src/features/social/publish-records-panel.tsx`.

## 3. Scope

- In scope: Chỉnh layout/styling Inspiration Vault để có outer border, header/status/body giống panel hiện có.
- Out of scope: Đổi logic capture/classification/storage.

## 4. Input / Output

- Input: Feedback UI thiếu nhất quán với các trang khác.
- Output mong đợi: Inspiration Vault nhìn cùng hệ layout với Storage Library/Publish Records/Display.

## 5. Acceptance Criteria

1. Inspiration Vault root dùng outer border/background panel shell như các trang chính.
2. Header/status/body nằm trong cùng panel, không còn các khối rời rạc bên ngoài.
3. Không thay đổi behavior capture/filter/toggle/delete.

## 6. Technical Plan

1. So sánh pattern panel hiện có.
2. Refactor class/layout của `InspirationVaultPanel`.
3. Chạy targeted tests/build và cập nhật changelog/task evidence.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/features/inspiration-vault/inspiration-vault-panel.tsx`

## 8. Test Plan

1. Unit/Integration cần chạy: `npm run test -- --run src/lib/inspiration-vault/inspiration-vault.test.ts src/components/layout/navigation.test.ts`.
2. Failure cases cần thử: Không phát sinh regression compile/type.
3. Kết quả mong đợi: Tests và build pass.

## 9. Observability

- Metrics: Không đổi.
- Logs: Không đổi.
- Error codes: Không đổi.

## 10. Risks & Rollback

- Risks: Layout spacing có thể cần fine tune thêm khi xem trực tiếp.
- Rollback strategy: Revert panel class/layout changes.

## 11. Deliverables

1. Inspiration Vault aligned shell styling.
2. Test/build evidence.
3. Changelog entry.

## 12. Changelog Note

- Tóm tắt dòng changelog dự kiến: Align Inspiration Vault visual shell với các panel hiện có.

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

- Assumptions: Đây là UX-only follow-up, không cần test mới vì không đổi logic; vẫn chạy regression tests liên quan.
- Blockers: None.
- Verification evidence: Targeted tests pass; production build pass; `git diff --check` pass.
- Files changed: `src/features/inspiration-vault/inspiration-vault-panel.tsx`, `tasks/FAST-UX-010.md`, `tasks/board.md`, `changelog/changelog.md`.
- Residual risks: Cần xem trực tiếp trong browser để fine tune spacing nếu user muốn mức pixel-polish cao hơn.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated: None; UX shell-only refactor, existing behavior tests retained.
- Test commands executed: `npm run test -- --run src/lib/inspiration-vault/inspiration-vault.test.ts src/components/layout/navigation.test.ts`; `npm run build`; `git diff --check`.
- Test results summary: Tests pass (2 files / 14 tests). Build pass. Existing warnings remain outside this task scope in audio/storage/video-tools/display panels.
