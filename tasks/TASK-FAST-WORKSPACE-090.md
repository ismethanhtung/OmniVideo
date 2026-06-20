# [FAST-WORKSPACE-090] Default VIP Original Volume to Zero

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

- Task ID: FAST-WORKSPACE-090
- Phase: FAST
- Target Phase: Workspace VIP defaults
- Domain: Workspace / VIP Processing / Audio Mix
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Owner requested `Original volume` default to be `0`.
- Current VIP default constants and Workspace UI fallback still use `0.1`, causing new/missing-config VIP runs to retain source audio by default.

## 3. Scope

- In scope:
  - Change shared VIP original audio default to `0`.
  - Change Workspace VIP template, seed, UI fallback, and placeholder to `0`.
  - Update focused tests and release metadata.
- Out of scope:
  - Changing explicitly saved node configs that already contain another `originalAudioVolume`.
  - Changing non-VIP video dubbing defaults unless they share the VIP constant.

## 4. Acceptance Criteria

1. New Workspace VIP nodes default `originalAudioVolume` to `0`.
2. VIP runtime fallback for missing `originalAudioVolume` uses `0`.
3. Workspace VIP inspector placeholder/fallback shows `0`.
4. Focused VIP tests, version guard, build, and diff check pass or failures are documented.

## 5. Test Plan

1. Run focused Workspace/VIP tests that assert default original volume.
2. Run `npm run guard:version`, `npm run build`, and `git diff --check`.

## 6. Execution Notes

- Assumption: "Original volume mặc định" refers to Workspace VIP / VIP processing default source audio mix volume.
- Blockers: none.
- Verification evidence: focused tests, version guard, build, and diff check passed.

## 7. Test Evidence

- Test files added/updated:
  - `src/lib/workspace/workspace-graph.test.ts`
  - `src/lib/multilingual-audio/video-vip-processing.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/workspace/workspace-graph.test.ts src/lib/multilingual-audio/video-vip-processing.test.ts src/app/api/audio/video-vip-processing/route.test.ts src/features/workspace/workspace-canvas-panel.test.ts --reporter=dot`
  - `npm run guard:version`
  - `npm run build`
  - `git diff --check`
- Test results summary:
  - Focused Vitest suite passed (4 files / 116 tests).
  - Version guard passed.
  - Next build passed.
  - Diff check passed.
