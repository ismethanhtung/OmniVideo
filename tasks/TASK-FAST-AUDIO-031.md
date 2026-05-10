# FAST-AUDIO-031 Harden Groq Timestamp Bounds by Audio Duration

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Version guard passed (if runtime changed)
- [x] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [x] Done

## 1. Metadata

- Task ID: FAST-AUDIO-031
- Phase: Phase 2
- Target Phase: P2
- Domain: Audio Transcript
- Task Type: Bugfix
- Priority: P0
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: Groq can return impossible timestamps that extend beyond the real media duration, e.g. a `03:47.670 -> 04:17.650` segment for a `03:49` video.
- Bài toán cần giải quyết: downstream translation and voice generation must never trust provider timestamps beyond actual extracted audio duration.
- Tài liệu liên quan: `docs/domains/multilingual-audio.md`, `docs/governance/testing-rules.md`

## 3. Scope

- In scope: measure extracted audio duration, clamp/drop Groq segment and word timestamps to that duration, expose duration in result metadata, add tests.
- Out of scope: forced alignment, VAD integration, changing transcription provider.

## 4. Input / Output

- Input: source video/audio, Groq verbose JSON with segment/word timestamps.
- Output mong đợi: normalized transcript never contains timestamps beyond actual extracted audio duration.

## 5. Acceptance Criteria

1. Audio extraction records a finite extracted audio duration when ffmpeg can probe it.
2. Groq segments ending beyond audio duration are clamped to audio duration.
3. Groq words starting beyond audio duration are dropped; words ending beyond duration are clamped.
4. Transcription result includes audio duration for diagnostics.
5. Regression tests cover the `谢谢大家` style impossible timestamp case.

## 6. Technical Plan

1. Add extracted audio duration probing after ffmpeg audio extraction.
2. Pass audio duration into Groq normalization and sanitize segment/word timestamps.
3. Update tests, changelog, board, and version.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: multilingual audio extraction/transcription types and tests.

## 8. Test Plan

1. Unit/Integration cần chạy: audio extraction, Groq transcription, Chinese transcription, Audio Transcript related tests.
2. Failure cases cần thử: impossible word/segment timestamps beyond source duration.
3. Kết quả mong đợi: invalid timestamps are clamped/dropped and tests pass.

## 9. Observability

- Metrics: transcription step metrics include audio duration.
- Logs: existing provider errors unchanged.
- Error codes: unchanged.

## 10. Risks & Rollback

- Risks: ffmpeg duration probe can fail for malformed output; fallback keeps duration undefined and preserves prior behavior.
- Rollback strategy: stop passing duration into Groq normalization.

## 11. Deliverables

1. Timestamp hardening.
2. Duration diagnostics.
3. Regression tests.

## 12. Changelog Note

- Clamp Groq transcript timestamps to extracted audio duration to prevent impossible final segments from stretching voice generation.

## 13. Task Type Checklist (Stamp [x])

### 13.2 Bugfix

- [x] Có mô tả cách tái hiện lỗi
- [x] Có root cause ngắn gọn
- [x] Có regression test
- [x] Có xác nhận lỗi cũ không tái diễn

## 14. Execution Notes

- Assumptions: extracted MP3 duration is the authoritative bound for Groq transcript timestamps.
- Blockers: None.
- Verification evidence:
  - Added ffmpeg duration probing for extracted speech-ready MP3.
  - Passed extracted audio duration into Groq transcription normalization.
  - Added regression coverage for `谢谢大家` where segment/word timestamps extend beyond source duration.
  - Targeted tests and build pass.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/multilingual-audio/audio-extraction.test.ts`
  - `src/lib/multilingual-audio/groq-transcription.test.ts`
  - `src/lib/multilingual-audio/chinese-transcription.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/audio-extraction.test.ts src/lib/multilingual-audio/groq-transcription.test.ts src/lib/multilingual-audio/chinese-transcription.test.ts src/lib/multilingual-audio/voice-segment-timing.test.ts`
  - `npm run test -- --run src/lib/multilingual-audio/audio-extraction.test.ts src/lib/multilingual-audio/groq-transcription.test.ts src/lib/multilingual-audio/chinese-transcription.test.ts src/features/audio/chinese-transcription-panel.test.ts src/lib/multilingual-audio/voice-segment-timing.test.ts src/lib/multilingual-audio/piper-tts.test.ts`
  - `npm run build`
  - `npm run guard:version`
- Test results summary:
  - Timestamp hardening tests pass (4 files / 13 tests).
  - Wider targeted audio tests pass (6 files / 34 tests).
  - Build pass with existing Turbopack warning outside scope in `src/app/api/video-processing/edit/route.ts`.
- Version guard command/result (if runtime changed): `npm run guard:version` pass.
