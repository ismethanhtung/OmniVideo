# [FAST-VIDEO-058] Add VIP Original Vocals Isolation

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

- Task ID: FAST-VIDEO-058
- Phase: FAST
- Target Phase: Workspace VIP
- Domain: Workspace / Video Pipeline / Multilingual Audio
- Task Type: Feature
- Priority: P0
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Owner often runs `Seed Remote VIP Voice Render` with `Original volume` around `0.2` to keep some original voices.
- If the source video contains copyrighted background music, mixing full original audio keeps that music in the final VIP output.
- Owner wants an option to remove/reduce music while retaining source vocals, using Replicate Spleeter model `soykertje/spleeter:cd128044253523c86abfd743dea680c88559ad975ccd72378c8433f067ab5d0a`.

## 3. Scope

- In scope:
  - Add a VIP option to use vocals-only original audio instead of the full source audio track.
  - Extract source audio, run Spleeter through Replicate, select the vocals stem, and use that stem for original-audio mixing.
  - Forward the vocals stem to remote EC2 voice/render workers so `remote-voice-render` does not fall back to full source audio.
  - Add API/runtime validation, progress/log visibility, and checkpoint fingerprint coverage for the new option.
  - Add focused tests for render args, remote payload pass-through, API parsing, Workspace wiring, and Replicate stem selection.
- Out of scope:
  - Legal guarantee that all copyrighted material is removed.
  - UI for selecting arbitrary Replicate models.
  - Running stem separation on EC2 itself without Replicate.

## 4. Acceptance Criteria

1. VIP node exposes an original-audio source option: full source audio or vocals-only source audio.
2. When vocals-only is selected and original audio volume is audible, VIP extracts source audio, calls Replicate Spleeter, and uses the returned vocals stem as the original audio mix source.
3. In `remote-voice-render`, the generated vocals stem is sent to the EC2 worker and final render uses that stem instead of source video audio.
4. If vocal isolation is enabled without `REPLICATE_API_TOKEN`, VIP returns a clear configuration error before rendering.
5. Checkpoint fingerprint changes when vocals-only mode is enabled so stale full-source-audio renders are not reused.
6. Focused tests, version guard, build, and diff check pass or failures are documented.

## 5. Technical Plan

1. Add a Replicate Spleeter adapter that extracts source audio to MP3, creates the prediction, polls if needed, and downloads the vocals stem.
2. Extend VIP runtime/render types with `originalAudioSourceMode` and optional `originalAudioStem`.
3. Update local render args to accept an external original-audio path and update remote worker payload/route to receive and use the stem.
4. Wire API route and Workspace VIP node config/form data.
5. Add focused tests, bump patch version, update changelog/board evidence, and verify.

## 6. Code Change Impact

- Co thay doi code khong: Yes
- Neu Yes, module impacted:
  - `src/lib/multilingual-audio/video-vip-processing.ts`
  - `src/lib/multilingual-audio/remote-vip-worker.ts`
  - `src/app/api/audio/video-vip-processing/route.ts`
  - `src/app/api/audio/video-vip-voice-render/route.ts`
  - `src/features/workspace/workspace-canvas-panel.tsx`
  - `src/lib/workspace/workspace-graph.ts`
  - focused tests

## 7. Test Plan

1. Focused commands:
   - `npm run test -- --run src/lib/multilingual-audio/source-vocal-isolation.test.ts src/lib/multilingual-audio/video-vip-processing.test.ts src/lib/multilingual-audio/remote-vip-worker.test.ts src/app/api/audio/video-vip-processing/route.test.ts src/app/api/audio/video-vip-voice-render/route.test.ts src/features/workspace/workspace-canvas-panel.test.ts src/lib/workspace/workspace-graph.test.ts`
2. Required checks:
   - `npm run guard:version`
   - `npm run build`
   - `git diff --check`

## 8. Observability

- VIP logs should show when vocals-only original audio is requested, when vocal isolation starts/succeeds/fails, and whether remote worker receives a stem.
- Workspace progress should mention vocals-only source audio mode when enabled.

## 9. Risks & Rollback

- Risks: Replicate model output schema may vary; adapter must tolerate common output shapes and fail clearly when no vocals URL can be found.
- Risks: Vocal isolation reduces background music but cannot guarantee copyright-safe output.
- Rollback strategy: revert this task's VIP option, Replicate adapter, remote payload changes, tests, changelog, and version bump.

## 10. Deliverables

1. VIP vocals-only original audio option.
2. Replicate Spleeter adapter.
3. Remote worker stem pass-through.
4. Regression tests and release metadata.

## 11. Changelog Note

- Tom tat dong changelog du kien: Add VIP vocals-only original audio mode using Replicate Spleeter.

## 12. Task Type Checklist (Stamp [x])

### 12.1 Feature

- [x] Co user/system flow ro rang
- [x] Co acceptance criteria do duoc
- [x] Co test cho happy path
- [x] Co test cho failure path chinh

### 12.2 Bugfix

- [ ] Co mo ta cach tai hien loi
- [ ] Co root cause ngan gon
- [ ] Co regression test
- [ ] Co xac nhan loi cu khong tai dien

### 12.3 Research

- [ ] Co cau hoi nghien cuu ro
- [ ] Co ket qua/khuyen nghi cu the

## 13. Execution Notes

- Implementation:
  - Added VIP original-audio source mode (`source` vs `vocals`) in Workspace VIP runtime config, form submission, API parsing, and checkpoint fingerprinting.
  - Added Replicate Spleeter vocal-isolation adapter with ffmpeg source-audio extraction, prediction polling, vocals URL selection, and clear `REPLICATE_API_TOKEN` validation.
  - Updated local VIP render args to accept an external original-audio stem input and updated remote worker multipart/client/route handling for `originalAudioStemFile`.
  - Added focused tests for adapter behavior, ffmpeg input ordering, remote stem upload, worker route parsing, API parsing, Workspace UI wiring, and graph/seed defaults.
  - Bumped app version to `0.11.46` and added changelog entry.
- Verification:
  - `npm run test -- --run src/lib/multilingual-audio/source-vocal-isolation.test.ts src/lib/multilingual-audio/video-vip-processing.test.ts src/lib/multilingual-audio/remote-vip-worker.test.ts src/app/api/audio/video-vip-processing/route.test.ts src/app/api/audio/video-vip-voice-render/route.test.ts src/features/workspace/workspace-canvas-panel.test.ts src/lib/workspace/workspace-graph.test.ts src/lib/workspace/workspace-seeds.test.ts` pass (8 files / 168 tests).
  - `npm run guard:version` pass.
  - `npm run build` pass.
  - `git diff --check` pass.

## 14. Test Evidence (Mandatory if code changed)

- Pending.
