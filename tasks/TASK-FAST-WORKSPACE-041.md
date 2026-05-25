# [FAST-WORKSPACE-041] Surface Full VIP Failure Stage Details in Workspace

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

- Task ID: FAST-WORKSPACE-041
- Phase: MVP runtime hardening
- Target Phase: Workspace VIP failure observability
- Domain: Workspace / VIP Processing / Progress Detail
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: Codex
- Reviewer: Owner
- Status: Review

## 2. Context

- Lý do: User receives only one generic line (`VIP processing failed ... Request Entity Too Large`) and cannot inspect which internal VIP stage failed.
- Bài toán cần giải quyết: When VIP API fails, Workspace must show structured step details (`steps`) returned by `/api/audio/video-vip-processing`, including stage labels and key metrics.

## 3. Scope

- In scope:
  - Preserve API payload on `fetchWorkspaceJson` failures.
  - For VIP step failures, append detailed stage log from API `steps` to progress description.
  - Keep success flow unchanged.
- Out of scope:
  - Live streaming progress from backend while request is still running.
  - Changing VIP backend stage execution logic.

## 4. Acceptance Criteria

1. VIP failure detail includes API `errorCode` and `error` message.
2. VIP failure detail includes each returned step with status/label/detail.
3. If step metrics exist (e.g. audio size), they are shown in a compact readable line.
4. Focused tests and version guard pass.

## 5. Test Plan

1. Source-level regression test ensures Workspace panel contains VIP failure detail formatting hooks.
2. Run focused Workspace panel tests.
3. Run `npm run guard:version`.

## 6. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/features/workspace/workspace-canvas-panel.test.ts`
- Test commands executed:
  - `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts`
  - `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts src/lib/multilingual-audio/video-vip-processing.test.ts src/app/api/audio/video-vip-processing/route.test.ts`
  - `npm run guard:version`
- Test results summary:
  - Workspace panel tests pass (1 file / 21 tests).
  - Focused Workspace/VIP tests pass (3 files / 30 tests).
  - VIP step failure detail is preserved instead of being replaced by one-line summary in the global flow-step catch.
- Version guard command/result (if runtime changed):
  - `npm run guard:version` pass.
