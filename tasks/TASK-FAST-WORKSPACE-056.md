# [FAST-WORKSPACE-056] Switch Remote VIP Seed to EC2 Render Only

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

- Task ID: FAST-WORKSPACE-056
- Phase: FAST
- Target Phase: Workspace remote VIP runtime reliability
- Domain: Workspace / Audio / Video Pipeline / Remote Worker
- Task Type: Bugfix
- Priority: P0
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context

- Lý do: Owner reports remote VIP voice/render remains unstable after EC2 redeploy attempts; the desired safer shape is local Piper voice generation plus EC2 ffmpeg render only.
- Bài toán cần giải quyết: Current remote mode delegates both Piper voice and final render to EC2, increasing network/runtime failure surface before the most important render stage.
- Tài liệu liên quan: `docs/domains/video-pipeline.md`, `docs/domains/multilingual-audio.md`, `tasks/TASK-FAST-WORKSPACE-054.md`, `tasks/TASK-FAST-WORKSPACE-055.md`

## 3. Scope

- In scope:
  - Change remote VIP mode semantics to generate voice locally and delegate only final ffmpeg render to EC2.
  - Keep the existing seed and endpoint path to minimize operational churn, but update labels/descriptions to say remote render only.
  - Send both source video and generated voice audio as multipart files to the worker.
  - Add/update tests proving local voice runs before remote render and worker does not call Piper.
- Out of scope:
  - Async job polling.
  - Durable object storage/S3 transfer.
  - Changing local VIP mode behavior.

## 4. Input / Output

- Input: Workspace seed `Seed Remote VIP Voice Render` / upload -> VIP -> save local.
- Output mong đợi: Transcript, translation, Piper voice, metadata run locally; only final ffmpeg render runs on EC2.

## 5. Acceptance Criteria

1. Remote seed description and node config indicate EC2 render-only behavior.
2. When `voiceRenderExecutionMode=remote`, `runVideoVipProcessing` still executes local voice generation and saves/reuses the voice checkpoint.
3. The remote worker client sends `videoFile` and `voiceFile` multipart payloads; no source video or voice audio bytes are serialized into JSON.
4. Worker API calls render-only runtime and never calls Piper voice generation for remote render-only requests.
5. Focused tests, build, and version guard pass or failures are documented.

## 6. Technical Plan

1. Add render-only VIP helper and remote client contract.
2. Replace remote branch in `runVideoVipProcessing` so only render stage is remote.
3. Update worker route to parse render-only multipart input and call render-only helper.
4. Update Workspace seed copy/config labels, docs, changelog, and focused tests.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/lib/multilingual-audio/video-vip-processing.ts`
  - `src/lib/multilingual-audio/remote-vip-worker.ts`
  - `src/app/api/audio/video-vip-voice-render/route.ts`
  - Workspace seed/graph/test files

## 8. Test Plan

1. Unit/API cần chạy:
   - `npm run test -- --run src/lib/multilingual-audio/video-vip-processing.test.ts src/lib/multilingual-audio/remote-vip-worker.test.ts src/app/api/audio/video-vip-voice-render/route.test.ts src/app/api/audio/video-vip-processing/route.test.ts src/lib/workspace/workspace-seeds.test.ts src/lib/workspace/workspace-graph.test.ts src/features/workspace/workspace-canvas-panel.test.ts`
2. Failure cases cần thử:
   - Missing worker endpoint still maps to `SYS_DUBBING_MUX_FAILED`.
   - Worker artifact download failure still maps to `SYS_DUBBING_MUX_FAILED`.
3. Kết quả mong đợi:
   - Local voice test proves generateVoice is called before remote render.
   - Worker route test proves render-only helper is called.

## 9. Observability

- Metrics: Existing VIP stage durations remain; remote render logs show render-only stage.
- Logs: Existing `[VIP]` logs remain.
- Error codes: Existing VIP error codes remain.

## 10. Risks & Rollback

- Risks: Large multipart upload still sends the source video to EC2 for render, so very weak networks can still fail before render starts.
- Rollback strategy: Set `voiceRenderExecutionMode=local` or revert this task's remote render-only changes.

## 11. Deliverables

1. Remote render-only VIP runtime.
2. Updated seed/user-facing copy.
3. Regression tests and docs/changelog/version updates.

## 12. Changelog Note

- Tóm tắt dòng changelog dự kiến: Switch remote VIP mode to local Piper voice plus EC2 final render only.

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
  - Local Piper voice generation is stable enough for the target videos, based on prior local VIP behavior.
  - EC2 ffmpeg render remains the expensive part worth offloading.
- Blockers: none at start.
- Verification evidence:
  - Root cause: delegating both Piper voice and render to EC2 made the remote step fail before the render value was reached, and the owner requested reducing the remote surface to render only.
  - Fix: remote mode now runs local Piper voice with existing checkpoints, then sends source video and generated voice WAV to EC2 for final render only.
  - Focused tests, production build, version guard, diff whitespace check, and launcher syntax checks pass.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/multilingual-audio/video-vip-processing.test.ts`
  - `src/lib/multilingual-audio/remote-vip-worker.test.ts`
  - `src/app/api/audio/video-vip-voice-render/route.test.ts`
  - `src/features/workspace/workspace-canvas-panel.test.ts`
  - Workspace seed/graph tests remain in the focused test command.
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/video-vip-processing.test.ts src/lib/multilingual-audio/remote-vip-worker.test.ts src/app/api/audio/video-vip-voice-render/route.test.ts src/app/api/audio/video-vip-processing/route.test.ts src/lib/workspace/workspace-seeds.test.ts src/lib/workspace/workspace-graph.test.ts src/features/workspace/workspace-canvas-panel.test.ts`
  - `npm run build`
  - `npm run guard:version`
  - `git diff --check`
  - `bash -n omnivideo-vip-spot.sh`
  - `zsh -n omnivideo-vip-spot.sh`
- Test results summary:
  - Focused remote VIP tests pass (7 files / 111 tests).
  - Production build pass.
  - Diff whitespace and launcher syntax checks pass.
- Version guard command/result (if runtime changed):
  - `npm run guard:version` pass.
