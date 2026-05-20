# [FAST-VIDEO-008] Fix Thumbnail Studio Blur and Text Preview Fidelity

## 0. Progress Stamp
- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [ ] Done

## 1. Metadata
- Task ID: FAST-VIDEO-008
- Phase: FAST
- Target Phase: Thumbnail Studio UX fidelity
- Domain: Video Pipeline / Thumbnail Studio
- Task Type: Bugfix
- Priority: P0
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context
- Owner reverted the previous attempt because it introduced incorrect behavior:
  - blur strength `0` still appeared blurred in preview;
  - text preview still did not match saved output;
  - blur icon was incorrectly changed to a filter icon.
- The editor must make the preview trustworthy before users save thumbnails.

## 3. Scope
- In scope:
  - make blur strength `0` render as no blur in both preview and saved image;
  - align blur strength mapping between preview and save;
  - replace the Blur panel icon with a more suitable blur-like icon;
  - align preview text scale and font loading with saved canvas output;
  - keep the source thumbnail selected after creating a saved variant;
  - add more display/special thumbnail fonts;
  - add colored text shadow/glow controls;
  - convert shadow/glow into an explicit toggle and stronger outer halo effect;
  - add 20 more thumbnail-style font options;
  - add one-click text style presets in the middle editor panel;
  - keep text/glow/stroke color controls as native color pickers;
  - update regression tests and changelog.
- Out of scope:
  - backend thumbnail storage/API changes;
  - advanced text layout features beyond current single/multi-line overlay behavior.

## 4. Acceptance Criteria
1. With blur strength `0`, preview has no blur and exported image has no blur.
2. Non-zero blur strength uses the same blur pixel calculation in preview and export.
3. Blur panel uses a blur-like icon, not scissors/crop and not filter/funnel.
4. Text preview and saved output use the same font source and proportional size baseline.
5. Creating a variant leaves the original/source thumbnail selected so users can produce multiple episode variants from the same image.
6. Text Overlay offers a broader set of display fonts suitable for thumbnail titles.
7. Text Overlay supports colored shadow/glow separately from stroke.
8. Text glow can be switched on/off per text layer.
9. Colored glow appears as a strong outer halo behind the stroke, similar to reference thumbnails.
10. Text Overlay includes 20 additional thumbnail-style fonts beyond the current set.
11. The middle editor panel offers quick-add text style presets such as `Red glow Montserrat`.
12. Text color and glow color use the same native color picker style as Stroke color.
13. Main canvas text strokes draw with the same visual weight as preview strokes.
14. Regression tests lock the blur-zero, icon, font, preview-scale, variant-selection, text style preset, native color picker, stroke, and text-glow behavior.

## 5. Technical Plan
1. Add shared helpers for blur strength conversion and thumbnail text font resolution.
2. Load selected thumbnail text fonts through `next/font/google` and expose CSS variables in the root layout.
3. Scale preview text/stroke by actual preview frame height against the 720px export baseline.
4. Add text shadow/glow properties to preview and canvas export.
5. Keep create-variant save selection on the source asset while preserving import/overwrite selection behavior.
6. Add text style presets and keep color controls aligned with the native picker style.
7. Update Thumbnail Studio source-level tests and run the required verification commands.

## 6. Test Plan
1. `npm run test -- --run src/features/thumbnails/thumbnail-studio-panel.test.ts`
2. `npm run build`
3. `npm run guard:version`

## 7. Changelog Note
- Fix Thumbnail Studio blur/text preview fidelity after the prior reverted attempt.

## 8. Execution Notes
- Fixed the root blur bug by changing blur strength conversion so `0` maps to `0px`; export now skips blur drawing for zero-strength regions.
- Preview blur now uses the same `getBlurPixelsFromStrength` helper as export and no longer uses a dark overlay to fake blur visibility.
- Replaced the Blur panel icon with `Droplets`, avoiding both the previous crop/scissors icon and the reverted filter/funnel icon.
- Loaded the requested base font set (`Montserrat`, `Bangers`, `Lobster`, `Sriracha`, `Agbalumo`) plus 20 additional thumbnail-style fonts through `src/app/layout.tsx`, then resolved the same font variables for canvas drawing.
- Added preview frame height tracking and scaled preview text/stroke against the 720px export baseline so saved output no longer appears much smaller than the preview.
- Create-variant save now refreshes the thumbnail library while keeping the source asset selected, so one base image can produce multiple episode thumbnails without losing the current edit setup.
- Replaced text-content quick presets with one-click style presets such as `Red glow Montserrat`, `Yellow glow Bangers`, and `Cyan glow Changa`.
- Quick style preset clicks now always create new text layers instead of mutating the currently selected layer.
- New quick style layers now use the preset label as text content (for example `Red glow Montserrat`) instead of generic `NEW TEXT`.
- Text color and Glow color now use native color picker inputs aligned with Stroke color.
- Quick style preset labels and quick-text preset labels now render with configured glow colors to better reflect final visual intent.
- Deleting a selected thumbnail now requires an explicit confirmation step before calling delete API.
- Drag-and-drop import box now includes an `Upload` button that opens file picker and routes through the same image import flow.
- Reworked the weak shadow controls into an explicit `Glow behind text` toggle with `Glow color`, `Glow blur`, `Glow spread`, and `Glow drop`.
- Canvas export now draws the glow as a colored outer stroke/halo behind the black stroke and fill, matching the yellow/red reference thumbnail style more closely than a normal offset shadow.
- Preview now uses a separate glow text layer behind the main text so the on-canvas sample better matches the saved image.
- Default text stroke width changed from `4px` to `5px`.
- Canvas export now fills text before stroking it so the saved stroke weight better matches the preview stroke weight.

## 9. Test Evidence
- Test files added/updated:
  - `src/app/layout.tsx`
  - `src/features/thumbnails/thumbnail-studio-panel.tsx`
  - `src/features/thumbnails/thumbnail-studio-panel.test.ts`
- Additional governance/runtime files updated:
  - `tasks/TASK-FAST-VIDEO-008.md`
  - `tasks/board.md`
  - `changelog/changelog.md`
  - `package.json`
  - `package-lock.json`
- Test commands executed:
  - `npm run test -- --run src/features/thumbnails/thumbnail-studio-panel.test.ts`
  - `npm run build`
  - `npm run guard:version`
- Test results summary:
  - Thumbnail Studio source-level regression test passes (1 file / 5 tests).
  - `npm run build` passes; existing ESLint circular-config warning remains unchanged from repo baseline.
  - `npm run guard:version` passes after patch bump `0.10.6 -> 0.10.7`.
