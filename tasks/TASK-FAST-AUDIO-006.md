# FAST-AUDIO-006 Sanitize Edge TTS SSML Text

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

- Task ID: FAST-AUDIO-006
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

- Lý do: User vẫn gặp `PRV_EDGE_TTS_FAILED` với close code `1007` và reason `SSML is invalid`.
- Bài toán cần giải quyết: Edge-TTS phải sanitize text từ translated segments trước khi build SSML, vì transcript/translation có thể chứa invisible/control chars làm Edge reject.
- Tài liệu liên quan:
  - `docs/domains/multilingual-audio.md`
  - `tasks/TASK-FAST-AUDIO-005.md`

## 3. Scope

- In scope:
  - Sanitize translated text trước khi XML escape/build SSML.
  - Regression test cho ký tự control/invisible.
  - Cập nhật changelog/task evidence.
- Out of scope:
  - Thay TTS provider.
  - Persist audio.

## 4. Input / Output

- Input: translated segments có thể chứa ký tự control.
- Output mong đợi: SSML hợp lệ, text được thay ký tự không tương thích bằng khoảng trắng.

## 5. Acceptance Criteria

1. Text trong SSML không còn XML-invalid control chars.
2. Segment validation tính theo sanitized text để không gửi segment rỗng.
3. Unit test bao phủ control chars trong text.
4. Real local API smoke vẫn trả audio.

## 6. Technical Plan

1. Thêm helper sanitize/remove incompatible characters trong Edge-TTS adapter.
2. Dùng sanitized text cho validation, char limit, SSML và segmentCount.
3. Thêm regression assertion trong `edge-tts.test.ts`.

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
   - Control chars in segment text.
3. Kết quả mong đợi:
   - Tests/build pass; real API smoke returns audio.

## 9. Observability

- Metrics: unchanged.
- Logs: no raw transcript logging.
- Error codes: unchanged.

## 10. Risks & Rollback

- Risks:
  - Edge service can still reject unsupported SSML if provider contract changes.
- Rollback strategy:
  - Revert sanitize helper only.

## 11. Deliverables

1. Sanitized Edge-TTS SSML generation.
2. Regression test.
3. Changelog/task evidence.

## 12. Changelog Note

- Tóm tắt dòng changelog dự kiến: Sanitize translated segment text before Edge-TTS SSML generation to avoid provider `SSML is invalid` errors.

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
  - User may be sending invisible/control chars from transcript/translation, or may be hitting stale dev server code. This task hardens the payload path regardless.
- Blockers:
  - None currently.
- Verification evidence:
  - `npm run test -- --run src/lib/multilingual-audio/edge-tts.test.ts src/app/api/audio/voice-generation/route.test.ts` pass (7 tests / 2 files).
  - Real local API smoke with control char payload returned `ok=true`, `audio/mpeg`, MP3 byte length `24336`.
  - `npm run test` pass (196 tests / 47 files).
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
  - Focused tests pass (7 tests / 2 files).
  - Real Edge-TTS API smoke pass with control char payload, MP3 audio returned.
  - Full suite pass (196 tests / 47 files).
  - Build pass with existing unused `Image` warning outside this task.
