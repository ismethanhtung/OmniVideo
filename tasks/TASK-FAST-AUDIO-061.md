# [FAST-AUDIO-061] Optimize Piper VIP Voice Generation Without Quality Loss

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

- Task ID: FAST-AUDIO-061
- Phase: MVP runtime hardening
- Target Phase: VIP voice performance
- Domain: Audio / VIP Processing / Piper TTS
- Task Type: Bugfix
- Priority: P1
- Size: M
- Owner: Codex
- Reviewer: Owner
- Status: Review

## 2. Context

- Lý do: User reports a 26-minute video at 0.8x has VIP voice generation taking over 10 minutes for 1123 Piper TTS segments.
- Bài toán cần giải quyết: Improve Piper TTS throughput without changing voice quality, timing semantics, alignment mode, or generated text content.
- Tài liệu liên quan: `docs/domains/multilingual-audio.md`, `docs/governance/testing-rules.md`, `docs/governance/task-standard.md`

## 3. Scope

- In scope:
  - Inspect current Piper TTS segment/chunk execution model.
  - Identify avoidable overhead that does not affect audio quality.
  - Optimize execution while preserving per-segment timing and alignment behavior.
  - Add regression tests for quality-preserving behavior.
- Out of scope:
  - Changing Piper voice/model.
  - Reducing transcript segments by merging text in a way that changes timing or natural pauses.
  - Lowering quality, sample rate, or output bitrate.

## 4. Input / Output

- Input: VIP voice generation with 1000+ translated timeline segments.
- Output mong đợi: Same quality/timing semantics with lower overhead for large segment counts.

## 5. Acceptance Criteria

1. Optimization does not change selected Piper model/settings or voice quality parameters.
2. Optimization preserves segment timing/alignment semantics.
3. Large segment-count path avoids unnecessary serial overhead where safe.
4. Regression tests cover the optimized execution path.
5. Focused tests and version guard pass.

## 6. Technical Plan

1. Read Piper TTS implementation and current tests.
2. Locate bottlenecks for many segments.
3. Implement conservative quality-preserving optimization.
4. Update tests, changelog, board, and version evidence.

## 7. Code Change Impact

- Có thay đổi code không: Yes, if optimization is implemented.
- Nếu Yes, module impacted: `src/lib/multilingual-audio/piper-tts.ts`, related tests.

## 8. Test Plan

1. Unit regression for large segment execution path.
2. Unit regression for timing/alignment preservation.
3. Run focused Piper/VIP tests.
4. Run version guard.

## 9. Observability

- Metrics: Existing VIP response includes voice generation duration and segment count.
- Logs: Existing progress center displays voice stage duration.
- Error codes: Existing Piper TTS error codes.

## 10. Risks & Rollback

- Risks: Parallelizing too aggressively can increase CPU/RAM pressure. Limit concurrency conservatively.
- Rollback strategy: Revert optimization and tests.

## 11. Deliverables

1. Piper TTS performance optimization.
2. Regression tests.
3. Changelog, board, version evidence.

## 12. Changelog Note

- Optimize Piper TTS throughput for large VIP segment counts without changing quality or timing semantics.

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

## 14. Execution Notes

- Assumptions: User requires no quality reduction, so optimization must preserve model/settings/output alignment semantics.
- Blockers: None.
- Root cause: Piper synthesis was already batched, but timeline alignment still did one ffmpeg duration probe plus one ffmpeg transform per segment sequentially. With 1123 segments, process startup and serial alignment overhead dominate.
- Fix: Read WAV duration directly from generated Piper files when possible and run independent alignment transforms with bounded concurrency. Piper model/settings/text and ffmpeg tempo/filter semantics remain unchanged.
- Residual risk: Actual speedup depends on CPU/disk and segment distribution. Default concurrency is conservative and can be tuned with `PIPER_ALIGNMENT_FFMPEG_CONCURRENCY`.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/multilingual-audio/piper-tts.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/piper-tts.test.ts src/lib/multilingual-audio/video-vip-processing.test.ts src/app/api/audio/video-vip-processing/route.test.ts`
  - `npm run build`
  - `npm run guard:version`
- Test results summary:
  - Focused Piper/VIP tests pass (3 files / 30 tests).
  - Regression covers direct WAV duration parsing without ffmpeg probes and concurrent balanced alignment transforms.
  - `npm run build` compiles current changes, then fails on unrelated pre-existing `src/app/api/video-processing/edit/route.ts:408` subtitle typing.
- Version guard command/result (if runtime changed): `npm run guard:version` pass.
