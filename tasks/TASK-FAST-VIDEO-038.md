# [FAST-VIDEO-038] Fix Video Narrator 3-word active-only highlight render

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

- Task ID: FAST-VIDEO-038
- Phase: FAST
- Target Phase: Video tools enhancement
- Domain: Video Processing / Video Narrator
- Task Type: Bugfix
- Priority: P1
- Size: XS
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- User clarified that `3-word active highlight` must color only the currently active word.
- Completed words and upcoming words must remain warm white.
- ASS karaoke `\k` tags do not guarantee this exact active-only color behavior.

## 3. Scope

- In scope:
  - Replace 3-word ASS karaoke `\k` rendering with per-word timed dialogue events.
  - Apply selected color only to the active word using explicit ASS color override tags.
  - Keep all non-active words warm white.
  - Update regression tests, changelog, version, and task evidence.
- Out of scope:
  - Broader subtitle UI redesign.
  - Remote worker deployment.

## 4. Acceptance Criteria

1. `3-word active highlight` output shows at most 3 words.
2. Only the current active word uses the selected color.
3. Previous and upcoming words remain warm white.
4. Regression test rejects the old `\k` karaoke rendering for this mode.
5. Tests/build pass.

## 5. Test Plan

1. `npm run test -- --run src/lib/video-processing/video-edit-pipeline.test.ts src/app/api/audio/video-narrator/route.test.ts`
2. `npm run guard:version`
3. `npm run build`

## 6. Test Evidence

- `npm run test -- --run src/lib/video-processing/video-edit-pipeline.test.ts src/app/api/audio/video-narrator/route.test.ts` pass (2 files / 29 tests).
- `npm run guard:version` pass.
- `npm run build` pass.
- `git diff --check` pass.
