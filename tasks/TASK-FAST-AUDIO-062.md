# [FAST-AUDIO-062] Keep VIP Processing Running When Segment Retry Is Exhausted

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Version guard passed (if runtime changed)
- [ ] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [ ] Done

## 1. Metadata

- Task ID: FAST-AUDIO-062
- Phase: MVP runtime hardening
- Target Phase: VIP runtime resilience
- Domain: Audio / VIP Processing / Transcription
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: Codex
- Reviewer: Owner
- Status: Review

## 2. Context

- Lý do: User reports VIP processing fails at `/api/audio/video-vip-processing` with `Groq segment retry exhausted` on a long Chinese segment.
- Bài toán cần giải quyết: Do not fail the whole VIP pipeline when one suspicious segment still cannot be split after retries.
- Tài liệu liên quan: `docs/domains/multilingual-audio.md`, `docs/governance/testing-rules.md`, `docs/governance/task-standard.md`

## 3. Scope

- In scope:
  - Add best-effort handling for overlong segment retry exhaustion in transcription.
  - Use best-effort mode in VIP processing path.
  - Add regression tests for strict vs best-effort behavior.
- Out of scope:
  - Changing translation/TTS strategy.
  - UI changes for retry policy controls.

## 4. Input / Output

- Input: VIP request containing at least one segment that remains overlong after retry attempts.
- Output mong đợi: VIP pipeline continues with original segment in best-effort mode and records retry exhaustion metrics.

## 5. Acceptance Criteria

1. Strict mode behavior remains unchanged: retry exhaustion still raises `PRV_GROQ_SEGMENT_RETRY_EXHAUSTED`.
2. Best-effort mode no longer throws on retry exhaustion and keeps original segment.
3. VIP processing explicitly runs transcription in best-effort mode.
4. Regression tests cover strict failure and best-effort continuation paths.

## 6. Technical Plan

1. Extend transcription request with retry handling mode.
2. Implement retry-exhausted fallback for best-effort mode while preserving strict behavior.
3. Wire VIP processing call to use best-effort mode.
4. Add/update focused tests.
5. Run focused tests and version guard.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/lib/multilingual-audio/chinese-transcription.ts`, `src/lib/multilingual-audio/video-vip-processing.ts`, related tests.

## 8. Test Plan

1. Unit test strict retry exhaustion still fails.
2. Unit test best-effort mode continues with exhausted segment.
3. VIP processing test asserts best-effort mode is passed to transcription runner.
4. Run focused tests and version guard.

## 9. Observability

- Metrics: expose retry exhaustion count in `groq-transcribe` step metrics.
- Logs: existing route error handling unchanged for strict mode.
- Error codes: keep `PRV_GROQ_SEGMENT_RETRY_EXHAUSTED` for strict mode only.

## 10. Risks & Rollback

- Risks: Best-effort mode can keep low-quality long segments in transcript for rare cases.
- Rollback strategy: remove best-effort branch and restore strict-only retry exhaustion.

## 11. Deliverables

1. Best-effort retry-exhausted handling for transcription.
2. VIP path wiring update.
3. Regression tests and changelog evidence.

## 12. Changelog Note

- Prevent VIP pipeline hard-fail on overlong segment retry exhaustion by using best-effort transcription retry mode.

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

- Assumptions: VIP flow should prioritize end-to-end completion over strict segment split guarantees.
- Blockers: None.
- Root cause: Segment-level retry logic from FAST-AUDIO-060 always threw on retry exhaustion, and VIP path consumed the strict default; one unresolved long segment aborted the entire VIP run.
- Fix: Added retry mode control in transcription with strict default preserved, then set VIP transcription call to best-effort so exhausted segments are retained and pipeline continues.
- Residual risk: Best-effort mode may keep rare noisy long segments, which can reduce translation/TTS quality for those segments only.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/multilingual-audio/chinese-transcription.test.ts`
  - `src/lib/multilingual-audio/video-vip-processing.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/chinese-transcription.test.ts src/lib/multilingual-audio/video-vip-processing.test.ts`
  - `npm run guard:version`
- Test results summary:
  - Focused tests pass (2 files / 7 tests), including strict-fail regression and best-effort continuation.
- Version guard command/result (if runtime changed):
  - `npm run guard:version` pass.
