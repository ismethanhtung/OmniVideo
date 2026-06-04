# [FAST-WORKSPACE-081] Update VIP Default Speed and Original Volume

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Version guard passed (if runtime changed)
- [x] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [ ] Done

## 1. Metadata

- Task ID: FAST-WORKSPACE-081
- Phase: FAST
- Target Phase: Workspace VIP runtime defaults
- Domain: Workspace / Video Pipeline
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: Codex
- Reviewer: Owner
- Status: Review

## 2. Context

- Owner wants VIP defaults changed to `Original volume=0.2` and `Speed factor=0.75`.
- Current VIP Workspace defaults are `originalAudioVolume=0` and `speedFactor=0.8` in templates/seeds/UI fallbacks.
- Runtime processing fallbacks also need to match so API or older node configs do not silently use old defaults.
- Tài liệu liên quan: `docs/domains/video-pipeline.md`.

## 3. Scope

- In scope:
  - Update VIP node template defaults.
  - Update VIP sample seed configs.
  - Update Workspace runtime/UI fallbacks and placeholders.
  - Update VIP processing runtime fallbacks for missing values.
  - Add/update focused tests and release metadata.
- Out of scope:
  - Changing audio.video-dubbing defaults.
  - Changing render preset/CRF/chunking behavior.

## 4. Acceptance Criteria

1. New VIP nodes default to `speedFactor=0.75` and `originalAudioVolume=0.2`.
2. VIP seed graphs default to `speedFactor=0.75` and `originalAudioVolume=0.2`.
3. Workspace VIP runtime form submission falls back to `0.75` and `0.2`.
4. VIP processing runtime uses the same defaults when inputs omit those values.
5. Focused tests, build, version guard, and diff check pass.

## 5. Technical Plan

1. Add/centralize VIP runtime default constants.
2. Update Workspace graph templates/seeds and UI fallbacks.
3. Update tests for node defaults and runtime fallback behavior.
4. Run verification and update changelog/board evidence.

## 6. Code Change Impact

- Có thay đổi code không: Yes
- Module impacted:
  - `src/lib/workspace/workspace-graph.ts`
  - `src/features/workspace/workspace-canvas-panel.tsx`
  - `src/lib/multilingual-audio/video-vip-processing.ts`
  - related tests

## 7. Test Plan

1. `npm run test -- --run src/lib/workspace/workspace-graph.test.ts src/features/workspace/workspace-canvas-panel.test.ts src/lib/multilingual-audio/video-vip-processing.test.ts src/app/api/audio/video-vip-processing/route.test.ts`
2. `npm run guard:version`
3. `npm run build`
4. `git diff --check`

## 8. Observability

- Existing VIP stage logs include `speedFactor`, `originalAudioVolume`, and `voiceVolume`.

## 9. Risks & Rollback

- Risk: older flows without explicit config will now keep more original audio and slow source video slightly more.
- Rollback: set node values manually to `0.8` and `0`, or revert defaults.

## 10. Deliverables

1. Updated VIP defaults.
2. Focused tests and verification evidence.
3. Changelog/version/task board updates.

## 11. Changelog Note

- Change VIP default Speed factor to `0.75` and Original volume to `0.2`.

## 12. Task Type Checklist (Stamp [x])

### 12.1 Bugfix

- [x] Có mô tả hành vi hiện tại
- [x] Có root cause ngắn gọn
- [x] Có regression test
- [x] Có xác nhận lỗi cũ không tái diễn

## 13. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/workspace/workspace-graph.test.ts`
  - `src/lib/multilingual-audio/video-vip-processing.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/workspace/workspace-graph.test.ts src/features/workspace/workspace-canvas-panel.test.ts src/lib/multilingual-audio/video-vip-processing.test.ts src/app/api/audio/video-vip-processing/route.test.ts`
  - `npm run guard:version`
  - `npm run build`
  - `git diff --check`
- Test results summary:
  - Focused Workspace/VIP runtime tests pass: 4 files / 108 tests.
  - Version guard pass.
  - Production build pass.
  - Diff whitespace check pass.
- Versioning note:
  - Bumped app version from `0.10.109` to `0.10.110`.
- Files changed:
  - Runtime: `src/lib/multilingual-audio/video-vip-processing.ts`
  - Workspace: `src/lib/workspace/workspace-graph.ts`, `src/features/workspace/workspace-canvas-panel.tsx`
  - Tests: `src/lib/workspace/workspace-graph.test.ts`, `src/lib/multilingual-audio/video-vip-processing.test.ts`
  - Docs/changelog/version: `docs/domains/video-pipeline.md`, `changelog/changelog.md`, `package.json`, `package-lock.json`
  - Governance: `tasks/TASK-FAST-WORKSPACE-081.md`, `tasks/board.md`
- Residual risks:
  - Existing saved VIP nodes with explicit old values keep their saved config; new nodes and missing-config fallbacks use `0.75` / `0.2`.
