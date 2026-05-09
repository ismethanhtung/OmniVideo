# FAST-AUDIO-028 Align Voice Segment Onsets with Word Timestamps

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

- Task ID: FAST-AUDIO-028
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

- Lý do: Segment timestamps are continuous containers, but actual source speech may occur later inside the segment according to word timestamps. Example: segment #9 is `00:08.700 -> 00:10.000`, but source word `啊` is actually spoken at `00:09.760 -> 00:09.960`.
- Bài toán cần giải quyết: generated voice should start at the actual word-level speech onset, not always at the segment container start.

## 3. Scope

- In scope: derive Audio Transcript voice generation segment timing from word timestamps when available; preserve existing segment boundary fallback.
- Out of scope: word-level translation alignment across languages and forced alignment of generated Vietnamese audio.

## 5. Acceptance Criteria

1. If source words overlap a translated segment, generated voice segment start uses the first overlapping word start.
2. Segment end keeps available boundary room to avoid clipping TTS output into the next segment.
3. If no word timing exists, voice generation falls back to original segment start/end.
4. Regression tests cover the delayed single-word case.

## 14. Execution Notes

- Verification evidence:
  - Added `buildWordAwareVoiceSegments` helper for deriving voice timing from word timestamps.
  - Segment #9 style case now maps `start` to first overlapping word start (`00:09.760`) while preserving segment boundary room for TTS duration.
  - Audio Transcript voice generation now sends word-aware segments to `/api/audio/voice-generation`.
  - `npm run test -- --run src/lib/multilingual-audio/voice-segment-timing.test.ts src/features/audio/chinese-transcription-panel.test.ts src/lib/multilingual-audio/piper-tts.test.ts src/app/api/audio/voice-generation/route.test.ts` pass (4 files / 25 tests).
  - `npm run build` pass with existing Turbopack warning outside scope in `src/app/api/video-processing/edit/route.ts`.
  - `npm run guard:version` pass.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/multilingual-audio/voice-segment-timing.ts`
  - `src/lib/multilingual-audio/voice-segment-timing.test.ts`
  - `src/features/audio/chinese-transcription-panel.tsx`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/voice-segment-timing.test.ts src/features/audio/chinese-transcription-panel.test.ts src/lib/multilingual-audio/piper-tts.test.ts src/app/api/audio/voice-generation/route.test.ts`
  - `npm run build`
  - `npm run guard:version`
- Test results summary:
  - Targeted tests pass (4 files / 25 tests).
  - Build pass; existing Turbopack warning is outside task scope.
- Version guard command/result (if runtime changed): `npm run guard:version` pass.
