# FAST-ACCESS-003 Restore full View Mode lock messages and red error rendering

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

- Task ID: FAST-ACCESS-003
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

- Lý do: User muốn thêm câu ngắn View Mode vào message gốc, không thay thế message gốc. Một số panel như AI Providers không render lỗi View Mode màu đỏ rõ ràng.
- Bài toán cần giải quyết: restore full lock/error copy, append `Some features are disabled in View Mode.`, và render các lỗi View Mode phổ biến bằng red treatment.
- Tài liệu liên quan: `docs/operations/public-demo-mode.md`, `docs/architecture/nextjs-mongodb-conventions.md`.

## 3. Scope

- In scope: route guard message composition, helper detect View Mode errors, AI Providers error rendering, Inspiration/topbar copy alignment, tests/changelog/task.
- Out of scope: complete visual audit of every panel in the app.

## 4. Input / Output

- Input: Public visitor triggers blocked write/test action.
- Output mong đợi: message includes original reason plus short View Mode note, and visible UI error text is red where handled.

## 5. Acceptance Criteria

1. `DEMO_WRITE_DISABLED` response includes original text and `Some features are disabled in View Mode.`
2. `DEMO_PROVIDER_ACCOUNT_DISABLED` and `DEMO_RATE_LIMITED` preserve their specific original reason and append/include View Mode copy.
3. AI Providers failed save/test/chat View Mode errors render red instead of muted/gray.
4. Topbar/Inspiration locked-state copy remains red and uses appended full message where appropriate.
5. Tests/build pass.

## 6. Technical Plan

1. Add access-control message helper/constants for full composed messages and View Mode error detection.
2. Update route guards to use full composed messages.
3. Update AI Providers panel failed states to include error codes and red rendering for View Mode errors.
4. Run targeted tests, full tests, build; update changelog/task/board.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/lib/access-control`, `src/features/ai-providers`, `src/components/layout/topbar.tsx`, `src/features/inspiration-vault`.

## 8. Test Plan

1. Unit/API cần chạy: access-control tests, app access route tests, Inspiration API tests, AI Providers panel tests.
2. Failure cases cần thử: public write blocked; View Mode error detection.
3. Kết quả mong đợi: tests pass; build pass.

## 9. Observability

- Metrics: No new metrics.
- Logs: Stable error codes preserved.
- Error codes: `DEMO_WRITE_DISABLED`, `DEMO_PROVIDER_ACCOUNT_DISABLED`, `DEMO_RATE_LIMITED`.

## 10. Risks & Rollback

- Risks: Some panels outside this task may still need bespoke red styling if they render API errors in custom muted elements.
- Rollback strategy: revert UI rendering changes only; guard codes remain stable.

## 11. Deliverables

1. Restored and appended View Mode messages.
2. Red error rendering for AI Providers View Mode paths.
3. Tests/build evidence.

## 12. Changelog Note

- Tóm tắt dòng changelog dự kiến: Restore full View Mode lock messages and red rendering for blocked actions.

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

- Assumptions: `Some features are disabled in View Mode.` should be appended after the specific reason.
- Blockers: None.
- Verification evidence: Targeted tests pass; full test suite pass; build pass with existing Turbopack warning outside scope.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated: `src/lib/access-control/access-control.test.ts`, `src/app/api/inspiration-vault/route.test.ts`.
- Test commands executed: `npm run test -- --run src/lib/access-control/access-control.test.ts src/app/api/inspiration-vault/route.test.ts src/features/ai-providers/ai-providers-panel.test.ts src/app/api/app/access/route.test.ts`; `npm run build`; `npm test`.
- Test results summary: Targeted tests pass (4 files / 12 tests). Full test suite pass (81 files / 361 tests). Build pass; existing Turbopack NFT warning remains outside scope in `src/app/api/video-processing/edit/route.ts` import trace.
