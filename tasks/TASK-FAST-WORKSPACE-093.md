# [FAST-WORKSPACE-093] Harden Remote VIP Worker Polling and Filename Fallback

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

- Task ID: FAST-WORKSPACE-093
- Phase: FAST
- Target Phase: Workspace remote VIP reliability
- Domain: Workspace / Remote VIP Worker / Video Pipeline
- Task Type: Bugfix
- Priority: P0
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Owner reports Workspace remote VIP flow still returns `omnivideo-vip-done.mp4` and then fails around remote voice/render with `Failed to fetch`.
- Live EC2 check showed the worker can be reachable and can keep running ffmpeg after the browser flow has already failed.
- The worker status endpoint also returned a very large payload because completed job `result` includes full voice alignment data.

## 3. Scope

- In scope:
  - Preflight remote worker health before transcript/translation work starts in remote voice/render mode.
  - Retry transient remote worker poll network failures instead of failing on the first `fetch failed`.
  - Keep full worker job result available for job-specific polling, but omit heavyweight result payloads from general health/status.
  - Sanitize/override remote output filename in the local control-plane so stale EC2 worker code cannot return `omnivideo-vip-done.mp4`.
  - Add regression coverage and update release metadata.
- Out of scope:
  - Full async/background `/api/audio/video-vip-processing` control-plane redesign.
  - EC2 deployment automation.
  - Durable object storage for remote artifacts.

## 4. Acceptance Criteria

1. Remote voice/render mode checks the configured EC2 worker before transcript starts.
2. Remote poll network glitches are retried for a bounded window before surfacing a failure.
3. General worker health/status response does not include full completed job result/alignment payloads.
4. Local VIP result filename uses sanitized source title even if the remote worker returns a stale generic filename.
5. Focused tests, version guard, build, and diff check pass or failures are documented.

## 5. Technical Plan

1. Extend remote worker client with preflight health check and bounded poll retry.
2. Add lightweight worker job serialization for general status.
3. Override remote VIP output filename locally with existing strict sanitizer.
4. Add tests for preflight, poll retry, lightweight status, and stale remote filename override.
5. Update changelog, board, and version metadata.

## 6. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/lib/multilingual-audio/remote-vip-worker.ts`
  - `src/lib/multilingual-audio/video-vip-processing.ts`
  - `src/app/api/audio/video-vip-voice-render/route.ts`
  - focused tests

## 7. Test Plan

1. Unit/API cần chạy:
   - `npm run test -- --run src/lib/multilingual-audio/remote-vip-worker.test.ts src/app/api/audio/video-vip-voice-render/route.test.ts src/lib/multilingual-audio/video-vip-processing.test.ts`
2. Failure cases cần thử:
   - EC2 unavailable should fail before transcript runner is called.
   - Poll `fetch failed` should retry and recover when the next poll returns done.
   - General health must not include full `result` payload.
3. Kết quả mong đợi:
   - Focused tests pass, then `npm run guard:version`, `npm run build`, and `git diff --check` pass.

## 8. Observability

- Logs: Adds remote worker preflight start/success/failure and bounded poll retry logs.
- Metrics: Existing remote job stage metrics remain.
- Error codes: Preserve `SYS_DUBBING_MUX_FAILED`.

## 9. Risks & Rollback

- Risks: This reduces transient failure sensitivity but does not remove the long browser-to-control-plane request.
- Rollback strategy: revert this task's remote client, worker route, VIP runtime, tests, changelog, and version changes.

## 10. Deliverables

1. Remote worker preflight before expensive local stages.
2. Bounded retry for remote worker poll network failures.
3. Lightweight health/status job serialization.
4. Local filename override for stale remote worker results.

## 11. Changelog Note

- Tóm tắt dòng changelog dự kiến: Harden remote VIP worker polling and filename fallback so EC2 connectivity glitches and stale worker filenames do not break Workspace VIP runs.

## 12. Task Type Checklist (Stamp [x])

### 12.1 Feature

- [ ] Có user/system flow rõ ràng
- [ ] Có acceptance criteria đo được
- [ ] Có test cho happy path
- [ ] Có test cho failure path chính

### 12.2 Bugfix

- [x] Có mô tả cách tái hiện lỗi
- [x] Có root cause ngắn gọn
- [x] Có regression test
- [x] Có xác nhận lỗi cũ không tái diễn

### 12.3 Research

- [ ] Có câu hỏi nghiên cứu rõ
- [ ] Có kết quả/khuyến nghị cụ thể
- [ ] Có quyết định next step

## 13. Execution Notes

- Root cause:
  - EC2 worker may be stale and return generic output filename.
  - Remote worker polling currently fails on the first network error.
  - General status response can become huge because done job result includes full alignment and artifact data.
- Residual architecture issue: Workspace still holds the browser request open while `/api/audio/video-vip-processing` polls the worker; full fix is a separate async control-plane task.

## 14. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/multilingual-audio/remote-vip-worker.test.ts`
  - `src/app/api/audio/video-vip-voice-render/route.test.ts`
  - `src/lib/multilingual-audio/video-vip-processing.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/remote-vip-worker.test.ts src/app/api/audio/video-vip-voice-render/route.test.ts src/lib/multilingual-audio/video-vip-processing.test.ts`
  - `npm run guard:version`
  - `npm run build`
  - `git diff --check`
- Test results summary:
  - Focused tests pass (3 files / 45 tests).
  - Version guard pass.
  - Build pass.
  - Diff check pass.
- Live check:
  - `curl -sS --max-time 5 http://16.162.254.230:8787/api/audio/video-vip-voice-render` returned `ok:true`, but the current EC2 worker is still serving the old heavyweight health payload and stale `omnivideo-vip-done.mp4` job result until redeployed/restarted.
