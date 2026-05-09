# FAST-AUDIO-024 Refine Segment Bottom-Follow Scroll and Voice Speed Display

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

- Task ID: FAST-AUDIO-024
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

- Lý do: User still not satisfied with segment tracking UX; wants active segment to settle near the bottom edge of Segments frame, voice speed badge in green, and lower min speed threshold.
- Bài toán cần giải quyết: adjust scroll anchor/visual style/speed floor.

## 3. Scope

- In scope: segment auto-scroll anchor, voice speed label color, min speed threshold.
- Out of scope: non-Audio Transcript UX.

## 4. Acceptance Criteria

1. Active segment auto-scroll places segment near bottom of Segments container (not full-page scroll).
2. `Voice speed` badge uses green styling.
3. Min speed threshold is `1.1` (instead of `1.2`) and no more `1.00x` display in segment speed label.
4. Relevant tests pass.

## 14. Execution Notes

- Verification evidence:
  - Active segment follow scroll now computes container-relative position and anchors near bottom of `Segments` frame.
  - Segment `Voice speed` style now uses green emphasis and display floor `1.10x`.
  - Timeline min speed threshold changed from `1.2` to `1.1`.
  - `npm run test -- --run src/features/audio/chinese-transcription-panel.test.ts src/lib/multilingual-audio/piper-tts.test.ts` pass (2 files / 19 tests).
  - `npm run guard:version` pass.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/features/audio/chinese-transcription-panel.tsx`
  - `src/features/audio/chinese-transcription-panel.test.ts`
  - `src/lib/multilingual-audio/types.ts`
  - `src/lib/multilingual-audio/piper-tts.ts`
- Test commands executed:
  - `npm run test -- --run src/features/audio/chinese-transcription-panel.test.ts src/lib/multilingual-audio/piper-tts.test.ts`
  - `npm run guard:version`
- Test results summary:
  - Targeted tests pass (2 files / 19 tests).
- Version guard command/result (if runtime changed): `npm run guard:version` pass.
