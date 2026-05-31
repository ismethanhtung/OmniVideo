# [FAST-AUDIO-067] Optimize Transcript Translation Prompt Cost and Quality

## 0. Progress Stamp
- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Version guard passed (if runtime changed)
- [x] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [ ] Done

## 1. Metadata
- Task ID: FAST-AUDIO-067
- Phase: FAST
- Target Phase: Multilingual audio polish
- Domain: Transcript translation
- Task Type: Feature
- Priority: P0
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context
- User reported translation chunks around 100 segments still send about 40KB request payload because the full transcript context is repeated in every chunk request.
- The desired direction is better translation quality, lower latency/cost, approximately 150 segments per chunk, compact JSON output, and smarter use of OpenAI-compatible capabilities such as prompt caching when available.

## 3. Scope
- In scope:
  - replace repeated full-transcript context in chunk prompts with a compact translation guide generated once per multi-chunk run;
  - increase translation chunk target to 150 segments while retaining char-budget splitting;
  - switch preferred model output to compact ID-to-text JSON while keeping backward parser compatibility;
  - add prompt-cache-friendly request shaping and cache/token observability when provider usage data is available;
  - update focused translation tests.
- Out of scope:
  - UI changes;
  - replacing every provider call with Responses API state;
  - changing transcription or TTS behavior;
  - persisting translation guides to DB.

## 4. Acceptance Criteria
1. Multi-chunk translation no longer sends the full transcript text in every chunk request.
2. Multi-chunk translation performs at most one guide preflight request and then sends a compact guide to each chunk.
3. Chunking targets 150 segments per request when char budget allows.
4. Parser accepts compact output shape `{"t":{"1700":"..."}}` and still accepts existing `segments` / `translations` shapes.
5. OpenAI-native chat requests can include `prompt_cache_key`, and logs expose prompt/completion/cached token metrics when returned by the provider.
6. Existing retry/split/fallback behavior still works.

## 5. Technical Plan
1. Add compact translation-guide preflight and local fallback for multi-chunk transcript translation.
2. Rework chunk prompt construction to use stable static instructions, compact guide, nearby context, and compact output contract.
3. Extend parser/logging/tests for compact JSON, 150-segment chunking, cache metrics, and retry compatibility.

## 6. Test Plan
1. `npm run test -- --run src/lib/multilingual-audio/transcript-translation.test.ts`
2. `npm run build`
3. `npm run guard:version`
4. `git diff --check`

## 7. Observability
- Logs: existing `[TranscriptTranslation]` events plus guide preflight events, guide/context sizes, token usage, and cached prompt tokens when present.
- Error codes: existing translation provider errors reused.

## 8. Risks & Rollback
- Risk: weak OpenAI-compatible providers may return invalid JSON for guide preflight.
- Mitigation: guide preflight is best-effort; failure logs and falls back to a minimal local guide before chunk translation.
- Rollback: restore full-transcript prompt context and 100-segment chunk constants.

## 9. Deliverables
1. Optimized translation prompt payloads.
2. Compact JSON response support.
3. Focused regression tests and verification evidence.

## 10. Changelog Note
- Optimize transcript translation with compact guide-based chunk prompts, 150-segment chunks, compact JSON output, and token/cache observability.

## 11. Execution Notes
- Implementation started from the existing shared `translateTranscriptSegments` runner so Audio Transcript, Workspace translation, and VIP flows inherit the change.
- Implemented a best-effort guide preflight only when the run has more than one chunk, preserving the single-chunk fast path.
- Kept provider compatibility by continuing to use Chat Completions JSON mode for OpenAI-compatible providers and only sending `prompt_cache_key` when the provider is OpenAI-native.

## 12. Test Evidence
- Test files added/updated:
  - `src/lib/multilingual-audio/transcript-translation.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/transcript-translation.test.ts`
  - `npm run test -- --run src/app/api/audio/transcript-translation/route.test.ts src/lib/multilingual-audio/transcript-translation.test.ts`
  - `npm run build`
  - `npm run guard:version`
  - `git diff --check`
- Test results summary:
  - transcript translation suite passes (1 file / 18 tests);
  - transcript translation API route + shared translation suite pass (2 files / 19 tests);
  - production build passes;
  - version guard passes after patch bump `0.10.79 -> 0.10.80`;
  - whitespace diff check passes.
