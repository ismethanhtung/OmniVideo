# FAST-AUDIO-029 Fix Strict Voice Timeline Drift

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

- Task ID: FAST-AUDIO-029
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

- Lý do: Strict voice timeline displays word-aware timestamps, but generated Piper WAV can speak later than the displayed segment start.
- Bài toán cần giải quyết: Strict mode must place generated speech at absolute source timestamps instead of letting earlier chunks push later chunks forward.
- Tài liệu liên quan: `docs/domains/multilingual-audio.md`, `docs/governance/testing-rules.md`

## 3. Scope

- In scope: fix strict Piper timeline alignment for Audio Transcript voice generation; add regression tests; update changelog/version.
- Out of scope: adding external VAD dependency; changing Groq transcription behavior; changing balanced mode.

## 4. Input / Output

- Input: translated voice segments with word-aware start/end timestamps.
- Output mong đợi: generated voice chunks are placed on the absolute timeline at their source timestamps.

## 5. Acceptance Criteria

1. Strict voice generation does not serialize chunks in a way that delays later segment onsets.
2. Strict timeline metadata matches the physical placement strategy used for the generated WAV.
3. Final strict voice output is trimmed/padded to the target transcript duration.
4. Regression tests cover overlapping/overrunning chunks that previously caused cumulative delay.

## 6. Technical Plan

1. Replace strict concat timeline assembly with an ffmpeg filter graph that delays each aligned segment to its absolute timestamp.
2. Mix delayed chunks and trim the final output to the requested target duration.
3. Add unit tests for strict absolute placement and run targeted verification/build/version guard.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/lib/multilingual-audio/piper-tts.ts`

## 8. Test Plan

1. Unit/Integration cần chạy: `src/lib/multilingual-audio/piper-tts.test.ts`, voice generation API/panel targeted tests.
2. Failure cases cần thử: strict mode with earlier chunk extending near/over the next timestamp.
3. Kết quả mong đợi: tests pass and strict ffmpeg args use absolute delay/mix instead of serial concat.

## 9. Observability

- Metrics: existing alignment timeline diagnostics.
- Logs: existing Piper/ffmpeg provider errors.
- Error codes: existing `PRV_PIPER_TTS_FAILED`.

## 10. Risks & Rollback

- Risks: large transcripts create large ffmpeg filter graphs; this is acceptable for current MVP and only affects strict mode.
- Rollback strategy: revert strict assembly to concat mode if ffmpeg filter graph fails unexpectedly.

## 11. Deliverables

1. Strict timeline placement fix.
2. Regression test coverage.
3. Changelog/version/task evidence.

## 12. Changelog Note

- Fix strict Audio Transcript voice timeline drift by placing Piper chunks on absolute timestamps before mixing.

## 13. Task Type Checklist (Stamp [x])

### 13.2 Bugfix

- [x] Có mô tả cách tái hiện lỗi
- [x] Có root cause ngắn gọn
- [x] Có regression test
- [x] Có xác nhận lỗi cũ không tái diễn

## 14. Execution Notes

- Assumptions: Word-aware segment timestamps are already correct; issue is in generated voice assembly.
- Blockers: None.
- Verification evidence:
  - Root cause: strict mode concatenated aligned chunks serially, so any physical overrun/overlap from earlier chunks could push later speech later than the displayed absolute `Voice` timestamp.
  - Strict mode now delays each aligned chunk to its absolute timestamp with ffmpeg `adelay`, mixes chunks with `amix`, and trims/pads final output to target duration.
  - Added regression coverage for segment starts `16.600`, `18.800`, and `20.100` to assert final strict assembly uses absolute delays instead of serial concat.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/multilingual-audio/piper-tts.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/piper-tts.test.ts`
  - `npm run test -- --run src/lib/multilingual-audio/piper-tts.test.ts src/app/api/audio/voice-generation/route.test.ts src/features/audio/chinese-transcription-panel.test.ts src/lib/multilingual-audio/voice-segment-timing.test.ts`
  - `npm run build`
  - `npm run guard:version`
- Test results summary:
  - Targeted Piper tests pass (1 file / 17 tests).
  - Audio Transcript targeted tests pass (4 files / 26 tests).
  - Build pass with existing Turbopack warning outside scope in `src/app/api/video-processing/edit/route.ts`.
- Version guard command/result (if runtime changed): `npm run guard:version` pass.
