# [FAST-VIDEO-024] Relax Subtitle Auto-Wrap Threshold to 80% Width

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
- Task ID: FAST-VIDEO-024
- Phase: FAST
- Target Phase: Subtitle wrapping behavior parity
- Domain: Video Processing / Subtitle Overlay
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context
- Current subtitle auto-wrap can break to line 2 too early even when horizontal space is still visually available.
- Owner requests wrap threshold to be relaxed so subtitles only wrap when text reaches about 80% of horizontal width.

## 3. Scope
- In scope:
  - Adjust ASS subtitle auto-wrap width budgeting in video edit pipeline.
  - Keep existing explicit line-break behavior intact.
  - Add regression tests for the 80%-width wrapping threshold behavior.
- Out of scope:
  - Subtitle font family/size default changes.
  - Subtitle placement drag/preview UI logic.

## 4. Acceptance Criteria
1. Auto-wrap threshold uses approximately 80% of effective subtitle horizontal width before splitting lines.
2. Long subtitle lines still wrap when exceeding the new threshold.
3. Existing manual/newline subtitle formatting remains preserved.
4. Relevant subtitle pipeline tests pass.

## 5. Technical Plan
1. Update max-line-width computation in `buildSubtitleAssContent` to target 80% usage of effective width.
2. Keep placement-region-aware width logic and stale-margin safeguards unchanged.
3. Add/adjust unit tests in `video-edit-pipeline.test.ts` for threshold behavior.
4. Run focused tests and version guard.

## 6. Test Plan
1. `npm run test -- --run src/lib/video-processing/video-edit-pipeline.test.ts`
2. `npm run guard:version`

## 7. Changelog Note
- Relax subtitle auto-wrap threshold so lines only wrap after consuming about 80% of available subtitle width.

## 8. Execution Notes
- Assumptions:
  - "80% chiều ngang" applies to effective subtitle render width (play resolution + placement-aware available width), not raw player viewport pixels.
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
