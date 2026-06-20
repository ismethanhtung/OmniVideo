# [FAST-AUDIO-072] Route Gemini Transcription Sandbox Through Native Audio API

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

- Task ID: FAST-AUDIO-072
- Phase: FAST
- Target Phase: Feature Sandbox transcription evaluation
- Domain: Audio / Feature Sandbox / Gemini
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Owner tried Feature Sandbox speech transcription with Google AI Studio and `models/gemini-3.1-flash-lite`.
- The sandbox called the OpenAI-compatible `/audio/transcriptions` path, which Google AI Studio/Gemini does not support for Whisper-style transcription.
- Result: `PRV_GROQ_TRANSCRIPTION_FAILED: Google AI Studio transcription request failed.`

## 3. Scope

- In scope:
  - Detect Google AI Studio/Gemini transcription targets.
  - Call native Gemini `generateContent` with extracted audio inline data.
  - Parse the model response back into the existing transcript result shape with segment/word timestamps.
  - Keep OpenAI-compatible Whisper providers on the existing `/audio/transcriptions` path.
- Out of scope:
  - Guaranteeing Gemini timestamp quality equals Whisper word timestamps.
  - Changing Audio Transcript production defaults.

## 4. Acceptance Criteria

1. Google AI Studio/Gemini sandbox runs no longer call `/audio/transcriptions`.
2. Gemini sandbox runs send extracted audio to native `generateContent`.
3. Gemini output is normalized into `text`, `language`, `segments`, and optional `words` so existing UI/steps still work.
4. Groq/default and other OpenAI-compatible transcription providers still use the existing Whisper-compatible flow.
5. Focused tests, version guard, build, and diff check pass or failures are documented.

## 5. Test Plan

1. Add adapter test for Gemini native audio request and response normalization.
2. Run focused transcription/UI tests.
3. Run `npm run guard:version`, `npm run build`, and `git diff --check`.

## 6. Execution Notes

- Assumption: Google AI Studio models can accept inline audio in `generateContent`; prompt forces the same JSON schema consumed by existing normalization.
- Blockers: none.
- Verification evidence: focused tests, version guard, build, and diff check passed.

## 7. Test Evidence

- Test files added/updated:
  - `src/lib/multilingual-audio/groq-transcription.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/groq-transcription.test.ts src/lib/multilingual-audio/chinese-transcription.test.ts src/app/api/audio/chinese-transcription/route.test.ts src/features/audio/piper-tts-sandbox-panel.test.ts src/components/layout/navigation.test.ts --reporter=dot`
  - `npm run guard:version`
  - `npm run build`
  - `git diff --check`
- Test results summary:
  - Focused Vitest suite passed (5 files / 32 tests).
  - Version guard passed.
  - Next build passed.
  - Diff check passed.
