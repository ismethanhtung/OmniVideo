# FAST-AUDIO-002 Fix Groq Size Validation After Audio Extraction

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

- Task ID: FAST-AUDIO-002
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

- Lý do: User gặp `VAL_AUDIO_FILE_TOO_LARGE` khi upload video gốc >100MB dù pipeline phải extract audio trước rồi mới gọi Groq.
- Bài toán cần giải quyết: Giới hạn Groq STT phải áp lên audio payload gửi Groq, không áp lên source video upload.
- Tài liệu liên quan:
  - `docs/domains/multilingual-audio.md`
  - Groq Speech-to-Text docs, verified 2026-04-27: direct upload limit applies to file sent to STT endpoint; Groq recommends 16k mono FLAC for reducing large files.

## 3. Scope

- In scope:
  - Remove source video 100MB rejection.
  - Extract speech-ready FLAC mono 16k before Groq upload.
  - Validate extracted audio payload size before Groq call.
  - Add regression tests.
- Out of scope:
  - Chunking audio over Groq limit.
  - Persisting extracted audio/transcript.

## 4. Input / Output

- Input: video file, including source video larger than Groq direct upload limit.
- Output mong đợi: source video passes initial validation; only extracted audio size can trigger Groq-size error.

## 5. Acceptance Criteria

1. Source video/audio upload validation no longer rejects based on original file size.
2. Extractor outputs FLAC mono 16k and Groq upload sends `speech.flac`.
3. Groq size limit validation runs after extraction on extracted audio bytes.
4. Tests cover source video >100MB validation and extracted payload size rejection.

## 6. Technical Plan

1. Split upload type validation from Groq payload size validation.
2. Change ffmpeg args/output metadata from WAV to FLAC mono 16k.
3. Update Groq adapter file blob metadata.
4. Update tests, docs, changelog, task evidence.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/lib/multilingual-audio/*`
  - task/changelog/docs

## 8. Test Plan

1. Unit/Integration cần chạy:
   - `npm run test -- --run src/lib/multilingual-audio/validation.test.ts src/lib/multilingual-audio/audio-extraction.test.ts src/lib/multilingual-audio/groq-transcription.test.ts`
2. Failure cases cần thử:
   - Extracted audio payload over limit.
   - Unsupported file still rejected.
3. Kết quả mong đợi:
   - Regression tests pass; no source file size false reject.

## 9. Observability

- Metrics: none.
- Logs: none.
- Error codes: `VAL_AUDIO_FILE_TOO_LARGE` now means extracted audio payload is too large for Groq upload, not source video.

## 10. Risks & Rollback

- Risks:
  - Very long extracted audio can still exceed Groq upload limit; chunking remains future work.
- Rollback strategy:
  - Revert FLAC extraction and size validation changes.

## 11. Deliverables

1. Corrected validation flow.
2. Regression tests.
3. Docs/changelog/task update.

## 12. Changelog Note

- Tóm tắt dòng changelog dự kiến: Fix Groq transcription size validation to apply after audio extraction and switch preprocessing to 16k mono FLAC.

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
  - Direct Groq upload limit remains tier-dependent; MVP keeps 100MB default to match current dev-tier behavior.
- Blockers: none.
- Verification evidence:
  - `npm run test -- --run src/lib/multilingual-audio/validation.test.ts src/lib/multilingual-audio/audio-extraction.test.ts src/lib/multilingual-audio/groq-transcription.test.ts` pass (10 tests / 3 files).
  - `npm run build` pass. Existing warning remains: `src/features/workspace/display-preferences-panel.tsx` unused `Image`.
  - `npm run test` pass (175 tests / 42 files).

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/multilingual-audio/validation.test.ts`
  - `src/lib/multilingual-audio/audio-extraction.test.ts`
  - `src/lib/multilingual-audio/groq-transcription.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/validation.test.ts src/lib/multilingual-audio/audio-extraction.test.ts src/lib/multilingual-audio/groq-transcription.test.ts`
  - `npm run build`
  - `npm run test`
- Test results summary:
  - Targeted tests pass: 10 tests / 3 files.
  - Full suite pass: 175 tests / 42 files.
  - Build pass with existing unused `Image` warning.
