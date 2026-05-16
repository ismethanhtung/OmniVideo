# [FAST-WORKSPACE-014] Add Full Storage-Asset Audio Transcript + Video Processing Seed

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

- Task ID: FAST-WORKSPACE-014
- Phase: FAST
- Target Phase: Workspace UX
- Domain: Workspace
- Task Type: Feature
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context

- User needs a seed that starts from `Storage Asset` and includes full Audio Transcript-standard processing plus downstream video transforms and storage output.
- Existing seeds only cover partial paths (e.g. preprocess+dubbing, or upload+dub+mask).

## 3. Scope

- In scope:
  - Add new sample graph factory for full end-to-end asset flow.
  - Register new seed in `WORKSPACE_SEED_TEMPLATES`.
  - Add/update tests validating registration and required node coverage.
- Out of scope:
  - Runtime API behavior changes.
  - New node types or planner semantics.

## 4. Acceptance Criteria

1. New Workspace seed exists and is selectable in Inspector seed list.
2. Seed starts from `source.asset`.
3. Seed includes preprocess, transcribe, translate, voice generation, video dubbing, mirror, blur/mask, storage upload, and VI metadata generation nodes.
4. Tests pass for seed registration and node coverage.

## 5. Technical Plan

1. Add graph builder in `workspace-graph.ts` with valid node/edge topology for planner constraints.
2. Register seed in `workspace-seeds.ts` with clear label/description.
3. Extend seed tests to assert new template and required node types.
4. Run focused tests and update changelog/task evidence.

## 6. Test Plan

1. `workspace-seeds.test.ts` checks seed registration and required nodes.
2. Focused run for `workspace-graph.test.ts` and `workspace-seeds.test.ts`.

## 7. Changelog Note

- Add full Storage Asset seed covering preprocess, transcript, translation, voice, dubbing, edit, storage, and Vietnamese metadata generation.


## 8. Execution Notes

- Added graph factory `createAssetTranscriptFullProcessingSampleGraph` with dual-branch topology: transcript pipeline branch and dubbing/edit branch.
- Ensured `edit.mask-region` receives both `video` source (from `edit.mirror`) and translated transcript (from `text.translate-transcript`) so edit step is executable.

## 9. Test Evidence

- Test files added/updated:
  - `src/lib/workspace/workspace-seeds.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/workspace/workspace-seeds.test.ts src/lib/workspace/workspace-graph.test.ts`
- Test results summary:
  - Pass (2 files, focused workspace seed/graph coverage).
