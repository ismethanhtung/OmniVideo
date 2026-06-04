# FAST-WORKSPACE-069 - Fit Canvas View After Seed Creation

- [x] DoR completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [ ] Done

## Task ID

`FAST-WORKSPACE-069`

## Title

Fit canvas view after seed creation.

## Phase

Phase 1

## Target Phase

MVP workspace UX

## Domain

Workspace

## Task Type

Fast UX bugfix

## Owner

AI Agent

## Status

Review

## Priority

High

## Context

The empty Workspace view is centered, but after applying a seed, seeded nodes keep their graph coordinates and can land outside the current viewport. The user then sees an empty dotted area even though nodes were created.

## Scope

In:

- Add a viewport fit helper based on current node bounding box.
- Fit the canvas view after applying a seed graph.
- Fit the canvas view when adding the first catalog node.
- Preserve graph/node coordinates and serialization.
- Update focused tests and release metadata.

Out:

- Minimap.
- Continuous auto-fit while dragging nodes.
- Repositioning seed node coordinates.

## Acceptance Criteria

1. Applying a seed changes only the canvas view so seeded nodes are visible.
2. Adding the first node changes only the canvas view so the node is visible.
3. Existing graph coordinates remain unchanged.
4. Focused source tests cover fit helper and seed/first-node usage.

## Technical Plan

1. Add `buildCanvasViewForNodes` helper using viewport dimensions and node bounds.
2. Call the helper after seed graph creation.
3. Call the helper after adding the first node.
4. Update tests, bump version, changelog, and run verification.

## Test Plan

- `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts`
- `npm run guard:version`
- `npm run build`

## Observability

Visible in Workspace: seed nodes should appear immediately after selecting a seed.

## Risks & Rollback

Risk: Fit calculation is viewport-based and may be imperfect on very small screens. Rollback by removing helper calls.

## Deliverables

- Seed/first-node viewport fit behavior.
- Tests and changelog evidence.

## Changelog Note

Fit Workspace canvas view to seeded nodes so flows are visible after seed creation.

## Execution Notes

- Created from user report that seed nodes were created outside the current centered viewport.
- Added `buildCanvasViewForNodes` to fit canvas view to node bounds without changing graph coordinates.
- Applied fit after seed creation.
- Applied fit when adding the first catalog node.

## Test Evidence

- `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts` pass (1 file / 25 tests).
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
- `tasks/TASK-FAST-WORKSPACE-069.md`

## Residual Risks

- Fit uses the viewport size available at seed/add time; extremely small viewports may still need manual pan/zoom.
