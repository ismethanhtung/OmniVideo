# FAST-AUDIO-034 Enforce 1.3x Minimum Speech Tempo

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

- Task ID: FAST-AUDIO-034
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

- Lý do: User reports generated voice can still feel slow even though min speed is configured as `1.3x`.
- Bài toán cần giải quyết: current min speed only applies when raw speech exceeds the timeline slot; speech that already fits can remain `1.0x` and then get padded with silence.
- Tài liệu liên quan: `docs/domains/multilingual-audio.md`, `docs/governance/testing-rules.md`

## 3. Scope

- In scope: enforce `1.3x` tempo for every valid timeline speech chunk, update tests and release evidence.
- Out of scope: changing translation text, TTS model, or non-timeline natural concatenation mode.

## 4. Input / Output

- Input: Piper raw segment audio and timeline slots.
- Output mong đợi: aligned speech chunks use at least `atempo=1.3` even when raw audio already fits the slot.

## 5. Acceptance Criteria

1. Strict timeline chunks with raw duration shorter than slot still use `speedFactor=1.3`.
2. Balanced timeline chunks with raw duration shorter than slot still use `speedFactor=1.3`.
3. Existing max speed clamp remains `1.75`.
4. Tests cover short-raw/long-slot cases.

## 6. Technical Plan

1. Update speed clamp semantics to enforce min tempo for positive speed factors.
2. Apply min tempo in strict and balanced alignment calculations.
3. Update affected tests, changelog, board, version, and run verification.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/lib/multilingual-audio/piper-tts.ts`

## 8. Test Plan

1. Unit tests: `src/lib/multilingual-audio/piper-tts.test.ts`.
2. Integration-adjacent targeted tests: Audio Transcript panel/voice route smoke tests.
3. Build + version guard.

## 9. Observability

- Metrics: existing timeline speed diagnostics.
- Logs: unchanged.
- Error codes: unchanged.

## 10. Risks & Rollback

- Risks: faster speech may create more silence inside loose slots, but that matches the requested minimum speaking tempo.
- Rollback strategy: restore clamp behavior to allow `1.0x` when raw speech fits.

## 11. Deliverables

1. True `1.3x` minimum speech tempo.
2. Regression tests.
3. Changelog/version/task evidence.

## 12. Changelog Note

- Enforce `1.3x` as the actual minimum speech tempo, not only a display/compression floor.

## 13. Task Type Checklist (Stamp [x])

### 13.2 Bugfix

- [x] Có mô tả cách tái hiện lỗi
- [x] Có root cause ngắn gọn
- [x] Có regression test
- [x] Có xác nhận lỗi cũ không tái diễn

## 14. Execution Notes

- Assumptions: timeline-aligned generated speech should speak at least `1.3x` while preserving absolute placement with silence padding as needed.
- Blockers: None.
- Verification evidence:
  - Root cause: min speed floor was only applied when raw speech exceeded the timeline slot; speech that already fit could remain `1.0x`.
  - Updated timeline speed clamp so positive speech chunks floor to `1.3x`.
  - Updated balanced alignment so short raw chunks also get `1.3x` before silence/pause placement.
  - Targeted tests, build, and version guard pass.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/multilingual-audio/piper-tts.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/piper-tts.test.ts src/features/audio/chinese-transcription-panel.test.ts src/app/api/audio/voice-generation/route.test.ts`
  - `npm run build`
  - `npm run guard:version`
- Test results summary:
  - Targeted tests pass (3 files / 25 tests).
  - Build pass with existing Turbopack warning outside scope in `src/app/api/video-processing/edit/route.ts`.
- Version guard command/result (if runtime changed): `npm run guard:version` pass.
