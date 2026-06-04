# FAST-WORKSPACE-064 - Expand Workspace Canvas Start Area

- [x] DoR completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [ ] Done

## Task ID

`FAST-WORKSPACE-064`

## Title

Expand Workspace canvas start area.

## Phase

Phase 1

## Target Phase

MVP workspace UX

## Domain

Workspace

## Task Type

Fast UX change

## Owner

AI Agent

## Status

Review

## Priority

High

## Context

The Workspace canvas drag/drop area feels constrained and starts from the top-left corner, making the flow workspace feel small.

## Scope

In:

- Increase Workspace canvas plane dimensions.
- Shift the default canvas viewport so the starting area is centered better.
- Update focused source tests and release metadata.

Out:

- Rebuilding canvas pan/zoom architecture.
- Changing graph node persistence coordinates.
- Adding minimap or fit-to-screen controls.

## Acceptance Criteria

1. Workspace canvas plane is substantially larger than the current `2400x1400`.
2. Default canvas view no longer starts at `x:0,y:0`.
3. Existing node coordinates and graph serialization remain unchanged.
4. Focused Workspace canvas tests cover the larger centered initial canvas behavior.

## Technical Plan

1. Update canvas size constants and default view constants.
2. Update Workspace canvas source tests.
3. Bump patch version and changelog.
4. Run focused tests, version guard, and build.

## Test Plan

- `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts`
- `npm run guard:version`
- `npm run build`

## Observability

No new runtime telemetry. Behavior is visible in the Workspace canvas initial viewport.

## Risks & Rollback

Risk: Larger plane can increase SVG/grid render area. Rollback by restoring previous constants.

## Deliverables

- Larger Workspace canvas plane.
- Centered default starting view.
- Test and changelog evidence.

## Changelog Note

Expand Workspace canvas area and center the initial viewport.

## Execution Notes

- Created from user report that the canvas feels limited and starts in the top-left corner.
- Increased Workspace canvas plane constants to `6400x3600`.
- Shifted default canvas view to `x:360,y:180,scale:0.7`.
- Updated focused source test coverage.

## Test Evidence

- `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts` pass (1 file / 23 tests).
- `npm run guard:version` pass.
- `npm run build` pass.
- `git diff --check` pass.

## Changed Files

- `src/features/workspace/workspace-canvas-panel.tsx`
- `src/features/workspace/workspace-canvas-panel.test.ts`
- `package.json`
- `package-lock.json`
- `changelog/changelog.md`
- `tasks/board.md`
- `tasks/TASK-FAST-WORKSPACE-064.md`

## Residual Risks

- Larger canvas plane increases rendered grid/SVG area, but no new graph serialization behavior was introduced.
