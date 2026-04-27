# FAST-AUDIO-004 Add Audio Transcript Step Trace and Generic Naming

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

- Task ID: FAST-AUDIO-004
- Phase: P2
- Target Phase: P2
- Domain: Multilingual Audio
- Task Type: Bugfix
- Priority: P0
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: User gặp `PRV_GROQ_TRANSCRIPTION_FAILED: Request Entity Too Large` và cần thấy từng bước đã hoàn thành tới đâu, đặc biệt audio sau extract nặng bao nhiêu. User cũng phản hồi tên `Chinese Transcript` quá hẹp.
- Bài toán cần giải quyết: UI/API phải expose step trace và đổi naming sang generic Audio Transcript.
- Tài liệu liên quan:
  - `docs/domains/multilingual-audio.md`
  - `tasks/TASK-P2-AUDIO-001.md`

## 3. Scope

- In scope:
  - Rename visible page/navigation copy to Audio Transcript.
  - Add API step trace for validate/extract/size-check/Groq stages.
  - Show step status + result details in UI for both success and failure.
  - Use compressed MP3 mono 16k payload for Groq to reduce Request Entity Too Large risk.
- Out of scope:
  - Audio chunking across multiple Groq requests.
  - Translation/TTS.

## 4. Input / Output

- Input: uploaded video/audio, language hint, prompt, timestamp options.
- Output mong đợi: transcript or error with step trace including extracted audio size.

## 5. Acceptance Criteria

1. UI no longer shows `Chinese Transcript` as feature name.
2. API success response includes ordered step trace with source file size and extracted audio size.
3. API error response includes step trace completed before failure.
4. Extracted audio sent to Groq is compressed MP3 mono 16k.
5. Tests cover trace on success/failure mapping and MP3 ffmpeg args.

## 6. Technical Plan

1. Extend transcription result/error payload types with `steps`.
2. Track steps in `runChineseVideoTranscription`.
3. Switch extraction format metadata from FLAC to MP3 64k mono 16k.
4. Render pipeline steps in UI.
5. Update tests/changelog/task evidence.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/lib/multilingual-audio/*`
  - `src/app/api/audio/chinese-transcription/route.ts`
  - `src/features/audio/chinese-transcription-panel.tsx`
  - `src/components/layout/navigation.ts`

## 8. Test Plan

1. Unit/Integration cần chạy:
   - `npm run test -- --run src/lib/multilingual-audio/audio-extraction.test.ts src/lib/multilingual-audio/chinese-transcription.test.ts src/lib/multilingual-audio/groq-transcription.test.ts src/components/layout/navigation.test.ts`
2. Failure cases cần thử:
   - Error carries steps.
   - MP3 file metadata sent to Groq.
3. Kết quả mong đợi:
   - Targeted tests pass, build pass, full test pass.

## 9. Observability

- Metrics: none.
- Logs: none.
- Error codes: existing codes preserved, error payload adds `steps`.

## 10. Risks & Rollback

- Risks:
  - Very long audio can still exceed Groq limits without chunking.
- Rollback strategy:
  - Revert UI trace/naming and extraction format changes.

## 11. Deliverables

1. Generic Audio Transcript UI.
2. Step trace response and UI display.
3. Compressed MP3 extraction.
4. Tests and docs/changelog.

## 12. Changelog Note

- Tóm tắt dòng changelog dự kiến: Add Audio Transcript step trace and compressed Groq audio payload.

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
  - `zh` remains default language hint but UI must not hard-code feature as Chinese-only.
- Blockers: none.
- Verification evidence:
  - `npm run test -- --run src/lib/multilingual-audio/audio-extraction.test.ts src/lib/multilingual-audio/chinese-transcription.test.ts src/lib/multilingual-audio/groq-transcription.test.ts src/components/layout/navigation.test.ts src/lib/workspace/workspace-graph.test.ts` pass (30 tests / 5 files).
  - `npm run build` pass. Existing warning remains: `src/features/workspace/display-preferences-panel.tsx` unused `Image`.
  - `npm run test` pass (180 tests / 43 files).

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/multilingual-audio/audio-extraction.test.ts`
  - `src/lib/multilingual-audio/chinese-transcription.test.ts`
  - `src/lib/multilingual-audio/groq-transcription.test.ts`
  - `src/components/layout/navigation.test.ts`
  - `src/lib/workspace/workspace-graph.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/audio-extraction.test.ts src/lib/multilingual-audio/chinese-transcription.test.ts src/lib/multilingual-audio/groq-transcription.test.ts src/components/layout/navigation.test.ts src/lib/workspace/workspace-graph.test.ts`
  - `npm run build`
  - `npm run test`
- Test results summary:
  - Targeted tests pass: 30 tests / 5 files.
  - Full suite pass: 180 tests / 43 files.
  - Build pass with existing unused `Image` warning.
