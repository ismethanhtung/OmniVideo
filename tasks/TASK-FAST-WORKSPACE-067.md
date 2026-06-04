# FAST-WORKSPACE-067 - Clarify VIP Stage Timing and Compact Hashtags

- [x] DoR completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [ ] Done

## Task ID

`FAST-WORKSPACE-067`

## Title

Clarify VIP stage timing and compact hashtags.

## Phase

Phase 1

## Target Phase

MVP workspace operations

## Domain

Workspace / Multilingual audio metadata

## Task Type

Fast UX/metadata bugfix

## Owner

AI Agent

## Status

Review

## Priority

High

## Context

VIP progress details show stage timings that do not visibly reconcile with the overall Workspace flow duration, making voice/render timing hard to trust. VIP metadata also emits hashtags with spaces, while the desired publishing format is compact hashtag tokens without spaces.

## Scope

In:

- Clarify VIP progress labels for measured voice and final render stage timings.
- Add a measured stage total line so users can compare pipeline stages against overall flow duration.
- Normalize generated Vietnamese metadata hashtags to no-space tokens.
- Update focused tests and release metadata.

Out:

- Reworking the actual VIP timing instrumentation across transport/polling/download.
- Changing provider/model selection.
- Backfilling old stored metadata.

## Acceptance Criteria

1. VIP progress details show voice and final render duration labels clearly.
2. VIP progress details show measured stage total separately from overall flow runtime.
3. Generated hashtags do not contain spaces.
4. Existing preferred tags still append and remain stable.
5. Focused tests cover timing label changes and hashtag normalization.

## Technical Plan

1. Add helper formatting for VIP measured stage total and explicit voice/render labels in Workspace progress details.
2. Normalize hashtags in `video-metadata` output to compact tokens.
3. Update unit/source tests.
4. Bump patch version, update changelog, and run verification.

## Test Plan

- `npm run test -- --run src/lib/multilingual-audio/video-metadata.test.ts src/features/workspace/workspace-canvas-panel.test.ts`
- `npm run guard:version`
- `npm run build`

## Observability

Progress detail should clearly distinguish measured pipeline stage total from full Workspace elapsed time.

## Risks & Rollback

Risk: Compact hashtag normalization may slightly change provider-generated wording. Rollback by restoring previous hashtag trim-only behavior.

## Deliverables

- Clear VIP timing labels.
- Compact hashtag normalization.
- Regression tests and changelog evidence.

## Changelog Note

Clarify VIP measured stage timing in Workspace progress and normalize generated hashtags without spaces.

## Execution Notes

- Created from user report that VIP total timing looked inconsistent and generated hashtags had spaces.
- Clarified Workspace VIP progress detail with `Voice render time`, `Final video render time`, and `Measured stages total`.
- Removed old completed-stage timestamp log lines from VIP final progress detail.
- Normalized generated Vietnamese metadata hashtags to compact no-space tokens.

## Test Evidence

- `npm run test -- --run src/lib/multilingual-audio/video-metadata.test.ts src/features/workspace/workspace-canvas-panel.test.ts` pass (2 files / 29 tests).
- `npm run guard:version` pass.
- `npm run build` pass.
- `git diff --check` pass.

## Changed Files

- `src/lib/multilingual-audio/video-metadata.ts`
- `src/lib/multilingual-audio/video-metadata.test.ts`
- `src/features/workspace/workspace-canvas-panel.tsx`
- `src/features/workspace/workspace-canvas-panel.test.ts`
- `package.json`
- `package-lock.json`
- `changelog/changelog.md`
- `tasks/board.md`
- `tasks/TASK-FAST-WORKSPACE-067.md`

## Residual Risks

- Overall Workspace duration can still exceed measured pipeline stage total because it includes orchestration, EC2 polling/transport, artifact download, and Save Local time.
