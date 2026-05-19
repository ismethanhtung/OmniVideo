# [FAST-VIDEO-006] Compact Thumbnail Studio Labels and Multi-Layer Blur/Text Summaries

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
- Task ID: FAST-VIDEO-006
- Phase: FAST
- Target Phase: Thumbnail Studio UX polish
- Domain: Video Pipeline / Thumbnail Studio
- Task Type: Feature
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context
- User requested that long thumbnail names should not wrap into multiple lines in `Thumbnail Studio` library cards.
- User also requested the Thumbnail Studio editor to support compact, one-line summaries like Video Tools Lab (`#1 x:.. y:.. w:.. h:.. t:.. s:..`) and apply that pattern not only to blur but also to multiple text overlays.
- Current panel only supported one blur + one text overlay state, so users could not manage multiple layers in the same concise list pattern.

## 3. Scope
- In scope:
  - truncate thumbnail card names to a single line;
  - add multi-item blur region list in Thumbnail Studio with compact single-line summaries;
  - add multi-item text overlay list in Thumbnail Studio with compact single-line summaries;
  - keep drag-on-canvas text positioning while allowing selecting active text layer;
  - update tests/changelog/version metadata.
- Out of scope:
  - backend persistence for blur/text layers;
  - API/runtime publish integration changes.

## 4. Acceptance Criteria
1. Thumbnail name in library cards is rendered as single-line truncate instead of wrapping full text.
2. `Crop + Blur` allows adding multiple blur regions and shows each region in compact one-line summary format.
3. `Text Overlay` allows adding multiple text layers and shows each layer in compact one-line summary format.
4. User can select an active blur/text item from summary lists and edit its values in the panel.
5. Drag-on-preview text positioning still works for the active text layer.
6. Regression test coverage updated for the new compact summary markers.

## 5. Technical Plan
1. Replace single blur/text states with `blurRegions[]` and `textOverlays[]` state models plus active item IDs.
2. Render compact summary list rows for blur and text overlays with add/remove/select actions.
3. Render all blur/text layers in preview and update drag behavior to edit only active text layer.
4. Update source-level test assertions and run verification commands.

## 6. Test Plan
1. `npm run test -- --run src/features/thumbnails/thumbnail-studio-panel.test.ts`
2. `npm run build`
3. `npm run guard:version`

## 7. Changelog Note
- Compact Thumbnail Studio labels and add Video-Tools-style multi-layer blur/text summary lists.

## 8. Execution Notes
- Summary style intentionally mirrors Video Tools Lab style for fast scanning.
- Text summary keeps fixed metadata (`x/y/size/weight`) and a short clipped text preview for dense readability.
- Owner feedback iteration: remove actions were moved inline to trailing `x` controls on each summary row (blur/text), replacing separate "Remove active ..." buttons.
- Owner feedback iteration: switched trailing remove text to close icons for visual consistency, and replaced blur coordinate form editing with direct in-preview drag (move) + corner-handle resize interaction.
- Owner feedback iteration: keep blur border but force square corners (no rounded corners), match border tone to existing panel styling, and upgrade blur resize from single-corner control to edge+corner handles (8-direction resize) with non-visual handle hit areas.
- Owner feedback iteration: default `Region blur` changed to off, removed `Workflow Output Hook` placeholder UI block, and fixed multi-text drag behavior by binding drag to the grabbed overlay id with pointer offset (no wrong-layer dragging and no center-snap pull).
- Owner feedback iteration: increased CTA contrast for `Add text layer`, `Add blur region`, and editor action buttons (`Save`, `Duplicate`, `Reset`, `Delete`) to improve discoverability.
- Owner feedback iteration: added click-to-edit text directly on preview canvas and tightened click-vs-drag thresholding for text overlays to prevent accidental drag on simple selection clicks.
- Owner feedback iteration: fixed long summary text from stretching panel layout by locking split-grid tracks with `minmax(0, …)` and adding strict overflow-truncate constraints on blur/text summary rows.

## 9. Test Evidence
- Test files added/updated:
  - `src/features/thumbnails/thumbnail-studio-panel.tsx`
  - `src/features/thumbnails/thumbnail-studio-panel.test.ts`
- Test commands executed:
  - `npm run test -- --run src/features/thumbnails/thumbnail-studio-panel.test.ts`
  - `npm run build`
  - `npm run guard:version`
- Test results summary:
  - Thumbnail Studio source-level test passes (1 file / 5 tests).
  - `npm run build` passes; existing ESLint circular-config warning remains unchanged from repo baseline.
  - `npm run guard:version` passes after patch bump `0.10.0 -> 0.10.1`.
