# FAST-WORKSPACE-062 - Default VIP Piper Model URLs and Enrich Server Status

- [x] DoR completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [ ] Done

## Task ID

`FAST-WORKSPACE-062`

## Title

Default VIP Piper model URLs and enrich Server modal status.

## Phase

Phase 1

## Target Phase

MVP operations

## Domain

Workspace / Remote VIP worker operations

## Task Type

Fast runtime UX + ops change

## Owner

AI Agent

## Status

Review

## Priority

High

## Context

The EC2 VIP launcher currently requires `PIPER_MODEL_URL` and `PIPER_MODEL_CONFIG_URL` to be exported every run even though the Drive links are stable. The topbar Server modal also needs richer EC2/server details and a `top`-style CPU view for monitoring remote render saturation.

## Scope

In:

- Add stable default Piper model/config URLs to `omnivideo-vip-spot.sh` while preserving env override support.
- Extend remote VIP worker status with EC2 instance metadata when available.
- Extend remote VIP worker status with a non-interactive `top` snapshot.
- Render EC2 metadata and top output in the topbar Server modal.
- Update focused tests and changelog/version evidence.

Out:

- AWS launcher lifecycle redesign.
- Persisting historical server metrics.
- Changing remote VIP render pipeline behavior.

## Acceptance Criteria

1. Running `./omnivideo-vip-spot.sh` without Piper URL env vars uses the known default Drive links.
2. Caller-provided `PIPER_MODEL_URL` / `PIPER_MODEL_CONFIG_URL` still override defaults.
3. `/api/audio/video-vip-voice-render` status includes `ec2` metadata fields when IMDS is reachable and remains successful when IMDS is unavailable.
4. `/api/audio/video-vip-voice-render` status includes a bounded `top` snapshot when `top` is available and remains successful when it is unavailable.
5. Topbar Server modal displays EC2 metadata and top output when present.

## Technical Plan

1. Update launcher defaults in `omnivideo-vip-spot.sh`.
2. Add worker-side helpers for EC2 IMDS and `top -b -n 1` capture.
3. Update Server modal status types and rendering.
4. Update tests for API contract and UI source expectations.
5. Bump patch version, update changelog, and run verification.

## Test Plan

- `npm run test -- --run src/app/api/audio/video-vip-voice-render/route.test.ts src/components/layout/topbar.test.ts`
- `bash -n omnivideo-vip-spot.sh`
- `zsh -n omnivideo-vip-spot.sh`
- `npm run guard:version`

## Observability

Server modal should surface current EC2 metadata and top snapshot from the worker health endpoint.

## Risks & Rollback

Risk: IMDS or `top` may be unavailable on non-EC2/dev environments. Rollback: helpers fail closed and omit optional fields.

## Deliverables

- Updated EC2 launcher defaults.
- Updated remote worker status payload.
- Updated topbar Server modal.
- Focused test coverage and changelog entry.

## Changelog Note

Add default Piper model Drive URLs to the EC2 VIP launcher and enrich Server status with EC2 metadata/top output.

## Execution Notes

- Created task from user request.
- Added default Piper Drive URLs to `omnivideo-vip-spot.sh`.
- Added optional EC2 metadata and top snapshot fields to the remote VIP worker status API.
- Added Server modal sections for EC2 instance data and top output.

## Test Evidence

- `npm run test -- --run src/app/api/audio/video-vip-voice-render/route.test.ts src/components/layout/topbar.test.ts` pass (2 files / 13 tests).
- `bash -n omnivideo-vip-spot.sh` pass.
- `zsh -n omnivideo-vip-spot.sh` pass.
- `npm run guard:version` pass.
- `npm run build` pass.
- `git diff --check` pass.

## Changed Files

- `omnivideo-vip-spot.sh`
- `src/app/api/audio/video-vip-voice-render/route.ts`
- `src/app/api/audio/video-vip-voice-render/route.test.ts`
- `src/components/layout/topbar.tsx`
- `src/components/layout/topbar.test.ts`
- `package.json`
- `package-lock.json`
- `changelog/changelog.md`
- `tasks/board.md`
- `tasks/TASK-FAST-WORKSPACE-062.md`

## Residual Risks

- EC2 metadata and `top` are optional; local/non-Linux workers will omit those sections if unavailable.
