# [FAST-WORKSPACE-079] Skip Muted Source Audio in VIP Final Render

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

- Task ID: FAST-WORKSPACE-079
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

- Owner reports a recent VIP run with `voice 01:26` but final `render (speed+mix+mirror+blur+sub) 05:14`, slower than earlier local runs.
- Quality must remain unchanged: final render preset stays `veryfast`; no `ultrafast` fallback.
- Current final ffmpeg filtergraph still decodes source audio, applies speed/volume, and mixes it even when `originalAudioVolume=0`.
- VIP defaults mute source audio, so that branch is unnecessary work for the common EC2 flow.
- Tài liệu liên quan: `docs/domains/video-pipeline.md`, `docs/domains/multilingual-audio.md`.

## 3. Scope

- In scope:
  - Inspect final VIP ffmpeg render filtergraph.
  - Skip source-audio decode/tempo/amix when original audio is fully muted.
  - Preserve existing behavior when original audio volume is audible.
  - Keep `veryfast` render preset and existing visual filters unchanged.
  - Add regression tests and verification evidence.
- Out of scope:
  - Changing encoder preset/CRF.
  - Replacing blur with cover box or changing visual output.
  - Parallel chunk rendering.

## 4. Acceptance Criteria

1. When `originalAudioVolume=0`, final VIP ffmpeg args do not reference `[0:a]` and do not include `amix`.
2. When `originalAudioVolume>0`, final VIP ffmpeg args still apply source audio speed/volume and mix with voice.
3. Render preset remains `veryfast` unless explicitly set to `superfast`.
4. Focused render tests and version guard pass.

## 5. Technical Plan

1. Read `buildVipFinalRenderArgs` and identify mandatory vs optional filter branches.
2. Split audio filter generation by muted vs audible original-audio branch.
3. Add tests for muted and audible original-audio cases.
4. Run focused tests, build, version guard, and update changelog/board evidence.

## 6. Code Change Impact

- Có thay đổi code không: Yes
- Module impacted:
  - `src/lib/multilingual-audio/video-vip-processing.ts`
  - `src/lib/multilingual-audio/video-vip-processing.test.ts`

## 7. Test Plan

1. `npm run test -- --run src/lib/multilingual-audio/video-vip-processing.test.ts src/app/api/audio/video-vip-voice-render/route.test.ts src/app/api/audio/video-vip-processing/route.test.ts src/lib/multilingual-audio/audio-extraction.test.ts`
2. `npm run guard:version`
3. `npm run build`
4. `git diff --check`

## 8. Observability

- Existing VIP stage timing still reports final render duration.
- Regression tests inspect generated ffmpeg filtergraph directly.

## 9. Risks & Rollback

- Risk: callers relying on silent source-audio processing when volume is exactly zero should see no audible output change.
- Rollback: restore the previous always-mix source audio branch in `buildVipFinalRenderArgs`.

## 10. Deliverables

1. Muted-source-audio optimized final render filtergraph.
2. Regression tests for muted and audible original-audio branches.
3. Changelog, version, board, and task evidence.

## 11. Changelog Note

- Skip source-audio decode/tempo/amix in VIP final render when original audio is muted, keeping `veryfast` quality unchanged.

## 12. Task Type Checklist (Stamp [x])

### 12.1 Bugfix

- [x] Có mô tả hành vi hiện tại
- [x] Có root cause ngắn gọn
- [x] Có regression test
- [x] Có xác nhận lỗi cũ không tái diễn

## 13. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/multilingual-audio/video-vip-processing.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/video-vip-processing.test.ts src/app/api/audio/video-vip-voice-render/route.test.ts src/app/api/audio/video-vip-processing/route.test.ts src/lib/multilingual-audio/audio-extraction.test.ts`
  - `npm run guard:version`
  - `npm run build`
  - `git diff --check`
- Test results summary:
  - Focused VIP render/API/ffmpeg resolver tests pass: 4 files / 46 tests.
  - Version guard pass.
  - Production build pass.
  - Diff whitespace check pass.
- Versioning note:
  - Bumped app version from `0.10.107` to `0.10.108`.
- Files changed:
  - Runtime: `src/lib/multilingual-audio/video-vip-processing.ts`
  - Tests: `src/lib/multilingual-audio/video-vip-processing.test.ts`
  - Governance/release: `tasks/TASK-FAST-WORKSPACE-079.md`, `tasks/board.md`, `changelog/changelog.md`, `package.json`, `package-lock.json`
- Residual risks:
  - Visual render cost from mirror/blur/subtitle remains; this change only removes unnecessary source-audio work when original audio is muted.
