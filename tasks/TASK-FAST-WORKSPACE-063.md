# FAST-WORKSPACE-063 - Stop Remote Server Status Timeout Spam

- [x] DoR completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [ ] Done

## Task ID

`FAST-WORKSPACE-063`

## Title

Stop remote Server status timeout spam.

## Phase

Phase 1

## Target Phase

MVP operations

## Domain

Workspace / Remote VIP worker operations

## Task Type

Fast bugfix

## Owner

AI Agent

## Status

Review

## Priority

High

## Context

When the configured remote VIP worker is unreachable, the topbar Server modal keeps polling every 5 seconds and the local proxy lets `fetch failed` timeouts surface as repeated server stack traces.

## Scope

In:

- Catch remote worker fetch failures in `/api/audio/remote-vip-worker`.
- Return a concise unavailable response instead of an uncaught stack trace.
- Pause Server modal auto-refresh after a failed check until the user manually refreshes.
- Add regression tests for unreachable worker behavior and source-level UI behavior.

Out:

- Changing remote worker deployment or EC2 lifecycle.
- Persisting worker health history.

## Acceptance Criteria

1. An unreachable worker returns a controlled JSON error instead of throwing an uncaught route error.
2. The Server modal displays the unavailable state and stops auto-refreshing after a failed check.
3. Manual Refresh can retry and re-enable auto-refresh after a successful response.
4. Regression tests cover the proxy failure behavior and UI pause behavior markers.

## Technical Plan

1. Add timeout/catch handling around remote proxy `fetch`.
2. Update Server modal refresh state to pause polling on failures.
3. Update tests and release metadata.
4. Run focused tests, version guard, and build.

## Test Plan

- `npm run test -- --run src/app/api/audio/remote-vip-worker/route.test.ts src/components/layout/topbar.test.ts`
- `npm run guard:version`
- `npm run build`

## Observability

The Server modal should show a readable unavailable message without repeatedly logging timeout stacks.

## Risks & Rollback

Risk: Auto-refresh pauses until manual retry after transient worker outages. Rollback: revert modal pause state and proxy catch changes.

## Deliverables

- Controlled remote worker proxy failure response.
- Paused auto-refresh behavior in Server modal.
- Regression test coverage and changelog entry.

## Changelog Note

Stop repeated remote Server status timeout logs and pause auto-refresh after worker failures.

## Execution Notes

- Created from user-reported repeated `fetch failed` timeout output.
- Added controlled remote worker proxy timeout handling.
- Paused Server modal auto-refresh after worker status failures.
- Added regression coverage for unreachable worker responses and UI pause markers.

## Test Evidence

- `npm run test -- --run src/app/api/audio/remote-vip-worker/route.test.ts src/components/layout/topbar.test.ts` pass (2 files / 6 tests).
- `npm run guard:version` pass.
- `npm run build` pass.
- `git diff --check` pass.

## Changed Files

- `src/app/api/audio/remote-vip-worker/route.ts`
- `src/app/api/audio/remote-vip-worker/route.test.ts`
- `src/components/layout/topbar.tsx`
- `src/components/layout/topbar.test.ts`
- `package.json`
- `package-lock.json`
- `changelog/changelog.md`
- `tasks/board.md`
- `tasks/TASK-FAST-WORKSPACE-063.md`

## Residual Risks

- If the EC2 worker is temporarily booting, the Server modal now requires a manual retry after the first failed check.
