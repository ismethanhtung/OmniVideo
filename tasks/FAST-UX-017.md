# FAST-UX-017 Make Inspiration Vault Truly Fill Viewport Height

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

- Task ID: FAST-UX-017
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

- Lý do: panel Inspiration Vault đã stretch nội bộ nhưng vẫn còn khoảng trống dưới do container route cha chưa full-height.
- Bài toán cần giải quyết: cho route Inspiration Vault dùng layout `h-full` thực.
- Tài liệu liên quan: `docs/governance/ai-agent-rules.md`, `docs/governance/testing-rules.md`.

## 3. Scope

- In scope: update content-router branch + panel root classes cho Inspiration Vault full viewport area.
- Out of scope: thay đổi logic bảng/data/actions.

## 4. Input / Output

- Input: feedback vẫn còn khoảng trống phía dưới.
- Output mong đợi: panel chạm full chiều cao vùng content khả dụng.

## 5. Acceptance Criteria

1. Không còn khoảng trống dư dưới panel trong viewport thông thường.
2. 4 bảng vẫn chia đều chiều cao phần còn lại.
3. Không đổi behavior lọc/dữ liệu/actions.

## 6. Technical Plan

1. Add special route layout for Inspiration Vault in content-router.
2. Switch panel root from fixed calc height to `h-full min-h-0`.
3. Run build verify and update governance artifacts.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/components/layout/content-router.tsx`, `src/features/inspiration-vault/inspiration-vault-panel.tsx`

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
- Rollback strategy: revert route/panel layout changes.

## 11. Deliverables

1. Full-height route + panel integration for Inspiration Vault.
2. Build evidence.
3. Changelog/task updates.

## 12. Changelog Note

- Tóm tắt dòng changelog dự kiến: Make Inspiration Vault route and panel fill full available viewport height.

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

- Assumptions: issue caused by parent layout container.
- Blockers: None.
- Verification evidence: `npm run build` pass.
- Files changed: `src/components/layout/content-router.tsx`, `src/features/inspiration-vault/inspiration-vault-panel.tsx`, `tasks/FAST-UX-017.md`, `tasks/board.md`, `changelog/changelog.md`.
- Residual risks: none significant.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated: None.
- Test commands executed: `npm run build`.
- Test results summary: Build pass. Existing warnings remain outside task scope.
