# [FAST-WORKSPACE-029] Smooth Preprocess Speed Editing and Mark Raw Sources with Outputs

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
- Task ID: FAST-WORKSPACE-029
- Phase: FAST
- Target Phase: Workspace polish
- Domain: Workspace / Storage asset lifecycle
- Task Type: Bug + Feature
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context
- Workspace preprocess speed currently converts every keystroke with `Number(value)`, so intermediate input such as `0.` collapses to `0` and makes editing values like `0.7 -> 0.8` frustrating.
- Raw assets and processed assets are already tagged, but the original raw source is not marked after it successfully produces a processed derivative.

## 3. Scope
- In scope:
  - make preprocess speed editing preserve in-progress decimal input and commit a validated value only after editing finishes;
  - add a raw-source lifecycle marker when a Workspace run stores a processed video derived from that source;
  - keep folder inference/search behavior stable with the new marker.
- Out of scope:
  - changing ffmpeg speed bounds;
  - adding full asset lineage graph UI;
  - retroactively migrating historical raw assets.

## 4. Acceptance Criteria
1. The preprocess speed field allows normal decimal editing such as `0.7 -> 0.8` without collapsing intermediate `0.` into `0`.
2. After Workspace stores a generated processed video from a raw source asset, the processed asset keeps `processed` and the raw source gains `has-processed-output` while retaining `raw`.
3. Folder inference does not mistake `has-processed-output` for a folder tag.
4. Code changes include regression tests for the input behavior hook, lifecycle helper behavior, and asset metadata patch contract.

## 5. Technical Plan
1. Add a focused numeric input component for preprocess speed that buffers draft text and commits clamped numeric values on blur/Enter.
2. Extend storage metadata patching to accept sanitized `tags` updates.
3. After successful generated-asset storage, patch the upstream raw source tags to include `has-processed-output` and update local asset state.
4. Add/update tests and verify build/version guard.

## 6. Test Plan
1. `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts src/lib/storage/asset-folder.test.ts src/app/api/storage/assets/[assetId]/route.test.ts`
2. `npm run build`
3. `npm run guard:version`

## 7. Changelog Note
- Smooth Workspace preprocess speed editing and mark raw source assets once they have generated processed outputs.

## 8. Execution Notes
- Proposed marker: `has-processed-output` because it is explicit about the source asset having produced another output, unlike `processed` which already denotes the derived asset itself.

## 9. Test Evidence
- Test files added/updated:
  - `src/features/workspace/workspace-canvas-panel.test.ts`
  - `src/lib/storage/asset-folder.test.ts`
  - `src/app/api/storage/assets/[assetId]/route.test.ts`
- Test commands executed:
  - `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts src/lib/storage/asset-folder.test.ts src/app/api/storage/assets/[assetId]/route.test.ts`
  - `npm run build`
  - `npm run guard:version`
  - `git diff --check`
- Test results summary:
  - targeted Workspace/storage suite passes (3 files / 21 tests);
  - `npm run build` passes with the existing ESLint circular-config warning;
  - `npm run guard:version` passes after patch bump `0.9.3 -> 0.9.4`;
  - `git diff --check` passes.
- Residual verification note:
  - browser QA for `http://127.0.0.1:3000/workspace` could not be completed in this session because the in-app browser policy blocks that local target.
