# [FAST-WORKSPACE-043] Save Workspace Runtime Video Directly to Local

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

- Task ID: FAST-WORKSPACE-043
- Phase: MVP runtime hardening
- Target Phase: Workspace local output parity
- Domain: Workspace / Video Pipeline
- Task Type: Feature
- Priority: P1
- Size: S
- Owner: Codex
- Reviewer: Owner
- Status: Review

## 2. Context

Owner reported that the current Workspace `Download Local` node only works after `Save final video` because it requires a Storage asset id. This forces a Drive/Storage upload even when the desired flow is `VIP full processing -> save to local machine`.

## 3. Scope

- In scope:
  - Rename/copy the output node behavior toward `Save to Local`.
  - Allow the planner to connect `Save to Local` directly after generated video artifact producers such as VIP Processing.
  - Allow runtime save-local execution from browser inline artifact data or server-side workspace artifact ids.
  - Add a workspace artifact download endpoint for large server-side video artifacts.
  - Add focused regression tests, docs, changelog, and version bump.
- Out of scope:
  - Persisting browser folder permissions between runs.
  - Native filesystem writes outside the browser save/download mechanism.
  - Changing Publish Social or Save to Storage behavior.

## 4. Acceptance Criteria

1. A Workspace flow `Storage Asset -> VIP Processing -> Save to Local` plans successfully without a `Save to Storage` node.
2. Save-to-local runtime can save a video runtime artifact directly from `file`, `base64`, or `artifactId`.
3. Large server-side workspace artifacts can be downloaded through a dedicated API route without first creating a Storage asset.
4. Existing `Storage Asset/Save to Storage -> Save to Local` flows continue to use the Storage asset download endpoint.
5. Focused tests, build, and `npm run guard:version` pass or unrelated failures are documented.

## 5. Technical Plan

1. Extend Workspace graph planning so `output.download-local` can resolve either a Storage producer or a generated artifact producer.
2. Update Workspace runtime download-local branch to save from `artifactByProducer` when no Storage asset id exists.
3. Add `/api/workspace/artifacts/[artifactId]/download` for server-side workspace artifacts.
4. Update node copy and source-level/runtime route tests.
5. Update docs, changelog, board, and app version.

## 6. Test Plan

1. `npm run test -- --run src/lib/workspace/workspace-graph.test.ts src/features/workspace/workspace-canvas-panel.test.ts src/app/api/workspace/artifacts/[artifactId]/download/route.test.ts`
2. `npm run build`
3. `npm run guard:version`

## 7. Changelog Note

- Let Workspace Save to Local consume generated video artifacts directly, including VIP output, without requiring Save to Storage first.

## 8. Execution Notes

- Implementation summary:
  - Renamed local output copy to `Save to Local` while preserving the existing `output.download-local` node type for compatibility.
  - Added planner resolution that picks the nearest upstream Storage producer or generated artifact producer, so `VIP Processing -> Save to Local` resolves to the VIP node instead of the original source asset.
  - Updated Workspace runtime to save from Storage assets, inline runtime files/base64, or server-side `artifactId`.
  - Added `/api/workspace/artifacts/[artifactId]/download` for temporary server-side workspace artifacts.
  - Updated docs, changelog, and version to `0.10.47`.
- Blockers:
  - None.

## 9. Test Evidence

- Test files added/updated:
  - `src/lib/workspace/workspace-graph.test.ts`
  - `src/features/workspace/workspace-canvas-panel.test.ts`
  - `src/app/api/workspace/artifacts/[artifactId]/download/route.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/workspace/workspace-graph.test.ts src/features/workspace/workspace-canvas-panel.test.ts 'src/app/api/workspace/artifacts/[artifactId]/download/route.test.ts'`
  - `npm run build`
  - `npm run guard:version`
- Test results summary:
  - Focused tests pass (3 files / 73 tests).
  - Build passes; existing ESLint circular-config warning remains unchanged from repo baseline.
  - Version guard passes.
