# FAST-AUDIO-043 Add VAD Timestamp Repair to Audio Transcript 2

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

- Task ID: FAST-AUDIO-043
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

- Lý do: Groq/Whisper sometimes returns severe timestamp drift; Audio Transcript 2 needs VAD-based repair without affecting Audio Transcript 1.
- Bài toán cần giải quyết: detect speech islands from extracted/vocals audio and use them to repair suspicious transcript segment timings.
- Tài liệu liên quan: `docs/governance/testing-rules.md`

## 3. Scope

- In scope: Audio Transcript 2 VAD checkbox, ffmpeg PCM energy VAD, VAD-based transcript timestamp repair, diagnostics steps, tests.
- Out of scope: Silero/native VAD dependency and changing Audio Transcript 1 behavior.

## 4. Input / Output

- Input: extracted speech-ready audio and Groq transcript segments/words.
- Output mong đợi: suspicious long/continuous segments are snapped toward detected speech islands, with repair diagnostics.

## 5. Acceptance Criteria

1. Audio Transcript 2 shows a VAD timestamp repair checkbox.
2. Audio Transcript 1 does not show the VAD checkbox.
3. API forwards the VAD flag into transcription domain.
4. Pipeline records `detect-speech` and `repair-timestamps` steps when VAD is enabled.
5. A short segment with a bad long timestamp is repaired to a nearby VAD speech island.
6. Tests cover VAD detection and timestamp repair behavior.

## 6. Technical Plan

1. Add ffmpeg PCM decode helper and energy-based speech island detection.
2. Add VAD transcript repair helper and call it after Groq transcription only when enabled.
3. Expose option in Audio Transcript 2 and add regression tests.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: Audio Transcript 2 UI, API route, transcription domain.

## 8. Test Plan

1. Unit tests: `src/lib/multilingual-audio/speech-activity.test.ts`.
2. Domain tests: `src/lib/multilingual-audio/chinese-transcription.test.ts`.
3. Route/source tests: API route + Audio Transcript panel tests.
4. Build + version guard.

## 9. Observability

- Metrics: speech island count, repaired segment count.
- Logs: none.
- UI: existing step trace shows VAD/repair steps.

## 10. Risks & Rollback

- Risks: energy VAD is less precise than Silero but avoids native dependency risk; option is scoped to Audio Transcript 2.
- Rollback strategy: hide checkbox and skip VAD branch.

## 11. Deliverables

1. VAD timestamp repair for Audio Transcript 2.
2. Diagnostics and tests.
3. Version/changelog/task evidence.

## 12. Changelog Note

- Add optional VAD timestamp repair to Audio Transcript 2.

## 13. Task Type Checklist (Stamp [x])

### 13.1 Feature

- [x] Có acceptance criteria rõ ràng
- [x] Có test plan
- [x] Có test evidence

## 14. Execution Notes

- Assumptions: ffmpeg-based PCM energy VAD is sufficient as a first safe pass and can be replaced by Silero later if needed.
- Blockers: None.
- Verification evidence:
  - Audio Transcript 2 sends `useVadTimestampRepair` only when its VAD checkbox is enabled.
  - Transcription domain decodes the current speech-ready/vocals audio to PCM, detects speech islands, and repairs suspicious segment timestamps after Groq transcription.
  - Step trace now includes `detect-speech` and `repair-timestamps` diagnostics when VAD repair is enabled.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated: `src/lib/multilingual-audio/speech-activity.test.ts`, `src/lib/multilingual-audio/chinese-transcription.test.ts`, `src/app/api/audio/chinese-transcription/route.test.ts`, `src/features/audio/chinese-transcription-panel.test.ts`
- Test commands executed: `npm run test -- --run src/lib/multilingual-audio/speech-activity.test.ts src/lib/multilingual-audio/chinese-transcription.test.ts src/app/api/audio/chinese-transcription/route.test.ts src/features/audio/chinese-transcription-panel.test.ts`; `npm run build`; `npm run guard:version`; `git diff --check`
- Test results summary: targeted tests passed (4 files / 19 tests); production build passed with existing Turbopack warning outside scope; diff whitespace check passed.
- Version guard command/result (if runtime changed): `npm run guard:version` passed after patch bump to `0.4.23`.
