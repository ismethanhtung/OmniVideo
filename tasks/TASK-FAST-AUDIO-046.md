# FAST-AUDIO-046 Harden Piper Voice Generation Against Empty-Phoneme Wave Header Failures

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Version guard passed (if runtime changed)
- [x] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [ ] Done

## 1. Metadata

- Task ID: FAST-AUDIO-046
- Phase: Phase 2
- Target Phase: P2
- Domain: Audio Transcript
- Task Type: Bugfix
- Priority: P0
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context

- Lý do: Audio Transcript `Generate Voice` đang fail với `PRV_PIPER_TTS_FAILED` và traceback `wave.Error: # channels not specified`.
- Bài toán cần giải quyết: harden luồng Piper local để không văng toàn bộ request khi gặp trường hợp empty phoneme/chunk.
- Tài liệu liên quan:
  - `docs/governance/testing-rules.md`
  - `docs/governance/ai-agent-rules.md`

## 3. Scope

- In scope:
  - Ưu tiên runtime Piper binary bundled local thay vì Python wrapper `.venv` mặc định.
  - Bổ sung guard xử lý chunk text không có speakable token để tránh gọi Piper vào case dễ lỗi.
  - Cập nhật unit tests cho nhánh fallback/guard.
- Out of scope:
  - Refactor lớn pipeline voice alignment.
  - Thay đổi UI Voice Generation controls.

## 4. Input / Output

- Input: translated transcript segments từ Audio Transcript.
- Output mong đợi: voice generation không fail với lỗi wave header trong case chunk không synthesize được; API trả audio bình thường hoặc fail có kiểm soát hơn.

## 5. Acceptance Criteria

1. Với cấu hình mặc định `binaryPath=piper`, runtime ưu tiên binary local bundled nếu tồn tại.
2. Segment/chunk không có ký tự speakable không làm crash toàn bộ pipeline.
3. Existing voice generation tests pass và có test mới cover nhánh bugfix.

## 6. Technical Plan

1. Cập nhật binary resolution strategy trong `piper-tts.ts`.
2. Thêm helper detect speakable content + xử lý silence fallback cho segment rỗng chunk.
3. Cập nhật tests + chạy verification + changelog/version guard.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- If Yes, module impacted:
  - `src/lib/multilingual-audio/piper-tts.ts`
  - `src/lib/multilingual-audio/piper-tts.test.ts`

## 8. Test Plan

1. Unit tests: `piper-tts.test.ts` (binary preference + empty chunk fallback).
2. Regression tests: existing route/voice tests impacted by helper behavior.
3. Expected: no regression existing assertions; new assertions pass.

## 9. Observability

- Metrics: none.
- Logs: keep existing error surface.
- Error codes: keep `PRV_PIPER_TTS_FAILED`.

## 10. Risks & Rollback

- Risks: môi trường không có bundled binary sẽ fallback `.venv` như cũ.
- Rollback strategy: revert `piper-tts` changes and restore prior binary resolution.

## 11. Deliverables

1. Hardened Piper runtime flow.
2. Updated tests and evidence.

## 12. Changelog Note

- Harden Audio Transcript Piper generation to avoid `wave.Error # channels not specified` crashes on weak/edge text chunks.

## 13. Task Type Checklist (Stamp [x])

### 13.2 Bugfix

- [x] Có mô tả cách tái hiện lỗi
- [x] Có root cause ngắn gọn
- [x] Có regression test
- [x] Có xác nhận lỗi cũ không tái diễn

## 14. Execution Notes

- Assumptions:
  - Lỗi liên quan trực tiếp tới `piper-tts` Python wrapper >=1.4.x hoặc empty-phoneme chunk behavior.
- Blockers: None.
- Verification evidence:
  - Root cause confirmed in local runtime: `.venv` currently uses `piper-tts 1.4.2`, which can raise `wave.Error: # channels not specified` on empty-phoneme inputs.
  - `resolvePiperBinaryPath("piper")` now prefers bundled native binary `piper/piper` over `.venv/bin/piper`.
  - Follow-up hardening: bundled `piper/piper` is now selected only when required dylibs are present; otherwise it auto-falls back to `.venv/bin/piper`.
  - `splitTextForPiperSynthesis` now filters punctuation-only chunks with no speakable token.
  - `synthesizeSegmentFiles` now creates a short silence WAV when a segment has no speakable chunk, instead of crashing voice generation.
  - Added/updated tests to cover binary preference and punctuation-only segment behavior.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/multilingual-audio/piper-tts.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/piper-tts.test.ts src/app/api/audio/voice-generation/route.test.ts`
  - `npm run build`
  - `npm run guard:version`
- Test results summary:
  - Voice generation related tests passed (2 files / 24 tests).
  - Build passed (existing Turbopack warning outside scope remains).
- Version guard command/result (if runtime changed):
  - `npm run guard:version` passed after version/lockfile/changelog update.
