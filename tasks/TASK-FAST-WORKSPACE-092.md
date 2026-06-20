# [FAST-WORKSPACE-092] Freeze Completed Progress Step Durations

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

- Task ID: FAST-WORKSPACE-092
- Phase: FAST
- Target Phase: Workspace Background Progress
- Domain: Workspace / Progress Center
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Owner observed VIP Transcript and Translate steps showing `success` while their displayed duration kept increasing during ongoing voice/render polling.
- Root cause: VIP checkpoint polling calls `finishProgressStep` repeatedly for already completed sub-steps, and `finishProgressStep` overwrites `finishedAt` each time.

## 3. Scope

- In scope:
  - Preserve the first `finishedAt` timestamp for already terminal progress steps.
  - Allow later measured `durationMs` updates to still be stored.
  - Add regression test for repeated finish calls.
- Out of scope:
  - Changing VIP backend checkpoint timing.
  - Reworking the Background Progress layout.

## 4. Acceptance Criteria

1. Repeated finish calls for a completed progress step do not move `finishedAt`.
2. Completed step duration no longer keeps increasing while later VIP stages are running.
3. Explicit measured `durationMs` updates still work for final VIP results.
4. Focused tests, version guard, build, and diff check pass or failures are documented.

## 5. Test Plan

1. Update `progress-center.test.ts` with repeated finish regression coverage.
2. Run focused progress/topbar/workspace tests.
3. Run `npm run guard:version`, `npm run build`, and `git diff --check`.

## 6. Execution Notes

- Blockers: none.
- Verification evidence: focused tests, version guard, production build, and diff check passed.

## 7. Test Evidence

- Test files added/updated: `src/lib/ui/progress-center.test.ts`.
- Test commands executed:
  - `npm run test -- --run src/lib/ui/progress-center.test.ts src/components/layout/topbar.test.ts src/features/workspace/workspace-canvas-panel.test.ts --reporter=dot`
  - `npm run guard:version`
  - `npm run build`
  - `git diff --check`
- Test results summary:
  - Focused tests pass (3 files / 37 tests).
  - Version guard pass.
  - Build pass.
  - Diff check pass.
