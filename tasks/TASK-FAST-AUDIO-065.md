# [FAST-AUDIO-065] Chunk Strict Voice Timeline Mix and Surface VIP Stage Details

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

- Task ID: FAST-AUDIO-065
- Phase: MVP runtime hardening
- Target Phase: VIP voice performance and observability
- Domain: Audio / VIP Processing / Workspace Progress
- Task Type: Bugfix
- Priority: P1
- Size: M
- Owner: Codex
- Reviewer: Owner
- Status: Review

## 2. Context

- Lý do: User compared completed split-video VIP runs and found segment count roughly doubled while voice stage time grew disproportionately (`578 segments -> 01:46`, `1066 segments -> 08:05`). This points beyond Piper synthesis into strict timeline alignment/mix overhead with very large segment counts.
- Bài toán cần giải quyết: Reduce nonlinear strict voice mix overhead by chunking the absolute timeline mix into 200-segment groups, then surface voice chunk details in Workspace VIP completion details.
- Tài liệu liên quan: `docs/domains/multilingual-audio.md`, `docs/governance/testing-rules.md`, `docs/governance/task-standard.md`.

## 3. Scope

- In scope:
  - Chunk strict timeline mix into 200-segment groups before final group-level mix.
  - Preserve absolute timestamps, borrowed-gap behavior, segment timing diagnostics, and final voice output semantics.
  - Expose voice processing chunk metadata in `VoiceGenerationResult`.
  - Show VIP stage durations and voice chunk details in Workspace progress detail after completion.
  - Add regression tests for large strict timeline chunking and detail rendering.
- Out of scope:
  - Server-sent events/background polling for true live server-side stage updates.
  - Splitting final MP4 render into multiple video chunks.
  - Changing Piper voice/model/settings.

## 4. Input / Output

- Input: Large strict-alignment VIP voice job with more than 200 segments.
- Output mong đợi: Strict voice mix runs as 200-segment timeline chunks plus a small final mix, and VIP details show chunk counts/timings.

## 5. Acceptance Criteria

1. Strict timeline mix with more than 200 aligned segments avoids one giant `amix` over all segments.
2. Chunked strict timeline mix preserves absolute timestamps and target voice duration.
3. Voice result includes chunk metadata for Workspace display.
4. Workspace VIP completion detail includes stage durations plus voice chunk lines.
5. Regression tests and version guard pass.

## 6. Technical Plan

1. Extend strict timeline alignment to mix aligned segment files in 200-segment groups.
2. Add voice processing chunk metadata to the alignment result type.
3. Update Workspace VIP progress detail formatting to show voice chunk summaries.
4. Add focused tests for large strict mix chunking and progress detail source expectations.
5. Update changelog, board, version, and evidence.

## 7. Code Change Impact

- Có thay đổi code không: Yes.
- Nếu Yes, module impacted: `src/lib/multilingual-audio/piper-tts.ts`, `src/lib/multilingual-audio/types.ts`, `src/features/workspace/workspace-canvas-panel.tsx`, related tests.

## 8. Test Plan

1. Unit regression: strict timeline with 450 segments creates 200/200/50 group mixes plus final group mix.
2. Unit regression: chunk metadata preserves segment counts and absolute time spans.
3. Workspace panel test/source assertion for voice chunk display copy.
4. Run focused tests and `npm run guard:version`.

## 9. Observability

- Metrics: VIP voice result includes processing chunk metadata.
- Logs: Workspace progress detail displays stage durations and voice chunk summaries after completion.
- Error codes: Existing Piper/VIP errors unchanged.

## 10. Risks & Rollback

- Risks: Additional mix passes add overhead for medium jobs; threshold 200 avoids this for small/medium flows.
- Rollback strategy: Revert strict mix chunking and display metadata additions.

## 11. Deliverables

1. Chunked strict voice timeline mix.
2. Voice chunk metadata in VIP detail.
3. Regression tests and changelog/version evidence.

## 12. Changelog Note

- Chunk strict Piper timeline mixing for large VIP voice jobs and surface voice chunk details in Workspace progress.

## 13. Task Type Checklist (Stamp [x])

### 13.1 Feature

- [x] Có user/system flow rõ ràng
- [x] Có acceptance criteria đo được
- [x] Có test cho happy path
- [x] Có test cho failure path chính

### 13.2 Bugfix

- [x] Có mô tả cách tái hiện lỗi
- [x] Có root cause ngắn gọn
- [x] Có regression test
- [x] Có xác nhận lỗi cũ không tái diễn

### 13.3 Research

- [ ] Có câu hỏi nghiên cứu rõ
- [ ] Có kết quả/khuyến nghị cụ thể
- [ ] Có quyết định next step

## 14. Execution Notes

- Assumptions: User mainly needs faster/more stable strict voice stage for large segment counts; true live progress requires a separate streaming/polling API and remains out of scope for this patch.
- Blockers: None.
- Root cause: Strict timeline alignment still performed one final absolute `amix` over every aligned segment file. With 1000+ inputs, that final mix can grow disproportionately even if Piper synthesis and per-segment transforms are bounded.
- Fix: Strict timeline alignment now mixes aligned segment files into 200-segment voice chunks first, then runs a small final absolute mix over those chunk files. Voice alignment metadata now includes processing chunk summaries for Workspace display, and VIP completion details include a stage log with durations.
- Residual risk: This is expected to reduce the nonlinear voice-stage spike, but exact speedup depends on local ffmpeg, disk, CPU throttling, segment density, and source duration.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/multilingual-audio/piper-tts.test.ts`
  - `src/features/workspace/workspace-canvas-panel.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/piper-tts.test.ts`
  - `npm run test -- --run src/features/workspace/workspace-canvas-panel.test.ts src/lib/multilingual-audio/piper-tts.test.ts src/lib/multilingual-audio/video-vip-processing.test.ts`
  - `npm run build`
  - `npm run guard:version`
- Test results summary:
  - Piper TTS tests pass (1 file / 25 tests), including 450-segment strict mix chunking into `200/200/50` plus final 3-input absolute mix.
  - Focused Workspace/Piper/VIP tests pass (3 files / 48 tests).
  - Workspace source regression covers `Voice chunks` and per-chunk detail copy.
  - `npm run build` compiled successfully, then failed on unrelated pre-existing `src/app/api/storage/assets/save-video-setup/route.ts:133` type mismatch (`StorageProviderType` includes `"other"`, but `uploadLocalMedia` expects `StorageProvider`).
- Version guard command/result (if runtime changed):
  - `npm run guard:version` pass.
