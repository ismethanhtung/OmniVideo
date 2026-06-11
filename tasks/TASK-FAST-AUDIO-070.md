# [FAST-AUDIO-070] Programmatic word-level segment splitting fallback for overlong Chinese transcription segments

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

- Task ID: FAST-AUDIO-070
- Phase: FAST
- Target Phase: Groq Telemetry & Reliability
- Domain: Audio / Whisper Transcription
- Task Type: Bugfix / Reliability
- Priority: P1
- Size: S
- Owner: Antigravity
- Reviewer: Owner
- Status: Done

## 2. Context

- Sometimes Whisper transcription returns overlong segments (e.g. >40 Han characters, representing 15-20 seconds of continuous speech).
- The segment-level retry loop tries to split them by re-transcribing the segment's audio clip.
- However, if the audio clip does not contain silent pauses, Whisper will repeatedly return a single overlong segment, leaving it overlong in the final output (in `best-effort` mode).
- Overlong segments cause downstream voice synthesis to lose timestamp synchronization. We must ensure no overlong segment remains.
- We will implement a programmatic fallback that splits overlong segments using word-level timestamps when the retry loop fails to split them in `best-effort` mode.

## 3. Scope

- In scope:
  - Implement `splitOverlongSegmentByWords` helper to programmatically partition overlong segments into sub-segments of <= 40 Han characters.
  - Integrate it as a fallback in `retryOverlongChineseSegments` when retry attempts fail to split an overlong segment under `best-effort` mode.
  - Update `chinese-transcription.test.ts` to expect programmatic splitting when retries are exhausted in `best-effort` mode.
  - Bump app version and update changelog.
- Out of scope:
  - Changing word segmentation logic in Whisper or changing `strict` mode throw behavior.

## 4. Acceptance Criteria

1. In `best-effort` mode, if a segment remains overlong (> 40 Han characters) after retry attempts, it is programmatically split into sub-segments based on word-level timestamps.
2. The split sub-segments are each <= 40 Han characters in length and are chronologically ordered, non-overlapping, and contiguous.
3. If no word timestamps are available, the fallback splits the text and duration proportionally.
4. Unit tests pass and verify that overlong segments are split programmatically instead of being kept whole in `best-effort` mode.
5. All 633+ tests pass, production builds successfully, and version guard checks succeed under a bumped version `0.10.117`.

## 5. Technical Plan

1. Define `splitOverlongSegmentByWords` in `src/lib/multilingual-audio/chinese-transcription.ts`.
2. Call it inside `retryOverlongChineseSegments` in the fallback block for `best-effort` mode.
3. Update `chinese-transcription.test.ts` to assert that overlong segments are split instead of remaining whole.
4. Bump version to `0.10.117` in `package.json` and `package-lock.json`.
5. Update `changelog/changelog.md` and `tasks/board.md`.

## 6. Code Change Impact

- Có thay đổi code không: Yes
- Module impacted:
  - `src/lib/multilingual-audio/chinese-transcription.ts`
  - `src/lib/multilingual-audio/chinese-transcription.test.ts`
  - `package.json`
  - `package-lock.json`
  - `changelog/changelog.md`
  - `tasks/board.md`

## 7. Test Plan

1. Run focused tests: `npx vitest run src/lib/multilingual-audio/chinese-transcription.test.ts`
2. Run all tests: `npm run test`
3. Run version guard: `npm run guard:version`
4. Run production build: `npm run build`

## 8. Observability

- Clean split segments without overlong transcription nodes in Workspace background progress outputs.

## 9. Risks & Rollback

- Risks: None (programmatic splitting uses local word timestamps, adding no extra latency or API requests).
- Rollback: Revert the fallback logic inside `retryOverlongChineseSegments`.

## 10. Deliverables

1. Programmatic word-level segment splitting fallback logic.
2. Updated test cases in transcription tests.
3. Version bump and changelog update.

## 11. Changelog Note

- Add programmatic word-level segment splitting fallback for overlong Chinese transcription segments when Whisper API retry fails to split them.

## 12. Execution Notes

- Implemented `splitOverlongSegmentByWords` in `src/lib/multilingual-audio/chinese-transcription.ts` as a local fallback for overlong segment splitting in `best-effort` mode.
- Used word timestamps to partition the segment cleanly at punctuation and pause boundaries if available.
- Added a proportional fallback when no word timestamps are provided.
- Connected the fallback to the retry exhaustion branch in `retryOverlongChineseSegments` in `best-effort` mode.
- Bumped app version to `0.10.117`.

## 13. Test Evidence

- Focused unit test runs: `npx vitest run src/lib/multilingual-audio/chinese-transcription.test.ts` passed (8 tests in `chinese-transcription.test.ts`).
- Full project verification: `npm run test` passed (118 files / 634 tests).
- Automated version compliance: `npm run guard:version` passed successfully.
- Production build validation: `npm run build` completed successfully.
