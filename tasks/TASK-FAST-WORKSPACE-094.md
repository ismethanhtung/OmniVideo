# [FAST-WORKSPACE-094] Harden Remote VIP Start Upload and Progress Visibility

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

- Task ID: FAST-WORKSPACE-094
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

- Owner reports remote VIP voice/render fails after transcript and translation with `UND_ERR_HEADERS_TIMEOUT` while EC2 appears idle.
- The failed run uploads a large source video before the worker returns a job id, so async polling never begins.
- Workspace progress only says "Generating voice and rendering final video" and does not show EC2 connection, upload progress, job acceptance, poll stage, or artifact download.

## 3. Scope

- In scope:
  - Replace default remote worker start POST transport with a Node HTTP/HTTPS multipart upload path that has an explicit long timeout and emits upload progress.
  - Preserve the existing `fetchImpl` path for tests and custom callers.
  - Save remote worker progress to VIP checkpoints during preflight, upload, job polling, and artifact download.
  - Surface remote upload/job stage details in Workspace VIP progress logs.
  - Add regression tests and update release metadata.
- Out of scope:
  - EC2 deployment/restart automation.
  - Changing the worker endpoint API contract.
  - Full background control-plane rewrite for `/api/audio/video-vip-processing`.

## 4. Acceptance Criteria

1. A large remote VIP start request no longer relies on native `fetch(FormData)` headers timeout in the default server runtime path.
2. Remote VIP progress checkpoint records whether the run is in preflight, uploading to EC2, accepted by worker, polling worker stage, or downloading artifact.
3. Workspace VIP progress displays the latest remote worker upload/job status instead of a generic voice/render line.
4. Existing mocked `fetchImpl` tests keep validating multipart payload shape.
5. Focused tests, version guard, build, and diff check pass or failures are documented.

## 5. Technical Plan

1. Add a streaming Node multipart upload helper to the remote VIP worker client with progress callbacks and explicit start request timeout.
2. Thread progress callbacks from VIP processing into checkpoint state and log events.
3. Render checkpoint `remoteWorker` state in Workspace progress polling.
4. Add regression tests for default Node upload progress and checkpoint/UI telemetry.
5. Bump patch version and update changelog/board evidence.

## 6. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/lib/multilingual-audio/remote-vip-worker.ts`
  - `src/lib/multilingual-audio/video-vip-processing.ts`
  - `src/features/workspace/workspace-canvas-panel.tsx`
  - focused tests

## 7. Test Plan

1. Unit/UI source tests cần chạy:
   - `npm run test -- --run src/lib/multilingual-audio/remote-vip-worker.test.ts src/lib/multilingual-audio/video-vip-processing.test.ts src/features/workspace/workspace-canvas-panel.test.ts`
2. Failure cases cần thử:
   - Remote start upload transport emits upload progress and parses async job response without native fetch.
   - VIP checkpoint persists remote upload progress from the remote worker client callback.
   - Workspace source includes remote upload/progress status rendering.
3. Kết quả mong đợi:
   - Focused tests pass, then `npm run guard:version`, `npm run build`, and `git diff --check` pass.

## 8. Observability

- Logs: Remote worker client logs start upload progress, job acceptance, poll retries, poll stages, completion, and artifact download.
- Metrics: Remote worker `metrics` payload continues flowing through polling progress.
- Error codes: Preserve `SYS_DUBBING_MUX_FAILED`.

## 9. Risks & Rollback

- Risks: The browser-to-Next API request can still be long-running until a future background control-plane rewrite; this task makes the EC2 start/upload path more robust and visible.
- Rollback strategy: revert this task's remote client, VIP checkpoint, Workspace progress, tests, changelog, and version changes.

## 10. Deliverables

1. Remote worker default upload transport with progress and longer timeout.
2. VIP checkpoint `remoteWorker` telemetry.
3. Workspace progress text for EC2 upload/job stages.
4. Regression tests and release metadata.

## 11. Changelog Note

- Tóm tắt dòng changelog dự kiến: Harden remote VIP EC2 start uploads and expose remote worker upload/job progress in Workspace.

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
  - Remote voice/render start request still uploads the entire video before the worker can return a `jobId`.
  - Default native `fetch(FormData)` can hit undici response header timeout while the large multipart request is still being uploaded or parsed.
  - Existing checkpoint polling does not include remote transport phase, so the UI cannot tell upload vs worker compute vs artifact download.

## 14. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/multilingual-audio/remote-vip-worker.test.ts`
  - `src/lib/multilingual-audio/video-vip-processing.test.ts`
  - `src/features/workspace/workspace-canvas-panel.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/remote-vip-worker.test.ts src/lib/multilingual-audio/video-vip-processing.test.ts src/features/workspace/workspace-canvas-panel.test.ts`
  - `npm run guard:version`
  - `npm run build`
  - `git diff --check`
- Test results summary:
  - Focused tests pass (3 files / 61 tests).
  - Version guard pass.
  - Build pass.
  - Diff check pass.
