# [FAST-WORKSPACE-083] VIP Checkpoint Reuse, Segment Cutting Optimization, and Clear Checkpoints Button

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Version guard passed (if runtime changed)
- [x] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [x] Done

## 1. Metadata

- Task ID: FAST-WORKSPACE-083
- Phase: FAST
- Target Phase: Workspace Diagnostics & User Experience
- Domain: Workspace / Audio Transcription
- Task Type: Bugfix / Usability / Quality
- Priority: P1
- Size: S
- Owner: Antigravity
- Reviewer: Owner
- Status: Done

## 2. Context

- Currently, running the same video with different speed parameters (e.g. 0.75x then 0.8x) reuses the old transcription/translation checkpoints, because the polling endpoint key does not include execution parameters, and GET endpoints return stale checkpoints.
- Overlong transcription segments are currently split using simple greedy pause/punctuation thresholds, resulting in splits in the middle of sentences or phrases (e.g. Vietnamese clause cuts).
- Users need a manual way to clear saved checkpoints from the Background Progress modal to force a fresh execution run of the workflow from the start when desired.

## 3. Scope

- In scope:
  - Include key configuration parameters (speed factor, languages, models, translation mode, volume, mirror option) in the frontend `vipResumeKey` generation.
  - Implement a scoring-based boundary splitting logic in `splitOverlongSegmentByWords` to prefer punctuation (hard and soft) and significant pauses, preventing mid-sentence splits.
  - Implement a `DELETE` endpoint in `/api/audio/video-vip-processing` to clear specific or all checkpoints from `/tmp/omnivideo-vip-stage-checkpoints/`.
  - Add a "Clear checkpoints" button next to "Clear finished" in the Background Progress modal.
  - Add unit tests for scoring-based split and DELETE API endpoint.
  - Bump app version and update changelog.
- Out of scope:
  - Changing Whisper segment/word recognition models.
  - Clearing third-party storage assets or remote server-side artifact caches.

## 4. Acceptance Criteria

1. Changing speed factor or other parameters in the Workspace node config correctly generates a different checkpoint key, ensuring no stale checkpoint files are read or reused.
2. In `splitOverlongSegmentByWords`, word splitting is optimized using a scoring system: splits are made at hard punctuation (`。？！?!.`) and soft punctuation (`，、；：,;:`) first, and then at significant silence pauses (>0.5s or >0.3s) if punctuation is absent, avoiding arbitrary mid-sentence cuts.
3. Background Progress modal contains a "Clear checkpoints" button that calls the server-side DELETE API and deletes `/tmp/omnivideo-vip-stage-checkpoints` directory, displaying success.
4. Unit tests are added and all tests pass (`npm run test`).
5. App version is bumped to `0.10.118` and version guard (`npm run guard:version`) passes.

## 5. Technical Plan

1. Modify `vipResumeKey` generation in `src/features/workspace/workspace-canvas-panel.tsx`.
2. Update `splitOverlongSegmentByWords` in `src/lib/multilingual-audio/chinese-transcription.ts` with scoring-based split logic.
3. Implement `DELETE` method handler in `src/app/api/audio/video-vip-processing/route.ts`.
4. Add "Clear checkpoints" button and connect click handler in `src/components/layout/topbar.tsx`.
5. Add unit tests in `chinese-transcription.test.ts` and `route.test.ts`.
6. Bump version to `0.10.118` in `package.json` and `package-lock.json`.
7. Run tests, run version-guard, build, and update changelog.

## 6. Code Change Impact

- Có thay đổi code không: Yes
- Module impacted:
  - `src/features/workspace/workspace-canvas-panel.tsx`
  - `src/lib/multilingual-audio/chinese-transcription.ts`
  - `src/app/api/audio/video-vip-processing/route.ts`
  - `src/components/layout/topbar.tsx`
  - `src/lib/multilingual-audio/chinese-transcription.test.ts`
  - `src/app/api/audio/video-vip-processing/route.test.ts`
  - `package.json`
  - `package-lock.json`
  - `changelog/changelog.md`
  - `tasks/board.md`

## 7. Test Plan

1. Run focused tests: `npx vitest run src/lib/multilingual-audio/chinese-transcription.test.ts`
2. Run focused API tests: `npx vitest run src/app/api/audio/video-vip-processing/route.test.ts`
3. Run all tests: `npm run test`
4. Run version guard: `npm run guard:version`
5. Run production build: `npm run build`

## 8. Observability

- Clean split segments at punctuation or pause boundaries.
- Reset logs/checkpoints on manual clear action.

## 9. Risks & Rollback

- Risks: Deleting the checkpoints directory via DELETE API could impact ongoing runs if they try to write checkpoint files during deletion.
- Mitigation: Deletion uses recursive `force: true` which is safe, and ongoing runs will simply recreate the folder when they write.
- Rollback: Revert DELETE handler and `vipResumeKey` changes.

## 10. Deliverables

1. Configuration-dependent `vipResumeKey`.
2. Scoring-based segmentation split logic.
3. DELETE API endpoint for checkpoints.
4. Clear checkpoints button in progress modal.
5. Unit tests, version bump, and changelog update.

## 11. Changelog Note

- Add config parameters to Workspace VIP checkpoint key, optimize sentence segment splits via punctuation/pause scoring, and add a Clear Checkpoints button in Background Progress modal.

## 12. Execution Notes

- Modified `vipResumeKey` generation in `src/features/workspace/workspace-canvas-panel.tsx` to include execution configuration parameters. This prevents the GET polling API from returning stale checkpoint content and ensures parameter changes trigger a clean rerun.
- Redesigned `splitOverlongSegmentByWords` in `src/lib/multilingual-audio/chinese-transcription.ts` to score boundaries and split on best punctuation or pause instead of arbitrary limits.
- Implemented `DELETE` route handler in `src/app/api/audio/video-vip-processing/route.ts` to allow deletion of a specific key's checkpoint folder or clearing all checkpoints.
- Rendered "Clear checkpoints" button next to "Clear finished" in the Background Progress modal (`topbar.tsx`), hooked to delete API with confirmation/alert dialogs.
- Bumped app version to `0.10.118`.

## 13. Test Evidence

- Focused unit test runs:
  - `npx vitest run src/lib/multilingual-audio/chinese-transcription.test.ts` passed (9 tests).
  - `npx vitest run src/app/api/audio/video-vip-processing/route.test.ts` passed (17 tests).
- Full project verification: `npm run test` passed (118 files / 637 tests).
- Automated version compliance: `npm run guard:version` passed successfully.
- Production build validation: `npm run build` completed successfully.
