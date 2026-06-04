# FAST-WORKSPACE-070 - Center Workspace Node Creation Coordinates

- [x] DoR completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [ ] Done

## Task ID

`FAST-WORKSPACE-070`

## Title

Center Workspace node creation coordinates.

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

The Workspace empty state and initial viewport are centered, but seed templates and manual catalog node creation still use old top-left graph coordinates. This causes newly created nodes to appear away from the centered working area and can make the viewport feel like it jumps back toward the old origin.

## Scope

In:

- Translate seeded graph node coordinates to the center of the expanded canvas.
- Place manually added catalog nodes around the currently visible canvas center.
- Avoid auto-fitting the viewport after manual Add Node.
- Keep seed graph topology/config unchanged.
- Update focused tests and release metadata.

Out:

- Minimap.
- Rewriting all seed coordinate literals in `workspace-graph.ts`.
- Changing drag, pan, zoom, or edge behavior.

## Acceptance Criteria

1. Applying a seed creates its nodes around the centered canvas area visible on initial Workspace entry.
2. Manually adding a node creates it near the current visible viewport center, not old top-left coordinates.
3. Adding a node does not auto-pan the viewport unexpectedly.
4. Focused tests cover centered seed/node creation markers and removal of old top-left formula.

## Technical Plan

1. Add node-bounds and graph-translation helpers in the Workspace canvas component.
2. Add a viewport-center based node insertion helper with small collision offsets.
3. Use translated seed graphs in `applySeedTemplate`.
4. Use viewport-center insertion in `addNode` and remove first-node auto-fit.
5. Update tests, bump version, changelog, and run verification.

## Test Plan

- `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts`
- `npm run guard:version`
- `npm run build`

## Observability

Visible in Workspace: seed nodes and newly added nodes should appear in the centered dotted workspace area without unexpected camera jumps.

## Risks & Rollback

Risk: Large manually built graphs may still need manual placement after many inserted nodes. Rollback by restoring old add-node coordinates and seed viewport fit.

## Deliverables

- Centered seed node coordinates.
- Centered manual Add Node coordinates.
- Tests and changelog evidence.

## Changelog Note

Center Workspace seed and manual node creation coordinates so new nodes appear in the visible working area.

## Execution Notes

- Added shared node-bounds helper for Workspace canvas node sets.
- Added seed graph translation so seed coordinates are shifted to the canvas center before state update.
- Changed manual Add Node to calculate insertion around the currently visible viewport center.
- Added nearby candidate offsets to reduce overlap when adding multiple nodes.
- Removed manual Add Node first-node auto-fit to prevent unexpected viewport jumps.

## Test Evidence

- `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts` pass (1 file / 26 tests).
- `npm run guard:version` pass.
- `npm run build` pass.

## Changed Files

- `src/features/workspace/workspace-canvas-panel.tsx`
- `src/features/workspace/workspace-canvas-panel.test.ts`
- `package.json`
- `package-lock.json`
- `changelog/changelog.md`
- `tasks/board.md`
- `tasks/TASK-FAST-WORKSPACE-070.md`

## Residual Risks

- After many manual node additions in a dense visible area, users may still need to drag nodes to organize the graph.
