# [FAST-VIDEO-037] Fix Video Narrator 3-word preview and active highlight color

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

- Task ID: FAST-VIDEO-037
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

- User reported Source Preview and Render Output subtitle behavior still do not match:
  - Preview ignores `3-word active highlight` and shows full text.
  - Render active color semantics are wrong.
  - Subtitle controls still expose confusing Bottom/Left/Right numeric fields.

## 3. Scope

- In scope:
  - Make Source Preview derive subtitle text from current video time and selected subtitle mode.
  - Make 3-word preview show only the active 3-word window.
  - Make 3-word render use warm white as default text color and selected color as active karaoke color.
  - Replace Bottom/Left/Right primary controls with horizontal alignment and vertical percent controls.
  - Update tests/changelog/version/task evidence.
- Out of scope:
  - EC2 worker deployment.
  - Broader Video Narrator layout redesign.

## 4. Acceptance Criteria

1. Source Preview reflects selected subtitle mode.
2. `3-word active highlight` preview shows at most 3 words.
3. In 3-word mode, non-active words are warm white and active word uses the selected color.
4. Rendered ASS uses the same active/default color semantics.
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
