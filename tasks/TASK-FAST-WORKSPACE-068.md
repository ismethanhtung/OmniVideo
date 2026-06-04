# FAST-WORKSPACE-068 - Move Progress Segments Left and Show Voice Speed

- [x] DoR completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [ ] Done

## Task ID

`FAST-WORKSPACE-068`

## Title

Move progress segments left and show voice speed.

## Phase

Phase 1

## Target Phase

MVP workspace operations

## Domain

Workspace / Progress UI

## Task Type

Fast UX change

## Owner

AI Agent

## Status

Review

## Priority

High

## Context

The progress modal currently shows Flow steps on the left and Dubbing details plus Segments on the right. The user wants Segments moved under Flow steps, always visible without hide/show, with a toggle to inspect source text and voice speed highlighting similar to Audio Transcript.

## Scope

In:

- Move rich progress Segments panel to the left column below Flow steps.
- Keep Segments always rendered in a scrollable area without Show all/Hide controls.
- Add source text toggle for segment rows.
- Include per-segment voice speed and warning metadata only when already available in VIP voice timeline data.
- Highlight high-speed or warning segments.
- Update focused tests and release metadata.

Out:

- Audio playback/scrubbing inside the progress modal.
- Full Audio Transcript timeline workbench parity.
- Recomputing voice speed or fetching/sending extra detail when no voice alignment timeline is available.

## Acceptance Criteria

1. Progress modal left column contains Flow steps and Segments when segment timeline data exists.
2. Dubbing details right column contains metadata only, not the full segment list.
3. Segment list is always visible and scrollable, with no Show all/Hide button.
4. Segment rows can toggle source text display.
5. VIP progress segment lines include voice speed data from `voice.alignment.timeline` when available.
6. High speed/warning segments are visually highlighted.

## Technical Plan

1. Serialize VIP progress segments with source text and voice alignment speed metadata.
2. Update topbar progress parser to support structured segment lines.
3. Split segment rendering into a left-column `ProgressSegmentsPanel`.
4. Keep right-side details focused on metadata.
5. Update tests, bump version, changelog, and run verification.

## Test Plan

- `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts src/components/layout/topbar.test.ts`
- `npm run guard:version`
- `npm run build`

## Observability

Progress modal should make voice speed anomalies visible directly in segment rows.

## Risks & Rollback

Risk: Very large segment lists remain large in the DOM, though scroll-constrained. Rollback by restoring the old collapsible timeline rendering.

## Deliverables

- Left-column segment panel.
- Source text toggle.
- Voice speed/warning display.
- Tests and changelog evidence.

## Changelog Note

Move progress segments under Flow steps and show per-segment voice speed with highlighting.

## Execution Notes

- Created from user request to move Segments left and expose source text/voice speed.
- Moved rich progress Segments into the left column under Flow steps.
- Removed segment Show all/Hide behavior; the list is always available in a scrollable panel.
- Added a source text toggle.
- Used existing VIP `voice.alignment.timeline` data to display speed/warnings when available, without additional requests.

## Test Evidence

- `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts src/components/layout/topbar.test.ts` pass (2 files / 27 tests).
- `npm run guard:version` pass.
- `npm run build` pass.
- `git diff --check` pass.

## Changed Files

- `src/features/workspace/workspace-canvas-panel.tsx`
- `src/features/workspace/workspace-canvas-panel.test.ts`
- `src/components/layout/topbar.tsx`
- `src/components/layout/topbar.test.ts`
- `package.json`
- `package-lock.json`
- `changelog/changelog.md`
- `tasks/board.md`
- `tasks/TASK-FAST-WORKSPACE-068.md`

## Residual Risks

- Voice speed is shown only when the existing VIP voice alignment timeline is present; no extra fetch or recomputation is performed.
