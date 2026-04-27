# FAST-AUDIO-007 Chunk Edge TTS SSML Requests

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

- Task ID: FAST-AUDIO-007
- Phase: Phase 2
- Target Phase: MVP Audio Pipeline
- Domain: Multilingual Audio
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: User vẫn gặp Edge-TTS `1007 SSML is invalid` trên payload transcript nhiều segment.
- Bài toán cần giải quyết: Không gửi toàn bộ transcript thành một SSML lớn; chia thành chunks nhỏ và sanitize Unicode invalid đầy đủ hơn.
- Tài liệu liên quan:
  - `docs/domains/multilingual-audio.md`
  - `tasks/TASK-FAST-AUDIO-006.md`

## 3. Scope

- In scope:
  - Chunk Edge-TTS synthesis theo segment/char budget.
  - Concatenate returned audio chunks for MVP preview/download.
  - Sanitize XML-invalid Unicode ranges beyond C0 control chars.
  - Regression tests.
- Out of scope:
  - Frame-accurate audio muxing.
  - Storage persistence.

## 4. Input / Output

- Input: long translated segment list.
- Output mong đợi: multiple smaller Edge-TTS requests, one returned audio payload.

## 5. Acceptance Criteria

1. Long segment list is split into multiple SSML requests.
2. XML-invalid surrogate/noncharacter code points are removed/replaced.
3. API still returns one audio payload.
4. Tests/build pass and local Edge smoke passes.

## 6. Technical Plan

1. Add sanitized segment normalization and chunking helpers.
2. Generate SSML per chunk and synthesize sequentially.
3. Concatenate audio buffers and expose total segment count.
4. Add tests verifying multiple websocket requests for long inputs.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/lib/multilingual-audio/edge-tts.ts`
  - `src/lib/multilingual-audio/edge-tts.test.ts`

## 8. Test Plan

1. Unit/Integration cần chạy:
   - `npm run test -- --run src/lib/multilingual-audio/edge-tts.test.ts src/app/api/audio/voice-generation/route.test.ts`
   - `npm run test`
   - `npm run build`
2. Failure cases cần thử:
   - Long input split.
   - Invalid Unicode sanitize.
3. Kết quả mong đợi:
   - Tests/build pass; smoke returns audio.

## 9. Observability

- Metrics: provider connection id remains per returned result; chunk count can be inferred later if exposed.
- Logs: no raw transcript logging.
- Error codes: unchanged.

## 10. Risks & Rollback

- Risks:
  - Concatenating compressed audio is MVP-grade and not exact muxing.
- Rollback strategy:
  - Revert chunking and use single request.

## 11. Deliverables

1. Chunked Edge-TTS requests.
2. Regression tests.
3. Changelog/task evidence.

## 12. Changelog Note

- Tóm tắt dòng changelog dự kiến: Chunk long Edge-TTS SSML requests to avoid provider `SSML is invalid` on multi-segment transcripts.

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
- [ ] Có tài liệu tham chiếu

## 14. Execution Notes

- Assumptions:
  - User payload likely exceeds Edge single-SSML tolerance or includes XML-invalid Unicode not covered by prior sanitize.
- Blockers:
  - None currently.
- Verification evidence:
  - `npm run test -- --run src/lib/multilingual-audio/edge-tts.test.ts src/app/api/audio/voice-generation/route.test.ts` pass (8 tests / 2 files).
  - Real local API smoke with 2 gapped segments and `preserveTimestampGaps=true` returned `ok=true`, MP3 audio.
  - Real local API smoke with 45 segments returned `ok=true`, MP3 byte length `1270824`, segment count `45`.
  - `npm run test` pass (197 tests / 47 files).
  - `npm run build` pass; warning cũ còn lại: `src/features/workspace/display-preferences-panel.tsx` import `Image` không dùng.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/multilingual-audio/edge-tts.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/edge-tts.test.ts src/app/api/audio/voice-generation/route.test.ts`
  - Real local API smoke via `curl -sS -X POST http://localhost:3003/api/audio/voice-generation ...`
  - `npm run test`
  - `npm run build`
- Test results summary:
  - Focused tests pass (8 tests / 2 files).
  - Real Edge-TTS API smoke pass for gapped and long transcript payloads.
  - Full suite pass (197 tests / 47 files).
  - Build pass with existing unused `Image` warning outside this task.
