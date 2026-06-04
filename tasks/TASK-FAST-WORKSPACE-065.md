# FAST-WORKSPACE-065 - Center Workspace Empty State and Suppress Tar Xattrs

- [x] DoR completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [ ] Done

## Task ID

`FAST-WORKSPACE-065`

## Title

Center Workspace empty state and suppress tar xattrs.

## Phase

Phase 1

## Target Phase

MVP workspace and ops UX

## Domain

Workspace / Remote VIP worker operations

## Task Type

Fast UX/ops bugfix

## Owner

AI Agent

## Status

Review

## Priority

High

## Context

After enlarging the Workspace canvas, the initial view still misses the empty draft panel because the panel is anchored at the plane's top-left. The EC2 launcher also emits noisy macOS tar extended-attribute warnings when unpacking archives on Linux.

## Scope

In:

- Place the Workspace empty-state panel at the center of the canvas plane.
- Set the default canvas view so the empty-state panel is visible in the middle on first page entry.
- Suppress macOS AppleDouble/xattr metadata while creating the EC2 worker archive.
- Update focused tests and release metadata.

Out:

- Full fit-to-content viewport algorithm.
- Minimap or infinite canvas implementation.
- Changing graph node coordinates.

## Acceptance Criteria

1. `Workspace draft is empty` is positioned at the canvas center rather than `left-16 top-16`.
2. Default canvas view is chosen so a new user sees the empty-state panel in the middle of the dotted workspace.
3. `omnivideo-vip-spot.sh` disables macOS copyfile metadata during tar creation.
4. Focused tests cover centered empty-state constants and tar metadata suppression.

## Technical Plan

1. Add centered empty-state position constants and update empty panel positioning.
2. Update default canvas view constants.
3. Add `COPYFILE_DISABLE=1` to the tar archive command.
4. Update source tests, bump version, update changelog, and run verification.

## Test Plan

- `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts src/app/api/audio/video-vip-voice-render/route.test.ts`
- `bash -n omnivideo-vip-spot.sh`
- `zsh -n omnivideo-vip-spot.sh`
- `npm run guard:version`
- `npm run build`

## Observability

Visible in Workspace initial canvas and EC2 launcher logs.

## Risks & Rollback

Risk: Centering is constant-based rather than dynamically fit-to-container. Rollback by restoring previous empty-state position and tar command.

## Deliverables

- Centered Workspace empty-state panel.
- Cleaner EC2 launcher tar archive creation.
- Test and changelog evidence.

## Changelog Note

Center the Workspace empty-state panel on first load and suppress macOS tar xattr warnings.

## Execution Notes

- Created from user report that the empty-state panel was still not visible/centered after enlarging canvas and tar emitted `LIBARCHIVE.xattr.com.apple.provenance` warnings.
- Moved the Workspace empty-state panel to `CANVAS_WIDTH / 2`, `CANVAS_HEIGHT / 2`.
- Updated the default canvas view to show the centered empty-state panel on first entry.
- Added `COPYFILE_DISABLE=1` to the launcher tar command to avoid macOS extended attributes in the remote archive.

## Test Evidence

- `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts` pass (1 file / 24 tests).
- `bash -n omnivideo-vip-spot.sh` pass.
- `zsh -n omnivideo-vip-spot.sh` pass.
- `npm run guard:version` pass.
- `npm run build` pass.
- `git diff --check` pass.

## Changed Files

- `src/features/workspace/workspace-canvas-panel.tsx`
- `src/features/workspace/workspace-canvas-panel.test.ts`
- `omnivideo-vip-spot.sh`
- `package.json`
- `package-lock.json`
- `changelog/changelog.md`
- `tasks/board.md`
- `tasks/TASK-FAST-WORKSPACE-065.md`

## Residual Risks

- Initial viewport centering is constant-based and tuned for normal Workspace viewport sizes, not a full fit-to-container algorithm.
