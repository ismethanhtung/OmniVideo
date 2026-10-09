# [FAST-VIDEO-071] ZeroTTS Voice Lab: Framed Sections and Video Color Grade Presets

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
- Task ID: FAST-VIDEO-071
- Phase: FAST
- Target Phase: ZeroTTS Voice Lab UX + video color grading
- Domain: Audio / Video Processing / ZeroTTS Voice Studio
- Task Type: Feature / UX
- Priority: P2
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context
- The ZeroTTS Voice Lab left column stacked Voice settings, Background Music, Synchronized Video and CapCut captions inside a single bordered card, making the inner controls hard to scan.
- Only the "CapCut VIP Captions" block had its own frame; the user asked for Voice, Background Music and Synchronized Video to each be framed/split like it.
- The user also asked the video block to offer the 12 one-click color presets from the "Video Color Grading & Lighting Studio" so the synchronized video can be graded within ZeroTTS.

## 3. Scope
- In scope:
  - wrap the Voice, Background Music and Synchronized Video blocks in their own framed cards (same frame language as the CapCut captions card);
  - add a compact 12-preset color-grade selector to the video card;
  - apply the selected preset to the live synchronized-video preview;
  - pass the selected preset into the ZeroTTS render settings and apply it in FFmpeg before captions are burned in;
  - extract the shared color-grade filter builders into a lib so the route, preview and render stay consistent.
- Out of scope:
  - adding manual color sliders to the ZeroTTS video block (presets only);
  - changing the existing Color Grading & Lighting Studio behavior;
  - changing render codec/quality settings.

## 4. Acceptance Criteria
1. Voice & Synthesis Settings, Background Music and Synchronized Video each render inside their own bordered card, with the Voice card header using an icon + divider like the CapCut captions card.
2. The video card shows all 12 color presets; the active preset is highlighted and its label/description are shown.
3. Selecting a preset updates the synchronized-video preview (CSS filter) and the render request (`settingsJson.colorGrade`).
4. `renderZeroTtsVideo` applies the color grade before burning in subtitles (grade first, then `subtitles`).
5. Shared color-grade helpers (`buildColorGradeFfmpegFilter`, `buildColorGradeCssFilter`) live in `src/lib/video-processing/color-grade.ts` and the color-grade route re-exports the FFmpeg builder.
6. `ZeroTtsRenderSettings` accepts `colorGrade`; `buildZeroTtsVideoFilter` composes grade + subtitles.
7. Unit tests cover the helpers, the ZeroTTS video filter composition and the panel UI.
8. Version bumped and changelog updated.

## 5. Technical Plan
1. Extract `ColorGradeFilterOptions`, `buildColorGradeFfmpegFilter` and a new `buildColorGradeCssFilter` to `src/lib/video-processing/color-grade.ts`.
2. Make `color-grade/route.ts` import + re-export the builder; reuse the CSS builder in the panel (`cgFilterCss`).
3. Add `colorGrade` to `ZeroTtsRenderSettings` and `buildZeroTtsVideoFilter`; use it in `renderZeroTtsVideo`.
4. Add `zeroTtsColorPreset` state and derived options/filter CSS in the panel; include `colorGrade` in the render `settingsJson`.
5. Restructure the ZeroTTS left column into framed cards and add the preset grid.
6. Update tests and release metadata.

## 6. Test Plan
1. `npx vitest run src/lib/video-processing/color-grade.test.ts src/lib/video-processing/zerotts-render.test.ts src/app/api/video-processing/color-grade/route.test.ts src/features/audio/piper-tts-sandbox-panel.test.ts`
2. `npx tsc --noEmit` (no new errors in changed files)
3. `npm run lint`
4. `npm run guard:version`
5. SSR check of `/piper-tts-sandbox`.

## 7. Changelog Note
- Split ZeroTTS Voice Lab Voice/BGM/Video into framed cards and add 12 video color-grade presets to the synchronized video.

## 8. Execution Notes
- The grade is applied in the FFmpeg chain before `subtitles` so caption colors are never shifted by the grade.
- The `natural_reset` ("Original") preset maps to no grade: the preview uses `filter: none` and no `colorGrade` is sent.
- The live preview approximates vibrance/tint like the existing Color Grading Studio; FFmpeg output remains authoritative.
- Follow-up fix: the "Video Color Grading & Lighting Studio" section was the only section missing the `border-t border-main` top separator and the only one with its own section `border` (double border). It now uses the standard `<section className="space-y-3">` pattern inside the panel padding.

## 9. Test Evidence
- Test files added/updated:
  - `src/lib/video-processing/color-grade.test.ts` (new: CSS + FFmpeg helper cases).
  - `src/lib/video-processing/zerotts-render.test.ts` (added `buildZeroTtsVideoFilter` cases).
  - `src/features/audio/piper-tts-sandbox-panel.test.ts` (updated overflow guard + new framing/presets test).
- Test commands executed:
  - `npx vitest run src/lib/video-processing/color-grade.test.ts src/lib/video-processing/zerotts-render.test.ts src/app/api/video-processing/color-grade/route.test.ts src/features/audio/piper-tts-sandbox-panel.test.ts` → 43 passed.
  - `npx tsc --noEmit` → no errors in changed files.
  - `npm run guard:version` → pass after patch bump `0.11.85 -> 0.11.86`.
- Residual risk: none.
