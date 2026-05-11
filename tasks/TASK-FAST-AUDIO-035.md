# FAST-AUDIO-035 Add Pro Audio Timeline Workbench

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

- Task ID: FAST-AUDIO-035
- Phase: Phase 2
- Target Phase: P2
- Domain: Audio Transcript
- Task Type: Feature
- Priority: P0
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: Audio Transcript currently shows only summary diagnostics after voice generation; user needs a CapCut-like timeline to inspect chunks, placement, speed, overlap, warnings, and playback position.
- Bài toán cần giải quyết: add a professional audio timeline workbench after voice generation so the operator can manage generated voice efficiently.
- Tài liệu liên quan: `docs/domains/multilingual-audio.md`, `docs/governance/testing-rules.md`

## 3. Scope

- In scope: timeline ruler, chunk lanes, playhead, zoom controls, status filters, overlap/warning/speed diagnostics, issue list, jump-to-segment behavior.
- Out of scope: waveform rendering from raw audio samples and destructive timeline editing.

## 4. Input / Output

- Input: `voiceResult.alignment.timeline` and audio preview current time.
- Output mong đợi: visual timeline of generated voice chunks with actionable diagnostics.

## 5. Acceptance Criteria

1. After voice generation, page shows a visual audio timeline with ruler and chunk blocks.
2. Each chunk exposes time range, segment id, speed, warnings, and overlap state.
3. User can filter timeline by all/warnings/overlap/fast/slow.
4. Playhead follows generated audio playback time.
5. Clicking a chunk jumps/highlights the corresponding transcript segment.
6. Tests verify key UI markers and data flow hooks exist.

## 6. Technical Plan

1. Add timeline state and derived diagnostics from `voiceTimelineDiagnostics`.
2. Render a full-width Audio Timeline Workbench inside the voice result panel.
3. Add source tests for markers and run targeted tests/build/guard.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/features/audio/chinese-transcription-panel.tsx`

## 8. Test Plan

1. Unit/source tests: `src/features/audio/chinese-transcription-panel.test.ts`.
2. Regression check: existing audio/Piper tests.
3. Build + version guard.

## 9. Observability

- Metrics: derived from existing voice timeline diagnostics.
- Logs: unchanged.
- Error codes: unchanged.

## 10. Risks & Rollback

- Risks: very dense timelines can be visually crowded; zoom and filters mitigate this.
- Rollback strategy: remove timeline workbench block without changing backend audio generation.

## 11. Deliverables

1. Audio Timeline Workbench UI.
2. Diagnostic filters and issue list.
3. Test/changelog/version evidence.

## 12. Changelog Note

- Add a professional Audio Transcript timeline workbench for generated voice chunks.

## 13. Task Type Checklist (Stamp [x])

### 13.1 Feature

- [x] Có user/system flow rõ ràng
- [x] Có acceptance criteria đo được
- [x] Có test cho happy path
- [x] Có test cho failure path chính

## 14. Execution Notes

- Assumptions: existing `alignment.timeline` is the authoritative chunk placement source.
- Blockers: None.
- Verification evidence:
  - Added Audio Timeline Workbench under generated voice output.
  - Workbench includes ruler, zoom slider, playhead, multi-lane chunk blocks, filters, issue list, status legend, overlap detection, and click-to-segment navigation.
  - Source test verifies workbench markers and data-flow hooks.
  - Targeted tests, build, and version guard pass.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/features/audio/chinese-transcription-panel.test.ts`
- Test commands executed:
  - `npm run test -- --run src/features/audio/chinese-transcription-panel.test.ts src/lib/multilingual-audio/piper-tts.test.ts src/lib/multilingual-audio/voice-segment-timing.test.ts`
  - `npm run build`
  - `npm run guard:version`
- Test results summary:
  - Targeted tests pass (3 files / 25 tests).
  - Build pass with existing Turbopack warning outside scope in `src/app/api/video-processing/edit/route.ts`.
- Version guard command/result (if runtime changed): `npm run guard:version` pass.
