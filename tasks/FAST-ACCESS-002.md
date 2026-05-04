# FAST-ACCESS-002 Polish View Mode locked-state copy and bump version

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

- Task ID: FAST-ACCESS-002
- Phase: P2
- Target Phase: P2
- Domain: Access Control / UX / Release
- Task Type: Feature
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: User
- Status: Done

## 2. Context

- Lý do: User muốn public mode copy thân thiện hơn, đổi topbar label từ `Demo` sang `View Mode`, hiển thị thông báo ngắn khi bấm tính năng bị khóa, các locked/error messages màu đỏ, và bump version.
- Bài toán cần giải quyết: polish UI/copy cho public-demo mode mà không thay đổi policy guard hiện có.
- Tài liệu liên quan: `docs/operations/public-demo-mode.md`, `docs/governance/versioning-rules.md`, `docs/architecture/nextjs-mongodb-conventions.md`.

## 3. Scope

- In scope: View Mode label/copy, red locked-state messages, click feedback for locked Inspiration Vault controls/topbar capture, server guard message copy, version bump.
- Out of scope: distributed rate limit, full auth, broad UI lock-state polish across every panel.

## 4. Input / Output

- Input: Public visitor clicks locked controls or submits locked quick capture.
- Output mong đợi: short red message `Some features are disabled in View Mode.` and no data mutation.

## 5. Acceptance Criteria

1. Topbar public label displays `View Mode` instead of `Demo`.
2. Locked topbar capture and Inspiration Vault controls show short red feedback when clicked.
3. Public-demo write guard returns short friendly message while preserving stable error codes.
4. Version is bumped according to versioning rules and lockfile is synchronized.
5. User-facing docs/changelog/task evidence are updated.

## 6. Technical Plan

1. Add shared locked-state copy and update route guard messages.
2. Update topbar and Inspiration Vault locked-state UI classes/click handlers.
3. Bump version via `npm version minor --no-git-tag-version`.
4. Run tests/build and update changelog/task/board.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/lib/access-control`, `src/components/layout/topbar.tsx`, `src/features/inspiration-vault/inspiration-vault-panel.tsx`, `package.json`, `package-lock.json`.

## 8. Test Plan

1. Unit/API cần chạy: access-control route tests, Inspiration Vault API tests, full `npm test`.
2. Failure cases cần thử: public write blocked still returns `DEMO_WRITE_DISABLED`; rate limit still returns `DEMO_RATE_LIMITED`.
3. Kết quả mong đợi: tests pass; build pass.

## 9. Observability

- Metrics: No new metrics.
- Logs: Existing error codes preserved.
- Error codes: `DEMO_WRITE_DISABLED`, `DEMO_RATE_LIMITED`, `DEMO_PROVIDER_ACCOUNT_DISABLED`.

## 10. Risks & Rollback

- Risks: Minor UI-only controls outside topbar/Inspiration Vault may still show their own error copy when server blocks them.
- Rollback strategy: revert this task or set `OMNIVIDEO_APP_MODE=owner` to avoid public locked states.

## 11. Deliverables

1. View Mode locked-state polish.
2. Version bump.
3. Tests/build evidence.

## 12. Changelog Note

- Tóm tắt dòng changelog dự kiến: Polish View Mode locked-state copy and release version bump.

## 13. Task Type Checklist (Stamp [x])

### 13.1 Feature

- [x] Có user/system flow rõ ràng
- [x] Có acceptance criteria đo được
- [x] Có test cho happy path
- [x] Có test cho failure path chính

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

- Assumptions: Version bump should be `minor` because the unreleased public-demo feature is a backward-compatible feature release.
- Blockers: None.
- Verification evidence: Targeted tests pass; full test suite pass; build pass with existing Turbopack warning outside scope.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated: Existing access-control/API tests reused; no new test file required because stable error codes remain covered.
- Test commands executed: `npm run test -- --run src/lib/access-control/access-control.test.ts src/app/api/app/access/route.test.ts src/app/api/inspiration-vault/route.test.ts src/app/api/audio/voice-generation/route.test.ts`; `npm test`; `npm run build`.
- Test results summary: Targeted tests pass (4 files / 13 tests). Full test suite pass (81 files / 360 tests). Build pass; existing Turbopack NFT warning remains outside scope in `src/app/api/video-processing/edit/route.ts` import trace.
