# [FAST-VIDEO-005] Build Thumbnail Studio UI Shell (Library + Editor)

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
- Task ID: FAST-VIDEO-005
- Phase: FAST
- Target Phase: Thumbnail workflow foundation
- Domain: Video Pipeline / UX
- Task Type: Feature
- Priority: P1
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context
- Repo currently has no dedicated thumbnail management surface for YouTube publishing workflow.
- User requested to implement UI first (before deep backend/workflow integration), but still aligned with existing OmniVideo visual system.
- Expected V1 UI direction:
  - one-page split layout: left thumbnail library, right editor/workflow controls;
  - import by drag-and-drop and import-by-URL;
  - editable thumbnail name, lifecycle tags (`raw`, `processed`, `has-processed-output`);
  - non-destructive editing mode by default (`create variant`) with optional overwrite mode;
  - duplicate/clone flow for episodic thumbnails;
  - richer editor controls (crop, region blur, text overlay style and positioning);
  - Drive and Workspace/Publish integration hooks presented in UI.

## 3. Scope
- In scope:
  - add `Thumbnail Studio` page to left navigation + route mapping;
  - implement UI shell and interactions using local state only (no API persistence yet);
  - match visual language used in Workspace / Audio Transcript / Video Tools Lab pages;
  - add/update tests for nav routing and new page source-level expectations;
  - update docs + changelog + version files for runtime change compliance.
- Out of scope:
  - backend thumbnail storage APIs;
  - real image processing pipeline implementation;
  - wiring into publish runtime and workflow executor.

## 4. Acceptance Criteria
1. Leftbar contains a `Thumbnail Studio` item under Video Pipeline and route resolves to `/thumbnail-studio`.
2. Thumbnail page uses a split layout (library + editor) consistent with current app style tokens/classes.
3. Library UI supports drag/drop import affordance, URL import input, search, and lifecycle filtering.
4. Editor UI includes:
   - mode switch (`Create variant` default, `Overwrite current`);
   - duplicate/delete thumbnail actions in library;
   - rename input;
   - crop + blur controls;
   - text overlay controls (font, size, fill/stroke colors, stroke width) and drag-on-canvas positioning.
5. UI shows integration placeholders for Drive storage and Workflow publish-node thumbnail selection.
6. Tests cover the new navigation/route mapping and core UI structure markers.

## 5. Technical Plan
1. Extend navigation/types/content-router registries with `thumbnailStudio`.
2. Create `ThumbnailStudioPanel` with V1 split layout and local state interactions.
3. Add source-level test for required UI markers and update navigation tests.
4. Update docs, bump version, update changelog, and run required verification commands.

## 6. Test Plan
1. `npm run test -- --run src/components/layout/navigation.test.ts src/features/thumbnails/thumbnail-studio-panel.test.ts`
2. `npm run build`
3. `npm run guard:version`

## 7. Changelog Note
- Add first-pass Thumbnail Studio UI page for managing/editing reusable publish thumbnails.

## 8. Execution Notes
- This task intentionally targets UI shell only so owner can review layout/style direction before backend integration.
- Owner review iteration applied:
  - lifecycle filter moved into search-adjacent filter icon menu;
  - left library pane widened and rendered as 2 thumbnails per row;
  - removed `Updated` labels from cards and kept duplicate/delete on each card;
  - moved duplicate/delete to top-right icon-only controls on thumbnail preview;
  - fixed invalid nested button hierarchy in card markup to prevent hydration error;
  - text positioning changed to drag-on-preview only (removed X/Y sliders).

## 9. Test Evidence
- Test files added/updated:
  - `src/features/thumbnails/thumbnail-studio-panel.test.ts`
  - `src/components/layout/navigation.test.ts`
- Test commands executed:
  - `npm run test -- --run src/components/layout/navigation.test.ts src/features/thumbnails/thumbnail-studio-panel.test.ts`
  - `npm run build`
  - `npm run guard:version`
  - `git diff --check`
- Test results summary:
  - Targeted tests pass: 2 files / 12 tests.
  - `npm run build` passes with existing ESLint circular-config warning already present in repo.
  - `npm run guard:version` passes after minor version bump `0.9.11 -> 0.10.0`.
  - `git diff --check` passes.
