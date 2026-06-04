# FAST-WORKSPACE-076 - Let Progress Segments Use Modal Height

- [x] DoR completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [ ] Done

## Task ID

`FAST-WORKSPACE-076`

## Title

Let Progress segments use modal height.

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

After moving Segments into the right progress column, the panel still uses the old fixed `28rem` height. This makes the right column look artificially short even when the modal has more available height.

## Scope

In:

- Remove the desktop fixed `28rem` segment-list cap.
- Let the Segments panel use modal-relative height on wide screens.
- Keep the list itself scrollable inside the panel.
- Update focused tests and release metadata.

Out:

- Runtime progress data changes.
- Segment row content changes.
- Modal sizing redesign.

## Acceptance Criteria

1. Segments no longer use `max-h-[28rem]`.
2. Segments panel uses available modal height on wide screens.
3. Segment list remains internally scrollable.
4. Focused tests and build pass.

## Technical Plan

1. Add `min-h-0` to the rich progress grid.
2. Make `ProgressSegmentsPanel` a flex column with modal-relative max height.
3. Make the segment list `flex-1` and scrollable.
4. Update topbar tests, bump version, changelog, and run verification.

## Test Plan

- `npm run test -- --run src/components/layout/topbar.test.ts`
- `npm run guard:version`
- `npm run build`

## Observability

Visible in Background Progress modal when a VIP task has segment details.

## Risks & Rollback

Risk: The right column can become taller than before on wide screens. Rollback by restoring the previous fixed segment list height.

## Deliverables

- Taller responsive Segments panel.
- Tests and changelog evidence.

## Changelog Note

Let the Background Progress Segments panel use available modal height instead of a fixed short cap.

## Execution Notes

- Removed the fixed desktop `max-h-[28rem]` cap.
- Added `min-h-0` to the rich progress grid.
- Made the Segments panel a flex column with `xl:max-h-[calc(90vh-15rem)]`.
- Kept the segment list internally scrollable with `flex-1`.

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
- `tasks/TASK-FAST-WORKSPACE-076.md`

## Residual Risks

- Segment panel height is modal-relative; extremely short viewports will still scroll internally.
