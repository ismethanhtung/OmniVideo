# FAST-WORKSPACE-066 - Configure Remote VIP Worker from Server Modal

- [x] DoR completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [ ] Done

## Task ID

`FAST-WORKSPACE-066`

## Title

Configure remote VIP worker from Server modal.

## Phase

Phase 1

## Target Phase

MVP operations

## Domain

Workspace / Remote VIP worker operations

## Task Type

Fast UX/ops change

## Owner

AI Agent

## Status

Review

## Priority

High

## Context

The deployed Vercel app needs to connect to EC2 remote VIP workers without requiring Vercel environment variable edits for every worker URL/token. The operator wants to paste `OMNIVIDEO_REMOTE_VIP_WORKER_URL` and `OMNIVIDEO_REMOTE_VIP_TOKEN` directly in the Server topbar modal.

## Scope

In:

- Add Server modal inputs for remote worker URL and token.
- Persist the entered URL/token in browser localStorage for this operator.
- Send the configured URL/token to the local proxy when checking or killing the worker.
- Let the local proxy use a caller-provided token header as an override while preserving env fallback.
- Add focused regression tests and release metadata.

Out:

- Multi-user secret storage.
- Server-side encrypted credential management.
- Vercel project/environment configuration automation.

## Acceptance Criteria

1. Server modal lets the user enter remote worker URL and token.
2. Server modal uses the entered URL/token for status refresh and kill requests.
3. Values persist across page reloads in localStorage.
4. `/api/audio/remote-vip-worker` forwards a caller-provided token to EC2 without requiring `OMNIVIDEO_REMOTE_VIP_TOKEN` env.
5. Existing env-based configuration still works as fallback.

## Technical Plan

1. Extend remote worker proxy to read endpoint from query and token from a local proxy header.
2. Add Server modal config state, localStorage persistence, and inputs.
3. Update focused tests for proxy token override and UI source markers.
4. Bump patch version, update changelog, and run verification.

## Test Plan

- `npm run test -- --run src/app/api/audio/remote-vip-worker/route.test.ts src/components/layout/topbar.test.ts`
- `npm run guard:version`
- `npm run build`

## Observability

The Server modal should show status based on the entered EC2 worker config and still surface unavailable state if it cannot connect.

## Risks & Rollback

Risk: Browser localStorage is not suitable for shared secrets across multiple users. This is acceptable for the current single-operator app. Rollback by removing the modal config fields and token override header.

## Deliverables

- Server modal worker URL/token configuration.
- Proxy token override support.
- Tests and changelog evidence.

## Changelog Note

Allow configuring the remote VIP worker URL/token directly from the Server topbar modal.

## Execution Notes

- Created from user request to avoid configuring Vercel env vars for EC2 worker URL/token.
- Added Server modal inputs for remote worker URL and token.
- Persisted modal worker config in browser localStorage.
- Updated Server status/kill requests to pass endpoint query and `X-OmniVideo-Remote-Vip-Token` header.
- Updated the local proxy to prefer the caller-provided worker token before env fallback.

## Test Evidence

- `npm run test -- --run src/app/api/audio/remote-vip-worker/route.test.ts src/components/layout/topbar.test.ts` pass (2 files / 7 tests).
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
- `tasks/TASK-FAST-WORKSPACE-066.md`

## Residual Risks

- The worker token is stored in browser localStorage for the current operator. This matches the single-operator workflow but is not a multi-user secret vault.
