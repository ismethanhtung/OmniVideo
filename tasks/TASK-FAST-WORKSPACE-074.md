# FAST-WORKSPACE-074 - Compact Progress Segments and Restore Stages Label

- [x] DoR completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [ ] Done

## Task ID

`FAST-WORKSPACE-074`

## Title

Compact progress segments and restore Stages label.

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

The Progress modal segment details now show useful voice speed/source text data, but each segment row is too tall. The VIP stage summary still exists in metadata as `Measured stages`, but the UI no longer presents it with the expected `Stages` label.

## Scope

In:

- Compact segment rows without removing translated/source/speed/duration data.
- Move raw/target duration into the segment header line.
- Show translated and source text in a compact grid when source is enabled.
- Render `Measured stages` metadata as `Stages`.
- Keep focused test coverage and release metadata current.

Out:

- Runtime VIP processing changes.
- Fetching additional segment data.
- Changing progress task storage format.

## Acceptance Criteria

1. Segment rows retain segment id, time range, speed, translated text, optional source text, and raw/target duration.
2. Segment rows use less vertical space than the previous stacked layout.
3. `Measured stages` appears as `Stages` in Dubbing details.
4. Stage wording uses the familiar render label `render (speed+mix+mirror+blur+sub)`.
5. Focused tests and build pass.

## Technical Plan

1. Update `ProgressSegmentsPanel` row layout and max scroll height.
2. Update `ProgressRichStepPanel` metadata label/value normalization for stages.
3. Add source tests for compact segment and stages markers.
4. Bump version, update changelog, and run verification.

## Test Plan

- `npm run test -- --run src/components/layout/topbar.test.ts`
- `npm run guard:version`
- `npm run build`

## Observability

Visible in Background Progress modal after a VIP run.

## Risks & Rollback

Risk: Compact text may be denser on small screens. Rollback by restoring the previous stacked segment row layout.

## Deliverables

- Compact segment rows.
- Restored `Stages` detail label.
- Tests and changelog evidence.

## Changelog Note

Compact Background Progress segment rows and restore the VIP `Stages` summary label.

## Execution Notes

- Compacted segment row padding and max scroll height.
- Moved raw/target duration into the segment header line.
- Rendered translated/source text in a compact two-column layout when source text is visible.
- Rendered `Measured stages` metadata with the visible label `Stages`.
- Normalized stage summary wording to show `render (speed+mix+mirror+blur+sub)`.

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
- `tasks/TASK-FAST-WORKSPACE-074.md`

## Residual Risks

- Compact rows are denser on narrow screens, but source text remains optional and scrollable.
