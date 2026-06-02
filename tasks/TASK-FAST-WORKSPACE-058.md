# [FAST-WORKSPACE-058] Prune retired Workspace seeds and prioritize full transcript seed

## 0. Progress Stamp
- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Version guard passed (if runtime changed)
- [ ] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [ ] Done

## 1. Metadata
- Task ID: FAST-WORKSPACE-058
- Phase: FAST
- Target Phase: Workspace seed cleanup
- Domain: Workspace
- Task Type: Cleanup
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context
- Owner requested removing retired Workspace seeds from the UI and cleaning stale seed logic from the large Workspace code path.
- Requested removals: `Seed VI Voice Mask Publish` and `Seed Asset Preprocess Dubbing`.
- Requested ordering: `Seed Asset Transcript Full Processing` should appear first.
- Requested label changes:
  - `Seed Asset VIP Processing` -> `Seed Asset VIP Processing (storage)`
  - `Seed Asset VIP Processing 2` -> `Seed Asset VIP Processing (local)`

## 3. Scope
- In scope:
  - Update Workspace seed registry ordering and labels.
  - Remove retired seed registry entries.
  - Remove seed-only graph builders that no longer have runtime callers.
  - Update tests to cover retired-seed absence, first seed ordering, and VIP labels.
  - Update version, changelog, and task board.
- Out of scope:
  - Removing historical mentions in completed task files or changelog entries.
  - Changing runtime execution semantics for remaining Workspace graph nodes.

## 4. Acceptance Criteria
1. Workspace seed registry no longer exposes `Seed VI Voice Mask Publish`.
2. Workspace seed registry no longer exposes `Seed Asset Preprocess Dubbing`.
3. `Seed Asset Transcript Full Processing` is the first registered seed.
4. VIP storage seed label is `Seed Asset VIP Processing (storage)`.
5. VIP local seed label is `Seed Asset VIP Processing (local)`.
6. No runtime source references remain for retired seed ids/builders outside tests that assert absence.
7. Focused Workspace tests and version guard pass.

## 5. Technical Plan
1. Update `WORKSPACE_SEED_TEMPLATES` to remove retired entries, reorder full transcript seed, and rename VIP labels.
2. Remove now-unused graph builders for retired seed-only flows.
3. Update Workspace seed and graph tests for new registry behavior.
4. Search runtime source for retired seed ids/builders.
5. Run focused tests and `npm run guard:version`.

## 6. Test Plan
1. `npm run test -- --run src/lib/workspace/workspace-seeds.test.ts src/lib/workspace/workspace-graph.test.ts`
2. `npm run guard:version`
3. `rg` checks for retired seed ids/builders in runtime source.

## 7. Observability
- No new runtime observability needed; this is seed registry cleanup.

## 8. Risks & Rollback
- Risk: historical flows are no longer one-click seeds, but underlying reusable node types remain available.
- Rollback: restore removed registry entries and graph builders from this task diff.

## 9. Deliverables
- Updated Workspace seed registry.
- Removed retired seed-only graph builders.
- Updated tests and governance artifacts.

## 10. Changelog Note
- Remove retired Workspace seeds, prioritize full transcript seed, and rename VIP seed labels.

## 11. Execution Notes
- Historical task/changelog mentions were intentionally preserved for audit trail.

## 12. Test Evidence
- `npm run test -- --run src/lib/workspace/workspace-seeds.test.ts src/lib/workspace/workspace-graph.test.ts` pass (2 files / 57 tests).
- `npm run guard:version` pass.
- `git diff --check` pass.
- `rg -n "vi-voice-mask-publish|asset-preprocess-dubbing|Seed VI Voice Mask Publish|Seed Asset Preprocess Dubbing|createUploadVietnameseMaskPublishSampleGraph|createAssetPreprocessDubbingSampleGraph" src` only finds the retired seed ids in the regression test that asserts absence.
