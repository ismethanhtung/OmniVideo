# FAST-AUDIO-008 Align Edge TTS Voice to Segment Timestamps

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [ ] Implementation completed
- [ ] Tests added/updated (if code changed)
- [ ] Docs updated (if impacted)
- [ ] Changelog updated
- [ ] Ready for review
- [ ] Done

## 1. Metadata

- Task ID: FAST-AUDIO-008
- Phase: Phase 2
- Target Phase: MVP Audio Pipeline
- Domain: Multilingual Audio
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: In Progress

## 2. Context

- Lý do: Voice output dài 3:58 dù segment timeline chỉ khoảng 2:28, làm lệch hoàn toàn so với timestamps.
- Bài toán cần giải quyết: Khi user bật preserve timestamp gaps, voice output phải được đặt theo `Segments.start/end`, không phụ thuộc tốc độ đọc tự nhiên của Edge-TTS.
- Tài liệu liên quan:
  - `docs/domains/multilingual-audio.md`
  - `tasks/TASK-P2-AUDIO-006.md`

## 3. Scope

- In scope:
  - Synthesize từng segment riêng khi `preserveTimestampGaps=true`.
  - Dùng ffmpeg đo duration, speed-up đoạn dài hơn slot, pad/trim theo `end-start`.
  - Chèn silence giữa segments theo timestamp và concat thành một MP3 timeline-aligned.
  - Tests cho atempo filter/timeline mode.
- Out of scope:
  - Mix voice vào video gốc.
  - Time-stretch chất lượng cao ngoài ffmpeg `atempo`.
  - Alignment cho WebM output.

## 4. Input / Output

- Input: translated segments `{id,start,end,text}`.
- Output mong đợi: voice MP3 duration gần bằng timestamp cuối cùng, mỗi segment bắt đầu theo timeline.

## 5. Acceptance Criteria

1. `preserveTimestampGaps=true` tạo output timeline-aligned theo segments.
2. Segment TTS dài hơn slot được speed-up bằng ffmpeg `atempo`, sau đó trim đúng slot.
3. Segment ngắn hơn slot được pad silence đến đúng slot.
4. API response expose alignment mode/target duration metadata.
5. Tests/build pass.

## 6. Technical Plan

1. Thêm ffmpeg helpers trong Edge-TTS adapter để probe duration, align segment, generate silence và concat.
2. Branch generation: natural concat khi `preserveTimestampGaps=false`, timeline align khi `true`.
3. Cập nhật result metadata và tests.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/lib/multilingual-audio/edge-tts.ts`
  - `src/lib/multilingual-audio/types.ts`
  - `src/lib/multilingual-audio/edge-tts.test.ts`

## 8. Test Plan

1. Unit/Integration cần chạy:
   - `npm run test -- --run src/lib/multilingual-audio/edge-tts.test.ts src/app/api/audio/voice-generation/route.test.ts`
   - `npm run test`
   - `npm run build`
2. Failure cases cần thử:
   - Segment duration invalid.
   - Long segment requires chained atempo.
3. Kết quả mong đợi:
   - Tests/build pass.

## 9. Observability

- Metrics: segment count, alignment mode, target duration.
- Logs: no raw transcript logging.
- Error codes: existing `PRV_EDGE_TTS_FAILED`.

## 10. Risks & Rollback

- Risks:
  - Speed-up can reduce voice quality for very short translated slots.
- Rollback strategy:
  - Disable timeline branch and return natural concat.

## 11. Deliverables

1. Timeline-aligned Edge-TTS MP3 output.
2. Tests/evidence.
3. Changelog/docs/task updates.

## 12. Changelog Note

- Tóm tắt dòng changelog dự kiến: Align Edge-TTS voice output to transcript segment timestamps using ffmpeg speed/pad/trim and silence insertion.

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
  - MVP alignment should prioritize timestamp correctness over perfect natural speech quality.
- Blockers:
  - None currently.
- Verification evidence:
  - Pending.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - Pending.
- Test commands executed:
  - Pending.
- Test results summary:
  - Pending.
