# [FAST-VIDEO-064] Upgrade Video Composer Preview Timeline and Controls

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

- Task ID: FAST-VIDEO-064
- Phase: FAST
- Target Phase: Video Composer
- Domain: Video Processing / UI
- Task Type: Bugfix / Feature
- Priority: P0
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

Owner review found that Video Composer's uploaded music was an independent audio element, not mixed into the preview timeline. The text overlay was fixed, the font size floor was too high, the Vintage look was poor, and the simple clip row did not resemble a usable multi-track editor timeline. The requested additions include speed control and a CapCut-like lower editing area.

## 3. Scope

- In scope:
  - Synchronize uploaded music preview to video play/pause/seek and sequential clip progression.
  - Add source-video speed control to preview.
  - Lower text size minimum to 4px and allow pointer drag positioning inside the preview.
  - Replace the Vintage preview with restrained color grade, film grain, vignette, and scratches.
  - Replace the lower clip row with a ruler, video track, audio track/waveform treatment, effects labels, and playhead tied to preview time.
- Out of scope:
  - MP4 render/mixdown or AI vocal stem separation.
  - Claiming browser audio synchronization has burned music into a downloadable video.
  - Frame-perfect non-linear editing or trimming.

## 4. Acceptance Criteria

1. When a preview clip plays, pauses, seeks, or advances, uploaded music follows the same composer time; its own control is no longer required to hear music in the video preview.
2. Preview speed choices affect clip playback and project duration/playhead calculations.
3. Font-size range permits `4px`, and visible overlay text can be dragged to a new location using pointer input.
4. Vintage effect shows a visibly refined, restrained grade plus grain/vignette/scratch layers rather than only a sepia filter.
5. A lower timeline has time ruler, vertical playhead, reorderable video cards, and a separate visual audio track when music is loaded.
6. Focused tests cover sync hooks, minimum font size, draggable text, speed, Vintage layers, and multi-track timeline labels.

## 5. Technical Plan

1. Track local clip durations/current preview time and derive composer timeline time.
2. Synchronize music audio element playback and time with video events; add speed state and metadata effects.
3. Add safe pointer-coordinate handling for the editable text layer.
4. Build the lower timeline structure inspired by the supplied CapCut reference, retaining existing drag reorder.
5. Add/update tests, release metadata, and required checks.

## 6. Test Plan

1. Panel source regression for `onPlay`, `onPause`, `onSeeking`, music sync, speed, min font size, pointer drag, Vintage layers, and timeline/audio-track UI.
2. Existing Video Composer/Video Tools panel tests.
3. Required checks: focused tests, `npm run guard:version`, `npm run build`, and `git diff --check`.

## 7. Observability

- Preview music failures are caught locally and do not block clip playback. The page continues to make its preview-only boundary explicit.

## 8. Risks & Rollback

- Risk: browsers can reject unprompted audio playback; the music play call is safely ignored until user initiates video playback.
- Mitigation: synchronize only from a user-driven video play event and retain preview if music cannot play.
- Rollback: revert composer preview/timeline changes, tests, version/changelog, and task entry.

## 9. Deliverables

1. Synced music and speed-aware preview.
2. Draggable text and improved Vintage look.
3. CapCut-inspired lower multi-track timeline.
4. Tests and governance evidence.

## 10. Changelog Note

- Planned summary: Synchronize Video Composer music preview and add draggable text, speed, refined Vintage, and multi-track timeline.

## 11. Execution Notes

- Music is now truly mixed into the browser preview experience, but this does not change the still-explicit limitation that MP4 mixdown needs a server render pipeline.

## 12. Test Evidence (Mandatory if code changed)

- `npm run test -- --run src/features/video-processing/video-composer-panel.test.ts src/features/video-processing/video-splitter-panel.test.ts` pass (2 files / 9 tests).
- `npm run guard:version` pass.
- `npm run build` pass outside the filesystem sandbox because Turbopack requires an internal port.
- `git diff --check` pass.
- Residual risk: music is synchronized in browser preview but this task deliberately does not claim a server MP4 mixdown or AI vocal stem separation.
