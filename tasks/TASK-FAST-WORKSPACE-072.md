# FAST-WORKSPACE-072 - Clarify Remote VIP Worker Network Failures

- [x] DoR completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [ ] Done

## Task ID

`FAST-WORKSPACE-072`

## Title

Clarify remote VIP worker network failures.

## Phase

Phase 1

## Target Phase

MVP workspace reliability

## Domain

Workspace

## Task Type

Fast reliability bugfix

## Owner

AI Agent

## Status

Review

## Priority

High

## Context

Workspace VIP EC2 voice/render failures currently surface as generic `fetch failed` errors. The user needs to know whether the failure happened while starting the worker job, polling it, or downloading the rendered artifact, and which endpoint could not be reached.

## Scope

In:

- Wrap remote VIP worker network failures with endpoint and request phase context.
- Preserve existing HTTP/worker JSON error behavior.
- Add focused tests for start, poll, and artifact-download network failures.
- Update changelog and version metadata.

Out:

- Restarting or provisioning EC2.
- Changing worker API protocol.
- Changing VIP checkpoint behavior.

## Acceptance Criteria

1. Network failure while starting the remote job includes the worker endpoint and `start request`.
2. Network failure while polling the remote job includes the worker endpoint and `job poll`.
3. Network failure while downloading the remote artifact includes the worker endpoint and `artifact download`.
4. Errors still use `SYS_DUBBING_MUX_FAILED` and a 502 status for network connectivity failures.
5. Focused tests and build pass.

## Technical Plan

1. Add a shared remote worker fetch wrapper.
2. Include phase, URL, and underlying error/cause details in mapped errors.
3. Use the wrapper for POST, poll GET, and artifact download GET.
4. Add regression coverage.
5. Bump version, update changelog, and run verification.

## Test Plan

- `npm run test -- --run src/lib/multilingual-audio/remote-vip-worker.test.ts`
- `npm run guard:version`
- `npm run build`

## Observability

Visible in Workspace progress errors: remote worker connectivity failures should identify the failing request phase and URL.

## Risks & Rollback

Risk: Error messages expose configured worker endpoint in app UI; acceptable because the endpoint is user-configured operational data. Rollback by removing the wrapper and restoring direct `fetch` calls.

## Deliverables

- Clear remote VIP worker network error messages.
- Tests and changelog evidence.

## Changelog Note

Clarify remote VIP worker `fetch failed` errors with endpoint and request phase details.

## Execution Notes

- Added `fetchRemoteVipWorker` wrapper for remote worker network calls.
- Added phase-specific error context for worker start request, job poll, and artifact download.
- Preserved existing worker HTTP and JSON error handling.
- Included underlying fetch cause details such as `ECONNREFUSED` when available.

## Test Evidence

- `npm run test -- --run src/lib/multilingual-audio/remote-vip-worker.test.ts` pass (1 file / 8 tests).
- `npm run guard:version` pass.
- `npm run build` pass.

## Changed Files

- `src/lib/multilingual-audio/remote-vip-worker.ts`
- `src/lib/multilingual-audio/remote-vip-worker.test.ts`
- `package.json`
- `package-lock.json`
- `changelog/changelog.md`
- `tasks/board.md`
- `tasks/TASK-FAST-WORKSPACE-072.md`

## Residual Risks

- This improves diagnosis only; EC2 worker availability, security group, public IP, and process health still need to be corrected operationally when the endpoint is unreachable.
