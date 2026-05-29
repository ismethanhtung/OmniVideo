# [FAST-VIDEO-021] Match Video Tools Lab Subtitle Preview in Product Render

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
- Task ID: FAST-VIDEO-021
- Phase: FAST
- Target Phase: Video Tools Lab subtitle render parity
- Domain: Video Pipeline / Workspace VIP
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context
- Owner reports Video Tools Lab `Original Preview` subtitle background height matches the desired mask coverage, but final product output renders the subtitle background much smaller.
- Saved setup includes `subtitleBackgroundPaddingY`, but downstream product render paths may not preserve it.
- The fix must keep blur behavior unchanged.

## 3. Scope
- In scope:
  - Preserve Video Tools Lab subtitle style settings, especially background padding Y, through Workspace and VIP product render paths.
  - Export subtitle margins from the currently visible preview box position before Run/Save.
  - Add richer subtitle font choices with styled preview in Video Tools Lab.
  - Change Video Tools subtitle defaults to font size `35` and background padding Y `8`.
  - Remove the incorrect ASS vertical scale workaround.
  - Add regression tests/source assertions for the lost setting.
- Out of scope:
  - Redesigning subtitle style controls.
  - Changing blur strength, blur placement, or cover box semantics.

## 4. Acceptance Criteria
1. Saved `subtitleBackgroundPaddingY` from Video Tools Lab is forwarded into VIP subtitle ASS style.
2. Workspace render form payloads include `subtitleBackgroundPaddingY` when using saved setup or node config.
3. ASS subtitle style returns to normal text/background scale without the previous `ScaleY=125` workaround.
4. Video Tools Lab Run/Save derives output subtitle `alignment` and margins from the currently visible preview box.
5. Saved subtitle placement is converted into the same percentage `x/y/width/height` region model as blur/cover boxes for Workspace/VIP render.
6. Video Tools Lab subtitle defaults are font size `35` and background padding Y `8`.
7. Video Tools Lab subtitle font selector includes multiple styled font options.
8. Subtitle wrapping uses the placement region width and multi-line subtitles have visible row spacing.
9. Subtitle/output font family in ffmpeg render matches Video Tools Lab configuration for bundled Google fonts (for example `Lobster`).
10. Focused tests pass and version guard passes.

## 5. Technical Plan
1. Extend Workspace video edit setup typing/default resolution with `subtitleBackgroundPaddingY`.
2. Forward `subtitleBackgroundPaddingY` from Workspace edit/VIP form payloads.
3. Parse `subtitleBackgroundPaddingY` in VIP API route and pass it into `subtitleStyle`.
4. Derive subtitle ASS placement from current preview box dimensions before save/run.
5. Normalize saved preview-placement percentages and saved blur regions into a subtitle placement region for Workspace and VIP API render paths.
6. Use placement-region width for ASS subtitle wrapping and add controlled ASS line spacing for wrapped/manual multi-line subtitles.
7. Resolve bundled Google font files and pass ffmpeg `ass` `fontsdir` so rendered subtitle font matches selected family.
8. Bundle a minimal local TTF for `Lobster` and prioritize it over Next `woff2` cache files for ffmpeg/libass compatibility.
9. Update Video Tools Lab subtitle defaults and font picker options.
10. Update regression tests and changelog/version evidence.

## 6. Test Plan
1. `npm run test -- --run src/features/video-processing/video-tools-lab-panel.test.ts src/app/api/video-processing/edit/route.test.ts src/app/api/audio/video-vip-processing/route.test.ts src/lib/video-processing/video-edit-pipeline.test.ts src/features/workspace/workspace-canvas-panel.test.ts src/lib/workspace/workspace-graph.test.ts`
2. `npm run guard:version`

## 7. Changelog Note
- Preserve Video Tools Lab subtitle preview placement and background padding in Workspace/VIP product render output.

## 8. Execution Notes
- Assumptions:
  - The main product mismatch is lost `subtitleBackgroundPaddingY`, not blur rendering.
  - Existing saved setup should be the source of truth when node config is still default.
  - For legacy setups without `subtitlePlacementRegion`, the first valid saved blur region is the best fallback because it uses the same coordinate model the owner already aligned visually.
- Blockers: none.

## 9. Test Evidence
- Test files added/updated:
  - `src/app/api/audio/video-vip-processing/route.test.ts`
  - `src/app/api/video-processing/edit/route.test.ts`
  - `src/features/video-processing/video-tools-lab-panel.test.ts`
  - `src/features/video-processing/subtitle-preview-placement.ts`
  - `src/features/workspace/workspace-canvas-panel.test.ts`
  - `src/lib/video-processing/subtitle-placement.ts`
  - `src/lib/video-processing/video-edit-pipeline.test.ts`
  - `public/fonts/Lobster-Regular.ttf`
  - `src/lib/workspace/workspace-graph.test.ts`
- Test commands executed:
  - `npm run test -- --run src/features/video-processing/video-tools-lab-panel.test.ts src/app/api/video-processing/edit/route.test.ts src/app/api/audio/video-vip-processing/route.test.ts src/lib/video-processing/video-edit-pipeline.test.ts src/features/workspace/workspace-canvas-panel.test.ts src/lib/workspace/workspace-graph.test.ts`
  - `npm run build`
  - `npm run guard:version`
- Test results summary:
  - Pass (6 files / 119 tests).
  - Build pass.
- Version guard command/result:
  - `npm run guard:version` pass.
