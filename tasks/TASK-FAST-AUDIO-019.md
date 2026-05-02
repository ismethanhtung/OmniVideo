# FAST-AUDIO-019 Smooth Piper Dubbing Speech Rate

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [ ] Done

## 1. Metadata

- Task ID: FAST-AUDIO-019
- Phase: Phase 2
- Target Phase: MVP Audio Pipeline
- Domain: Multilingual Audio
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context

- Lý do: Piper dubbed audio đã khớp timestamp nhưng nghe không tự nhiên vì từng segment bị ép riêng vào `start/end`, làm đoạn dài bị nói nhanh và đoạn ngắn có cảm giác chậm.
- Bài toán cần giải quyết: Giữ timeline alignment nhưng giảm dao động tốc độ đọc giữa các segment và expose diagnostics để biết segment nào còn vượt ngưỡng.
- Tài liệu liên quan:
  - `docs/domains/multilingual-audio.md`
  - `docs/architecture/node-architecture.md`
  - `tasks/TASK-FAST-AUDIO-013.md`

## 3. Scope

- In scope:
  - Cải thiện thuật toán timeline alignment của Piper voice generation.
  - Cho phép segment dài mượn một phần gap sau segment trước khi tăng tempo.
  - Giảm sentence silence nhân tạo khi synthesize từng segment ở timeline mode.
  - Thêm alignment diagnostics/warnings vào response metadata.
  - Hiển thị diagnostics trên Audio Transcript sau khi sinh voice.
  - Đánh số segment trong Audio Transcript và điều chỉnh prompt dịch theo segment duration, không ép số chữ bằng nguồn.
  - Hiển thị nhóm segment `slow` trong diagnostics.
  - Persist `videoMetadata` qua reload và cho phép chỉnh sửa metadata trước khi lưu asset.
  - Đổi default alignment sang balanced timing để giảm pause/speed-up giả tạo.
  - Cập nhật tests/docs/changelog.
- Out of scope:
  - Thay provider TTS.
  - Duration-aware LLM rewrite/translation.
  - Lip-sync model hoặc source-separation.

## 4. Input / Output

- Input: translated segments `{id,start,end,text}` và Piper settings.
- Output mong đợi: WAV balanced-aligned có speed factor ít cực đoan hơn, ít silence nội bộ hơn, kèm metrics cho từng segment.

## 5. Acceptance Criteria

1. Balanced mode không còn ép segment về đúng `end-start` bằng pad/speed-up cực đoan.
2. Balanced mode giảm sentence silence dùng cho từng segment để tránh làm raw TTS dài giả tạo.
3. API result có diagnostics gồm raw duration, slot duration, target duration, speed factor và borrowed gap per segment.
4. Segment cần tempo cao vẫn được đánh dấu warning để người dùng/flow biết cần rewrite sau này.
5. Regression tests cho gap borrowing, bounded diagnostics và existing Piper route pass.

## 6. Technical Plan

1. Tách helper tính alignment plan từ raw duration + segment timing.
2. Cập nhật Piper segment synthesis/alignment để dùng balanced scheduling và trả diagnostics.
3. Cập nhật types/tests/docs/changelog/task evidence.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/lib/multilingual-audio/piper-tts.ts`
  - `src/lib/multilingual-audio/types.ts`
  - `src/lib/multilingual-audio/transcript-translation.ts`
  - `src/lib/multilingual-audio/transcript-translation.test.ts`
  - `src/lib/multilingual-audio/transcript-session.ts`
  - `src/lib/multilingual-audio/transcript-session.test.ts`
  - `src/lib/multilingual-audio/piper-tts.test.ts`
  - `src/features/audio/chinese-transcription-panel.tsx`
  - `docs/domains/multilingual-audio.md`

## 8. Test Plan

1. Unit/Integration cần chạy:
   - `npm run test -- --run src/lib/multilingual-audio/piper-tts.test.ts src/app/api/audio/voice-generation/route.test.ts`
   - `npm run build`
2. Failure cases cần thử:
   - Segment dài hơn slot nhưng có gap sau để mượn.
   - Segment vẫn cần speed factor cao sau khi mượn gap.
3. Kết quả mong đợi:
   - Tests/build pass hoặc ghi rõ warning ngoài scope.

## 9. Observability

- Metrics: raw duration, slot duration, target duration, speed factor, borrowed gap, warning codes.
- Logs: không log raw transcript.
- Error codes: dùng existing `PRV_PIPER_TTS_FAILED`.

## 10. Risks & Rollback

- Risks:
  - Mượn gap sau segment có thể làm voice kéo dài gần segment kế tiếp nếu transcript quá dày.
  - Một số segment vẫn cần duration-aware rewrite mới đạt tự nhiên hoàn toàn.
- Rollback strategy:
  - Revert alignment helper và quay lại strict `end-start` timeline mode.

## 11. Deliverables

1. Smoothed Piper timeline alignment.
2. Alignment diagnostics metadata.
3. Audio Transcript diagnostics UI.
4. Duration-aware translation prompt.
5. Tests/evidence/docs/changelog.

## 12. Changelog Note

- Tóm tắt dòng changelog dự kiến: Smooth Piper timeline voice alignment by borrowing safe gaps and exposing per-segment speed diagnostics.

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
  - MVP ưu tiên giảm dao động speed trong giới hạn timeline hiện có; duration-aware rewrite sẽ là follow-up nếu diagnostics còn cảnh báo nhiều.
- Blockers:
  - None currently.
- Verification evidence:
  - `npm run test -- --run src/lib/multilingual-audio/piper-tts.test.ts src/app/api/audio/voice-generation/route.test.ts src/lib/multilingual-audio/transcript-session.test.ts src/lib/multilingual-audio/transcript-translation.test.ts src/app/api/audio/transcript-translation/route.test.ts` pass (27 tests / 5 files).
  - `npm run build` pass with existing warnings outside task scope: unused `Share2`, unused `loading`, unused `FileAudio`, missing `selectedProviderId` hook dependency, unused `Image`.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/multilingual-audio/piper-tts.test.ts`
  - `src/lib/multilingual-audio/transcript-translation.test.ts`
  - `src/lib/multilingual-audio/transcript-session.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/piper-tts.test.ts src/app/api/audio/voice-generation/route.test.ts src/lib/multilingual-audio/transcript-session.test.ts src/lib/multilingual-audio/transcript-translation.test.ts src/app/api/audio/transcript-translation/route.test.ts`
  - `npm run build`
- Test results summary:
  - Targeted session/Piper/voice generation/translation tests pass (27 tests / 5 files).
  - Production build pass; warnings are existing/outside scope and do not fail build.
