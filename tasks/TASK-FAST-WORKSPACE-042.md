# [FAST-WORKSPACE-042] Apply Video Tools Cover Box and Text Overlay in Workspace

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

- Task ID: FAST-WORKSPACE-042
- Phase: MVP runtime hardening
- Target Phase: Workspace video edit parity
- Domain: Workspace / Video Pipeline
- Task Type: Feature
- Priority: P1
- Size: S
- Owner: Codex
- Reviewer: Owner
- Status: Review

## 2. Context

Owner asked whether setup saved from Video Tools Lab will render the same in Workspace. Current answer: not yet. Video Tools Lab persists `coverBoxEnabled` and `textOverlay`, but Workspace still only forwards the older blur/subtitle mask fields to `/api/video-processing/edit`.

## 3. Scope

- In scope:
  - Extend Workspace asset setup typing/default resolution for cover box and text overlay fields.
  - Forward saved cover box and text overlay settings when Workspace runs `edit.mask-region`.
  - Keep legacy blur/subtitle behavior working for existing saved setups.
  - Add focused regression tests and update changelog/task/board.
- Out of scope:
  - Full Workspace visual editor controls for text overlay.
  - VIP audio route parity unless the current Workspace edit path already uses `/api/video-processing/edit`.

## 4. Acceptance Criteria

1. If an upstream Storage Asset has Video Tools Lab setup with `coverBoxEnabled=true`, Workspace sends cover-box fields to `/api/video-processing/edit` without forcing blur.
2. If saved setup has `textOverlayEnabled=true`, Workspace sends the text overlay JSON and play resolution fields to `/api/video-processing/edit`.
3. Existing saved setups with `blurEnabled=true` still send blur fields as before.
4. Focused tests and `npm run guard:version` pass or unrelated failures are documented.

## 5. Technical Plan

1. Update Workspace `videoEditSetup` typing and mask config resolver to include cover/text fields.
2. Update Workspace edit API request construction to forward cover/text fields and conditionally set blur.
3. Add/update Workspace panel source-level tests for new request fields.
4. Update changelog/task/board and run verification.

## 6. Test Plan

1. `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts`
2. `npm run guard:version`

## 7. Changelog Note

- Apply saved Video Tools Lab cover box and text overlay setup when running Workspace video edit flows.

## 8. Execution Notes

- Implementation summary:
  - Confirmed the previous Video Tools Lab implementation persisted new setup fields, but Workspace did not yet forward them.
  - Added Workspace config resolution for `blurEnabled`, `coverBoxEnabled`, `textOverlayEnabled`, and `textOverlay`.
  - Updated Workspace `edit-video` requests to send cover/text setup to `/api/video-processing/edit`.
  - Updated Workspace VIP requests to send cover/text setup to `/api/audio/video-vip-processing`.
  - Updated VIP API/runtime to render cover boxes with `drawbox` and channel text via ASS after subtitles.
  - Updated docs/changelog/version.
- Blockers:
  - None.

## 9. Test Evidence

- Test files added/updated:
  - `src/features/workspace/workspace-canvas-panel.test.ts`
  - `src/app/api/audio/video-vip-processing/route.test.ts`
  - `src/lib/multilingual-audio/video-vip-processing.test.ts`
  - `src/lib/video-processing/video-edit-pipeline.test.ts`
  - `src/app/api/video-processing/edit/route.test.ts`
- Test commands executed:
  - `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts src/app/api/audio/video-vip-processing/route.test.ts src/lib/multilingual-audio/video-vip-processing.test.ts src/lib/video-processing/video-edit-pipeline.test.ts src/app/api/video-processing/edit/route.test.ts`
  - `npm run build`
  - `npm run guard:version`
- Test results summary:
  - Focused tests pass (5 files / 53 tests).
  - Build passes; existing ESLint circular-config warning remains unchanged from repo baseline.
  - Version guard passes after patch bump `0.10.45 -> 0.10.46`.
  - Residual risk: Workspace inspector still does not provide full manual UI controls for editing text overlay in-place; it now applies the setup saved from Video Tools Lab.
