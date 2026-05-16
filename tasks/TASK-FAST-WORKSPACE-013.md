# [FAST-WORKSPACE-013] Direct Canvas Linking and Edge Deletion

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [ ] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [ ] Done

## 1. Metadata

- Task ID: FAST-WORKSPACE-013
- Phase: FAST
- Target Phase: UX polish
- Domain: Workspace
- Task Type: Feature
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context

- Current Workspace linking requires selecting a source node, clicking `Link from node`, then clicking a destination node.
- The user needs a direct canvas interaction: hover a node, drag from a visible handle, and drop on another node to create a link.
- Existing links also need a visible, direct deletion affordance.

## 3. Scope

- In scope:
  - Show connector handles at the midpoint of all four node edges on hover.
  - Support drag-to-connect from a handle to a destination node.
  - Preserve existing `Link from node` inspector workflow.
  - Add direct edge deletion UI on the canvas.
  - Add regression coverage for graph edge deletion and workspace canvas source behavior.
- Out of scope:
  - Port-specific visual wiring.
  - Edge rerouting, bezier editing, minimap, or keyboard shortcuts.
  - Replacing the Inspector-based link workflow.

## 4. Acceptance Criteria

1. Hovering a Workspace node reveals small connector handles on all four sides.
2. Dragging from a handle to a valid destination node creates the same validated edge as `Link from node`.
3. Invalid drag-to-connect attempts surface the existing connection error UI and do not create an edge.
4. Existing `Link from node` remains available.
5. Workspace edges expose an on-canvas delete action and removing an edge updates the graph.
6. Tests cover edge deletion behavior and the presence of the new canvas interaction hooks.

## 5. Technical Plan

1. Add a `deleteWorkspaceEdge` graph helper and tests.
2. Extend `WorkspaceCanvasPanel` state/events with drag-link preview behavior and drop-target connection handling.
3. Render hover handles on nodes plus interactive edges with delete affordance.
4. Add focused tests, run build/browser verification, then update task/changelog evidence.

## 6. Test Plan

1. Unit regression: deleting an edge removes only that edge.
2. Source-level regression: canvas file includes drag-link handlers, connector handles, and delete-edge affordance.
3. Focused Vitest on graph + workspace canvas tests.
4. Browser verification on local Workspace route.

## 7. Risks & Rollback

- Risk: Pointer interaction conflicts between node dragging, canvas panning, and link dragging.
- Mitigation: stop propagation on handles and keep node move behavior unchanged outside handle targets.
- Rollback: remove new handle/edge interaction layer while keeping graph helper isolated.

## 8. Deliverables

1. Direct drag-to-connect UX on Workspace canvas.
2. Direct edge deletion UX on Workspace canvas.
3. Tests and verification evidence.

## 9. Changelog Note

- Add direct drag-to-connect handles and on-canvas edge deletion to Workspace.


## 10. Execution Notes

- Implemented `deleteWorkspaceEdge` so link deletion is explicit and isolated from node deletion.
- Added direct handle-based linking while keeping `Link from node` unchanged as a fallback path.
- Refined handles after review: the active source handle now gets a stronger selected state, destination nodes reveal all four handles during a drag, and the nearest destination handle gets its own stronger target state.
- Browser verification could not be completed because the in-app browser policy rejected access to the local dev URL; this remains the only unverified interaction surface.

## 11. Test Evidence

- Test files added/updated:
  - `src/lib/workspace/workspace-graph.test.ts`
  - `src/features/workspace/workspace-canvas-panel.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/workspace/workspace-graph.test.ts src/features/workspace/workspace-canvas-panel.test.ts`
  - `npm run build`
- Test results summary:
  - Focused Vitest pass (2 files / 41 tests).
  - Production build pass; existing ESLint circular-config warning remains outside this change.
- Uncovered cases:
  - Live drag/drop browser verification was not executed because the local URL was blocked by browser policy.
