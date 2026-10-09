# [FAST-VIDEO-070] Expand Color Grading Studio with More Presets and Professional Parameters

## 0. Progress Stamp
- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [ ] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [x] Done

## 1. Metadata
- Task ID: FAST-VIDEO-070
- Phase: FAST
- Target Phase: Video color grading UX
- Domain: Video Processing / ZeroTTS Video Studio
- Task Type: Feature / UX
- Priority: P2
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context
- The "Video Color Grading & Lighting Studio" section only offered 6 one-click color presets and 6 manual parameters (brightness, contrast, saturation, gamma, vignette, temperature).
- User requested ~10 presets and any additional professional parameters that increase the range of possible styles.
- Adding professional parameters requires support in both the live CSS preview and the FFmpeg export filter chain to stay consistent.

## 3. Scope
- In scope:
  - add 6 new one-click presets (total 12) with curated values across the new parameters;
  - add 4 professional parameters: Hue shift, Tint (green/magenta), Vibrance, Sepia;
  - extend the FFmpeg color-grade filter builder and route option parsing;
  - extend the live CSS preview approximation;
  - keep default preset behavior and existing parameter ranges intact.
- Out of scope:
  - changing render codec/quality settings;
  - per-segment (temporal) grading or keyframed grading;
  - highlight/shadow mask editing UI.

## 4. Acceptance Criteria
1. The preset grid renders at least 10 one-click presets, each applying all 10 parameters.
2. New parameters (hue, tint, vibrance, sepia) are adjustable via sliders and reflect in the live preview.
3. `buildColorGradeFfmpegFilter` emits `hue=`, `vibrance=`, `colorbalance=` (mid-tone tint) and `colorchannelmixer=` (sepia) only when non-neutral, and clamps out-of-range values.
4. The render request sends `hue`, `vibrance`, `sepia`, `tint` for both multipart and JSON requests.
5. Unit tests cover the new presets, parameters and FFmpeg filters.

## 5. Technical Plan
1. Extend `ColorGradeFilterOptions` and `buildColorGradeFfmpegFilter` in the color-grade route.
2. Parse the new form fields in the multipart and JSON branches of the route.
3. Extend `ColorGradePreset`, the preset list, component state, `applyColorGradePreset`, `handleCgRenderExport` and `cgFilterCss` in the panel.
4. Add the four new sliders and expand the preset grid.
5. Update tests and release metadata.

## 6. Test Plan
1. `npx vitest run src/app/api/video-processing/color-grade/route.test.ts`
2. `npx vitest run src/features/audio/piper-tts-sandbox-panel.test.ts -t "Video Color Grading"`
3. `npx tsc --noEmit`
4. `npm run guard:version`

## 7. Changelog Note
- Add 6 new pro color presets and Hue/Tint/Vibrance/Sepia grading parameters.

## 8. Execution Notes
- FFmpeg mapping (all verified available in bundled ffmpeg-static 6.0):
  - Hue → `hue=h=<deg>` (CSS `hue-rotate`).
  - Tint (green/magenta) → `colorbalance` midtones `rm/gm/bm` (merged with existing temperature `rs/gs/bs`).
  - Vibrance → `vibrance=intensity=<v>`.
  - Sepia → `colorchannelmixer` blended between identity and the sepia matrix.
- The live preview approximates vibrance (gentle extra `saturate`) and tint (small `hue-rotate`), consistent with the existing temperature approximation; FFmpeg output remains authoritative.

## 9. Test Evidence
- Test files updated:
  - `src/app/api/video-processing/color-grade/route.test.ts` (added hue/vibrance/sepia/tint, neutral-omission, sepia blend and clamping cases).
  - `src/features/audio/piper-tts-sandbox-panel.test.ts` (added new preset ids and parameter assertions).
- Test commands executed:
  - `npx vitest run src/features/audio/piper-tts-sandbox-panel.test.ts src/app/api/video-processing/color-grade/route.test.ts` → 25 passed.
  - `npx tsc --noEmit` → no errors in changed files.
  - `npm run guard:version` → pass after patch bump `0.11.84 -> 0.11.85`.
- Also synced the stale ZeroTTS "Synchronized Video" test assertions with the current UI labels from commit `6aea21f`.
- Residual risk: none.
