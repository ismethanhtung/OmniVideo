# [FAST-VIDEO-025] Disable Automatic Subtitle Line Wrapping

## 0. Progress Stamp
- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Version guard passed (if runtime changed)
- [x] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [ ] Done

## 1. Metadata
- Task ID: FAST-VIDEO-025
- Phase: FAST
- Target Phase: Subtitle rendering stability
- Domain: Video Processing / Subtitle Overlay
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context
- A real render case still wraps a subtitle into 2 lines unexpectedly although visual width appears under target.
- Owner requested a strict fallback mode: keep subtitle on one line by default, and avoid automatic wrap.

## 3. Scope
- In scope:
  - Remove automatic subtitle line wrapping in ASS generation.
  - Preserve explicit newline from source segment text.
  - Update/add tests proving no auto line split is injected.
- Out of scope:
  - Subtitle placement/region tuning.
  - Translation segmentation strategy.

## 4. Acceptance Criteria
1. Subtitle renderer no longer injects automatic line break for long one-line segment text.
2. Explicit newline in segment text is still preserved in rendered ASS output.
3. Target subtitle pipeline tests pass.

## 5. Technical Plan
1. Replace auto-wrap path in `buildSubtitleAssContent` with uppercase + newline-preserving text transform.
2. Keep ASS gap insertion behavior for explicit multi-line subtitles.
3. Update tests in `video-edit-pipeline.test.ts` to reflect no auto-wrap behavior.
4. Run focused tests and version guard.

## 6. Test Plan
1. `npm run test -- --run src/lib/video-processing/video-edit-pipeline.test.ts`
2. `npm run guard:version`

## 7. Changelog Note
- Disabled automatic subtitle line wrapping; subtitles now stay single-line unless input segment already contains manual newline.

## 8. Execution Notes
- Assumptions:
  - Segment lengths are already controlled upstream, so one-line default is acceptable for owner workflow.
- Blockers: none.

## 9. Test Evidence
- Test files added/updated:
  - `src/lib/video-processing/video-edit-pipeline.ts`
  - `src/lib/video-processing/video-edit-pipeline.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/video-processing/video-edit-pipeline.test.ts`
  - `npm run guard:version`
- Test results summary:
  - Pass (1 file / 21 tests).
  - Version guard pass.
