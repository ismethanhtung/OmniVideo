# [FAST-WORKSPACE-057] Run VIP Piper Voice on EC2

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

- Task ID: FAST-WORKSPACE-057
- Phase: FAST
- Target Phase: Workspace remote VIP runtime reliability
- Domain: Workspace / Audio / Video Pipeline / Remote Worker
- Task Type: Feature
- Priority: P0
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context

- Owner reports EC2 final render can now run successfully.
- Next requirement: move VIP Piper voice generation to EC2 as well.
- Current remote mode from `FAST-WORKSPACE-056` deliberately runs transcript, translation, Piper voice, and metadata locally, then delegates only final ffmpeg render to EC2.
- The provided Piper model URLs must be supported by the EC2 launcher:
  - `PIPER_MODEL_URL`
  - `PIPER_MODEL_CONFIG_URL`

## 3. Scope

- In scope:
  - Read current remote render path and Piper voice path carefully before implementation.
  - Add a remote voice + render mode that synthesizes Piper voice on EC2 and renders on EC2.
  - Preserve the existing render-only mode as a fallback.
  - Ensure EC2 launcher can fetch both Piper model and model config from Google Drive share URLs.
  - Add/update tests for remote mode selection, multipart transport, worker route behavior, and failure mapping.
- Out of scope:
  - Moving transcript, translation, or metadata generation to EC2.
  - S3/object-storage transfer.
  - Removing local VIP mode or render-only remote mode.

## 4. Acceptance Criteria

1. Workspace remote VIP configuration can select EC2 voice + render, while existing local and EC2 render-only modes remain available.
2. When EC2 voice + render is selected, local runtime runs transcript and translation locally, then sends source video and translated segments to the EC2 worker without sending generated voice audio from local.
3. EC2 worker downloads/uses configured Piper model files, synthesizes voice on EC2, renders the final video on EC2, stores the rendered artifact, and returns the normal VIP result shape to the local control-plane.
4. Render-only remote mode still sends `videoFile` and `voiceFile` and does not call Piper on the worker.
5. Piper model URL/config URL handling in the launcher supports the provided Google Drive file links.
6. Focused tests, build, version guard, and launcher syntax checks pass or failures are documented.

## 5. Technical Plan

1. Inspect current VIP processing, remote worker client/route, Workspace seed config, and Piper runtime setup.
2. Extend the remote execution contract to distinguish render-only from voice+render.
3. Implement worker-side voice+render execution without regressing render-only.
4. Update EC2 launcher model download/config handling and relevant docs/changelog/version.
5. Add focused tests for happy path and primary failure paths, then run verification commands.

## 6. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/lib/multilingual-audio/video-vip-processing.ts`
  - `src/lib/multilingual-audio/remote-vip-worker.ts`
  - `src/app/api/audio/video-vip-voice-render/route.ts`
  - Workspace seed/config files
  - `omnivideo-vip-spot.sh`

## 7. Test Plan

1. Unit/API cần chạy:
   - `npm run test -- --run src/lib/multilingual-audio/video-vip-processing.test.ts src/lib/multilingual-audio/remote-vip-worker.test.ts src/app/api/audio/video-vip-voice-render/route.test.ts src/app/api/audio/video-vip-processing/route.test.ts src/lib/workspace/workspace-seeds.test.ts src/lib/workspace/workspace-graph.test.ts src/features/workspace/workspace-canvas-panel.test.ts`
2. Failure cases cần thử:
   - Missing remote worker endpoint/token still maps to the existing VIP mux/remote error path.
   - Worker-side voice/render artifact download failure remains mapped to `SYS_DUBBING_MUX_FAILED`.
   - Render-only request missing `voiceFile` remains rejected.
3. Kết quả mong đợi:
   - EC2 voice+render path calls worker-side Piper voice generation.
   - EC2 render-only path does not call worker-side Piper voice generation.

## 8. Observability

- Metrics: Existing VIP stage duration logs remain.
- Logs: Remote stage logs must distinguish render-only from voice+render.
- Error codes: Preserve existing VIP error codes unless a more specific existing code applies.

## 9. Risks & Rollback

- Risks: Piper model/runtime compatibility on Linux ARM64 remains operationally sensitive.
- Rollback strategy: Switch the Workspace node config back to local or EC2 render-only mode.

## 10. Deliverables

1. EC2 voice+render VIP runtime mode.
2. Preserved EC2 render-only fallback mode.
3. Updated EC2 Spot launcher for provided Piper model/config URLs.
4. Tests, docs, changelog, and version updates.

## 11. Changelog Note

- Tóm tắt dòng changelog dự kiến: Add EC2 Piper voice generation mode for remote VIP processing while preserving render-only fallback.

## 12. Task Type Checklist (Stamp [x])

### 12.1 Feature

- [x] Có user/system flow rõ ràng
- [x] Có acceptance criteria đo được
- [x] Có test cho happy path
- [x] Có test cho failure path chính

### 12.2 Bugfix

- [ ] Có mô tả cách tái hiện lỗi
- [ ] Có root cause ngắn gọn
- [ ] Có regression test
- [ ] Có xác nhận lỗi cũ không tái diễn

### 12.3 Research

- [ ] Có câu hỏi nghiên cứu rõ
- [ ] Có kết quả/khuyến nghị cụ thể
- [ ] Có quyết định next step
- [ ] Có tài liệu tham chiếu

## 13. Execution Notes

- Assumptions:
  - EC2 render endpoint from `FAST-WORKSPACE-056` is already operational.
  - The worker continues to run the same repo code as the local app.
  - Provided Piper model/config URLs are intended for the EC2 worker runtime.
- Blockers: none at start.
- Verification evidence:
  - Implemented `remote-voice-render` as a separate mode so `remote` remains EC2 render-only fallback.
  - Worker route now branches by payload execution mode: render-only requires multipart `voiceFile`; voice+render requires transcript/translation and runs Piper on EC2.
  - Launcher now requires Piper model/config URLs as a pair and supports provided Google Drive sharing links via parsed file id download URL.
  - Focused tests, production build, version guard, diff whitespace check, and launcher syntax checks pass.

## 14. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/multilingual-audio/video-vip-processing.test.ts`
  - `src/lib/multilingual-audio/remote-vip-worker.test.ts`
  - `src/app/api/audio/video-vip-voice-render/route.test.ts`
  - `src/app/api/audio/video-vip-processing/route.test.ts`
  - `src/lib/workspace/workspace-seeds.test.ts`
  - `src/lib/workspace/workspace-graph.test.ts`
  - `src/features/workspace/workspace-canvas-panel.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/video-vip-processing.test.ts src/lib/multilingual-audio/remote-vip-worker.test.ts src/app/api/audio/video-vip-voice-render/route.test.ts src/app/api/audio/video-vip-processing/route.test.ts src/lib/workspace/workspace-seeds.test.ts src/lib/workspace/workspace-graph.test.ts src/features/workspace/workspace-canvas-panel.test.ts`
  - `npm run build`
  - `npm run guard:version`
  - `git diff --check`
  - `bash -n omnivideo-vip-spot.sh`
  - `zsh -n omnivideo-vip-spot.sh`
- Test results summary:
  - Focused remote VIP/Workspace tests pass (7 files / 115 tests).
  - Production build pass.
  - Version guard pass.
  - Diff whitespace check pass.
  - Launcher syntax checks pass.
- Files changed:
  - Runtime/API: `src/lib/multilingual-audio/video-vip-processing.ts`, `src/lib/multilingual-audio/remote-vip-worker.ts`, `src/app/api/audio/video-vip-processing/route.ts`, `src/app/api/audio/video-vip-voice-render/route.ts`
  - Workspace: `src/lib/workspace/workspace-graph.ts`, `src/lib/workspace/workspace-seeds.ts`, `src/features/workspace/workspace-canvas-panel.tsx`
  - Operations: `omnivideo-vip-spot.sh`
  - Tests: `src/lib/multilingual-audio/video-vip-processing.test.ts`, `src/lib/multilingual-audio/remote-vip-worker.test.ts`, `src/app/api/audio/video-vip-processing/route.test.ts`, `src/app/api/audio/video-vip-voice-render/route.test.ts`, `src/lib/workspace/workspace-graph.test.ts`, `src/lib/workspace/workspace-seeds.test.ts`, `src/features/workspace/workspace-canvas-panel.test.ts`
  - Docs/changelog/version: `docs/domains/video-pipeline.md`, `docs/domains/multilingual-audio.md`, `changelog/changelog.md`, `package.json`, `package-lock.json`
- Residual risks:
  - EC2 voice+render depends on Piper package/model compatibility on Ubuntu ARM64.
  - Remote worker artifacts are still process-local temporary artifacts; object storage is still the durability follow-up for Spot interruptions and very large videos.
