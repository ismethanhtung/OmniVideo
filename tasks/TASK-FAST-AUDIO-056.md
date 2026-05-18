# [FAST-AUDIO-056] Add Full Transcript Context to Every Translation Chunk

## 0. Progress Stamp
- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [ ] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [ ] Done

## 1. Metadata
- Task ID: FAST-AUDIO-056
- Phase: FAST
- Target Phase: Multilingual audio polish
- Domain: Transcript translation
- Task Type: Feature
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context
- Transcript translation currently chunks long transcripts into batches (for example 100 segments at a time), but each provider request only sees the current chunk.
- User wants every translation request to retain the current chunking/output behavior while also receiving the full source transcript as read-only context so names, pronouns, relationships, and story continuity can remain stable across chunks.

## 3. Scope
- In scope:
  - add full-transcript source context to every translation request prompt;
  - keep outputs constrained to the current chunk only;
  - apply the same shared translation behavior to Audio Transcript, Workspace translation nodes, and video dubbing flows because they already use the shared translator.
- Out of scope:
  - changing chunk size/concurrency;
  - translating the whole transcript in one provider call;
  - adding user-configurable prompt toggles.

## 4. Acceptance Criteria
1. Each chunk-json translation request includes the full source transcript text as separate read-only context plus only the current chunk in the required output section.
2. Adaptive retries/splits continue to receive the same full transcript context, not only their reduced retry subset.
3. Single-segment plain-text fallback also receives the full transcript context.
4. Regression tests verify multi-chunk requests contain full context while still asking for only the local chunk outputs.

## 5. Technical Plan
1. Build a normalized full transcript context string once from the original source segments.
2. Thread that context through chunk requests, adaptive retries, and fallback requests.
3. Update prompt wording and tests, then verify the shared translation path.

## 6. Test Plan
1. `npm run test -- --run src/lib/multilingual-audio/transcript-translation.test.ts`
2. `npm run build`
3. `npm run guard:version`

## 7. Changelog Note
- Add full source transcript context to every translation chunk while keeping per-chunk outputs unchanged.

## 8. Execution Notes
- Product intent: improve continuity for long narrative transcripts without abandoning the existing bounded chunk workflow.

## 9. Test Evidence
- Test files added/updated:
  - `src/lib/multilingual-audio/transcript-translation.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/multilingual-audio/transcript-translation.test.ts`
  - `npm run build`
  - `npm run guard:version`
  - `git diff --check`
- Test results summary:
  - transcript translation suite passes (1 file / 15 tests);
  - `npm run build` passes with the existing ESLint circular-config warning;
  - `npm run guard:version` passes after patch bump `0.9.4 -> 0.9.5`;
  - `git diff --check` passes.
