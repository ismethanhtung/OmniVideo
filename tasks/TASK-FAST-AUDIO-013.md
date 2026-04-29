# FAST-AUDIO-013 Replace Audio Transcript Edge TTS with Piper

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

- Task ID: FAST-AUDIO-013
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

- Lý do: User không cần Edge-TTS nữa và muốn Audio Transcript voice generation dùng Piper local, có thể đọc theo segment timestamps.
- Bài toán cần giải quyết: Gỡ Edge-TTS khỏi Audio Transcript, dùng Piper self-contained runtime trong `piper/`, giữ audio không persist, và hỗ trợ timeline alignment.
- Tài liệu liên quan:
  - `tasks/TASK-FAST-AUDIO-010.md`
  - `tasks/TASK-FAST-AUDIO-011.md`
  - `tasks/TASK-FAST-AUDIO-012.md`

## 3. Scope

- In scope:
  - Đổi `/api/audio/voice-generation` từ Edge-TTS sang Piper.
  - Đổi controls trong `Audio Transcript` từ Edge voice/rate/pitch/output format sang Piper binary/model/config/speaker/scales.
  - Hỗ trợ timeline mode: synthesize từng segment, chèn silence theo gap, trim/pad/speed-up theo `start/end`.
  - Xoá Edge-TTS route/lib/tests khỏi flow/runtime.
  - Tests cho Piper voice route và adapter.
- Out of scope:
  - Lưu voice vào Storage Library.
  - Mix voice vào video gốc.
  - Tải voice model mới.

## 4. Input / Output

- Input: translated segments `{id,start,end,text}` và Piper runtime/model config.
- Output mong đợi: WAV preview/download trong browser, không persist server-side.

## 5. Acceptance Criteria

1. Audio Transcript không còn Edge-TTS controls/copy.
2. Voice generation API dùng Piper.
3. Generated WAV không lưu lâu dài; temp files bị xoá sau request.
4. Default paths portable theo repo (`piper`, empty model/config auto-resolve), không hard-code absolute required.
5. Timeline alignment dùng `start/end` khi bật preserve timestamps.
6. Tests/build pass.

## 6. Technical Plan

1. Mở rộng Piper adapter cho voice segments + timeline align.
2. Đổi voice generation API sang Piper.
3. Đổi Audio Transcript UI controls sang Piper.
4. Xoá Edge-TTS module/test và cập nhật types/tests/changelog/task.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/lib/multilingual-audio/piper-tts.ts`
  - `src/lib/multilingual-audio/types.ts`
  - `src/app/api/audio/voice-generation/route.ts`
  - `src/features/audio/chinese-transcription-panel.tsx`
  - tests liên quan

## 8. Test Plan

1. Unit/Integration cần chạy:
   - `npm run test -- --run src/lib/multilingual-audio/piper-tts.test.ts src/app/api/audio/piper-tts/route.test.ts src/app/api/audio/voice-generation/route.test.ts src/components/layout/navigation.test.ts`
   - `npm run build`
2. Failure cases cần thử:
   - Empty segments.
   - Piper model incompatible.
   - Timeline alignment args.
3. Kết quả mong đợi:
   - Tests/build pass.

## 9. Observability

- Metrics: segment count, alignment mode, target duration, byte length.
- Logs: không log raw transcript ngoài error message provider.
- Error codes: existing Piper/voice generation codes.

## 10. Risks & Rollback

- Risks:
  - Timeline alignment dùng ffmpeg có thể làm giảm chất lượng khi speed-up nhiều.
  - Current model trong `piper/` chưa tương thích Piper VITS.
- Rollback strategy:
  - Restore Edge route/imports from previous task if needed.

## 11. Deliverables

1. Piper voice generation in Audio Transcript.
2. Timestamp-aware Piper synthesis path.
3. Edge-TTS cleanup.
4. Tests/evidence/changelog.

## 12. Changelog Note

- Tóm tắt dòng changelog dự kiến: Replace Audio Transcript Edge-TTS voice generation with local Piper and timestamp-aware synthesis.

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

## 14. Execution Notes

- Assumptions:
  - User wants Edge removed from Audio Transcript voice generation; Piper sandbox may remain for isolated testing.
- Blockers:
  - Current repo model is incompatible with piper-tts, but migration can still be implemented and will return explicit error until model is replaced.
- Verification evidence:
  - `rg -n "edge-tts|Edge-TTS|EDGE_TTS|EdgeTts|vi-VN-HoaiMyNeural|PRV_EDGE_TTS_FAILED" src` returned no matches.
  - `npm run test -- --run src/lib/multilingual-audio/piper-tts.test.ts src/app/api/audio/piper-tts/route.test.ts src/app/api/audio/voice-generation/route.test.ts src/components/layout/navigation.test.ts` pass (19 tests / 4 files).
  - `npm run build` pass with existing warning outside task scope: `src/features/workspace/display-preferences-panel.tsx` unused `Image`.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/multilingual-audio/piper-tts.test.ts`
  - `src/app/api/audio/voice-generation/route.test.ts`
- Test commands executed:
  - `rg -n "edge-tts|Edge-TTS|EDGE_TTS|EdgeTts|vi-VN-HoaiMyNeural|PRV_EDGE_TTS_FAILED" src`
  - `npm run test -- --run src/lib/multilingual-audio/piper-tts.test.ts src/app/api/audio/piper-tts/route.test.ts src/app/api/audio/voice-generation/route.test.ts src/components/layout/navigation.test.ts`
  - `npm run build`
- Test results summary:
  - Edge-TTS source references removed from `src`.
  - Targeted tests pass (19 tests / 4 files).
  - Production build pass; only existing unused `Image` warning remains outside scope.
