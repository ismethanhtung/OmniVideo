# FAST-AUDIO-005 Fix Edge TTS Websocket Runtime Failure

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

- Task ID: FAST-AUDIO-005
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

- Lý do: User gặp lỗi `PRV_EDGE_TTS_FAILED: Edge-TTS websocket failed` khi generate voice từ Audio Transcript.
- Bài toán cần giải quyết: Harden Edge-TTS runtime để server-side request bắt tay websocket ổn định hơn và trả lỗi provider rõ hơn.
- Tài liệu liên quan:
  - `docs/domains/multilingual-audio.md`
  - `tasks/TASK-P2-AUDIO-006.md`

## 3. Scope

- In scope:
  - Sửa Edge-TTS websocket transport server-side.
  - Thêm regression test cho transport failure/success path.
  - Cập nhật changelog/task evidence.
- Out of scope:
  - Đổi provider TTS.
  - Persist audio output.
  - Workspace TTS node.

## 4. Input / Output

- Input: translated segments + Edge-TTS settings.
- Output mong đợi: audio generation không fail ngay ở websocket handshake trong Node runtime.

## 5. Acceptance Criteria

1. Edge-TTS server-side transport gửi websocket upgrade với headers phù hợp cho ReadAloud endpoint.
2. Adapter vẫn synthesize audio thành công trong unit test qua mocked transport.
3. Provider handshake/close errors trả `PRV_EDGE_TTS_FAILED` với detail dễ debug hơn.
4. Full tests/build pass hoặc ghi rõ blocker.

## 6. Technical Plan

1. Thay default Node global WebSocket bằng custom TLS websocket transport có Origin/User-Agent headers.
2. Giữ injectable WebSocket/transport cho unit tests.
3. Thêm tests cho custom transport message handling và close/error path.

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
   - Websocket closes without audio.
   - Invalid output format remains rejected.
3. Kết quả mong đợi:
   - Tests pass, build pass.

## 9. Observability

- Metrics: unchanged.
- Logs: avoid raw transcript; error message includes transport stage.
- Error codes: `PRV_EDGE_TTS_FAILED`.

## 10. Risks & Rollback

- Risks:
  - Edge ReadAloud endpoint is unofficial and can still block/rate-limit requests.
- Rollback strategy:
  - Revert transport hardening only; UI/API contract remains unchanged.

## 11. Deliverables

1. Hardened Edge-TTS transport.
2. Regression tests.
3. Changelog/task evidence.

## 12. Changelog Note

- Tóm tắt dòng changelog dự kiến: Fix Edge-TTS websocket failure by using a server-side TLS websocket transport with Edge-compatible headers.

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
  - Failure happened first at Node websocket handshake, then after transport hardening at Edge SSML validation.
  - Root cause: Edge ReadAloud requires `Sec-MS-GEC`/Edge-compatible headers and SSML voice name must use the full Edge voice format, not only short voice id.
- Blockers:
  - None currently.
- Verification evidence:
  - `npm run test -- --run src/lib/multilingual-audio/edge-tts.test.ts src/app/api/audio/voice-generation/route.test.ts` pass (7 tests / 2 files).
  - Real local API smoke: `POST /api/audio/voice-generation` returned `ok=true`, `audio/mpeg`, MP3 byte length `18720`.
  - `npm run test` pass (196 tests / 47 files).
  - `npm run build` pass; warning cũ còn lại: `src/features/workspace/display-preferences-panel.tsx` import `Image` không dùng.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/multilingual-audio/edge-tts.test.ts`
  - `src/app/api/audio/voice-generation/route.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/edge-tts.test.ts src/app/api/audio/voice-generation/route.test.ts`
  - Real local API smoke via `curl -sS -X POST http://localhost:3002/api/audio/voice-generation ...`
  - `npm run test`
  - `npm run build`
- Test results summary:
  - Focused tests pass (7 tests / 2 files).
  - Real Edge-TTS API smoke pass, MP3 audio returned.
  - Full suite pass (196 tests / 47 files).
  - Build pass with existing unused `Image` warning outside this task.
