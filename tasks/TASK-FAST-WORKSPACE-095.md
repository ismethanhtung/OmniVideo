# [FAST-WORKSPACE-095] Parallelize Remote VIP Source Upload Staging

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

- Task ID: FAST-WORKSPACE-095
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

- Owner reports a 600MB source video spends more than five minutes before remote voice/render can start.
- The current remote worker start request still sends the whole source video through one HTTP multipart request after transcript and translation.
- That avoids premature timeout after FAST-WORKSPACE-094, but it does not improve the physical transfer time.

## 3. Scope

- In scope:
  - Add remote worker source-video chunk staging on the same worker route.
  - Upload large source videos to EC2 in parallel chunks before the lightweight job start request.
  - Start remote VIP jobs by referencing a staged `sourceUploadId`.
  - Preserve fallback to the existing single multipart upload when the remote worker is old or staging fails.
  - Expose chunk-upload progress phases in checkpoints and Workspace progress.
- Out of scope:
  - Moving transcript/translation to EC2.
  - Direct browser-to-EC2 upload UI.
  - Persistent object-storage backed transfer cache.

## 4. Acceptance Criteria

1. Default remote VIP client stages large source videos using parallel chunk uploads before sending the job start request.
2. Worker route can accept source upload chunks and later resolve `sourceUploadId` into the original source bytes.
3. If chunk staging is unsupported or fails, the client falls back to the existing single multipart start upload instead of breaking the run.
4. Workspace progress can display chunk-staging upload progress.
5. Focused tests, version guard, build, and diff check pass or failures are documented.

## 5. Technical Plan

1. Extend remote worker route with `sourceUpload=part` handling and staged source assembly.
2. Extend remote worker client with chunk-staging upload, concurrency control, and progress events.
3. Update Workspace remote progress formatter for staging phases.
4. Add regression tests for staged uploads, worker staged source resolution, and UI visibility.
5. Bump patch version and update changelog/board evidence.

## 6. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/lib/multilingual-audio/remote-vip-worker.ts`
  - `src/app/api/audio/video-vip-voice-render/route.ts`
  - `src/features/workspace/workspace-canvas-panel.tsx`
  - focused tests

## 7. Test Plan

1. Unit/API/UI source tests cần chạy:
   - `npm run test -- --run src/lib/multilingual-audio/remote-vip-worker.test.ts src/app/api/audio/video-vip-voice-render/route.test.ts src/features/workspace/workspace-canvas-panel.test.ts`
2. Failure cases cần thử:
   - Chunk staging failure falls back to single multipart start upload.
   - Worker can resolve staged source chunks for async remote job start.
3. Kết quả mong đợi:
   - Focused tests pass, then `npm run guard:version`, `npm run build`, and `git diff --check` pass.

## 8. Observability

- Logs: Remote client emits source staging start/progress/complete/fallback phases.
- Metrics: Worker job metrics still report source file size and render stages.
- Error codes: Preserve `SYS_DUBBING_MUX_FAILED`.

## 9. Risks & Rollback

- Risks: Parallel upload improves single-stream bottlenecks but cannot exceed the user's actual outbound bandwidth. EC2 must be redeployed with the worker route change for staging to be used.
- Rollback strategy: revert this task's client staging, worker route staging, tests, changelog, and version changes.

## 10. Deliverables

1. Parallel chunk source staging protocol.
2. Worker-side staged source assembly.
3. Workspace progress text for chunk staging.
4. Regression tests and release metadata.

## 11. Changelog Note

- Tóm tắt dòng changelog dự kiến: Parallelize remote VIP source upload staging so large source videos do not depend on one slow start request.

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

## 13. Execution Notes

- Root cause:
  - The prior fix addressed timeout/visibility, but the control path still transfers the full 600MB source in one HTTP request.
  - Single-stream WAN upload can be too slow even when EC2 is healthy and idle.

## 14. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/multilingual-audio/remote-vip-worker.test.ts`
  - `src/app/api/audio/video-vip-voice-render/route.test.ts`
  - `src/features/workspace/workspace-canvas-panel.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/remote-vip-worker.test.ts src/app/api/audio/video-vip-voice-render/route.test.ts src/features/workspace/workspace-canvas-panel.test.ts`
  - `npm run guard:version`
  - `npm run build`
  - `git diff --check`
- Test results summary:
  - Focused tests pass (3 files / 50 tests).
  - Version guard pass.
  - Build pass.
  - Diff check pass.
