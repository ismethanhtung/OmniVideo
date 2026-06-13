# [FAST-WORKSPACE-085] Fix VIP parallel render subtitle speechEnd chunk drift

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Version guard passed (if runtime changed)
- [x] Changelog updated
- [x] Ready for review
- [x] Done

## 1. Metadata

- Task ID: FAST-WORKSPACE-085
- Phase: FAST
- Target Phase: Workspace VIP EC2 render reliability
- Domain: Workspace / VIP Render
- Task Type: Bugfix
- Priority: P0
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Owner reports VIP EC2 voice + render becomes extremely slow and the final output shows subtitles stacked on top of each other after the first part of the video.
- The VIP renderer parallelizes long final renders into chunks. Chunk subtitles shift `start` and `end` into chunk-local time, but `speechEnd` remains absolute.
- Subtitle ASS generation uses `speechEnd` as the effective dialogue end when present, so absolute `speechEnd` can make chunk-local subtitle events last far too long and overlap later subtitles.

## 3. Scope

- In scope:
  - Shift and clip `speechEnd` when translated segments are prepared for parallel render chunks.
  - Preserve subtitles whose speech tail crosses a chunk boundary.
  - Add a regression test proving chunk ASS timing does not leak absolute `speechEnd`.
  - Update version, changelog, board, and verification evidence.
- Out of scope:
  - Changing Video Narrator UI.
  - Changing EC2 provisioning, worker tokens, or ffmpeg chunk count policy.
  - Reworking voice generation timing.

## 4. Acceptance Criteria

1. Parallel VIP chunk subtitle segments have chunk-local `start`, `end`, and `speechEnd`.
2. No chunk subtitle event can inherit an absolute `speechEnd` from the full-video timeline.
3. Segments whose speech tail crosses the chunk boundary remain visible only for the clipped chunk duration.
4. Regression tests cover the overlap bug.
5. Focused tests, version guard, build, and diff check pass.

## 5. Technical Plan

1. Inspect VIP chunk render subtitle shifting and ASS subtitle generation.
2. Update shifted translated segment preparation to clip `speechEnd` alongside `start` and `end`.
3. Add focused regression coverage for chunk-local `speechEnd` behavior.
4. Run targeted tests and required repo verification.

## 6. Test Plan

1. `npm run test -- --run src/lib/multilingual-audio/video-vip-processing.test.ts src/lib/video-processing/video-edit-pipeline.test.ts`
2. `npm run guard:version`
3. `npm run build`
4. `git diff --check`

## 7. Test Evidence

- `npm run test -- --run src/lib/multilingual-audio/video-vip-processing.test.ts src/lib/video-processing/video-edit-pipeline.test.ts` pass (2 files / 46 tests).
- `npm run guard:version` pass.
- `npm run build` pass.
- `git diff --check` pass.

## 8. Changelog Note

- Fix VIP EC2 parallel render subtitles stacking by shifting and clipping `speechEnd` per chunk.

## 9. Execution Notes

- Root cause identified in `shiftTranslatedSegmentsForRender`: `speechEnd` was left on the full-video timeline while chunk ASS rendering expects chunk-local timestamps.
- Updated `shiftTranslatedSegmentsForRender` to remove the original absolute `speechEnd`, re-add only the shifted chunk-local `speechEnd`, and keep boundary-crossing speech tails clipped to the active chunk.
