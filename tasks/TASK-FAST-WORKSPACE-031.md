# [FAST-WORKSPACE-031] Add Cleanup Assets Workspace Node

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
- Task ID: FAST-WORKSPACE-031
- Phase: FAST
- Target Phase: Workspace cleanup automation
- Domain: Workspace graph/runtime
- Task Type: Feature
- Priority: P1
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context
- User wants a first-class Workspace node that can clean up source and/or processed video assets after a successful flow, especially after publishing.
- Agreed V1 design:
  - category `cleanup`
  - node type `cleanup.delete-assets`
  - two checkboxes: `deleteOriginalAsset`, `deleteProcessedAsset`
  - when placed after `social.publish`, it runs only after upstream publish succeeds
  - reuse the existing asset deletion behavior so Drive files and related history are removed too.

## 3. Scope
- In scope:
  - new Cleanup Assets node template/category/palette presentation;
  - graph planning + runtime execution for asset cleanup;
  - source asset cleanup for upstream `source.asset`;
  - processed asset cleanup for the final stored asset producer;
  - publish-gated execution when cleanup is connected after `social.publish`.
- Out of scope:
  - deleting every intermediate generated artifact;
  - trash/restore workflow;
  - bulk cleanup across unrelated flows.

## 4. Acceptance Criteria
1. Workspace exposes a `Cleanup Assets` node under a dedicated `cleanup` category.
2. The node config includes `Delete original asset` and `Delete processed asset` checkboxes.
3. The planner accepts cleanup after a compatible asset/publish path and emits a cleanup step with the relevant producer context.
4. If cleanup is downstream of `social.publish`, it only executes when that publish step succeeded.
5. Selected asset ids are deleted through the existing storage asset DELETE API, so Drive files and related intake history are removed.
6. The node reports skipped/failed/success states clearly and avoids double-deleting the same asset id.

## 5. Technical Plan
1. Extend graph types/templates/palette with cleanup category + node template.
2. Extend flow planning with `cleanup-assets` steps and publish-gating metadata.
3. Implement inspector controls and runtime deletion behavior in Workspace.
4. Add regression tests for defaults, planning, and source-level runtime integration.

## 6. Test Plan
1. Graph unit tests for cleanup defaults and cleanup planning after publish.
2. Source/runtime regression test for checkbox UI and DELETE execution path.
3. `npm run test -- --run src/lib/workspace/workspace-graph.test.ts src/features/workspace/workspace-canvas-panel.test.ts`
4. `npm run build`
5. `npm run guard:version`

## 7. Changelog Note
- Workspace now includes a publish-aware Cleanup Assets node for deleting original and/or final processed assets.

## 8. Execution Notes
- `processed asset` in V1 means the final stored asset produced by the upstream path, not every intermediate artifact.

## 9. Test Evidence
- `npm run test -- --run src/lib/workspace/workspace-graph.test.ts src/features/workspace/workspace-canvas-panel.test.ts src/lib/workspace/workspace-flow-setup.test.ts` ✅
- `npm run build` ✅
  - Existing repo warning remains: ESLint circular-config serialization warning during build output.
- `npm run guard:version` ✅
- `git diff --check` ✅
