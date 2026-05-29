# [FAST-VIDEO-023] Update Subtitle Defaults and Force Uppercase Render

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
- Task ID: FAST-VIDEO-023
- Phase: FAST
- Target Phase: Subtitle default/style consistency
- Domain: Video Tools Lab / Workspace / Video Pipeline
- Task Type: Feature
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context
- Owner requested 3 changes globally:
  1. subtitle background opacity default = 0
  2. subtitle font size default = 40
  3. subtitle text rendered as uppercase.
  4. subtitle should appear when speech starts (avoid showing too early on leading silence).

## 3. Scope
- In scope:
  - Update subtitle defaults in Video Tools Lab, Workspace defaults/templates/seeds, and edit/VIP API fallbacks.
  - Force subtitle render text to uppercase in ASS generation.
  - Prevent subtitle segment overlap after VIP speech-timing alignment.
  - Ensure VIP composite ffmpeg ASS filters pass `fontsdir` so selected custom fonts (for example `Lobster`) are used in Workspace output.
  - Ensure VIP render can resolve `Bangers` via dynamic Google-font media fallback when a bundled local TTF is unavailable.
  - Bundle `Bangers-Regular.ttf` and map `Bangers` directly in edit/VIP font resolution to avoid `woff2` fallback behavior in ffmpeg/libass.
  - Change default subtitle font to `Bangers` across Lab/Workspace/API subtitle fallback paths.
  - Change default translation model to `cx/gpt-5.5` (replace `cx/gpt-5.3-codex-low`) across shared defaults and workspace seed/template defaults.
  - Update focused tests for changed defaults/rendering.
- Out of scope:
  - Existing saved setup migration.
  - Non-subtitle text overlay casing behavior.

## 4. Acceptance Criteria
1. New subtitle default font size is 40 everywhere runtime defaults are defined.
2. New subtitle background opacity default is 0 everywhere runtime defaults are defined.
3. Subtitle ASS output text is uppercase.
4. VIP subtitle timing follows voice speech timing so subtitles do not appear early before spoken audio starts.
5. Adjacent subtitles do not overlap after timing alignment in VIP render path.
6. Focused tests pass and version guard passes.
7. Workspace VIP output uses selected subtitle font family consistently with Video Tools Lab preview.

## 5. Technical Plan
1. Update default constants/state values in Video Tools Lab and Workspace graph/config resolution.
2. Update API fallback defaults for edit + VIP routes.
3. Uppercase translated subtitle text during ASS content build.
4. Update focused unit/source tests and run verification.

## 6. Test Plan
1. `npm run test -- --run src/features/video-processing/video-tools-lab-panel.test.ts src/lib/workspace/workspace-graph.test.ts src/lib/video-processing/video-edit-pipeline.test.ts src/lib/multilingual-audio/video-vip-processing.test.ts`
2. `npm run guard:version`

## 7. Changelog Note
- Set subtitle defaults to size 40 + background opacity 0, enforce uppercase subtitle rendering, align VIP subtitle timing with spoken voice timing, and prevent subtitle overlap.

## 8. Execution Notes
- Assumptions:
  - "Ở mọi nơi" applies to runtime/template defaults and API fallbacks, not retroactively rewriting existing saved setups.
- Blockers: none.

## 9. Test Evidence
- Test files added/updated:
  - `src/features/video-processing/video-tools-lab-panel.tsx`
  - `src/features/video-processing/video-tools-lab-panel.test.ts`
  - `src/features/workspace/workspace-canvas-panel.tsx`
  - `src/lib/workspace/workspace-graph.ts`
  - `src/lib/workspace/workspace-graph.test.ts`
  - `src/app/api/video-processing/edit/route.ts`
  - `src/app/api/audio/video-vip-processing/route.ts`
  - `src/lib/video-processing/video-edit-pipeline.ts`
  - `src/lib/video-processing/video-edit-pipeline.test.ts`
  - `src/lib/multilingual-audio/video-vip-processing.ts`
- Test commands executed:
  - `npm run test -- --run src/features/video-processing/video-tools-lab-panel.test.ts src/lib/workspace/workspace-graph.test.ts src/lib/video-processing/video-edit-pipeline.test.ts src/lib/multilingual-audio/video-vip-processing.test.ts`
  - `npm run test -- src/lib/workspace/workspace-graph.test.ts src/features/video-processing/video-tools-lab-panel.test.ts src/app/api/audio/video-vip-processing/route.test.ts src/lib/multilingual-audio/transcript-translation.test.ts`
  - `npm run test -- src/lib/multilingual-audio/video-vip-processing.test.ts src/lib/video-processing/video-edit-pipeline.test.ts`
  - `npm run test -- src/lib/multilingual-audio/video-vip-processing.test.ts`
  - `npm run guard:version`
- Test results summary:
  - Pass (4 files / 90 tests).
  - Version guard pass.
