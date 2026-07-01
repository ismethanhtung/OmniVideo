# [FAST-WORKSPACE-099] Stage Workspace VIP Source Directly to EC2

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

- Task ID: FAST-WORKSPACE-099
- Phase: FAST
- Target Phase: Workspace remote VIP reliability
- Domain: Workspace / Remote VIP Worker / Video Pipeline
- Task Type: Bugfix
- Priority: P0
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Owner reports `VIP · Upload source` to Vercel is still very slow on deployment: 48.71 MB / 167.87 MB after 1:38.
- The EC2 worker already supports staged source chunks, but the current browser flow first uploads the full video to Vercel before the server can stage it to EC2.
- Uploading directly to EC2 only helps if Vercel no longer needs the original video bytes for transcript or render.

## 3. Scope

- In scope:
  - Add browser-to-EC2 source chunk staging for Workspace `remote-voice-render` VIP runs when the source is a browser `File`.
  - Let `/api/audio/video-vip-processing` accept a staged EC2 `remoteSourceUploadId` instead of `videoFile`.
  - Add a remote worker transcription mode so transcript can run from the staged EC2 source.
  - Reuse the same staged source for EC2 voice/render to avoid Vercel re-uploading the source.
  - Add CORS support for direct browser chunk uploads to the worker.
- Out of scope:
  - Direct EC2 staging for Storage Asset-only sources without a browser file.
  - Replicate vocals isolation on EC2.
  - Full Vercel Workflows/queue rewrite.

## 4. Acceptance Criteria

1. Remote VIP runs with a browser `File` source can stage source chunks directly to EC2 before calling Vercel.
2. Vercel VIP API can run transcript through EC2 when `remoteSourceUploadId` is supplied.
3. EC2 voice/render uses `sourceUploadId` and does not require Vercel to upload the source again.
4. CORS preflight and source chunk POST responses allow browser direct upload.
5. Focused tests, version guard, build, and diff check pass or failures are documented.

## 5. Technical Plan

1. Extend remote worker route with CORS and a `transcribe` execution mode.
2. Extend remote worker client with `runRemoteVideoVipTranscription` and source upload id pass-through.
3. Extend VIP processing input/API route for `remoteSourceUploadId`.
4. Add Workspace direct EC2 source staging helper and use it for remote VIP browser-file sources.
5. Add regression/source tests and release metadata.

## 6. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/features/workspace/workspace-canvas-panel.tsx`
  - `src/app/api/audio/video-vip-processing/route.ts`
  - `src/app/api/audio/video-vip-voice-render/route.ts`
  - `src/lib/multilingual-audio/remote-vip-worker.ts`
  - `src/lib/multilingual-audio/video-vip-processing.ts`
  - focused tests

## 7. Test Plan

1. Focused tests:
   - `npm run test -- --run src/lib/multilingual-audio/remote-vip-worker.test.ts src/app/api/audio/video-vip-voice-render/route.test.ts src/lib/multilingual-audio/video-vip-processing.test.ts src/app/api/audio/video-vip-processing/route.test.ts src/features/workspace/workspace-canvas-panel.test.ts`
2. Release checks:
   - `npm run guard:version`
   - `npm run build`
   - `git diff --check`

## 8. Observability

- Background Progress should show direct EC2 source upload bytes before the lightweight Vercel VIP API call.
- Remote worker job status should surface `transcript`, `voice`, `render`, and artifact stages.

## 9. Risks & Rollback

- Risks: Browser direct upload requires an EC2 endpoint reachable from the browser and a worker token available in Server modal/local config, unless the worker has auth disabled.
- Rollback strategy: revert this task's direct upload helper, remote transcription mode, source upload id pass-through, tests, changelog, board, and version bump.

## 10. Deliverables

1. Browser-to-EC2 direct source staging for remote VIP file sources.
2. EC2 transcript mode and source upload id reuse.
3. Regression tests and release metadata.

## 11. Changelog Note

- Tóm tắt dòng changelog dự kiến: Stage Workspace VIP source videos directly to EC2 for remote voice/render runs.

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
  - The deployed Workspace flow uploaded the full source from browser to Vercel before Vercel could stage anything to EC2.
  - Direct EC2 source upload only works if transcript and render can both consume the staged EC2 source, so this task added an EC2 transcription mode and source upload id pass-through.
- Scope note:
  - Direct staging is enabled only for `remote-voice-render` runs with a browser `File` source and non-vocals original audio mode.

## 14. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/multilingual-audio/remote-vip-worker.test.ts`
  - `src/app/api/audio/video-vip-voice-render/route.test.ts`
  - `src/app/api/audio/video-vip-processing/route.test.ts`
  - `src/features/workspace/workspace-canvas-panel.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/remote-vip-worker.test.ts src/app/api/audio/video-vip-voice-render/route.test.ts src/app/api/audio/video-vip-processing/route.test.ts src/features/workspace/workspace-canvas-panel.test.ts src/lib/multilingual-audio/video-vip-processing.test.ts`
  - `npm run guard:version`
  - `npm run build`
  - `git diff --check`
- Test results summary:
  - Focused tests pass (5 files / 111 tests).
  - Version guard pass.
  - Build pass.
  - Diff check pass.
