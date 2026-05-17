# [FAST-OPS-005] Persist finished Background Progress tasks across reloads

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [ ] Done

## 1. Metadata

- Task ID: FAST-OPS-005
- Phase: FAST
- Target Phase: Runtime observability UX
- Domain: Operations / Progress Center
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context

- User reported that `Background Progress` disappears after a page reload, which makes finished runtime history feel unsaved.
- Root cause: progress tasks are currently held only in an in-memory `Map`, so the modal has no persisted history to restore after reload.

## 3. Scope

- In scope:
  - Persist finished (`success` / `failed`) Background Progress tasks to browser storage.
  - Rehydrate finished task history after reload.
  - Keep `Clear finished` as the explicit bulk-delete path for persisted history.
  - Keep per-task dismiss behavior consistent with persisted history removal.
- Out of scope:
  - Rebuild progress tracking as a server-backed queue/history system.
  - Persist currently-running client tasks across reload, because reload interrupts the browser-owned execution context and restoring them as live would be misleading.

## 4. Acceptance Criteria

1. A finished Background Progress task remains visible after in-memory state is reset and rehydrated from browser storage.
2. `Clear finished` removes finished tasks from both the UI state and persisted storage.
3. Dismissing one finished task removes it from persisted storage as well.
4. Invalid/corrupted stored payloads are ignored safely instead of crashing the progress center.
5. Regression tests, build, and version guard pass.

## 5. Technical Plan

1. Add safe localStorage serialization/rehydration helpers to `progress-center`.
2. Persist only finished tasks and keep active tasks ephemeral to avoid stale “running” jobs after reload.
3. Make `Clear finished` / dismiss operations automatically synchronize persisted history.
4. Add regression tests for reload-style rehydration, deletion, and corrupted payload fallback.
5. Update changelog/task metadata and run focused verification.

## 6. Code Change Impact

- Có thay đổi code không: Yes
- Module impacted:
  - `src/lib/ui/progress-center.ts`
  - `src/lib/ui/progress-center.test.ts`
  - `src/components/layout/topbar.tsx`
  - `tasks/board.md`
  - `tasks/TASK-FAST-OPS-005.md`
  - `changelog/changelog.md`
  - `package.json`
  - `package-lock.json`

## 7. Test Plan

1. Unit regression test: finished task persists and rehydrates after simulated reload.
2. Unit regression test: `Clear finished` removes stored history while preserving active tasks in memory.
3. Failure-path test: corrupted persisted payload is ignored safely.
4. `npm run test -- --run src/lib/ui/progress-center.test.ts src/components/layout/topbar.test.ts`
5. `npm run build`
6. `npm run guard:version`

## 8. Observability

- Finished task history becomes durable across reloads, improving lightweight local runtime traceability without pretending interrupted client work is still live.

## 9. Risks & Rollback

- Risks:
  - Browser storage can be unavailable or corrupted; persistence must fail soft.
  - Persisting active jobs would create stale runtime signals after reload, so this task intentionally persists only finished history.
- Rollback:
  - Remove localStorage helpers and return to in-memory-only progress history.

## 10. Deliverables

1. Reload-safe finished task history for Background Progress.
2. Storage-aware clear/dismiss behavior.
3. Regression coverage for persistence and bad payload handling.

## 11. Changelog Note

- Background Progress now restores finished task history after reload and clears the persisted history when users click `Clear finished`.

## 12. Task Type Checklist (Stamp [x])

### 12.1 Bugfix

- [x] Có mô tả hành vi hiện tại
- [x] Có root cause ngắn gọn
- [x] Có regression test
- [x] Có xác nhận lỗi cũ không tái diễn

## 13. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/ui/progress-center.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/ui/progress-center.test.ts src/components/layout/topbar.test.ts`
  - `npm run build`
  - `npm run guard:version`
- Test results summary:
  - `npm run test -- --run src/lib/ui/progress-center.test.ts src/components/layout/topbar.test.ts` pass (2 files / 7 tests).
  - `npm run build` pass (existing ESLint circular-config warning remains, outside scope).
  - `npm run guard:version` pass.
- Versioning note:
  - Bumped app version `0.8.2 -> 0.8.3` (`PATCH`) because this is a backward-compatible bugfix for persisted UI history.

## 14. Execution Notes

- Assumptions:
  - The user's main expectation is durable finished-task history across reload, with `Clear finished` as the explicit cleanup action.
- Root cause:
  - `src/lib/ui/progress-center.ts` stored every task only in an in-memory `Map`.
- Verification evidence:
  - Finished tasks now survive an in-memory reset through localStorage rehydration.
  - `Clear finished` and dismiss operations synchronize the stored history.
  - Invalid stored JSON is ignored safely.
