# FAST-WORKSPACE-078 - Keep Segments From Expanding Progress Row Height

- [x] DoR completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [ ] Done

## Task ID

`FAST-WORKSPACE-078`

## Title

Keep Segments from expanding progress row height.

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

The Segments panel should stop at the same height as the left column. The previous viewport-based and stretch-only approaches allowed the Segments content to define the grid row height, making the right side appear effectively unbounded.

## Scope

In:

- Let the left column define the grid row height.
- Place Segments inside an absolute right-column panel on wide layouts.
- Keep the Segments list scrollable inside that fixed-height panel.
- Avoid JavaScript height measurement.
- Update focused tests and release metadata.

Out:

- Runtime progress data changes.
- Segment row content changes.
- Modal global sizing redesign.

## Acceptance Criteria

1. Segments no longer expand the two-column progress row height.
2. Segments panel height matches the left column on wide layouts.
3. Segment list scrolls internally.
4. No `ResizeObserver` or JS height measurement is used.
5. Focused tests and build pass.

## Technical Plan

1. Wrap the right column in a relative grid item.
2. Render Segments as `xl:absolute xl:inset-0` inside that wrapper.
3. Keep mobile/tablet fallback max height.
4. Update tests, bump version, changelog, and run verification.

## Test Plan

- `npm run test -- --run src/components/layout/topbar.test.ts`
- `npm run guard:version`
- `npm run build`

## Observability

Visible in Background Progress modal when a VIP task has segment details.

## Risks & Rollback

Risk: If the left column is very short, Segments will intentionally be short and scroll internally. Rollback by restoring a viewport-based cap.

## Deliverables

- Segments panel no longer expands row height.
- Tests and changelog evidence.

## Changelog Note

Keep Background Progress Segments height capped by the left Flow steps/Dubbing details column without JS measurement.

## Execution Notes

- Removed the interrupted `ResizeObserver`/height-state approach.
- Wrapped the right column in a normal-flow `relative` grid item.
- Rendered the Segments panel as `xl:absolute xl:inset-0` so it fills the right grid cell without contributing content height to the row.
- Kept the segment list scrollable inside the fixed-height panel.

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
- `tasks/TASK-FAST-WORKSPACE-078.md`

## Residual Risks

- On wide layouts, Segments height is intentionally capped to the left column. Long segment lists must scroll inside the panel.
