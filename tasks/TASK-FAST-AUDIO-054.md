# [FAST-AUDIO-054] Lower minimum voice speed floor to 1.30x

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [ ] Done

## 1. Metadata

- Task ID: FAST-AUDIO-054
- Phase: FAST
- Target Phase: Audio timing polish
- Domain: Audio Transcript / Workspace Audio
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context

- User requested lowering the minimum voice speed from `1.4x` to `1.3x`.
- Current source of truth uses `timelineMinSpeedFactor: 1.4`, and Audio Transcript UI display floor is also hard-coded to `1.4x`.
- Workspace Piper nodes reuse the shared audio runtime settings, so lowering the shared floor should keep Workspace aligned automatically.

## 3. Scope

- In scope:
  - Lower shared Piper timeline minimum speed floor from `1.4x` to `1.3x`.
  - Lower Audio Transcript displayed `Voice speed` floor from `1.4x` to `1.3x`.
  - Update tests and docs/changelog/version metadata.
- Out of scope:
  - Retune max speed, high-speed warning threshold, or alignment algorithms.
  - Add new Workspace-only speed settings.

## 4. Acceptance Criteria

1. Shared Piper runtime uses `timelineMinSpeedFactor = 1.3`.
2. Audio Transcript `Voice speed` display never floors above `1.3x`.
3. Workspace nodes inherit the same `1.3x` runtime floor through shared Piper settings.
4. Regression tests reflect `1.3x` floor behavior.
5. Test/build/version guard pass.

## 5. Technical Plan

1. Update shared audio alignment constant and Audio Transcript display formatter.
2. Update Piper regression expectations for the lower floor.
3. Update changelog/task/version metadata.
4. Run impacted tests, build, and version guard.

## 6. Code Change Impact

- Có thay đổi code không: Yes
- Module impacted:
  - `src/lib/multilingual-audio/types.ts`
  - `src/features/audio/chinese-transcription-panel.tsx`
  - `src/lib/multilingual-audio/piper-tts.test.ts`
  - `tasks/board.md`
  - `tasks/TASK-FAST-AUDIO-054.md`
  - `changelog/changelog.md`
  - `package.json`
  - `package-lock.json`

## 7. Test Plan

1. `npm run test -- --run src/lib/multilingual-audio/piper-tts.test.ts src/features/audio/chinese-transcription-panel.test.ts src/features/workspace/workspace-canvas-panel.test.ts`
2. `npm run build`
3. `npm run guard:version`

## 8. Observability

- Existing Piper alignment diagnostics continue to expose actual speed factors.

## 9. Risks & Rollback

- Risks:
  - Lowering the floor may make some generated speech feel slightly less brisk than the recent `1.4x` behavior.
- Rollback:
  - Restore `timelineMinSpeedFactor` and Audio Transcript display floor to `1.4`.

## 10. Deliverables

1. Shared `1.3x` min floor for Audio Transcript + Workspace runtime.
2. Updated regression tests and release metadata.

## 11. Changelog Note

- Lower the shared Piper runtime floor and Audio Transcript display floor from `1.40x` to `1.30x`; Workspace inherits the shared runtime value automatically.

## 12. Task Type Checklist (Stamp [x])

### 12.1 Bugfix

- [x] Có mô tả hành vi hiện tại
- [x] Có root cause ngắn gọn
- [x] Có regression test
- [x] Có xác nhận lỗi cũ không tái diễn

## 13. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/multilingual-audio/piper-tts.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/piper-tts.test.ts src/features/audio/chinese-transcription-panel.test.ts src/features/workspace/workspace-canvas-panel.test.ts`
  - `npm run build`
  - `npm run guard:version`
- Test results summary:
  - `npm run test -- --run src/lib/multilingual-audio/piper-tts.test.ts src/features/audio/chinese-transcription-panel.test.ts src/features/workspace/workspace-canvas-panel.test.ts` pass (3 files / 39 tests).
  - `npm run build` pass (existing ESLint circular-config warning remains, outside scope).
  - `npm run guard:version` pass.
- Versioning note:
  - Bumped app version `0.8.0 -> 0.8.1` (`PATCH`) because this is a backward-compatible runtime bugfix/polish change.
