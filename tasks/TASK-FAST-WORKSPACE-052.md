# [FAST-WORKSPACE-052] Add Seed Asset VIP Processing 2 for Upload->VIP->Local

## 0. Progress Stamp
- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [ ] Version guard passed (if runtime changed)
- [ ] Docs updated (if impacted)
- [ ] Changelog updated
- [ ] Ready for review
- [ ] Done

## 1. Metadata
- Task ID: FAST-WORKSPACE-052
- Phase: FAST
- Target Phase: Workspace seed extension
- Domain: Workspace
- Task Type: Feature
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: In Progress

## 2. Context
- Owner requests one more seed named `Seed Asset VIP Processing 2`.
- The new seed must use flow `Upload Video -> VIP Processing -> Save to Local`.
- Existing `Seed Asset VIP Processing` remains as `Storage Asset -> VIP Processing -> Save to Storage`.

## 3. Scope
- In scope:
  - Add new sample graph for upload -> VIP processing -> save local.
  - Register new seed template in Workspace seed registry.
  - Add/update tests for seed registration and flow planner output.
- Out of scope:
  - Changing existing seed labels/behavior unrelated to this new seed.
  - Runtime execution logic changes beyond existing planner path.

## 4. Acceptance Criteria
1. Workspace Inspector shows new seed `Seed Asset VIP Processing 2`.
2. New seed builds a 3-node graph: `source.file -> video.vip-processing -> output.download-local`.
3. Flow planner returns steps `vip-process-video` then `download-local` for this seeded graph.
4. Focused workspace tests and version guard pass.

## 5. Technical Plan
1. Add a new sample graph builder in workspace graph helpers.
2. Register new seed entry in `WORKSPACE_SEED_TEMPLATES`.
3. Extend seed tests for new template registration.
4. Extend graph tests for planner output of the new seeded graph.
5. Run focused tests and guard check.

## 6. Test Plan
1. `npm run test -- --run src/lib/workspace/workspace-seeds.test.ts src/lib/workspace/workspace-graph.test.ts`
2. `npm run guard:version`

## 7. Changelog Note
- Add `Seed Asset VIP Processing 2` with upload-to-VIP-to-local flow.

## 8. Execution Notes
- Assumptions:
  - Existing local output node `output.download-local` remains the intended node for save-local flow.
- Blockers: none.

## 9. Test Evidence
- Pending test execution.
