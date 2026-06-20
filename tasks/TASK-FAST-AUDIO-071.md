# [FAST-AUDIO-071] Add Provider-Selectable Speech Transcription Sandbox

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

- Task ID: FAST-AUDIO-071
- Phase: FAST
- Target Phase: Feature Sandbox transcription evaluation
- Domain: Audio / Feature Sandbox / AI Providers
- Task Type: Feature
- Priority: P1
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Current transcript speech-to-text uses Groq Whisper through a hard-coded model path.
- Owner wants Feature Sandbox to test other API/model options while keeping the same extraction, timestamp, prompt, chunking, and post-processing behavior as the Groq flow.
- UI should follow Audio Transcript style and keep the existing upload/asset input pattern.

## 3. Scope

- In scope:
  - Add provider/model controls to Feature Sandbox transcript lab.
  - Let `/api/audio/chinese-transcription` accept optional provider/model fields for sandbox experiments.
  - Reuse existing audio extraction, timestamp granularity, chunking, retry, prompt, and overlong segment handling.
  - Keep default behavior compatible with Groq Whisper when no provider/model is supplied.
  - Add focused tests for provider/model propagation and UI controls.
- Out of scope:
  - Guaranteeing every provider supports audio transcription.
  - Adding separate stored job history for sandbox runs.
  - Changing Audio Transcript's production default UI.

## 4. Acceptance Criteria

1. Feature Sandbox transcript lab still supports upload video/audio and Video Asset selection.
2. Feature Sandbox transcript lab exposes AI Provider and transcription model controls.
3. The API route passes selected provider API key/base URL/name and model into the same transcription pipeline.
4. The transcription pipeline still extracts speech-ready audio, requests verbose JSON, timestamp segments/words, chunking, prompt, and retry logic as before.
5. Existing Groq default behavior remains compatible when no provider/model is selected.
6. Focused tests, version guard, build, and diff check pass or failures are documented.

## 5. Technical Plan

1. Generalize Groq transcription adapter to accept model/base URL/provider label while preserving Groq defaults.
2. Add optional transcription provider config to `runChineseVideoTranscription` and the API route.
3. Add Feature Sandbox provider/model loading controls and submit selected values.
4. Update tests for adapter/pipeline/API/UI coverage.
5. Update version, changelog, board, and evidence.

## 6. Test Plan

1. Unit test transcription adapter model/base URL propagation.
2. Unit/API test pipeline/route provider-model propagation.
3. Source/UI test Feature Sandbox exposes provider/model controls.
4. Run focused Vitest suite, `npm run guard:version`, `npm run build`, and `git diff --check`.

## 7. Observability

- Transcript steps should include selected transcription model and provider name.
- Existing error steps should still attach extraction/transcription failure evidence.

## 8. Risks & Rollback

- Risk: Some OpenAI-compatible providers may not implement `/audio/transcriptions` or may use different timestamp fields.
- Mitigation: Preserve Groq-compatible default and surface provider errors with the existing step trace.
- Rollback: Revert this task's provider/model optional config and UI controls.

## 9. Deliverables

1. Provider-selectable Feature Sandbox transcription lab.
2. Generalized transcription model/base URL path.
3. Focused tests and changelog evidence.

## 10. Changelog Note

- Add Feature Sandbox speech transcription provider/model controls while preserving Groq-compatible timestamp pipeline.

## 11. Execution Notes

- Assumption: selected providers are OpenAI-compatible for audio transcription endpoints.
- Blockers: none.
- Verification evidence: focused tests, version guard, build, and diff check passed.

## 12. Test Evidence

- Test files added/updated:
  - `src/lib/multilingual-audio/groq-transcription.test.ts`
  - `src/lib/multilingual-audio/chinese-transcription.test.ts`
  - `src/app/api/audio/chinese-transcription/route.test.ts`
  - `src/features/audio/piper-tts-sandbox-panel.test.ts`
  - `src/components/layout/navigation.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/groq-transcription.test.ts src/lib/multilingual-audio/chinese-transcription.test.ts src/app/api/audio/chinese-transcription/route.test.ts src/features/audio/piper-tts-sandbox-panel.test.ts src/components/layout/navigation.test.ts --reporter=dot`
  - `npm run guard:version`
  - `npm run build`
  - `git diff --check`
- Test results summary:
  - Focused Vitest suite passed (5 files / 31 tests).
  - Version guard passed.
  - Next build passed.
  - Diff check passed.
