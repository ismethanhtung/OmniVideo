# FAST-WORKSPACE-071 - Restore Original Workspace Canvas UI

- [x] DoR completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [ ] Done

## Task ID

`FAST-WORKSPACE-071`

## Title

Restore original Workspace canvas UI.

## Phase

Phase 1

## Target Phase

MVP workspace UX

## Domain

Workspace

## Task Type

Fast UX revert

## Owner

AI Agent

## Status

Review

## Priority

High

## Context

Recent attempts to expand and center the Workspace canvas made seed and manual node creation feel worse. The user requested restoring the canvas UI to the original behavior.

## Scope

In:

- Restore original canvas dimensions and default viewport.
- Restore original empty-state placement.
- Restore original manual Add Node coordinate formula.
- Restore original seed application without graph translation or viewport fit.
- Update focused tests and release metadata.

Out:

- Reverting unrelated Server modal, VIP progress, metadata, or launcher changes.
- Redesigning Workspace canvas behavior in this task.

## Acceptance Criteria

1. Workspace canvas dimensions are back to the original `2400x1400`.
2. Default canvas view is back to `{ x: 0, y: 0, scale: 0.6 }`.
3. Empty draft panel is back at the original top-left placement.
4. Add Node and Apply Seed use the original coordinate behavior.
5. Focused tests and build pass.

## Technical Plan

1. Remove centered/expanded canvas constants and helper functions.
2. Restore `addNode` and `applySeedTemplate` to their original behavior.
3. Restore the empty-state panel class.
4. Update tests, changelog, version, and run verification.

## Test Plan

- `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts`
- `npm run guard:version`
- `npm run build`

## Observability

Visible in Workspace: the canvas should behave like before the recent centering/expansion work.

## Risks & Rollback

Risk: The original small/top-left canvas limitations return by design. Rollback by reintroducing a redesigned canvas approach in a later task.

## Deliverables

- Restored original Workspace canvas UI behavior.
- Tests and changelog evidence.

## Changelog Note

Restore Workspace canvas UI to the original dimensions, viewport, empty-state placement, and node creation behavior.

## Execution Notes

- Restored canvas constants to `2400x1400` and default view `{ x: 0, y: 0, scale: 0.6 }`.
- Removed the centered canvas constants and seed/node placement helpers.
- Restored manual Add Node position formula.
- Restored seed application to use `seed.buildGraph()` directly.
- Restored empty draft panel to `left-16 top-16`.

## Test Evidence

- `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts` pass (1 file / 25 tests).
- `npm run guard:version` pass.
- `npm run build` pass.

## Changed Files

- `src/features/workspace/workspace-canvas-panel.tsx`
- `src/features/workspace/workspace-canvas-panel.test.ts`
- `package.json`
- `package-lock.json`
- `changelog/changelog.md`
- `tasks/board.md`
- `tasks/TASK-FAST-WORKSPACE-071.md`

## Residual Risks

- The previous canvas limitations return intentionally because this task restores the original UI behavior.
