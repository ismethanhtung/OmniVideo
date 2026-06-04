# FAST-WORKSPACE-073 - Use Server Modal Remote VIP Config for Workspace Runs

- [x] DoR completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [ ] Done

## Task ID

`FAST-WORKSPACE-073`

## Title

Use Server modal remote VIP config for Workspace runs.

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

The topbar Server modal allows entering a remote VIP worker URL/token, but Workspace VIP voice/render runs still rely on the node field or server environment variables. This makes Server modal configuration useful for status checks but not for actual render/voice execution.

## Scope

In:

- Move browser-stored remote VIP worker config into a shared helper.
- Use Server modal URL/token as Workspace runtime fallback when VIP node URL is empty.
- Send `remoteVoiceRenderToken` from browser config to the VIP processing API.
- Use the same config for Workspace Inspector Check/Kill worker actions.
- Update focused tests and release metadata.

Out:

- Persisting worker credentials server-side.
- Removing node-level remote worker URL override.
- Changing EC2 worker protocol.

## Acceptance Criteria

1. Server modal URL/token are stored under one shared browser config helper.
2. Workspace VIP remote render and remote voice/render use Server modal URL/token when node URL is empty.
3. Node-level `remoteVoiceRenderEndpoint` still overrides the Server modal URL.
4. Workspace Check/Kill worker actions include the Server modal token and fallback URL.
5. Focused tests and build pass.

## Technical Plan

1. Add shared `remote-vip-worker-config` helper.
2. Update topbar Server modal to use the helper.
3. Update Workspace VIP formData creation to include resolved endpoint and token.
4. Update Workspace Inspector Check/Kill requests to use the same config.
5. Update tests, bump version, changelog, and run verification.

## Test Plan

- `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts src/components/layout/topbar.test.ts`
- `npm run guard:version`
- `npm run build`

## Observability

Workspace VIP progress logs include whether the remote worker endpoint came from the node, Server modal, or server env fallback.

## Risks & Rollback

Risk: Browser-stored token is sent to the app API for the current run. This matches the existing Server modal proxy behavior. Rollback by removing Workspace fallback use and returning to node/env-only config.

## Deliverables

- Server modal remote VIP config applies to Workspace voice/render runs.
- Tests and changelog evidence.

## Changelog Note

Use topbar Server modal remote VIP worker URL/token for Workspace VIP render and voice/render runs.

## Execution Notes

- Added a shared browser config helper for remote VIP worker URL/token.
- Updated topbar Server modal to read/write remote VIP worker config through the shared helper.
- Updated Workspace VIP run formData to use the Server modal endpoint/token when the node URL is empty.
- Preserved node URL override behavior.
- Updated Workspace Inspector Check/Kill worker actions to use the shared endpoint/token.
- Added progress detail describing whether endpoint source is node, Server modal, or env fallback.

## Test Evidence

- `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts src/components/layout/topbar.test.ts` pass (2 files / 28 tests).
- `npm run guard:version` pass.
- `npm run build` pass.

## Changed Files

- `src/lib/workspace/remote-vip-worker-config.ts`
- `src/components/layout/topbar.tsx`
- `src/components/layout/topbar.test.ts`
- `src/features/workspace/workspace-canvas-panel.tsx`
- `src/features/workspace/workspace-canvas-panel.test.ts`
- `package.json`
- `package-lock.json`
- `changelog/changelog.md`
- `tasks/board.md`
- `tasks/TASK-FAST-WORKSPACE-073.md`

## Residual Risks

- Browser config is per browser/device. Deployments still need the EC2 worker reachable from the server runtime that executes `/api/audio/video-vip-processing`.
