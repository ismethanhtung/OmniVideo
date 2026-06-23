# [FAST-VIDEO-056] Move VIP Translation Corrections Into Background Progress

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Version guard passed (if runtime changed)
- [x] Changelog updated
- [x] Ready for review
- [x] Done

## 1. Metadata

- Task ID: FAST-VIDEO-056
- Phase: FAST
- Target Phase: Workspace VIP
- Domain: Workspace / Video Pipeline / Multilingual Audio
- Task Type: Feature
- Priority: P0
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Owner rejected the separate Workspace correction panel because it sits outside the Background Progress flow and is awkward while reviewing completed VIP output.
- Owner wants to edit corrected translated lines directly inside the `Segments (...)` list shown in Background Progress.
- Owner needs to correct multiple segments before re-running, not only one selected segment.
- Previous VIP correction plumbing already supports re-running with transcript override plus imported translated segments, skipping transcript and AI translation.

## 3. Scope

- In scope:
  - Move the VIP translation correction UI into the existing Background Progress segments panel.
  - Allow multiple translated segment edits in the visible segment list.
  - Dispatch corrected translated segments from Background Progress to the Workspace VIP rerun path.
  - Remove the separate Workspace correction panel UI.
  - Keep corrected reruns using existing transcript/translation runtime data so transcript and AI translation are skipped.
  - Add/update focused tests for the Background Progress UI and Workspace event wiring.
- Out of scope:
  - Persisting corrected segment drafts across browser reload.
  - Editing source transcript text or timestamps.
  - Segment-level partial voice regeneration.

## 4. Acceptance Criteria

1. The Background Progress `Segments (...)` panel for a completed Workspace VIP step exposes an edit mode for translated segment text.
2. User can edit multiple translated segments in-place before re-running.
3. The corrected run action sends all segment texts back to Workspace for the matching VIP node.
4. Workspace receives the Background Progress correction event and calls the existing VIP corrected rerun path with `transcriptOverrideJson` and `importedTranslationSegmentsJson`.
5. The old separate Workspace correction panel is removed.
6. Focused tests, version guard, build, and diff check pass or failures are documented.

## 5. Technical Plan

1. Add a typed browser event module for Background Progress VIP translation correction requests.
2. Update `ProgressSegmentsPanel` in Topbar to provide in-place edit mode and dispatch corrected segment text.
3. Update Workspace to listen for the correction event and call `runWorkspaceFlow("fresh", ...)` with the existing VIP translation override.
4. Remove the separate `VipTranslationCorrectionPanel` component and render path.
5. Update focused tests, bump patch version, changelog, and task/board evidence.

## 6. Code Change Impact

- Co thay doi code khong: Yes
- Neu Yes, module impacted:
  - `src/components/layout/topbar.tsx`
  - `src/features/workspace/workspace-canvas-panel.tsx`
  - `src/lib/workspace/*`
  - focused tests

## 7. Test Plan

1. Focused commands:
   - `npm run test -- --run src/components/layout/topbar.test.ts src/features/workspace/workspace-canvas-panel.test.ts src/lib/workspace/vip-translation-correction-events.test.ts`
2. Required checks:
   - `npm run guard:version`
   - `npm run build`
   - `git diff --check`

## 8. Observability

- Background Progress remains the review surface for completed VIP output.
- Corrected VIP rerun continues to show the existing correction-mode progress message that transcript and AI translation are skipped.

## 9. Risks & Rollback

- Risks: The correction action is session-local because the full transcript/translation arrays are not persisted across reloads.
- Rollback strategy: revert this task's Topbar edit UI, Workspace event listener, event module, tests, changelog, and version bump.

## 10. Deliverables

1. In-place multi-segment correction UI in Background Progress.
2. Workspace correction rerun event wiring.
3. Removal of the separate Workspace correction panel.
4. Regression tests and release metadata.

## 11. Changelog Note

- Tom tat dong changelog du kien: Move VIP translation corrections into Background Progress segments with multi-segment rerun support.

## 12. Task Type Checklist (Stamp [x])

### 12.1 Feature

- [x] Co user/system flow ro rang
- [x] Co acceptance criteria do duoc
- [x] Co test cho happy path
- [x] Co test cho failure path chinh

### 12.2 Bugfix

- [ ] Co mo ta cach tai hien loi
- [ ] Co root cause ngan gon
- [ ] Co regression test
- [ ] Co xac nhan loi cu khong tai dien

### 12.3 Research

- [ ] Co cau hoi nghien cuu ro
- [ ] Co ket qua/khuyen nghi cu the

## 13. Execution Notes

- Implementation:
  - Added `src/lib/workspace/vip-translation-correction-events.ts` as the typed bridge from Background Progress to Workspace VIP correction reruns.
  - Updated the Background Progress `Segments (...)` panel to expose edit mode for completed VIP segment timelines.
  - Added multi-segment textarea editing, changed-count display, empty-segment guard, reset, and `Run corrected VIP` controls directly inside the segments panel.
  - Removed the separate Workspace `VipTranslationCorrectionPanel` render/component.
  - Added a Workspace listener for `WORKSPACE_VIP_TRANSLATION_CORRECTION_EVENT` that validates payloads, checks session transcript/translation availability, builds per-segment corrections, and calls the existing corrected VIP rerun path.
  - Bumped app version from `0.11.43` to `0.11.44`.

## 14. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/components/layout/topbar.test.ts`
  - `src/features/workspace/workspace-canvas-panel.test.ts`
  - `src/lib/workspace/vip-translation-correction-events.test.ts`
- Test commands executed:
  - `npm run test -- --run src/components/layout/topbar.test.ts src/features/workspace/workspace-canvas-panel.test.ts src/lib/workspace/vip-translation-correction-events.test.ts`
  - `npm run test -- --run src/components/layout/topbar.test.ts src/features/workspace/workspace-canvas-panel.test.ts src/lib/workspace/vip-translation-correction-events.test.ts src/lib/multilingual-audio/video-vip-processing.test.ts src/app/api/audio/video-vip-processing/route.test.ts`
  - `npm run guard:version`
  - `npm run build`
  - `git diff --check`
- Test results summary:
  - Focused Topbar/Workspace/event tests pass (3 files / 30 tests).
  - Focused Topbar/Workspace/event plus VIP API/runtime regression tests pass (5 files / 80 tests).
  - Version guard pass.
  - Build pass.
  - Diff check pass.
- Residual risk:
  - Corrected rerun remains session-local because full transcript/translation arrays are not persisted across page reload.
  - Corrected rerun still regenerates voice/render/metadata; segment-level voice patching remains out of scope.
