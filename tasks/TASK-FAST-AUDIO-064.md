# [FAST-AUDIO-064] Chunk Piper Voice Synthesis at 200 Segments

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

- Task ID: FAST-AUDIO-064
- Phase: MVP runtime hardening
- Target Phase: VIP voice performance and stability
- Domain: Audio / VIP Processing / Piper TTS
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: Codex
- Reviewer: Owner
- Status: Review

## 2. Context

- Lý do: User wants Piper TTS to process large VIP voice jobs in smaller batches, starting with 200 segments per chunk, to reduce risk, heat, and memory pressure on an M1 Air 8GB.
- Bài toán cần giải quyết: Split Piper batch synthesis without changing transcript/translation flow, voice quality settings, timestamp semantics, or final alignment behavior.
- Tài liệu liên quan: `docs/domains/multilingual-audio.md`, `docs/governance/testing-rules.md`, `docs/governance/task-standard.md`.

## 3. Scope

- In scope:
  - Chunk Piper batch synthesis by 200 voice segments by default.
  - Keep transcript/translation unchanged.
  - Preserve existing strict/balanced/natural alignment semantics and original segment timestamps.
  - Keep existing bounded ffmpeg alignment concurrency behavior.
  - Add regression tests for chunking and segment order preservation.
- Out of scope:
  - Splitting video render into multiple MP4 blocks.
  - Changing Piper model/voice quality parameters.
  - Adding durable Mongo-backed chunk checkpoints.
  - Changing Workspace UI controls for chunk size.

## 4. Input / Output

- Input: Large voice generation request, e.g. 450 translated segments.
- Output mong đợi: Piper runs batch synthesis as `200/200/50` segment groups, then produces one final voice artifact with the same timeline semantics as before.

## 5. Acceptance Criteria

1. Piper batch synthesis uses a default 200 segment chunk size for non-empty voice segments.
2. Chunking does not change Piper model/settings/text normalization or quality parameters.
3. Chunking preserves output segment order, including when punctuation-only silence segments are mixed with spoken segments.
4. Existing strict/balanced/natural alignment behavior remains compatible with the chunked synthesis output.
5. Regression tests and version guard pass.

## 6. Technical Plan

1. Add a conservative Piper segment batch-size constant with default `200`.
2. Refactor segment file synthesis to process batchable segments in bounded groups while writing outputs back to their original segment index.
3. Add tests for 450-segment chunking and mixed silence/spoken ordering.
4. Update changelog, board, version, and test evidence.

## 7. Code Change Impact

- Có thay đổi code không: Yes.
- Nếu Yes, module impacted: `src/lib/multilingual-audio/piper-tts.ts`, `src/lib/multilingual-audio/piper-tts.test.ts`, version/changelog/task board.

## 8. Test Plan

1. Unit regression: 450 segments trigger 3 Piper batch invocations.
2. Unit regression: mixed punctuation-only and spoken segments preserve timeline order.
3. Run focused Piper TTS tests.
4. Run `npm run guard:version`.

## 9. Observability

- Metrics: Existing voice generation duration and segment count remain available.
- Logs: Existing Piper/VIP errors unchanged.
- Error codes: Existing Piper TTS error codes unchanged.

## 10. Risks & Rollback

- Risks: More Piper process launches can add overhead for medium-size jobs, but default chunking improves failure isolation for large jobs.
- Rollback strategy: Revert chunking helper and tests to previous single-batch behavior.

## 11. Deliverables

1. Piper synthesis chunking at 200 segments.
2. Regression tests.
3. Changelog, board, and version evidence.

## 12. Changelog Note

- Chunk Piper TTS voice synthesis into 200-segment batches for large VIP jobs while preserving timeline semantics.

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

- Assumptions: Chunking should apply only inside Piper synthesis; downstream alignment continues using original segment timestamps to avoid timeline drift.
- Blockers: None.
- Root cause: Large VIP jobs were using one Piper batch for all spoken segments. That minimized model loads, but made a single large batch more fragile and less friendly to low-RAM machines.
- Fix: Piper now splits spoken segment synthesis into default 200-segment groups, writes each result back to the original segment index, and leaves existing alignment/render semantics unchanged.
- Residual risk: More Piper process launches can add small overhead versus one huge batch. Final ffmpeg render remains a separate long-running bottleneck for long videos.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/multilingual-audio/piper-tts.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/piper-tts.test.ts`
  - `npm run test -- --run src/lib/multilingual-audio/piper-tts.test.ts src/lib/multilingual-audio/video-vip-processing.test.ts`
  - `npm run build`
  - `npm run guard:version`
- Test results summary:
  - Piper TTS tests pass (1 file / 24 tests), including 450-segment chunking and mixed silence/spoken ordering regressions.
  - Piper + VIP focused tests pass (2 files / 26 tests).
  - `npm run build` compiled successfully, then failed on unrelated pre-existing `src/app/api/storage/assets/save-video-setup/route.ts:133` type mismatch (`StorageProviderType` includes `"other"`, but `uploadLocalMedia` expects `StorageProvider`).
- Version guard command/result (if runtime changed):
  - `npm run guard:version` pass.
