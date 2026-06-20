# [FAST-WORKSPACE-083] Lower VIP original volume default to 0.1

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

- Task ID: FAST-WORKSPACE-083
- Phase: FAST
- Target Phase: Workspace VIP defaults
- Domain: Workspace / Multilingual Audio
- Task Type: Fix
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Owner wants `Original volume` default lowered from `0.2x` to `0.1x`.
- Current VIP defaults use `0.2` across runtime constants, Workspace templates/seeds, and UI fallbacks.

## 3. Scope

- In scope:
  - Change VIP original audio default from `0.2` to `0.1`.
  - Update Workspace template/seed defaults, runtime fallbacks, placeholders, and tests.
- Out of scope:
  - Changing explicit user-saved node configs.
  - Changing mixer behavior when a caller explicitly passes `0.2`.

## 4. Acceptance Criteria

1. New VIP processing defaults use `originalAudioVolume=0.1`.
2. Workspace VIP runtime fallbacks and inspector placeholders show `0.1`.
3. Existing explicit `originalAudioVolume` values are still respected.
4. Tests, version guard, build, and diff check pass.

## 5. Technical Plan

1. Update the shared VIP original volume constant and Workspace defaults.
2. Update focused tests for default behavior.
3. Run verification and update changelog/board.

## 6. Test Plan

1. `npm run test -- --run src/lib/workspace/workspace-graph.test.ts src/lib/multilingual-audio/video-vip-processing.test.ts`
2. `npm run guard:version`
3. `npm run build`
4. `git diff --check`

## 7. Test Evidence

- `npm run test -- --run src/lib/workspace/workspace-graph.test.ts src/lib/multilingual-audio/video-vip-processing.test.ts` pass (2 files / 74 tests).
- `npm run guard:version` pass.
- `npm run build` pass.
- `git diff --check` pass.

## 8. Changelog Note

- Lower VIP original volume default to `0.1`.

## 9. Execution Notes

- Changed shared VIP processing and Workspace VIP defaults from `0.2` to `0.1`.
- Existing explicit node configs and explicit render calls still keep their configured volume.
