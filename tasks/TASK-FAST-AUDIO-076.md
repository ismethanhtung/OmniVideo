# [FAST-AUDIO-076] Retry Transient Translation Chunk Failures

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

- Task ID: FAST-AUDIO-076
- Phase: FAST
- Target Phase: VIP translation reliability
- Domain: Audio / VIP / Transcript Translation
- Task Type: Bugfix
- Priority: P0
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Owner provided a VIP translation log where chunk `6/11` received Gemini `503 UNAVAILABLE` with message `This model is currently experiencing high demand... Please try again later.`
- The translation stage failed immediately after that transient provider response even though other chunks continued returning `200`.
- This makes the workflow too brittle for long VIP videos.

## 3. Scope

- In scope:
  - Retry transient translation chunk failures at chunk level.
  - Treat provider `503`, `429`, `5xx`, high-demand/unavailable messages, and network fetch failures as transient.
  - Keep existing request-too-large split retry, invalid JSON retry, and single-segment fallback behavior.
  - Log retry attempts clearly before declaring `chunk-failed`.
  - Add regression tests for Gemini-style `503` recovery and bounded failure.
- Out of scope:
  - Skipping translation chunks and producing incomplete videos.
  - Changing transcription, voice, or render stages.
  - Changing provider/model selection.

## 4. Acceptance Criteria

1. A chunk receiving temporary Gemini `503 UNAVAILABLE` retries instead of failing the whole translation immediately.
2. If a transient chunk failure recovers on retry, translation completes with all segments in order.
3. If transient failures continue past the retry limit, the chunk fails with the original translation error.
4. Existing split retry for request-too-large and invalid JSON remains functional.
5. Focused tests, version guard, build, and diff check pass or failures are documented.

## 5. Technical Plan

1. Add transient translation error detection and retry delay helpers.
2. Wrap `translateChunkAdaptive` request failures with bounded transient retry before existing split/fallback branches.
3. Adjust provider HTTP status mapping so `429` and `5xx` are treated as retryable server/provider failures.
4. Add tests around 503 recovery and exhausted retries.
5. Update changelog, board, and version metadata.

## 6. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/lib/multilingual-audio/transcript-translation.ts`
  - `src/lib/multilingual-audio/transcript-translation.test.ts`

## 7. Test Plan

1. Unit cần chạy:
   - `npm run test -- --run src/lib/multilingual-audio/transcript-translation.test.ts`
2. Regression cần thử:
   - Gemini-style 503 high demand recovers on retry.
   - Persistent transient failure retries then fails boundedly.
   - Existing request-too-large split tests still pass.
3. Kết quả mong đợi:
   - Focused tests pass, then `npm run guard:version`, `npm run build`, and `git diff --check` pass.

## 8. Observability

- Logs: Adds `chunk-transient-retry` event with chunk label, attempt, max retries, delay, and summarized error.
- Error codes: Preserve `PRV_GROQ_TRANSLATION_FAILED`.

## 9. Risks & Rollback

- Risks: Retrying may add seconds when provider is overloaded, but that is preferable to failing long VIP runs immediately.
- Rollback strategy: revert retry helper changes, tests, changelog, board, and version bump.

## 10. Deliverables

1. Bounded chunk-level retry for temporary provider failures.
2. Regression tests and task/changelog evidence.

## 11. Changelog Note

- Tóm tắt dòng changelog dự kiến: Retry transient translation chunk failures so temporary Gemini overload does not immediately fail VIP translation.

## 12. Task Type Checklist (Stamp [x])

### 12.1 Feature

- [ ] Có user/system flow rõ ràng
- [ ] Có acceptance criteria đo được
- [ ] Có test cho happy path
- [ ] Có test cho failure path chính

### 12.2 Bugfix

- [x] Có mô tả cách tái hiện lỗi
- [x] Có root cause ngắn gọn
- [x] Có regression test
- [x] Có xác nhận lỗi cũ không tái diễn

### 12.3 Research

- [ ] Có câu hỏi nghiên cứu rõ
- [ ] Có kết quả/khuyến nghị cụ thể
- [ ] Có quyết định next step

## 13. Execution Notes

- Root cause: non-OK translation provider response from one chunk threw immediately; chunk-level adaptive retry only handled request-too-large and invalid JSON, not temporary provider overload.
- Assumption: Do not skip failed translation chunks for VIP because that produces a semantically incomplete video.

## 14. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/multilingual-audio/transcript-translation.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/transcript-translation.test.ts`
  - `npm run guard:version`
  - `npm run build`
  - `git diff --check`
- Test results summary:
  - Focused transcript translation tests pass (1 file / 20 tests).
  - Version guard pass.
  - Build pass.
  - Diff check pass.
