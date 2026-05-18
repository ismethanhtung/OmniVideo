# [FAST-UX-027] Color-code Asset Lifecycle Tags

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
- Task ID: FAST-UX-027
- Phase: FAST
- Target Phase: Asset UX polish
- Domain: Storage / asset pickers
- Task Type: Feature
- Priority: P2
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context
- Asset lifecycle now uses distinct tags: `raw`, `processed`, and `has-processed-output`.
- User wants these statuses to be scannable by color instead of appearing only as plain text in metadata strings.

## 3. Scope
- In scope:
  - add a reusable lifecycle tag badge renderer;
  - color-code the three lifecycle tags with a clear but restrained palette;
  - surface badges in Storage Library and common asset pickers.
- Out of scope:
  - recoloring arbitrary user/folder tags;
  - changing asset lifecycle semantics.

## 4. Acceptance Criteria
1. `raw`, `processed`, and `has-processed-output` render with distinct badge colors.
2. Lifecycle badges appear in Storage Library and the main asset pickers used across Audio Transcript, Workspace, Video Tools Lab, and Publish Records.
3. Non-lifecycle metadata text remains intact.
4. Tests cover the shared badge mapping and source usage in the target views.

## 5. Technical Plan
1. Add a shared lifecycle badge UI helper.
2. Reuse it across asset browsing surfaces.
3. Add/update tests and release metadata.

## 6. Test Plan
1. `npm run test -- --run src/lib/storage/asset-lifecycle-tags.test.ts src/features/storage/storage-library-panel.test.ts src/features/audio/chinese-transcription-panel.test.ts src/features/workspace/workspace-canvas-panel.test.ts src/features/video-processing/video-tools-lab-panel.test.ts src/features/social/publish-records-panel.test.ts`
2. `npm run build`
3. `npm run guard:version`

## 7. Changelog Note
- Add color-coded lifecycle badges for raw, processed, and raw-with-processed-output assets.

## 8. Execution Notes
- Palette choice:
  - `raw`: amber/yellow = source material / waiting state;
  - `processed`: emerald/green = completed derivative;
  - `has-processed-output`: rose/red = source already consumed / attention marker.

## 9. Test Evidence
- Test files added/updated:
  - `src/lib/storage/asset-lifecycle-tags.test.ts`
  - `src/features/storage/storage-library-panel.test.ts`
  - `src/features/audio/chinese-transcription-panel.test.ts`
  - `src/features/workspace/workspace-canvas-panel.test.ts`
  - `src/features/video-processing/video-tools-lab-panel.test.ts`
  - `src/features/social/publish-records-panel.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/storage/asset-lifecycle-tags.test.ts src/features/storage/storage-library-panel.test.ts src/features/audio/chinese-transcription-panel.test.ts src/features/workspace/workspace-canvas-panel.test.ts src/features/video-processing/video-tools-lab-panel.test.ts src/features/social/publish-records-panel.test.ts`
  - `npm run build`
  - `npm run guard:version`
  - `git diff --check`
- Test results summary:
  - lifecycle badge + target surface suite passes (6 files / 34 tests);
  - `npm run build` passes with the existing ESLint circular-config warning;
  - `npm run guard:version` passes after patch bump `0.9.5 -> 0.9.6`;
  - `git diff --check` passes.
