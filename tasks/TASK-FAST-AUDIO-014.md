# FAST-AUDIO-014 Optimize Groq Segment Translation Latency and Completeness

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [x] Done

## 1. Metadata

- Task ID: FAST-AUDIO-014
- Phase: Phase 2
- Target Phase: MVP Audio Pipeline
- Domain: Multilingual Audio
- Task Type: Bugfix/Performance
- Priority: P0
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: User thấy bước dịch segment sang tiếng Việt rất lâu dù Groq/model phản hồi nhanh, và đôi khi bản dịch còn sót ký tự Hán/CJK trong câu tiếng Việt.
- Bài toán cần giải quyết: Rút thời gian tổng của translation bằng xử lý chunk song song có giới hạn, đồng thời tăng quality gate để retry segment còn untranslated text mà vẫn giữ đúng segment timeline.
- Tài liệu liên quan:
  - `docs/domains/multilingual-audio.md`
  - `tasks/TASK-P2-AUDIO-005.md`

## 3. Scope

- In scope:
  - Tối ưu `translateTranscriptSegments` để nhiều chunk độc lập chạy song song có giới hạn.
  - Retry các segment có `translatedText` rỗng, bằng source, hoặc còn ký tự CJK sau khi dịch.
  - Giữ nguyên order và `id/start/end` theo source segments.
  - Regression tests cho latency/concurrency và lỗi output còn ký tự Hán/CJK.
- Out of scope:
  - Background job/queue/progress streaming.
  - Human review editor.
  - Cache persisted translation.

## 4. Input / Output

- Input: transcript segments `{id,start,end,text}`, source language, target language, Groq-compatible model/provider.
- Output mong đợi: translated segments `{id,start,end,sourceText,translatedText}` giữ đúng timeline, ít request latency hơn khi có nhiều chunk, và không còn ký tự CJK trong bản dịch tiếng Việt.

## 5. Acceptance Criteria

1. Translation chunks độc lập được gọi song song có giới hạn thay vì tuần tự toàn bộ.
2. Output vẫn preserve segment order, `id`, `start`, `end`.
3. Segment có `translatedText` còn ký tự CJK được retry với request nhỏ hơn.
4. Retry có giới hạn để tránh vòng lặp vô hạn khi provider trả output kém.
5. Tests cover concurrency behavior, CJK residual retry, and existing provider failure path.

## 6. Technical Plan

1. Thêm helper bounded concurrency cho translation chunks và dùng trong `translateTranscriptSegments`.
2. Mở rộng quality detection từ "source == translated" sang "translated còn CJK" và thêm retry depth giới hạn.
3. Cập nhật unit tests cho concurrency/order preservation và regression còn ký tự Hán trong translated text.
4. Cập nhật docs/changelog/task evidence sau khi verify.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/lib/multilingual-audio/transcript-translation.ts`
  - `src/lib/multilingual-audio/transcript-translation.test.ts`
  - `docs/domains/multilingual-audio.md`

## 8. Test Plan

1. Unit/Integration cần chạy:
   - `npm run test -- --run src/lib/multilingual-audio/transcript-translation.test.ts src/app/api/audio/transcript-translation/route.test.ts`
2. Failure cases cần thử:
   - Groq provider error.
   - Provider trả bản dịch còn ký tự CJK.
   - Retry vẫn còn CJK sau giới hạn.
3. Kết quả mong đợi:
   - Targeted tests pass, no new linter diagnostics in edited files.

## 9. Observability

- Metrics: chunk count, segment count, total tokens already returned in API result.
- Logs: không log raw transcript/secret.
- Error codes:
  - Existing `VAL_TRANSLATION_SEGMENTS_REQUIRED`
  - Existing `PRV_GROQ_TRANSLATION_FAILED`

## 10. Risks & Rollback

- Risks:
  - Parallel chunk calls có thể tăng áp lực rate limit nếu provider quota thấp; dùng concurrency giới hạn để giảm rủi ro.
  - Một số proper noun bằng chữ Hán có thể bị retry thêm; với ZH->VI hiện ưu tiên không để sót chữ Hán trong output.
- Rollback strategy:
  - Đưa `translateTranscriptSegments` về loop tuần tự và chỉ retry behavior cũ.

## 11. Deliverables

1. Bounded parallel transcript translation.
2. Stronger untranslated/CJK residual retry.
3. Regression tests and verification evidence.
4. Changelog/docs/task updates.

## 12. Changelog Note

- Tóm tắt dòng changelog dự kiến: Optimize Groq segment translation with bounded parallel chunks and stricter retry for untranslated CJK output.

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

- Assumptions:
  - Target language is Vietnamese and source is usually Chinese for this workflow.
  - Groq/model request latency is fast; current user-visible delay mainly comes from sequential chunk processing and quality retries.
- Root cause:
  - Translation chunks were processed sequentially, so multi-chunk transcripts paid cumulative network/model latency.
  - Quality retry only caught empty/source-equal CJK output and missed mixed Vietnamese+CJK text like `Bạn nhìn đồng hồ báo thức một cách ngây呆`.
- Blockers: none.
- Verification evidence:
  - `npm run test -- --run src/lib/multilingual-audio/transcript-translation.test.ts src/app/api/audio/transcript-translation/route.test.ts` pass (10 tests / 2 files).
  - Regression added for CJK residual retry and bounded quality retry.
  - Concurrency test confirms independent chunks overlap while preserving translated segment order.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/multilingual-audio/transcript-translation.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/transcript-translation.test.ts src/app/api/audio/transcript-translation/route.test.ts`
- Test results summary:
  - Targeted tests pass: 10 tests / 2 files.
