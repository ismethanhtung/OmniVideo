# [FAST-VIDEO-035] Refine Video Narrator subtitle controls and timeline segments

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

- Task ID: FAST-VIDEO-035
- Phase: FAST
- Target Phase: Video tools enhancement
- Domain: Video Processing / Video Narrator
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- User reported Video Narrator subtitle controls still look broken and unclear.
- User needs default subtitle size 80 and vertical default around 35% from the bottom instead of very low.
- User wants Narration Timeline to look more like Audio Transcript segments while preserving the play button.
- User clarified that the subtitle sample belongs on Source Preview, not inside the subtitle controls.

## 3. Scope

- In scope:
  - Replace confusing Bottom/Left/Right subtitle controls with clearer horizontal position and vertical offset controls.
  - Default subtitle size to 80 and vertical offset to 35% of 1080p.
  - Redesign background/worker controls to avoid orphaned labels and poor grouping.
  - Redesign Narration Timeline rows following Audio Transcript segment layout and keep play action.
  - Move subtitle sample preview onto Source Preview as a live overlay and remove the sample from the control box.
  - Update changelog/version/task evidence.
- Out of scope:
  - Changing subtitle rendering semantics beyond default style values and passed margins.
  - Changing script generation or render pipeline logic.

## 4. Acceptance Criteria

1. Subtitle controls no longer show confusing Bottom/Left/Right numeric fields as the primary layout.
2. Horizontal position is clearly selectable as left/center/right.
3. Vertical position is displayed as percent from bottom and defaults to 35%.
4. Subtitle font size defaults to 80.
5. Background and worker controls are visually grouped and do not leave orphan labels.
6. Narration Timeline uses an Audio Transcript-like segment row layout and keeps the segment play button.
7. Subtitle sample appears on Source Preview using the current font, color, background, alignment, and vertical offset settings.

## 5. Technical Plan

1. Add constants/helpers for subtitle vertical percent to ASS margin conversion.
2. Update Video Narrator default state and localStorage migration for subtitle style defaults.
3. Replace subtitle style JSX with grouped controls.
4. Replace timeline row JSX with Audio Transcript-inspired grid rows and play button.
5. Run targeted tests, build, and version guard.

## 6. Code Change Impact

- Có thay đổi code không: Yes
- Modules impacted:
  - `src/features/video-narrator/video-narrator-panel.tsx`
  - `package.json`
  - `package-lock.json`
  - `tasks/board.md`
  - `changelog/changelog.md`

## 7. Test Plan

1. Run `npm run test -- --run src/lib/video-processing/video-edit-pipeline.test.ts src/app/api/audio/video-narrator/route.test.ts`.
2. Run `npm run guard:version`.
3. Run `npm run build`.

## 8. Observability

- UI changes are covered by production build/type checks.

## 9. Risks & Rollback

- Risks: Existing saved localStorage subtitle values from older UI may conflict with new defaults.
- Rollback strategy: Restore previous numeric margin controls.

## 10. Deliverables

1. Clear subtitle controls.
2. Better Narration Timeline rows.
3. Updated changelog/version/task evidence.

## 11. Changelog Note

- Refined Video Narrator subtitle controls and timeline segment UI.

## 12. Execution Notes

- Assumptions: User's requested 35% means 35% offset from bottom, which places subtitles below the vertical center in a standard top-origin frame.
- Blockers: None.
- Verification evidence: Targeted API test, production build, version guard, and diff check passed.

## 13. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - No dedicated component test was added for this visual-only UI placement change; existing Video Narrator API regression tests were re-run.
- Test commands executed:
  - `npm run test -- --run src/app/api/audio/video-narrator/route.test.ts` (Pass: 1 file / 3 tests)
  - `npm run guard:version` (Pass)
  - `npm run build` (Pass)
  - `git diff --check` (Pass)
- Test results summary:
  - Source Preview subtitle overlay compiles successfully with live subtitle style state.
  - Existing Video Narrator API route tests remain green.
- Version guard command/result (if runtime changed): `npm run guard:version` pass.
