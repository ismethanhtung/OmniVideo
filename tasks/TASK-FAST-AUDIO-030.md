# FAST-AUDIO-030 Raise Voice Speed Floor and TTS Translation Normalization

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

- Task ID: FAST-AUDIO-030
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

- Lý do: Audio Transcript voice generation needs a higher minimum speed floor and Vietnamese TTS-friendly translated text.
- Bài toán cần giải quyết: raise timeline minimum speed from `1.1x` to `1.25x` and normalize translation output for phrases/measurements that Piper may read poorly.
- Tài liệu liên quan: `docs/domains/multilingual-audio.md`, `docs/governance/testing-rules.md`

## 3. Scope

- In scope: Piper speed floor, UI display floor, Vietnamese TTS translation prompt + deterministic text normalization, tests, changelog/version.
- Out of scope: changing TTS engine/model; full Vietnamese text verbalizer for every possible abbreviation.

## 4. Input / Output

- Input: translated transcript segments and voice generation timeline settings.
- Output mong đợi: generated voice uses at least `1.25x` when acceleration is required, and translated text is friendlier to Vietnamese TTS.

## 5. Acceptance Criteria

1. Timeline speed floor is `1.25x` for accelerated chunks.
2. Audio Transcript UI speed label floor displays `1.25x`.
3. Translation prompt instructs TTS-friendly spelling for foreign terms and measurements.
4. Translation normalization converts examples like `wasabi` and `50cm` into TTS-friendlier text.
5. Regression tests cover the speed floor and normalization behavior.

## 6. Technical Plan

1. Update Piper alignment settings and UI speed formatting floor from `1.1` to `1.25`.
2. Add Vietnamese TTS text normalization to translation payload normalization.
3. Update translation prompt/tests and run targeted verification/build/version guard.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: multilingual audio translation, Piper TTS settings, Audio Transcript UI.

## 8. Test Plan

1. Unit/Integration cần chạy: `piper-tts.test.ts`, `transcript-translation.test.ts`, Audio Transcript panel test.
2. Failure cases cần thử: measurement abbreviation and foreign loanword normalization.
3. Kết quả mong đợi: tests pass and version guard passes.

## 9. Observability

- Metrics: existing voice speed diagnostics.
- Logs: existing translation/Piper provider errors.
- Error codes: unchanged.

## 10. Risks & Rollback

- Risks: deterministic replacements may not cover every abbreviation; narrow patterns reduce accidental rewrites.
- Rollback strategy: revert normalization helper and speed floor constants.

## 11. Deliverables

1. Speed floor update.
2. Translation/TTS normalization.
3. Test/changelog/task evidence.

## 12. Changelog Note

- Raise Audio Transcript voice speed floor to `1.25x` and normalize translated text for Vietnamese TTS pronunciation.

## 13. Task Type Checklist (Stamp [x])

### 13.2 Bugfix

- [x] Có mô tả cách tái hiện lỗi
- [x] Có root cause ngắn gọn
- [x] Có regression test
- [x] Có xác nhận lỗi cũ không tái diễn

## 14. Execution Notes

- Assumptions: deterministic normalization should stay conservative and target common TTS problem patterns.
- Blockers: None.
- Verification evidence:
  - Raised `timelineMinSpeedFactor` to `1.25` and matched Audio Transcript `Voice speed` display floor.
  - Added deterministic Vietnamese TTS text normalization for `wasabi`, compact metric units, and percent values.
  - Translation prompt now explicitly asks for phonetic foreign terms and spoken measurement units.
  - Targeted tests pass for Piper speed floor, translation normalization, and Audio Transcript panel expectations.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/multilingual-audio/piper-tts.test.ts`
  - `src/lib/multilingual-audio/transcript-translation.test.ts`
  - `src/features/audio/chinese-transcription-panel.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/piper-tts.test.ts src/lib/multilingual-audio/transcript-translation.test.ts src/features/audio/chinese-transcription-panel.test.ts`
  - `npm run build`
  - `npm run guard:version`
- Test results summary:
  - Targeted tests pass (3 files / 31 tests).
  - Build pass with existing Turbopack warning outside scope in `src/app/api/video-processing/edit/route.ts`.
- Version guard command/result (if runtime changed): `npm run guard:version` pass.
