# [FAST-WORKSPACE-097] Clarify Vercel VIP Upload Progress and Duration

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

- Task ID: FAST-WORKSPACE-097
- Phase: FAST
- Target Phase: Workspace remote VIP reliability
- Domain: Workspace / VIP Processing / Vercel
- Task Type: Bugfix
- Priority: P0
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Owner reports the deployed Vercel VIP flow appears stuck at `VIP · Transcript` for minutes, while the same flow works locally.
- The Workspace UI starts the transcript stage before the browser has finished uploading the source video body to `/api/audio/video-vip-processing`.
- On Vercel, browser-to-function upload and function max duration are production boundaries that localhost does not expose.

## 3. Scope

- In scope:
  - Add an explicit VIP source upload progress stage before transcript work.
  - Use upload progress for the Workspace VIP POST request so production does not look stuck on transcript while source bytes are still uploading.
  - Configure longer Vercel function duration for long VIP routes.
  - Add focused regression/source tests.
- Out of scope:
  - Moving transcript generation fully to EC2.
  - Replacing Vercel with a persistent queue or Vercel Workflow.
  - Direct browser-to-EC2 upload.

## 4. Acceptance Criteria

1. Workspace Background Progress shows a distinct `VIP · Upload source` step before `VIP · Transcript`.
2. VIP POST upload progress updates bytes/percent when the browser sends a source video to Vercel.
3. Long VIP API routes declare `maxDuration` for Vercel App Router deployment.
4. Focused tests, version guard, build, and diff check pass or failures are documented.

## 5. Technical Plan

1. Add an upload stage descriptor and XHR JSON helper for upload-progress capable VIP POSTs.
2. Wire the VIP flow to start/finish the upload stage and then start transcript after upload completes.
3. Add `maxDuration` to long VIP route handlers.
4. Update source tests for progress labels/helper usage and route duration exports.
5. Update changelog/version metadata and verification evidence.

## 6. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/features/workspace/workspace-canvas-panel.tsx`
  - `src/app/api/audio/video-vip-processing/route.ts`
  - `src/app/api/audio/video-vip-voice-render/route.ts`
  - focused tests

## 7. Test Plan

1. Focused tests:
   - `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts src/app/api/audio/video-vip-processing/route.test.ts src/app/api/audio/video-vip-voice-render/route.test.ts`
2. Failure cases:
   - VIP XHR JSON helper maps non-OK JSON payloads into `WorkspaceApiError`.
   - Source tests verify Vercel max duration exports remain present.
3. Release checks:
   - `npm run guard:version`
   - `npm run build`
   - `git diff --check`

## 8. Observability

- Logs: Background Progress now identifies browser-to-Vercel source upload separately from transcript.
- Metrics: Upload progress displays uploaded bytes and percent when total size is available.
- Error codes: Preserve existing Workspace API error parsing.

## 9. Risks & Rollback

- Risks: Upload progress does not reduce the user's physical browser-to-Vercel bandwidth time; it makes the true stage visible and gives Vercel more runtime budget once processing starts.
- Rollback strategy: revert this task's route duration exports, Workspace XHR helper/wiring, tests, changelog, and version bump.

## 10. Deliverables

1. VIP source upload progress stage.
2. Vercel max duration declarations for VIP routes.
3. Regression tests and release metadata.

## 11. Changelog Note

- Tóm tắt dòng changelog dự kiến: Clarify Vercel VIP source upload progress and increase long VIP route duration.

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
  - The UI labeled the initial state as transcript before `/api/audio/video-vip-processing` had even received the uploaded source video.
  - Localhost hides this because file upload to the local server is effectively immediate.
  - Vercel long-running route duration also needed an explicit App Router `maxDuration`.

## 14. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/features/workspace/workspace-canvas-panel.test.ts`
  - `src/app/api/audio/video-vip-processing/route.test.ts`
  - `src/app/api/audio/video-vip-voice-render/route.test.ts`
- Test commands executed:
  - `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts src/app/api/audio/video-vip-processing/route.test.ts src/app/api/audio/video-vip-voice-render/route.test.ts`
  - `npm run guard:version`
  - `npm run build`
  - `git diff --check`
- Test results summary:
  - Focused tests pass (3 files / 60 tests).
  - Version guard pass.
  - Build pass.
  - Diff check pass.
- Residual risk:
  - This fix exposes and protects the Vercel upload/function-duration boundary, but browser-to-Vercel upload speed still depends on the user's network and source video size.
