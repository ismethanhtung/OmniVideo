# FAST-AUDIO-038 Repair Suspicious Word Timestamp Voice Timing

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

- Task ID: FAST-AUDIO-038
- Phase: Phase 2
- Target Phase: P2
- Domain: Audio Transcript
- Task Type: Bugfix
- Priority: P0
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: Groq/Whisper có thể trả về word timestamp bất thường, ví dụ một chữ `这` kéo dài `01:00 -> 01:20`, làm voice bắt đầu quá sớm so với thoại thật.
- Bài toán cần giải quyết: voice timing không được tin mù quáng vào word timestamp kéo dài bất thường hoặc segment rất ngắn nhưng duration quá dài.
- Tài liệu liên quan: `docs/governance/testing-rules.md`

## 3. Scope

- In scope: detect suspicious word timing during voice segment construction, repair TTS segment start/end conservatively, expose diagnostics in Audio Transcript UI, add regression tests.
- Out of scope: adding a native VAD/forced-alignment dependency or changing Groq transcription request contract.

## 4. Input / Output

- Input: translated segments and Groq word timestamps.
- Output mong đợi: generated voice segments avoid impossible early starts caused by long hallucinated word timestamps, with visible repair warnings.

## 5. Acceptance Criteria

1. A short segment with a suspiciously long first word no longer schedules voice at the word's bad early start.
2. Repaired voice segments keep source segment identity and remain within the original segment window.
3. Audio Transcript UI can show timing repair diagnostics after voice generation.
4. Regression tests cover the reported long-word timestamp case.

## 6. Technical Plan

1. Extend word-aware voice segment timing with suspicious word detection and repair diagnostics.
2. Use repaired timing when calling voice generation and keep diagnostics in component state.
3. Render repair warnings near affected segments and add unit/source tests.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: Audio Transcript voice timing and panel diagnostics.

## 8. Test Plan

1. Unit test: `src/lib/multilingual-audio/voice-segment-timing.test.ts`.
2. Source UI test: `src/features/audio/chinese-transcription-panel.test.ts`.
3. Build + version guard.

## 9. Observability

- Metrics: none.
- Logs: none.
- UI diagnostics: timing repair warnings shown per segment.

## 10. Risks & Rollback

- Risks: heuristic repair cannot be as perfect as forced alignment/VAD, but should prevent severe early-start failures.
- Rollback strategy: revert timing repair helper and UI diagnostic state.

## 11. Deliverables

1. Suspicious timestamp repair in voice timing.
2. UI diagnostics for repaired segments.
3. Tests, version bump, changelog, task evidence.

## 12. Changelog Note

- Repair suspicious Groq word timestamps before generating voice so short segments are not scheduled far before real speech.

## 13. Task Type Checklist (Stamp [x])

### 13.2 Bugfix

- [x] Có mô tả cách tái hiện lỗi
- [x] Có root cause ngắn gọn
- [x] Có regression test
- [x] Có xác nhận lỗi cũ không tái diễn

## 14. Execution Notes

- Assumptions: no reliable VAD dependency is currently present, so this task adds a conservative timing repair layer at voice segment construction.
- Blockers: None.
- Verification evidence:
  - `buildWordAwareVoiceSegmentsWithDiagnostics` ignores suspiciously long word timestamps and anchors affected voice segments to reliable words where possible.
  - When all words for a segment are suspicious, timing is estimated near the segment end rather than scheduling voice at a bad early timestamp.
  - Audio Transcript stores and renders per-segment timing repair diagnostics after voice generation.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated: `src/lib/multilingual-audio/voice-segment-timing.test.ts`, `src/features/audio/chinese-transcription-panel.test.ts`
- Test commands executed: `npm run test -- --run src/lib/multilingual-audio/voice-segment-timing.test.ts src/features/audio/chinese-transcription-panel.test.ts`; `npm run build`; `npm run guard:version`; `git diff --check`
- Test results summary: targeted tests passed (2 files / 11 tests); production build passed with existing Turbopack warning outside scope; diff whitespace check passed.
- Version guard command/result (if runtime changed): `npm run guard:version` passed after patch bump to `0.4.18`.
