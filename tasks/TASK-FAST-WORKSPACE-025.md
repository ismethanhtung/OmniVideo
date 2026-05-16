# [FAST-WORKSPACE-025] Add missing mask setup warnings and soften progress separators

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

- Task ID: FAST-WORKSPACE-025
- Phase: FAST
- Target Phase: Workspace pre-run UX polish
- Domain: Workspace / Progress UI
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context

- User reported that separators created by `divide-y` in the new progress modal look visually too dark/heavy.
- User also requested a pre-run warning when a flow uses `Blur + subtitle overlay` but the selected source video has no saved setup from `Video Tools Lab`.

## 3. Scope

- In scope:
  - Soften internal row dividers used by the progress modal without weakening outer card borders.
  - Add non-blocking Flow Setup warnings for `edit.mask-region` nodes when their upstream Storage Asset has no saved `videoEditSetup`.
  - Keep hard validation issues and non-blocking warnings visually/semantically separate.
- Out of scope:
  - Rebuild the full Flow Setup design.
  - Require every flow to use a saved Video Tools Lab setup.

## 4. Acceptance Criteria

1. Progress modal internal separators render lighter than the main card borders.
2. Flow Setup surfaces a clear warning for `Blur + subtitle overlay` when the upstream source Storage Asset lacks saved `videoEditSetup`.
3. The new warning does not disable `Run Flow`; only true blocking issues do.
4. Flow Setup summary distinguishes blocking issues from warnings.
5. Test/build/version guard pass.

## 5. Technical Plan

1. Add a soft divider utility and use it in the progress modal row groups.
2. Extend Flow Setup helpers with upstream-source warning detection for mask nodes.
3. Add warnings to Flow Setup modal summary/cards separately from blocking issues.
4. Add regression tests, then update changelog/task/version metadata.

## 6. Code Change Impact

- Có thay đổi code không: Yes
- Module impacted:
  - `src/app/globals.css`
  - `src/components/layout/topbar.tsx`
  - `src/lib/workspace/workspace-flow-setup.ts`
  - `src/lib/workspace/workspace-flow-setup.test.ts`
  - `src/features/workspace/workspace-canvas-panel.tsx`
  - `src/features/workspace/workspace-canvas-panel.test.ts`
  - `tasks/board.md`
  - `tasks/TASK-FAST-WORKSPACE-025.md`
  - `changelog/changelog.md`
  - `package.json`
  - `package-lock.json`

## 7. Test Plan

1. `npm run test -- --run src/lib/workspace/workspace-flow-setup.test.ts src/features/workspace/workspace-canvas-panel.test.ts src/components/layout/topbar.test.ts`
2. `npm run build`
3. `npm run guard:version`

## 8. Observability

- Pre-run UX now exposes recoverable warnings before execution instead of hiding them until runtime.

## 9. Risks & Rollback

- Risks:
  - Warning detection must follow the actual upstream branch to avoid false positives in more complex graphs.
- Rollback:
  - Revert warning helper wiring and restore original divider classes.

## 10. Deliverables

1. Softer progress modal separators.
2. Non-blocking missing-mask-setup warning in Flow Setup.
3. Updated regression coverage and release metadata.

## 11. Changelog Note

- Soften progress modal row separators and add a non-blocking Flow Setup warning when an upstream Storage Asset has no saved `Blur + subtitle overlay` setup from Video Tools Lab.

## 12. Task Type Checklist (Stamp [x])

### 12.1 Bugfix

- [x] Có mô tả hành vi hiện tại
- [x] Có root cause ngắn gọn
- [x] Có regression test
- [x] Có xác nhận lỗi cũ không tái diễn

## 13. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/workspace/workspace-flow-setup.test.ts`
  - `src/features/workspace/workspace-canvas-panel.test.ts`
  - `src/components/layout/topbar.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/workspace/workspace-flow-setup.test.ts src/features/workspace/workspace-canvas-panel.test.ts src/components/layout/topbar.test.ts`
  - `npm run build`
  - `npm run guard:version`
- Test results summary:
  - `npm run test -- --run src/lib/workspace/workspace-flow-setup.test.ts src/features/workspace/workspace-canvas-panel.test.ts src/components/layout/topbar.test.ts` pass (3 files / 19 tests).
  - `npm run build` pass (existing ESLint circular-config warning remains, outside scope).
  - `npm run guard:version` pass.
- Versioning note:
  - Bumped app version `0.8.1 -> 0.8.2` (`PATCH`) because this is a backward-compatible UI/runtime hardening fix.
