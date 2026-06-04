# FAST-WORKSPACE-075 - Rebalance Progress Details and Segments Layout

- [x] DoR completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [ ] Done

## Task ID

`FAST-WORKSPACE-075`

## Title

Rebalance progress details and segments layout.

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

The Background Progress modal places Dubbing details on the right and Segments under Flow steps on the left. The user wants Dubbing details moved below Flow steps on the left, with Segments occupying the right column by itself. The `Stages` metadata card also spans both columns even when the second column has room.

## Scope

In:

- Move Dubbing details below Flow steps in the left column.
- Move Segments to the right column by itself.
- Remove full-width span from the `Stages` metadata card.
- Update focused tests and release metadata.

Out:

- Runtime progress data changes.
- Segment parsing changes.
- Stage duration calculation changes.

## Acceptance Criteria

1. Left progress column contains Flow steps followed by Dubbing details.
2. Right progress column contains Segments when segment data exists.
3. `Stages` metadata card no longer forces a full-width row.
4. Focused tests and build pass.

## Technical Plan

1. Reorder `ProgressTaskDetails` layout columns.
2. Remove the `Stages` metadata `sm:col-span-2` behavior.
3. Update topbar source tests.
4. Bump version, update changelog, and run verification.

## Test Plan

- `npm run test -- --run src/components/layout/topbar.test.ts`
- `npm run guard:version`
- `npm run build`

## Observability

Visible in Background Progress modal after a VIP run.

## Risks & Rollback

Risk: On narrower screens the stacking order changes, but the left-first order matches the requested structure. Rollback by restoring the previous two-column ordering.

## Deliverables

- Rebalanced progress details/segments layout.
- Tests and changelog evidence.

## Changelog Note

Move Dubbing details under Flow steps and place Segments in the right progress column.

## Execution Notes

- Reordered the rich progress layout so the left column contains Flow steps followed by Dubbing details.
- Moved Segments into the right column as its own panel.
- Removed the full-width `Stages` card span so it fills the next available metadata grid cell.

## Test Evidence

- `npm run test -- --run src/components/layout/topbar.test.ts` pass (1 file / 3 tests).
- `npm run guard:version` pass.
- `npm run build` pass.

## Changed Files

- `src/components/layout/topbar.tsx`
- `src/components/layout/topbar.test.ts`
- `package.json`
- `package-lock.json`
- `changelog/changelog.md`
- `tasks/board.md`
- `tasks/TASK-FAST-WORKSPACE-075.md`

## Residual Risks

- On small screens panels still stack vertically; the requested left/right split applies at the wide modal breakpoint.
