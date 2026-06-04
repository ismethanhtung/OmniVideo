# FAST-WORKSPACE-077 - Match Segments Height to Left Progress Column

- [x] DoR completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [ ] Done

## Task ID

`FAST-WORKSPACE-077`

## Title

Match Segments height to left progress column.

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

The Background Progress Segments panel should not use a viewport-based height. The user wants the right Segments column height to match the left column containing Flow steps and Dubbing details.

## Scope

In:

- Stretch the progress grid columns to the same row height.
- Make the Segments panel fill the grid row height on wide screens.
- Keep the segment list internally scrollable.
- Update focused tests and release metadata.

Out:

- Changing segment content.
- Runtime progress changes.
- Modal global sizing redesign.

## Acceptance Criteria

1. Segments panel height matches the left progress column on wide layouts.
2. Segment list remains scrollable inside the panel.
3. No viewport-specific desktop height cap remains.
4. Focused tests and build pass.

## Technical Plan

1. Add `items-stretch` to the rich progress grid.
2. Use `xl:h-full` on the Segments panel.
3. Keep the list `flex-1 overflow-y-auto`.
4. Update tests, bump version, changelog, and run verification.

## Test Plan

- `npm run test -- --run src/components/layout/topbar.test.ts`
- `npm run guard:version`
- `npm run build`

## Observability

Visible in Background Progress modal when a VIP task has segment details.

## Risks & Rollback

Risk: If the left column is very short, the right panel will be short too by design. Rollback by restoring viewport-relative height.

## Deliverables

- Segments panel height matched to left progress column.
- Tests and changelog evidence.

## Changelog Note

Match the Background Progress Segments panel height to the left Flow steps/Dubbing details column.

## Execution Notes

- Added `items-stretch` to the rich progress grid.
- Removed viewport-relative desktop height behavior from the Segments panel.
- Set the Segments panel to `xl:h-full` so it matches the left column row height.
- Kept the segment list scrollable with `flex-1 overflow-y-auto`.

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
- `tasks/TASK-FAST-WORKSPACE-077.md`

## Residual Risks

- If the left column is short, Segments will intentionally be short and scroll internally.
