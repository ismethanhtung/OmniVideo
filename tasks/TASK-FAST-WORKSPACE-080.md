# [FAST-WORKSPACE-080] Parallelize EC2 VIP Final Render Chunks

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

- Task ID: FAST-WORKSPACE-080
- Phase: FAST
- Target Phase: Remote VIP runtime reliability
- Domain: Workspace / Video Pipeline / Remote Worker
- Task Type: Performance
- Priority: P0
- Size: M
- Owner: Codex
- Reviewer: Owner
- Status: Review

## 2. Context

- Owner reports EC2 `c8g.xlarge` render still takes about `05:14` while voice takes `01:26`.
- Observed ffmpeg often stays around one full CPU (`100%`) instead of using all 4 vCPU.
- Single ffmpeg filtergraphs with `ass`, `boxblur`, `overlay`, and `hflip` may not scale linearly even when encoder/filter thread counts are set.
- Quality must remain unchanged: keep `veryfast`, CRF, visual filters, subtitle style, and mix behavior.
- Tài liệu liên quan: `docs/domains/video-pipeline.md`, `docs/domains/multilingual-audio.md`.

## 3. Scope

- In scope:
  - Add optional parallel final render chunking for VIP final render.
  - Configure EC2 launcher to use 4 render chunks by default on `c8g.xlarge`.
  - Preserve single-pass fallback when chunking is disabled or unsafe.
  - Shift subtitle/text/blur/cover timelines per chunk so output remains synced.
  - Concatenate chunk outputs with stream copy.
  - Add focused tests for chunk planning, shifted ffmpeg args, and default fallback behavior.
- Out of scope:
  - Changing encoder preset/CRF.
  - Changing blur/subtitle/text visual output.
  - GPU/hardware encoder support.

## 4. Acceptance Criteria

1. EC2 launcher sets `OMNIVIDEO_VIP_RENDER_CHUNKS=4`.
2. When chunking is enabled and media duration is long enough, final render creates multiple time chunks and renders them concurrently.
3. Per-chunk ffmpeg args seek video/audio inputs, shift timeline filters, and keep `veryfast` preset unless explicitly configured otherwise.
4. Chunk outputs are concatenated by stream copy into the final MP4.
5. Focused tests, build, version guard, launcher syntax checks, and diff check pass.

## 5. Technical Plan

1. Extract chunk planning and timeline-shift helpers near final render args.
2. Extend final render args with optional input seek/duration and timeline offset.
3. Add parallel chunk render path in `renderVipCompositeVideo` with single-render fallback.
4. Add env/launcher config and regression tests.
5. Update docs/changelog/task evidence and run verification.

## 6. Code Change Impact

- Có thay đổi code không: Yes
- Module impacted:
  - `src/lib/multilingual-audio/video-vip-processing.ts`
  - `omnivideo-vip-spot.sh`
  - related tests/docs

## 7. Test Plan

1. `npm run test -- --run src/lib/multilingual-audio/video-vip-processing.test.ts src/app/api/audio/video-vip-voice-render/route.test.ts src/app/api/audio/video-vip-processing/route.test.ts src/lib/multilingual-audio/audio-extraction.test.ts`
2. `npm run guard:version`
3. `npm run build`
4. `git diff --check`
5. `bash -n omnivideo-vip-spot.sh`
6. `zsh -n omnivideo-vip-spot.sh`

## 8. Observability

- Existing render stage duration remains the main timing signal.
- Worker process status should show multiple ffmpeg processes during chunked render.

## 9. Risks & Rollback

- Risk: chunk boundaries may expose timestamp/concat edge cases for unusual input files.
- Rollback: set `OMNIVIDEO_VIP_RENDER_CHUNKS=1` to force the existing single-render path.

## 10. Deliverables

1. Parallel chunked final render path.
2. EC2 launcher config for 4 chunks.
3. Regression tests and verification evidence.

## 11. Changelog Note

- Parallelize EC2 VIP final render into 4 chunks by default while preserving `veryfast` quality.

## 12. Task Type Checklist (Stamp [x])

### 12.1 Performance

- [x] Có mô tả bottleneck hiện tại
- [x] Có phạm vi tối ưu rõ
- [x] Có fallback/rollback
- [x] Có test regression cho behavior chính

## 13. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/multilingual-audio/video-vip-processing.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/video-vip-processing.test.ts src/app/api/audio/video-vip-voice-render/route.test.ts src/app/api/audio/video-vip-processing/route.test.ts src/lib/multilingual-audio/audio-extraction.test.ts`
  - `npm run guard:version`
  - `npm run build`
  - `git diff --check`
  - `bash -n omnivideo-vip-spot.sh`
  - `zsh -n omnivideo-vip-spot.sh`
- Test results summary:
  - Focused VIP render/API/ffmpeg resolver tests pass: 4 files / 48 tests.
  - Version guard pass.
  - Production build pass.
  - Diff whitespace check pass.
  - Launcher syntax checks pass.
- Versioning note:
  - Bumped app version from `0.10.108` to `0.10.109`.
- Files changed:
  - Runtime: `src/lib/multilingual-audio/video-vip-processing.ts`
  - Operations: `omnivideo-vip-spot.sh`
  - Tests: `src/lib/multilingual-audio/video-vip-processing.test.ts`
  - Docs/changelog/version: `docs/domains/video-pipeline.md`, `docs/domains/multilingual-audio.md`, `changelog/changelog.md`, `package.json`, `package-lock.json`
  - Governance: `tasks/TASK-FAST-WORKSPACE-080.md`, `tasks/board.md`
- Residual risks:
  - Some unusual inputs may expose timestamp issues at concat boundaries; rollback is `OMNIVIDEO_VIP_RENDER_CHUNKS=1`.
  - Chunked CRF encode keeps the same preset/CRF/filter behavior, but final file size may differ slightly because chunks are encoded independently.
