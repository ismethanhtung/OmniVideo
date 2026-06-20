# [FAST-AUDIO-073] Tighten Overlong Chinese Segment Retry Threshold

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

- Task ID: FAST-AUDIO-073
- Phase: FAST
- Target Phase: VIP transcription reliability
- Domain: Audio / VIP / Transcription
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Owner observed a VIP Background Progress segment whose Chinese source text remained too long for useful tracing:
  `请当着无故门再或者给我一本当下潮流火爆的画本子看完后写回后感实在苦不堪言`
- Existing overlong split logic retried only when a segment had more than `40` Han characters.
- The observed source text has `36` Han characters, so the previous threshold did not classify it as suspicious.

## 3. Scope

- In scope:
  - Tighten the overlong Chinese segment threshold from the previous `> 40` Han characters.
  - Keep the existing segment-level retry and best-effort programmatic fallback behavior.
  - Add a focused regression test for the observed 36-Han-character source text.
- Out of scope:
  - Rewriting transcript translation prompts.
  - Splitting translated Vietnamese text after translation.

## 4. Acceptance Criteria

1. A Chinese transcript segment with 36 Han characters is treated as overlong and retried.
2. Existing best-effort fallback splits exhausted overlong segments using the tightened threshold.
3. Existing successful retry behavior remains intact.
4. Focused tests, version guard, build, and diff check pass or failures are documented.

## 5. Test Plan

1. Add unit test in `chinese-transcription.test.ts` for the observed 36-Han-character Chinese segment.
2. Run focused Chinese transcription/VIP tests.
3. Run `npm run guard:version`, `npm run build`, and `git diff --check`.

## 6. Execution Notes

- Previous retry threshold was `> 40` Han characters; the observed source text counts as `36`, so it escaped retry.
- Blockers: none.
- Verification evidence: focused tests, version guard, production build, and diff check passed.

## 7. Test Evidence

- Test files added/updated: `src/lib/multilingual-audio/chinese-transcription.test.ts`.
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/chinese-transcription.test.ts src/lib/multilingual-audio/groq-transcription.test.ts src/lib/multilingual-audio/video-vip-processing.test.ts src/app/api/audio/chinese-transcription/route.test.ts --reporter=dot`
  - `npm run guard:version`
  - `npm run build`
  - `git diff --check`
- Test results summary:
  - Focused tests pass (4 files / 42 tests).
  - Version guard pass.
  - Build pass.
  - Diff check pass.
