# [FAST-WORKSPACE-084] Harden Vercel remote VIP worker status proxy

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

- Task ID: FAST-WORKSPACE-084
- Phase: FAST
- Target Phase: Workspace remote VIP runtime reliability
- Domain: Workspace / Remote VIP Worker
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Owner reports deployed Vercel Workspace remote VIP flow marks the EC2 worker unavailable while the same worker is reachable from a browser and works locally.
- The status proxy currently aborts EC2 status checks after `3000ms` and hides the underlying network/timeout detail.
- Vercel-to-EC2 network latency/path can differ from local machine-to-EC2 checks.

## 3. Scope

- In scope:
  - Increase remote worker status proxy timeout for deployed environments.
  - Allow timeout override through an environment variable.
  - Return safe diagnostic detail and timeout metadata when the proxy cannot reach EC2.
  - Surface those diagnostics in Server modal and Workspace errors.
  - Add regression tests for timeout configuration and unavailable diagnostics.
  - Update version, changelog, board, and test evidence.
- Out of scope:
  - EC2 security group automation.
  - Changing the long-running VIP render worker protocol.
  - Adding HTTPS/TLS termination to EC2.

## 4. Acceptance Criteria

1. `/api/audio/remote-vip-worker` no longer uses a hard-coded `3000ms` timeout.
2. The timeout defaults to a Vercel-safe longer value and can be overridden by env.
3. Unreachable EC2 responses include safe diagnostic `detail` and `timeoutMs`.
4. Existing token forwarding behavior remains unchanged.
5. Focused tests, build, version guard, and diff check pass.

## 5. Test Plan

1. `npm run test -- --run src/app/api/audio/remote-vip-worker/route.test.ts src/components/layout/topbar.test.ts src/features/workspace/workspace-canvas-panel.test.ts`
2. `npm run guard:version`
3. `npm run build`
4. `git diff --check`

## 6. Test Evidence

- `npm run test -- --run src/app/api/audio/remote-vip-worker/route.test.ts src/components/layout/topbar.test.ts src/features/workspace/workspace-canvas-panel.test.ts` pass (3 files / 33 tests).
- `npm run guard:version` pass.
- `npm run build` pass.
- `git diff --check` pass.
