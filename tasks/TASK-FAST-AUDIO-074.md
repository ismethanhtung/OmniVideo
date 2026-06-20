# [FAST-AUDIO-074] Smooth Strict VIP Voice Timing

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Version guard passed (if runtime changed)
- [x] Changelog updated
- [x] Ready for review
- [x] Done

## 1. Metadata

- Task ID: FAST-AUDIO-074
- Phase: FAST
- Target Phase: VIP voice quality
- Domain: Audio / VIP / Piper Timing
- Task Type: Bugfix
- Priority: P1
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Owner reported that generated Vietnamese voice feels too rigid around segment start times.
- Current strict timeline alignment places each voice chunk exactly at the segment start and can speed up a cramped segment even when the previous segment has audible slack/silence.
- Current speed floor can also force `1.25x` even when a chunk already fits its target slot naturally, creating "speaks too early then waits" artifacts.

## 3. Scope

- In scope:
  - Let strict timeline chunks borrow a small, safe amount of lead time from preceding audible slack.
  - Keep transcript/subtitle timestamps unchanged.
  - Apply the `1.25x` speed floor only when a chunk actually needs acceleration.
  - Add regression tests for lead borrowing and natural-speed fit.
- Out of scope:
  - Rewriting translation prompts.
  - Changing transcript timestamp generation.
  - Replacing Piper with another TTS engine.

## 4. Acceptance Criteria

1. A cramped strict timeline segment can start slightly before its transcript start when the previous chunk has audible slack, reducing speed pressure without overlapping previous spoken audio.
2. Strict timeline chunks that already fit their target duration keep natural `1.0x` speed instead of being forced to `1.25x`.
3. Existing high-speed warning behavior remains when no safe slack is available.
4. Focused tests, version guard, build, and diff check pass or failures are documented.

## 5. Test Plan

1. Add/update `piper-tts.test.ts` coverage for natural fit and strict lead-borrow smoothing.
2. Run focused Piper/VIP tests.
3. Run `npm run guard:version`, `npm run build`, and `git diff --check`.

## 6. Execution Notes

- Blockers: none.
- Verification evidence: focused tests, version guard, production build, and diff check passed.

## 7. Test Evidence

- Test files added/updated:
  - `src/lib/multilingual-audio/piper-tts.test.ts`
  - `src/features/audio/chinese-transcription-panel.test.ts`
  - `src/lib/multilingual-audio/video-dubbing.test.ts`
  - `src/lib/multilingual-audio/video-vip-processing.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/piper-tts.test.ts src/features/audio/chinese-transcription-panel.test.ts src/lib/multilingual-audio/video-dubbing.test.ts src/lib/multilingual-audio/video-vip-processing.test.ts --reporter=dot`
  - `npm run guard:version`
  - `npm run build`
  - `git diff --check`
- Test results summary:
  - Focused tests pass (4 files / 61 tests).
  - Version guard pass.
  - Build pass.
  - Diff check pass.
