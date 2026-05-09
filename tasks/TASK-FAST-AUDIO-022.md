# FAST-AUDIO-022 Restore Audio Transcript Timestamp Sync and Segment Playback UX

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

- Task ID: FAST-AUDIO-022
- Phase: Phase 2
- Target Phase: P2
- Domain: Audio Transcript
- Task Type: Bugfix/Feature
- Priority: P0
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: Piper voice generation speed improved, but generated audio timeline is much shorter than source timestamps (example segment #218 at 07:00.432 while audio is only ~06:20). User also requested Audio Transcript segment UX improvements.
- Bài toán cần giải quyết: restore timestamp-faithful voice output for Audio Transcript and expose generated segment timing/speed/playback status.
- Tài liệu liên quan: `docs/domains/multilingual-audio.md`, `docs/governance/testing-rules.md`.

## 3. Scope

- In scope: Audio Transcript page voice generation alignment mode, timeline metadata, hide/show defaults for Words/Run steps/Transcript, generated speed/timing per segment, voice playback segment highlighting/autoscroll, red marking for missing generated text/audio.
- Out of scope: replacing Piper, changing translation provider, redesigning full page layout.

## 4. Input / Output

- Input: translated segments with source timestamps and generated Piper voice result.
- Output mong đợi: generated audio preserves source timestamp scale and UI shows where each generated segment lands during playback.

## 5. Acceptance Criteria

1. Audio Transcript voice generation uses timestamp-preserving alignment so late segments remain reachable near their source timestamps.
2. Voice result timeline includes per-segment generated start/end and speed factor.
3. Words, Run steps, and Transcript panels default collapsed with hide/show controls.
4. Segment rows show generated voice speed and generated voice timestamp after voice generation.
5. During voice playback, the active segment is highlighted and auto-scrolled into view.
6. Segments missing generated voice timeline/text are visibly marked red.
7. Regression tests cover timestamp-preserving alignment metadata and updated UI behavior where practical.

## 6. Technical Plan

1. Inspect Audio Transcript component and Piper timeline metadata shape.
2. Switch Audio Transcript request to strict timestamp alignment and enrich strict alignment metadata with generated scheduled start/end.
3. Add UI collapsed toggles and generated timing/speed/missing markers.
4. Add playback time listener to mark/autoscroll active segment.
5. Add/update tests and run targeted/full verification.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: Audio Transcript UI, Piper TTS timeline helper, tests.

## 8. Test Plan

1. Unit/Integration cần chạy: Piper TTS tests, Audio Transcript panel tests, voice generation route tests.
2. Failure cases cần thử: missing generated timeline marks segment as failed/missing.
3. Kết quả mong đợi: targeted and full tests pass; version guard pass.

## 9. Observability

- Metrics: existing generationDurationMs and alignment timeline diagnostics.
- Logs: preserve existing API errors.
- Error codes: no new error code expected.

## 10. Risks & Rollback

- Risks: strict timestamp alignment may reintroduce speed-up/trimming for long translated segments, but it is required for timestamp sync.
- Rollback strategy: revert Audio Transcript request alignment mode and UI metadata changes.

## 11. Deliverables

1. Timestamp-preserving Audio Transcript voice generation.
2. Segment generated timing/speed UI.
3. Playback active segment highlight/autoscroll.
4. Missing generated segment marker.
5. Tests, changelog, version bump, task evidence.

## 12. Changelog Note

- Restore Audio Transcript Piper timestamp sync and add generated segment playback diagnostics.

## 13. Task Type Checklist (Stamp [x])

### 13.1 Feature

- [x] Có user/system flow rõ ràng
- [x] Có acceptance criteria đo được
- [x] Có test cho happy path
- [x] Có test cho failure path chính

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

- Assumptions: Audio Transcript needs source timestamp sync more than natural pause compression.
- Blockers: none currently.
- Verification evidence:
  - Root cause confirmed: Audio Transcript forced `alignmentMode: "balanced"`, which compresses long gaps and can make generated audio shorter than source timestamps.
  - Audio Transcript now sends `alignmentMode: "strict"` for timestamp-preserving voice generation.
  - Strict Piper alignment metadata now records generated start/end, speed factor, pause-before, and drift for each segment.
  - UI defaults Words, Run steps, and Transcript to hidden; segment rows show generated speed/timestamp, active playback highlight/autoscroll, and missing generated marker.
  - `npm run test -- --run src/lib/multilingual-audio/piper-tts.test.ts src/app/api/audio/voice-generation/route.test.ts src/features/audio/chinese-transcription-panel.test.ts` pass (3 files / 23 tests).
  - `npm run build` pass with existing Turbopack warning outside scope in `src/app/api/video-processing/edit/route.ts`.
  - `npm run guard:version` pass.
  - `npm test` pass (85 files / 373 tests).

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/multilingual-audio/piper-tts.test.ts`
  - `src/features/audio/chinese-transcription-panel.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/piper-tts.test.ts src/app/api/audio/voice-generation/route.test.ts src/features/audio/chinese-transcription-panel.test.ts`
  - `npm run build`
  - `npm run guard:version`
  - `npm test`
- Test results summary:
  - Targeted Piper/API/Audio Transcript tests pass (3 files / 23 tests).
  - Build pass; existing Turbopack warning is outside task scope.
  - Version guard pass.
  - Full test suite pass (85 files / 373 tests).
- Version guard command/result (if runtime changed): `npm run guard:version` pass.
