# [FAST-WORKSPACE-028] Remove blue focus outline from edge delete control

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

- Task ID: FAST-WORKSPACE-028
- Phase: FAST
- Target Phase: Workspace canvas polish
- Domain: Workspace / UI interactions
- Task Type: Bugfix
- Priority: P2
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context

- After the edge delete control was moved to an SVG-native focusable element, clicking the visible `x` now shows the browser's default blue focus outline.
- The outline is visually noisy and inconsistent with the Workspace control styling.

## 3. Scope

- In scope:
  - Suppress the browser-default blue focus outline on the SVG delete control.
  - Keep keyboard accessibility by providing a theme-compatible `focus-visible` treatment.
- Out of scope:
  - Redesigning every focus style in the app.

## 4. Acceptance Criteria

1. Mouse click on the edge delete `x` no longer shows the default blue browser outline.
2. Keyboard focus still has an intentional visible state.
3. Regression test confirms the delete control carries the dedicated focus styling hook.
4. Test/build/version guard pass.

## 5. Technical Plan

1. Add a dedicated class to the SVG delete control.
2. Define outline suppression + `:focus-visible` styling in global CSS.
3. Add source-level regression coverage.
4. Run verification and update release metadata.

## 6. Code Change Impact

- Có thay đổi code không: Yes
- Module impacted:
  - `src/app/globals.css`
  - `src/features/workspace/workspace-canvas-panel.tsx`
  - `src/features/workspace/workspace-canvas-panel.test.ts`
  - `tasks/board.md`
  - `tasks/TASK-FAST-WORKSPACE-028.md`
  - `changelog/changelog.md`
  - `package.json`
  - `package-lock.json`

## 7. Test Plan

1. Source-level regression test verifies `workspace-edge-delete-control` remains wired.
2. `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts`
3. `npm run build`
4. `npm run guard:version`

## 8. Observability

- None.

## 9. Risks & Rollback

- Risks:
  - Removing default outlines without a replacement would hurt keyboard users, so keep an explicit `focus-visible` state.
- Rollback:
  - Remove the custom class and CSS.

## 10. Deliverables

1. No default blue outline on click.
2. Intentional keyboard focus styling.
3. Updated regression coverage.

## 11. Changelog Note

- Replace the default blue edge-delete focus outline with a controlled Workspace focus-visible style.

## 12. Task Type Checklist (Stamp [x])

### 12.1 Bugfix

- [x] Có mô tả hành vi hiện tại
- [x] Có root cause ngắn gọn
- [x] Có regression test
- [x] Có xác nhận lỗi cũ không tái diễn

## 13. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/features/workspace/workspace-canvas-panel.test.ts`
- Test commands executed:
  - `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts`
  - `npm run build`
  - `npm run guard:version`
- Test results summary:
  - `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts` pass (1 file / 14 tests).
  - `npm run build` pass (existing ESLint circular-config warning remains, outside scope).
  - `npm run guard:version` pass.
- Versioning note:
  - Bumped app version `0.8.5 -> 0.8.6` (`PATCH`) because this is a backward-compatible visual interaction bugfix.

## 14. Execution Notes

- Assumptions:
  - Mouse click should not leave a browser-default blue outline, but keyboard users still need an intentional visible focus state.
- Root cause:
  - The new SVG-native delete control is focusable, so browsers rendered their default outline after click.
- Verification evidence:
  - Added `workspace-edge-delete-control` with `outline: none` plus explicit `:focus-visible` styling.
