# P2-AUDIO-001 Chinese Voice Extraction and Groq Transcription MVP

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

- Task ID: P2-AUDIO-001
- Phase: P2
- Target Phase: P2
- Domain: Multilingual Audio / Workspace
- Task Type: Feature
- Priority: P0
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: Cần bước đầu cho workflow video tiếng Trung sang tiếng Việt: lấy voice/audio từ video và transcript tiếng Trung có timestamp để các bước dịch/lồng tiếng sau dùng lại.
- Bài toán cần giải quyết: Upload video, chuẩn hóa audio cho ASR, gọi Groq Whisper Large v3 Turbo, trả text + segment/word timestamps trong UI chi tiết và từ Workspace node.
- Tài liệu liên quan:
  - `docs/SYSTEM-SUMMARY.md`
  - `docs/governance/ai-agent-rules.md`
  - `docs/governance/testing-rules.md`
  - `docs/domains/multilingual-audio.md`
  - `docs/domains/video-pipeline.md`
  - `docs/architecture/node-architecture.md`
  - Groq Speech-to-Text docs, verified 2026-04-27

## 3. Scope

- In scope:
  - API nhận video upload, validate input, extract audio speech-ready bằng `ffmpeg`.
  - Gọi Groq `whisper-large-v3-turbo` transcription với `verbose_json` và timestamp granularities.
  - Chuẩn hóa transcript thành text, segments, words, provider metadata.
  - Trang chi tiết mới cho Chinese Voice Transcript.
  - Workspace node mới dùng cùng API từ `source.file`.
  - Tests cho validation, Groq response mapping, Workspace plan.
- Out of scope:
  - Dịch sang tiếng Việt.
  - TTS/voice clone/lồng tiếng bằng Kling AI.
  - Source separation nhạc nền/voice thật sự bằng model chuyên dụng. MVP chỉ extract audio track chuẩn hóa cho ASR; music-bed separation sẽ là task riêng.
  - Persist transcript vào MongoDB.

## 4. Input / Output

- Input: video file local, optional prompt/language/timestamp granularity.
- Output mong đợi: transcript tiếng Trung, segment timestamps, optional word timestamps, metadata file audio chuẩn hóa tạm thời trong request lifecycle.

## 5. Acceptance Criteria

1. API `POST /api/audio/chinese-transcription` reject thiếu file, file không phải video/audio, hoặc thiếu `GROQ_API_KEY` với error code rõ ràng.
2. API extract audio bằng `ffmpeg` sang WAV mono 16k trước khi gọi Groq.
3. API gọi Groq model `whisper-large-v3-turbo`, `response_format=verbose_json`, `language=zh`, và trả text + timestamps chuẩn hóa.
4. Trang mới cho phép upload video, chọn word timestamps, nhập prompt, chạy transcription và xem transcript/segments/words.
5. Workspace có node audio transcription chạy được từ `source.file` qua same API và hiển thị kết quả trong run status.
6. Có tests mới/cập nhật cho happy path và failure path chính.

## 6. Technical Plan

1. Thêm domain module `src/lib/multilingual-audio/*` cho validation, ffmpeg extraction orchestration, Groq request/mapping.
2. Thêm API route App Router cho transcription upload.
3. Thêm UI panel chi tiết, navigation/content router entry.
4. Thêm Workspace node template, flow planning step, runtime config và runner branch.
5. Cập nhật docs/changelog/task evidence.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/lib/multilingual-audio/*`
  - `src/app/api/audio/chinese-transcription/route.ts`
  - `src/features/audio/chinese-transcription-panel.tsx`
  - `src/components/layout/*`
  - `src/lib/workspace/workspace-graph.ts`
  - `src/features/workspace/workspace-canvas-panel.tsx`

## 8. Test Plan

1. Unit/Integration cần chạy:
   - `npm run test -- --run src/lib/multilingual-audio/*.test.ts src/lib/workspace/workspace-graph.test.ts src/components/layout/navigation.test.ts`
2. Failure cases cần thử:
   - Missing API key.
   - Invalid/missing file.
   - Groq provider error mapping.
   - Workspace transcription node without upstream file.
3. Kết quả mong đợi:
   - Tests pass; API/Workspace logic trả lỗi đoán được thay vì throw raw.

## 9. Observability

- Metrics: none in MVP.
- Logs: server-side provider/extraction errors only through returned error code, không log secret.
- Error codes:
  - `VAL_AUDIO_FILE_REQUIRED`
  - `VAL_AUDIO_FILE_UNSUPPORTED`
  - `CFG_GROQ_API_KEY_MISSING`
  - `SYS_AUDIO_EXTRACTION_FAILED`
  - `PRV_GROQ_TRANSCRIPTION_FAILED`

## 10. Risks & Rollback

- Risks:
  - `ffmpeg-static` binary có thể không hỗ trợ một số runtime platform hiếm; fallback là cài `ffmpeg` vào PATH.
  - Video lớn có thể tốn memory vì App Router đọc file vào request memory.
  - Tách voice khỏi nhạc nền thật sự chưa giải quyết trong MVP.
  - `npm audit --omit=dev` báo vulnerability hiện hữu ở `next@15.5.2`/bundled `postcss`; fix đề xuất nâng Next ngoài dependency range hiện tại nên chưa thực hiện trong task audio.
- Rollback strategy:
  - Gỡ navigation/page/API/node mới; không ảnh hưởng pipeline intake/social hiện có.

## 11. Deliverables

1. API transcription.
2. Detailed transcription page.
3. Workspace node integration.
4. Tests and changelog.

## 12. Changelog Note

- Tóm tắt dòng changelog dự kiến: Thêm Chinese Voice Transcript MVP với ffmpeg audio extraction, Groq Whisper Large v3 Turbo transcription timestamps, UI chi tiết và Workspace node.

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
  - User will provide `GROQ_API_KEY` as environment variable.
  - `ffmpeg-static` bundled binary is available; extractor falls back to `ffmpeg` in PATH if needed.
  - `language=zh` is the default source language for this MVP.
- Blockers: none.
- Verification evidence:
  - `npm run test -- --run src/lib/multilingual-audio/validation.test.ts src/lib/multilingual-audio/audio-extraction.test.ts src/lib/multilingual-audio/groq-transcription.test.ts src/app/api/audio/chinese-transcription/route.test.ts src/lib/workspace/workspace-graph.test.ts src/components/layout/navigation.test.ts` pass (30 tests / 6 files).
  - `npm run build` pass. Existing warning remains: `src/features/workspace/display-preferences-panel.tsx` unused `Image`.
  - `npm run test` pass (173 tests / 42 files).
  - `./node_modules/ffmpeg-static/ffmpeg -version` pass; bundled ffmpeg binary resolves locally.
  - `npm audit --omit=dev` completed and reports 2 vulnerabilities from current Next/PostCSS dependency chain; no automatic fix applied because suggested fix upgrades Next outside the current range.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/multilingual-audio/validation.test.ts`
  - `src/lib/multilingual-audio/audio-extraction.test.ts`
  - `src/lib/multilingual-audio/groq-transcription.test.ts`
  - `src/app/api/audio/chinese-transcription/route.test.ts`
  - `src/lib/workspace/workspace-graph.test.ts`
  - `src/components/layout/navigation.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/validation.test.ts src/lib/multilingual-audio/audio-extraction.test.ts src/lib/multilingual-audio/groq-transcription.test.ts src/app/api/audio/chinese-transcription/route.test.ts src/lib/workspace/workspace-graph.test.ts src/components/layout/navigation.test.ts`
  - `npm run build`
  - `npm run test`
  - `./node_modules/ffmpeg-static/ffmpeg -version`
  - `npm audit --omit=dev`
- Test results summary:
  - Targeted tests pass: 30 tests / 6 files.
  - Full suite pass: 173 tests / 42 files.
  - Build pass with existing unused `Image` warning.
