# [FAST-VIDEO-065] Fix Video Composer Metadata Event Null Crash

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

- Task ID: FAST-VIDEO-065
- Phase: FAST
- Target Phase: Video Composer
- Domain: Video Processing / UI
- Task Type: Bugfix
- Priority: P0
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

Uploading a video to Video Composer throws `Cannot read properties of null (reading 'duration')` from the `onLoadedMetadata` handler. The handler accesses React's event target inside a deferred state updater, after the event context can no longer be relied upon.

## 3. Scope

- In scope: capture the native video duration synchronously in the metadata handler before scheduling state; preserve preview playback-rate setup; add regression coverage.
- Out of scope: changes to composer timeline behavior or output render architecture.

## 4. Acceptance Criteria

1. Uploading a video no longer reads `event.currentTarget` inside a deferred state updater.
2. The decoded duration is still stored for the active clip and speed is applied to the video element.
3. Focused test asserts the safe event-data capture pattern.

## 5. Technical Plan

1. Extract `currentTarget` and duration synchronously from `onLoadedMetadata`.
2. Use the captured primitive in the state updater.
3. Update regression test, release metadata, and run required checks.

## 6. Test Plan

1. Focused Video Composer panel regression source test.
2. Required version guard, production build, and diff check.

## 7. Observability

- No new telemetry; the previous client exception is removed at its event-lifecycle cause.

## 8. Risks & Rollback

- Risk: invalid video metadata can produce a non-finite duration.
- Mitigation: store only a finite non-negative duration.
- Rollback: revert the handler/test/release metadata changes.

## 9. Deliverables

1. Safe metadata handler.
2. Regression test and evidence.

## 10. Changelog Note

- Planned summary: Fix Video Composer upload crash caused by deferred metadata event access.

## 11. Execution Notes

- Root cause: React event lifecycle and deferred state callback interaction, not an invalid uploaded video.

## 12. Test Evidence (Mandatory if code changed)

- `npm run test -- --run src/features/video-processing/video-composer-panel.test.ts` pass (1 file / 4 tests).
- `npm run guard:version`, `npm run build`, and `git diff --check` pass alongside FAST-VIDEO-066.
