# [FAST-WORKSPACE-091] Show VIP Token Usage And Fix Progress Step Durations

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

- Task ID: FAST-WORKSPACE-091
- Phase: FAST
- Target Phase: Workspace VIP progress visibility
- Domain: Workspace / Background Progress / VIP
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Owner wants VIP completion details to show AI token usage.
- Background Progress currently shows VIP sub-step durations like `10:38`, `10:18`, and `09:53` because UI sub-steps use client step elapsed time, not measured backend stage durations.
- VIP result already includes measured stage durations and translation token telemetry when the translation provider returns usage.

## 3. Scope

- In scope:
  - Show translation token usage in VIP detail metadata when available.
  - Add explicit progress-step duration support and render it in Background Progress.
  - Set VIP transcript/translation/voice-render/metadata sub-step durations from backend measured stages on completion.
- Out of scope:
  - Estimating tokens when provider does not return usage.
  - Adding new provider billing APIs.

## 4. Acceptance Criteria

1. VIP completion details include translation token usage when `totalTokensUsed` exists.
2. Background Progress VIP sub-steps display measured stage durations instead of client elapsed job time after final result arrives.
3. Existing live elapsed timing still works for normal/running steps without measured durations.
4. Focused tests, version guard, build, and diff check pass or failures are documented.

## 5. Test Plan

1. Add/update unit/source tests for progress step `durationMs`, Background Progress rendering, and Workspace VIP summary markers.
2. Run focused tests for progress center, topbar, workspace panel, and VIP processing.
3. Run `npm run guard:version`, `npm run build`, and `git diff --check`.

## 6. Execution Notes

- Blockers: none.
- Verification evidence: focused tests, version guard, production build, and diff check passed.

## 7. Test Evidence

- Test files added/updated:
  - `src/lib/ui/progress-center.test.ts`
  - `src/components/layout/topbar.test.ts`
  - `src/features/workspace/workspace-canvas-panel.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/ui/progress-center.test.ts src/components/layout/topbar.test.ts src/features/workspace/workspace-canvas-panel.test.ts src/lib/multilingual-audio/video-vip-processing.test.ts --reporter=dot`
  - `npm run guard:version`
  - `npm run build`
  - `git diff --check`
- Test results summary:
  - Focused tests pass (4 files / 56 tests).
  - Version guard pass.
  - Build pass.
  - Diff check pass.
