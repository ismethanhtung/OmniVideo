# FAST-AUDIO-033 Split Merged Transcript Segments for Voice Timing

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

- Task ID: FAST-AUDIO-033
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

- Lý do: Groq can merge multiple spoken sentences into one segment. Piper then reads the translated segment as one continuous sentence even when the source had separate utterances.
- Bài toán cần giải quyết: split voice generation chunks inside merged transcript segments using translated sentence boundaries and source word timing gaps.
- Tài liệu liên quan: `docs/domains/multilingual-audio.md`, `docs/governance/testing-rules.md`

## 3. Scope

- In scope: sub-split Audio Transcript voice generation segments, preserve parent segment diagnostics in UI, add regression tests.
- Out of scope: changing Groq transcription or translation segment IDs.

## 4. Input / Output

- Input: translated segment text, source word timestamps.
- Output mong đợi: separate voice chunks for separate spoken phrases inside one merged transcript segment.

## 5. Acceptance Criteria

1. A merged segment like `Meo meo, ... rồi. Sao lại vậy...?` can become multiple voice chunks.
2. Sub-chunks keep a `sourceSegmentId` so UI diagnostics still attach to the original segment.
3. If no sentence/gap evidence exists, current single-chunk behavior remains.
4. Tests cover the merged multi-sentence segment case.

## 6. Technical Plan

1. Add optional `sourceSegmentId` to voice generation segment/timeline types.
2. Split translated text into TTS chunks and map them to word timing clusters.
3. Aggregate UI timeline diagnostics by parent segment ID and update tests.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: multilingual audio voice timing, Piper timeline metadata, Audio Transcript UI.

## 8. Test Plan

1. Unit tests: `voice-segment-timing`, `piper-tts`, `chinese-transcription-panel`.
2. Failure checks: no words/no split fallback.
3. Build + version guard.

## 9. Observability

- Metrics: existing timeline diagnostics, grouped by parent segment in UI.
- Logs: unchanged.
- Error codes: unchanged.

## 10. Risks & Rollback

- Risks: heuristic splitting may not catch every merged dialogue case.
- Rollback strategy: revert voice segment splitting helper.

## 11. Deliverables

1. Voice sub-segment splitting.
2. Parent segment diagnostics.
3. Test/changelog/version evidence.

## 12. Changelog Note

- Split merged transcript segments into separate voice chunks when translated sentences and source word timing gaps indicate multiple utterances.

## 13. Task Type Checklist (Stamp [x])

### 13.2 Bugfix

- [x] Có mô tả cách tái hiện lỗi
- [x] Có root cause ngắn gọn
- [x] Có regression test
- [x] Có xác nhận lỗi cũ không tái diễn

## 14. Execution Notes

- Assumptions: source word timing gaps are the best available local signal for pauses inside merged Groq segments.
- Blockers: None.
- Verification evidence:
  - Added sentence + word-gap splitting in `buildWordAwareVoiceSegments`.
  - Added `sourceSegmentId` to voice segments/timeline chunks so UI diagnostics can group sub-chunks under the original segment.
  - Added regression test for the merged `Meo meo, Lao Quan...` style segment.
  - Targeted tests and build pass.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/multilingual-audio/voice-segment-timing.test.ts`
  - `src/features/audio/chinese-transcription-panel.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/voice-segment-timing.test.ts src/lib/multilingual-audio/piper-tts.test.ts src/features/audio/chinese-transcription-panel.test.ts src/app/api/audio/voice-generation/route.test.ts`
  - `npm run test -- --run src/lib/multilingual-audio/voice-segment-timing.test.ts src/features/audio/chinese-transcription-panel.test.ts`
  - `npm run build`
  - `npm run guard:version`
- Test results summary:
  - Targeted audio tests pass (4 files / 28 tests).
  - Follow-up split/UI tests pass (2 files / 6 tests).
  - Build pass with existing Turbopack warning outside scope in `src/app/api/video-processing/edit/route.ts`.
- Version guard command/result (if runtime changed): `npm run guard:version` pass.
