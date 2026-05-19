# [FAST-VIDEO-007] Make Thumbnail Studio Production-Ready with Storage Persistence

## 0. Progress Stamp
- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [ ] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [ ] Done

## 1. Metadata
- Task ID: FAST-VIDEO-007
- Phase: FAST
- Target Phase: Thumbnail Studio end-to-end workflow
- Domain: Video Pipeline / Thumbnail Studio / Storage
- Task Type: Feature
- Priority: P0
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context
- Owner wants Thumbnail Studio to move beyond mock UI and become usable for real YouTube thumbnail operations.
- Required baseline now: import image by drag-drop or URL, edit text/blur/crop-related output, manage tags carefully, duplicate/variant workflow, and persist assets on storage (Drive).
- Existing Thumbnail Studio currently uses local seed data and does not persist to backend storage.

## 3. Scope
- In scope:
  - add backend thumbnail asset persistence using storage providers (focus Drive) and `assets` collection with `assetType=image`;
  - add Thumbnail Studio API routes for list/create/update/delete/download thumbnail assets;
  - integrate Thumbnail Studio panel with real data loading/import/save/delete;
  - support create-variant (default) and overwrite save semantics;
  - keep existing blur/text layer editing interactions and include tags/folder metadata handling;
  - add/update automated tests for new routes and UI contract markers.
- Out of scope:
  - full workflow node integration for selecting thumbnail in Workspace publish flow;
  - advanced pro image tooling beyond current crop preset + text + blur + drag controls.

## 4. Acceptance Criteria
1. Thumbnail Studio loads thumbnail library from backend storage assets (`assetType=image`) instead of static seed.
2. User can import thumbnail by drag-drop file and by URL; imported assets are uploaded to storage provider account and persisted.
3. User can set/maintain folder + tags metadata for thumbnail assets.
4. Save action persists edited output image to storage; `Create variant` creates a new thumbnail asset and keeps old one.
5. `Overwrite current` replaces selected thumbnail (new upload + old asset removal path) while preserving smooth UX feedback.
6. Duplicate/delete/reset actions continue working with persisted assets.
7. Tests cover new thumbnail API routes and updated Thumbnail Studio source-level contract markers.

## 5. Technical Plan
1. Implement `thumbnail` repository helpers for CRUD on `assets` documents with `assetType=image` and metadata normalization.
2. Implement `/api/storage/thumbnail-assets` routes (list/create and item patch/delete/download), reusing storage provider upload + download/delete helpers.
3. Refactor Thumbnail Studio panel to fetch provider accounts + thumbnail assets, render real image previews, and wire import/save/delete actions.
4. Add/update tests for new routes and Thumbnail Studio behavior markers; run verification commands.

## 6. Test Plan
1. `npm run test -- --run src/app/api/storage/thumbnail-assets/route.test.ts src/app/api/storage/thumbnail-assets/[assetId]/route.test.ts src/app/api/storage/thumbnail-assets/[assetId]/download/route.test.ts src/features/thumbnails/thumbnail-studio-panel.test.ts src/components/layout/navigation.test.ts`
2. `npm run build`
3. `npm run guard:version`

## 7. Changelog Note
- Upgrade Thumbnail Studio from mock UI to persisted Drive-backed thumbnail management with import/edit/save/delete flows.

## 8. Execution Notes
- Initial implementation focuses on fast, lightweight browser-side render/export to keep edit flow smooth.
- Added a dedicated thumbnail asset API surface (`/api/storage/thumbnail-assets`) so image CRUD stays isolated from existing video-asset routes.
- Save flow now renders client-side image output (crop preset + blur regions + text overlays) and uploads to storage account in one action.
- `Create variant` is the default mode; `Overwrite current` uploads replacement then deletes old thumbnail asset/remote file.
- Thumbnail metadata keeps folder/tags only for editor context; crop/blur/text tool state is session-only and is not persisted to new thumbnail assets.
- Follow-up UX iteration: hide `has-processed-output` badge in Thumbnail Library and reframe Thumbnail Studio shell to Workspace-style fixed viewport panel with equal outer padding + internal scrolling.
- Follow-up crop iteration: replace passive crop preset select with crop ratio buttons, a draggable/resizable green crop box on the preview, session-only crop selection state, and save-time output cropping.
- Follow-up setup cleanup: add default `None` crop mode, split Text/Crop/Blur into separate editor panels, and stop persisting transient crop/blur/text setup on thumbnail assets.

## 9. Test Evidence
- Test files added/updated:
  - `src/lib/thumbnails/repository.ts`
  - `src/app/api/storage/thumbnail-assets/route.ts`
  - `src/app/api/storage/thumbnail-assets/[assetId]/route.ts`
  - `src/app/api/storage/thumbnail-assets/[assetId]/download/route.ts`
  - `src/app/api/storage/thumbnail-assets/route.test.ts`
  - `src/app/api/storage/thumbnail-assets/[assetId]/route.test.ts`
  - `src/app/api/storage/thumbnail-assets/[assetId]/download/route.test.ts`
  - `src/features/thumbnails/thumbnail-studio-panel.tsx`
  - `src/features/thumbnails/thumbnail-studio-panel.test.ts`
- Test commands executed:
  - `npm run test -- --run src/app/api/storage/thumbnail-assets/route.test.ts src/app/api/storage/thumbnail-assets/[assetId]/route.test.ts src/app/api/storage/thumbnail-assets/[assetId]/download/route.test.ts src/features/thumbnails/thumbnail-studio-panel.test.ts src/components/layout/navigation.test.ts`
  - `npm run test -- --run src/components/layout/content-router.test.ts src/features/thumbnails/thumbnail-studio-panel.test.ts`
  - `npm run test -- --run src/features/thumbnails/thumbnail-studio-panel.test.ts`
  - `npm run test -- --run src/features/thumbnails/thumbnail-studio-panel.test.ts src/app/api/storage/thumbnail-assets/route.test.ts`
  - `npm run build`
  - `npm run guard:version`
- Test results summary:
  - Targeted test suites pass (5 files / 18 tests).
  - Follow-up layout tests pass (2 files / 8 tests).
  - Latest crop interaction contract test passes (1 file / 5 tests).
  - Latest no-setup-persistence regression tests pass (2 files / 8 tests).
  - `npm run build` passes (existing ESLint circular-config warning unchanged from repo baseline).
  - `npm run guard:version` passes after patch bump `0.10.1 -> 0.10.4`.
