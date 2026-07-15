# [FAST-VIDEO-061] Preview and Reorder Video Tools Merge Queue

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

- Task ID: FAST-VIDEO-061
- Phase: FAST
- Target Phase: Video Tools Lab
- Domain: Video Processing / UI
- Task Type: Feature
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

Video Tools Merge Videos uploads the queue immediately to produce an MP4 and currently gives no visual check of the resulting sequence. The owner needs to preview the proposed concatenation and use drag-and-drop to reorder files before committing the real merge.

## 3. Scope

- In scope:
  - Browser-local sequential preview of the selected merge queue with no upload or ffmpeg render.
  - HTML drag-and-drop reorder of the queue.
  - Ensure the reordered queue is the exact order posted to the existing merge API.
  - Show the active preview position and allow removing a selected file.
- Out of scope:
  - Re-encoding, transition effects, or a pre-rendered merged artifact.
  - Storage-asset merge source support.
  - Changes to the existing merge API/runtime.

## 4. Acceptance Criteria

1. After selecting two or more local videos, the user can play a preview that advances through them in the displayed queue order without requesting `/api/video-processing/merge`.
2. A user can drag a queue item from position 1 to position 3 (or equivalent) and the displayed numbering, preview order, and POST FormData order all use the new order.
3. A queue item can be removed and the preview updates safely; no preview is shown when the queue is empty.
4. The existing Merge + Download MP4 behavior remains available and still requires at least two files.
5. Focused tests cover preview/reorder UI wiring and no regression in merge request ordering.

## 5. Technical Plan

1. Add local object-URL lifecycle management and a sequential browser video preview for queue files.
2. Add drag event handlers and immutable queue move/remove helpers in the Video Tools merge panel.
3. Keep `runMerge` iterating the reordered `mergeFiles` list unchanged.
4. Add/update focused tests, patch version, changelog, task evidence, and required checks.

## 6. Test Plan

1. UI regression: verify local preview/object URL lifecycle, sequential `onEnded` advance, drag/drop handlers, remove action, and queue-order FormData loop.
2. Existing runtime regression: run Video Splitter panel, merge API route, and video merge runtime tests.
3. Required checks: `npm run guard:version`, `npm run build`, and `git diff --check`.

## 7. Observability

- No server work is performed for previews. Existing merge progress telemetry remains the sole status path for committed merges.

## 8. Risks & Rollback

- Risk: large local files can consume browser memory while preview object URLs are active.
- Mitigation: revoke object URLs whenever the queue changes or the panel unmounts.
- Rollback: revert the Video Tools preview/reorder UI, tests, task metadata, changelog entry, and version bump.

## 9. Deliverables

1. Drag-sortable merge queue with remove action.
2. Local sequential merge preview.
3. Tests and release/task evidence.

## 10. Changelog Note

- Planned summary: Add local sequential preview and drag reorder to Video Tools Merge Videos.

## 11. Execution Notes

- Preview intentionally plays the source files back-to-back in the queued order. It validates sequence before merge but does not conceal stream-copy compatibility issues that ffmpeg can still report during the actual merge.

## 12. Test Evidence (Mandatory if code changed)

- `npm run test -- --run src/features/video-processing/video-splitter-panel.test.ts src/app/api/video-processing/merge/route.test.ts src/lib/video-processing/video-merge.test.ts` pass (3 files / 9 tests).
- `npm run guard:version` pass.
- `npm run build` pass outside the filesystem sandbox; the initial sandbox attempt was blocked by Turbopack needing an internal port, not by code/type errors.
- `git diff --check` pass.
- Residual risk: local sequential preview validates order but cannot pre-detect stream-copy incompatibilities that the actual ffmpeg concat can report.
