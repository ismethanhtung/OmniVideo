# [FAST-WORKSPACE-060] Add Remote VIP Worker Status and Kill Controls

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

- Task ID: FAST-WORKSPACE-060
- Phase: FAST
- Target Phase: Remote VIP operations
- Domain: Workspace / Remote VIP Worker
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: Codex
- Reviewer: Owner
- Status: Review

## 2. Context

- Owner observed long-running EC2 remote VIP jobs stuck under `stage=voice` while actual work was ffmpeg timeline alignment.
- Current UI has no way to inspect remote worker jobs or kill stuck child processes without SSH commands.
- Tài liệu liên quan: `docs/domains/video-pipeline.md`.

## 3. Scope

- In scope:
  - Add remote worker job list/status and cancel endpoints.
  - Track Piper/ffmpeg child processes started by Piper voice generation and allow worker-side kill.
  - Scan OS process table for untracked OmniVideo Piper/ffmpeg processes so old/stuck ffmpeg jobs are visible and killable.
  - Add a topbar `Server` modal for centralized remote worker status and kill controls.
  - Add Workspace VIP inspector controls to check remote worker status and kill active worker jobs/processes through a local proxy.
  - Update tests, changelog, task board, and version metadata.
- Out of scope:
  - Rewriting ffmpeg timeline alignment strategy.
  - Persisting remote jobs across worker process restarts.
  - Multi-user permission model beyond existing worker token.

## 4. Acceptance Criteria

1. Remote worker `GET /api/audio/video-vip-voice-render` returns active job, tracked child process, and system process summary.
2. Remote worker supports cancel/kill for a job or all active worker jobs/processes.
3. Topbar `Server` modal can check worker status and trigger kill without SSH.
4. Focused API/UI tests and version guard pass.

## 5. Technical Plan

1. Add active child process tracking in Piper TTS helper for Piper/ffmpeg subprocesses.
2. Extend remote worker route with list/status and DELETE cancel behavior.
3. Add local proxy route for browser-safe check/kill calls to the configured remote worker.
4. Add small Workspace inspector controls and tests.

## 6. Code Change Impact

- Có thay đổi code không: Yes
- Module impacted:
  - `src/lib/multilingual-audio/piper-tts.ts`
  - `src/app/api/audio/video-vip-voice-render/route.ts`
  - `src/app/api/audio/remote-vip-worker/route.ts`
  - `src/components/layout/topbar.tsx`
  - `src/features/workspace/workspace-canvas-panel.tsx`
  - related tests

## 7. Test Plan

1. `npm run test -- --run src/app/api/audio/video-vip-voice-render/route.test.ts src/app/api/audio/remote-vip-worker/route.test.ts src/components/layout/topbar.test.ts src/features/workspace/workspace-canvas-panel.test.ts src/lib/multilingual-audio/piper-tts.test.ts`
2. `npm run guard:version`

## 8. Observability

- Remote worker status includes active jobs, stage/message/metrics, tracked child process PID/kind/elapsed, and OS-scanned ffmpeg/piper PID/CPU/memory.

## 9. Risks & Rollback

- Risk: kill action terminates active worker subprocesses and causes current jobs to fail.
- Rollback: remove worker status/kill endpoints and UI controls.

## 10. Deliverables

1. Worker status/cancel API.
2. Workspace controls for check and kill.
3. Test and changelog evidence.

## 11. Changelog Note

- Add remote VIP worker status and kill controls for stuck EC2 jobs.

## 12. Task Type Checklist (Stamp [x])

### 12.1 Bugfix

- [x] Có mô tả hành vi hiện tại
- [x] Có root cause ngắn gọn
- [x] Có regression test
- [x] Có xác nhận lỗi cũ không tái diễn

## 13. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/app/api/audio/video-vip-voice-render/route.test.ts`
  - `src/app/api/audio/remote-vip-worker/route.test.ts`
  - `src/components/layout/topbar.test.ts`
  - `src/features/workspace/workspace-canvas-panel.test.ts`
- Test commands executed:
  - `npm run test -- --run src/app/api/audio/video-vip-voice-render/route.test.ts src/app/api/audio/remote-vip-worker/route.test.ts src/components/layout/topbar.test.ts src/features/workspace/workspace-canvas-panel.test.ts src/lib/multilingual-audio/piper-tts.test.ts`
  - `npm run guard:version`
  - `npm run build`
  - `git diff --check`
- Test results summary:
  - Focused tests pass: 5 files / 61 tests.
  - Version guard pass.
  - Production build pass.
  - Diff whitespace check pass.
- Versioning note:
  - Bumped app version from `0.10.88` to `0.10.89`.
