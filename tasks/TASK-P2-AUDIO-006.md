# P2-AUDIO-006 Edge TTS Voice Generation for Audio Transcript

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

- Task ID: P2-AUDIO-006
- Phase: Phase 2
- Target Phase: MVP Audio Pipeline
- Domain: Multilingual Audio
- Task Type: Feature
- Priority: P1
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: Audio Transcript đã có dịch segment sang tiếng Việt kèm timestamp; bước tiếp theo cần sinh voice-over từ các segment đã dịch.
- Bài toán cần giải quyết: Thêm Edge-TTS provider đầu tiên, cấu hình voice/rate/pitch/volume/output format trong UI, và trả audio có thể nghe/tải ngay trên trang Audio Transcript.
- Tài liệu liên quan:
  - `docs/domains/multilingual-audio.md`
  - `docs/architecture/integration-boundaries.md`
  - `tasks/TASK-P2-AUDIO-005.md`

## 3. Scope

- In scope:
  - Edge-TTS adapter server-side cho transcript translation segments.
  - API `POST /api/audio/voice-generation`.
  - UI settings trong Audio Transcript page: voice, rate, pitch, volume, output format, preserve timestamp gaps.
  - Audio preview/download output.
  - Unit/API tests cho validation, adapter success/failure và route failure.
- Out of scope:
  - Voice cloning.
  - True duration-stretching từng segment để khớp chính xác timeline.
  - Persist audio vào MongoDB/storage.
  - Workspace TTS node.

## 4. Input / Output

- Input: translated transcript segments `{id,start,end,translatedText}`, Edge-TTS config.
- Output mong đợi: audio buffer/data URL, MIME type, provider metadata, synthesized segment count.

## 5. Acceptance Criteria

1. User có thể bấm sinh voice sau khi đã có Vietnamese translation segments.
2. User cấu hình được voice, rate, pitch, volume, output format và tùy chọn giữ gap timestamp giữa segments.
3. API reject payload thiếu segments hoặc config ngoài range bằng error code rõ ràng.
4. Edge-TTS adapter gửi SSML có voice/prosody đúng config và trả audio bytes + metadata.
5. UI hiển thị audio player, metadata và link tải file khi voice generation thành công.

## 6. Technical Plan

1. Mở rộng audio types và thêm `edge-tts.ts` với validation, SSML builder, Edge websocket client.
2. Thêm App Router API `POST /api/audio/voice-generation`.
3. Mở rộng `chinese-transcription-panel.tsx` với state/settings/action/result voice.
4. Thêm tests cho lib và API.
5. Cập nhật docs/changelog/task evidence.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/lib/multilingual-audio/*`
  - `src/app/api/audio/voice-generation/*`
  - `src/features/audio/chinese-transcription-panel.tsx`

## 8. Test Plan

1. Unit/API cần chạy:
   - `npm run test -- --run src/lib/multilingual-audio/edge-tts.test.ts src/app/api/audio/voice-generation/route.test.ts`
   - Audio transcript related regression tests nếu cần.
2. Failure cases cần thử:
   - Missing segments.
   - Unsupported output format.
   - Provider websocket error/timeout path.
3. Kết quả mong đợi:
   - Tests pass, build pass hoặc ghi rõ blocker.

## 9. Observability

- Metrics: segment count, output bytes, output format, voice.
- Logs: không log raw transcript/secret; lỗi provider trả code chuẩn.
- Error codes: `VAL_TTS_SEGMENTS_REQUIRED`, `VAL_TTS_CONFIG_INVALID`, `PRV_EDGE_TTS_FAILED`.

## 10. Risks & Rollback

- Risks:
  - Edge ReadAloud protocol không phải API chính thức; có thể thay đổi hoặc bị rate-limit.
  - Preserve timestamp gaps chỉ thêm khoảng lặng giữa câu, chưa đảm bảo duration từng segment khớp hoàn toàn timeline.
- Rollback strategy:
  - Gỡ API/UI TTS mà không ảnh hưởng transcription/translation.

## 11. Deliverables

1. Edge-TTS voice generation API.
2. Audio Transcript voice settings + preview/download.
3. Tests and changelog evidence.

## 12. Changelog Note

- Tóm tắt dòng changelog dự kiến: Add Edge-TTS voice generation from Vietnamese transcript segments with user-configurable voice settings.

## 13. Task Type Checklist (Stamp [x])

### 13.1 Feature

- [x] Có user/system flow rõ ràng
- [x] Có acceptance criteria đo được
- [x] Có test cho happy path
- [x] Có test cho failure path chính

### 13.2 Bugfix

- [ ] Có mô tả cách tái hiện lỗi
- [ ] Có root cause ngắn gọn
- [ ] Có regression test
- [ ] Có xác nhận lỗi cũ không tái diễn

### 13.3 Research

- [ ] Có câu hỏi nghiên cứu rõ
- [ ] Có kết quả/khuyến nghị cụ thể
- [ ] Có quyết định next step
- [ ] Có tài liệu tham chiếu

## 14. Execution Notes

- Assumptions:
  - Scope page-only; Workspace TTS node sẽ là task sau.
  - Edge-TTS dùng Vietnamese neural voices mặc định, có thể đổi qua voice id khác.
- Blockers:
  - None currently.
- Verification evidence:
  - `npm run test -- --run src/lib/multilingual-audio/edge-tts.test.ts src/app/api/audio/voice-generation/route.test.ts` pass (7 tests / 2 files).
  - `npm run test` pass (196 tests / 47 files).
  - `npm run build` pass; warning cũ còn lại: `src/features/workspace/display-preferences-panel.tsx` import `Image` không dùng.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/multilingual-audio/edge-tts.test.ts`
  - `src/app/api/audio/voice-generation/route.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/edge-tts.test.ts src/app/api/audio/voice-generation/route.test.ts`
  - `npm run test`
  - `npm run build`
- Test results summary:
  - Focused tests pass (7 tests / 2 files).
  - Full suite pass (196 tests / 47 files).
  - Build pass with existing unused `Image` warning outside this task.
