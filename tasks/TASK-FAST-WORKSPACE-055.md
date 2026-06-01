# [FAST-WORKSPACE-055] Harden Remote VIP Media Transport for Long Videos

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

- Task ID: FAST-WORKSPACE-055
- Phase: FAST
- Target Phase: Workspace remote VIP runtime reliability
- Domain: Workspace / Audio / Video Pipeline / Remote Worker
- Task Type: Bugfix
- Priority: P0
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context

- Lý do: Owner reports remote VIP succeeds for a short ~3 minute video but fails for a ~15 minute video at render stage with `Invalid string length`.
- Bài toán cần giải quyết: Remote VIP currently serializes large source/result videos through base64 JSON payloads, which can exceed V8 string limits for longer videos.
- Tài liệu liên quan: `docs/domains/video-pipeline.md`, `docs/domains/multilingual-audio.md`, `tasks/TASK-FAST-WORKSPACE-054.md`

## 3. Scope

- In scope:
  - Replace remote VIP source upload base64 JSON with multipart video upload.
  - Return remote rendered video through a server artifact id and binary download instead of inline base64 JSON.
  - Preserve existing transcript/translation/metadata local control-plane behavior.
  - Add regression tests for the new long-video-safe transport path.
- Out of scope:
  - S3/object-storage persistence.
  - Moving checkpoint persistence off local temp storage.
  - Changing local VIP render behavior.

## 4. Input / Output

- Input: Workspace remote VIP run with longer video files.
- Output mong đợi: Remote voice/render can process large videos without constructing source/result base64 JSON strings.

## 5. Acceptance Criteria

1. Remote VIP client sends source video bytes as multipart `videoFile`, not `fileBase64` JSON.
2. Remote worker stores rendered video as a server artifact and returns metadata plus `artifactId`, not `videoBase64`, for the worker response.
3. Remote VIP client downloads the worker artifact as binary bytes and returns the normal VIP result shape to the local control-plane.
4. Existing worker token validation and remote mode wiring remain intact.
5. Focused remote VIP tests and version guard pass or failures are documented.

## 6. Technical Plan

1. Update `remote-vip-worker.ts` to post multipart form data and fetch binary artifacts.
2. Update `/api/audio/video-vip-voice-render` to parse multipart requests while keeping legacy JSON validation coverage where practical.
3. Add route/client tests covering multipart upload, artifact response, artifact binary fetch, and error path.
4. Update docs/changelog/version and board state.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/lib/multilingual-audio/remote-vip-worker.ts`
  - `src/app/api/audio/video-vip-voice-render/route.ts`
  - Related tests/docs/version files

## 8. Test Plan

1. Unit/API cần chạy:
   - `npm run test -- --run src/lib/multilingual-audio/remote-vip-worker.test.ts src/app/api/audio/video-vip-voice-render/route.test.ts src/app/api/audio/video-vip-processing/route.test.ts`
2. Failure cases cần thử:
   - Remote worker artifact download failure maps to `SYS_DUBBING_MUX_FAILED`.
   - Missing multipart video remains rejected.
3. Kết quả mong đợi:
   - Focused tests pass and no remote payload path requires large video base64 JSON.

## 9. Observability

- Metrics: Existing VIP stage durations and byte length logs remain unchanged.
- Logs: Existing `[VIP]` remote stage logs remain unchanged.
- Error codes: Existing `SYS_DUBBING_MUX_FAILED` and `VAL_DUBBING_VIDEO_REQUIRED` remain unchanged.

## 10. Risks & Rollback

- Risks: Worker artifacts are still in-memory and expire with worker process restart.
- Rollback strategy: Revert the remote worker contract changes to the prior inline JSON transport if urgent.

## 11. Deliverables

1. Long-video-safe remote VIP media transport.
2. Regression tests for multipart/artifact remote transport.
3. Docs/changelog/version updates.

## 12. Changelog Note

- Tóm tắt dòng changelog dự kiến: Harden remote VIP media transport by replacing inline base64 videos with multipart upload and artifact download.

## 13. Task Type Checklist (Stamp [x])

### 13.1 Feature

- [ ] Có user/system flow rõ ràng
- [ ] Có acceptance criteria đo được
- [ ] Có test cho happy path
- [ ] Có test cho failure path chính

### 13.2 Bugfix

- [x] Có mô tả cách tái hiện lỗi
- [x] Có root cause ngắn gọn
- [x] Có regression test
- [x] Có xác nhận lỗi cũ không tái diễn

### 13.3 Research

- [ ] Có câu hỏi nghiên cứu rõ
- [ ] Có kết quả/khuyến nghị cụ thể
- [ ] Có quyết định next step
- [ ] Có tài liệu tham chiếu

## 14. Execution Notes

- Assumptions:
  - The remote worker runs the same Next.js routes as the local app, including Workspace server artifact download routes.
  - The reported `Invalid string length` is caused by large base64 JSON construction or serialization in the remote media transport path.
- Blockers: none at start.
- Verification evidence:
  - Root cause confirmed in code: `runRemoteVideoVipVoiceRender` serialized remote source video through JSON (`fileBase64`) and the worker returned rendered video through JSON (`videoBase64`), so longer videos could hit V8 string limits.
  - Fix: source video now travels as multipart `videoFile`; rendered worker output is stored as a server artifact and downloaded as binary bytes.
  - Focused tests, build, version guard, and diff whitespace checks pass.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/multilingual-audio/remote-vip-worker.test.ts`
  - `src/app/api/audio/video-vip-voice-render/route.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/remote-vip-worker.test.ts src/app/api/audio/video-vip-voice-render/route.test.ts src/app/api/audio/video-vip-processing/route.test.ts`
  - `npm run build`
  - `npm run guard:version`
  - `git diff --check`
- Test results summary:
  - Focused remote VIP tests pass (3 files / 17 tests).
  - Production build pass.
  - Diff whitespace check pass.
- Version guard command/result (if runtime changed):
  - `npm run guard:version` pass.
