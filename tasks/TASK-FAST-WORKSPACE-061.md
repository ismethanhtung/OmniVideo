# [FAST-WORKSPACE-061] Maximize EC2 VIP Render CPU Utilization

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

- Task ID: FAST-WORKSPACE-061
- Phase: FAST
- Target Phase: Remote VIP runtime reliability
- Domain: Workspace / Video Pipeline / Remote Worker
- Task Type: Bugfix
- Priority: P0
- Size: S
- Owner: Codex
- Reviewer: Owner
- Status: Review

## 2. Context

- Owner reports EC2 `c8g.xlarge` Piper can reach about 400% CPU, while final ffmpeg render stays around 100%.
- Render is much slower than voice generation and often appears stuck, with only about 2 of 10 attempts completing.
- Current final VIP render args do not explicitly set ffmpeg/libx264/filter thread counts.
- EC2 launcher installs system ffmpeg, but runtime ffmpeg resolution can still prefer `ffmpeg-static` from `node_modules` unless an explicit path is configured.
- Remote worker process scanning from the prior status/kill task may not reliably classify the final `/tmp/omnivideo-vip-*` ffmpeg process when the system `ffmpeg` binary is used.
- Tài liệu liên quan: `docs/domains/video-pipeline.md`, `docs/domains/multilingual-audio.md`.

## 3. Scope

- In scope:
  - Make final VIP ffmpeg render explicitly use available CPU threads by default.
  - Allow an EC2-friendly fastest render preset while preserving existing preset compatibility.
  - Add render timeout/progress safeguards so ffmpeg cannot hang indefinitely without a controlled failure.
  - Ensure remote worker status/kill sees final VIP ffmpeg render processes.
  - Add/update focused tests and verification evidence.
  - Update changelog, board, and app version metadata.
- Out of scope:
  - GPU acceleration or hardware encoder support.
  - Rewriting subtitle/blur composition into multiple render passes.
  - Changing transcript, translation, or Piper model quality.

## 4. Acceptance Criteria

1. Final VIP ffmpeg args include explicit CPU threading options for filtergraph and encoder, defaulting to all detected CPUs unless overridden by env.
2. `veryfast` remains the default final render preset; optimization must not trade quality/size for `ultrafast`.
3. Final render ffmpeg has a configurable timeout and reports a concise timeout/error instead of hanging indefinitely.
4. Remote worker status/kill process scanning includes final `/tmp/omnivideo-vip-*` ffmpeg render processes even when the system `ffmpeg` binary is used.
5. Focused VIP render and worker API tests plus version guard pass.

## 5. Technical Plan

1. Inspect VIP final render args, worker route payload normalization, and process scanning.
2. Add render thread/timeout helpers with deterministic env overrides for tests.
3. Wire thread options into final ffmpeg args and timeout into final render execution.
4. Update worker process detection and tests for final VIP ffmpeg visibility.
5. Run focused tests, version guard, and update changelog/board evidence.

## 6. Code Change Impact

- Có thay đổi code không: Yes
- Module impacted:
  - `src/lib/multilingual-audio/video-vip-processing.ts`
  - `src/app/api/audio/video-vip-voice-render/route.ts`
  - related tests

## 7. Test Plan

1. `npm run test -- --run src/lib/multilingual-audio/video-vip-processing.test.ts src/app/api/audio/video-vip-voice-render/route.test.ts src/app/api/audio/video-vip-processing/route.test.ts src/lib/workspace/workspace-graph.test.ts src/features/workspace/workspace-canvas-panel.test.ts src/lib/multilingual-audio/audio-extraction.test.ts`
2. `npm run guard:version`
3. `git diff --check`
4. `bash -n omnivideo-vip-spot.sh`
5. `zsh -n omnivideo-vip-spot.sh`

## 8. Observability

- Worker logs/status should surface render stage metrics including chosen preset/thread count where available.
- Worker process status should classify final VIP ffmpeg render processes by command path/arguments.

## 9. Risks & Rollback

- Risk: forcing all CPU threads can reduce responsiveness on weak local machines if this path is run locally.
- Rollback: set `OMNIVIDEO_VIP_RENDER_THREADS=1` or revert the render args helper changes.

## 10. Deliverables

1. Full-CPU final VIP render defaults with env override.
2. Controlled render timeout path.
3. Remote worker process detection for final VIP ffmpeg.
4. Tests, changelog, board, and version updates.

## 11. Changelog Note

- Optimize EC2 VIP final render to use all CPU threads while keeping `veryfast` quality, force system ffmpeg on EC2, and expose/timeout stuck final ffmpeg processes.

## 12. Task Type Checklist (Stamp [x])

### 12.1 Bugfix

- [x] Có mô tả hành vi hiện tại
- [x] Có root cause ngắn gọn
- [x] Có regression test
- [x] Có xác nhận lỗi cũ không tái diễn

## 13. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/multilingual-audio/video-vip-processing.test.ts`
  - `src/app/api/audio/video-vip-voice-render/route.test.ts`
  - `src/app/api/audio/video-vip-processing/route.test.ts`
  - `src/lib/workspace/workspace-graph.test.ts`
  - `src/features/workspace/workspace-canvas-panel.test.ts`
  - `src/lib/multilingual-audio/audio-extraction.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/video-vip-processing.test.ts src/app/api/audio/video-vip-voice-render/route.test.ts src/app/api/audio/video-vip-processing/route.test.ts src/lib/workspace/workspace-graph.test.ts src/features/workspace/workspace-canvas-panel.test.ts src/lib/multilingual-audio/audio-extraction.test.ts`
  - `npm run guard:version`
  - `npm run build`
  - `git diff --check`
  - `bash -n omnivideo-vip-spot.sh`
  - `zsh -n omnivideo-vip-spot.sh`
- Test results summary:
  - Focused VIP render/worker/Workspace/ffmpeg resolver tests pass: 6 files / 117 tests.
  - Version guard pass.
  - Production build pass.
  - Diff whitespace check pass.
  - Launcher syntax checks pass.
- Versioning note:
  - Bumped app version from `0.10.89` to `0.10.90`.
- Files changed:
  - Runtime/API: `src/lib/multilingual-audio/video-vip-processing.ts`, `src/lib/multilingual-audio/audio-extraction.ts`, `src/app/api/audio/video-vip-processing/route.ts`, `src/app/api/audio/video-vip-voice-render/route.ts`
  - Workspace: `src/lib/workspace/workspace-graph.ts`, `src/features/workspace/workspace-canvas-panel.tsx`
  - Operations: `omnivideo-vip-spot.sh`
  - Tests: `src/lib/multilingual-audio/video-vip-processing.test.ts`, `src/lib/multilingual-audio/audio-extraction.test.ts`, `src/app/api/audio/video-vip-voice-render/route.test.ts`, `src/app/api/audio/video-vip-processing/route.test.ts`, `src/lib/workspace/workspace-graph.test.ts`, `src/features/workspace/workspace-canvas-panel.test.ts`
  - Docs/changelog/version: `docs/domains/video-pipeline.md`, `docs/domains/multilingual-audio.md`, `changelog/changelog.md`, `package.json`, `package-lock.json`
- Residual risks:
  - ffmpeg/libass subtitle filtering may still have single-threaded sections; explicit threads lets libx264/filtergraph use available CPUs where ffmpeg can parallelize.
