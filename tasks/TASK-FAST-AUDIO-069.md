# [FAST-AUDIO-069] Implement HTTP 429 rate limit retries with backoff for Groq Whisper transcription

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

- Task ID: FAST-AUDIO-069
- Phase: FAST
- Target Phase: Groq Telemetry & Reliability
- Domain: Audio / Whisper Transcription
- Task Type: Improvement / Reliability
- Priority: P1
- Size: S
- Owner: Antigravity
- Reviewer: Owner
- Status: Review

## 2. Context

- During transcription of large files or during segment-level retries of overlong segments, the system makes multiple sequential calls to the Groq Whisper API.
- Since Groq's developer tier enforces a rate limit of 20 Requests Per Minute (RPM), these multiple calls can easily trigger an HTTP 429 "Rate limit reached" error.
- We need to implement an automatic retry mechanism with backoff inside the core `transcribeWithGroq` function to handle HTTP 429 rate limit errors gracefully by sleeping for the duration requested in the error message before retrying.

## 3. Scope

- In scope:
  - Add retry loop in `transcribeWithGroq` (in `groq-transcription.ts`) to handle HTTP 429 errors.
  - Parse the retry delay time in seconds dynamically from the error message.
  - Retry on rate limit (HTTP 429) up to 5 times.
  - Update `groq-transcription.test.ts` to mock and verify HTTP 429 rate limit retry behavior.
  - Bump app version and update changelog.
- Out of scope:
  - Changing model provider or using separate credentials.
  - Rate limiting other providers like translation or metadata.

## 4. Acceptance Criteria

1. If Groq Whisper API returns an HTTP 429 rate limit error, `transcribeWithGroq` parses the delay text (e.g., "try again in 3s") to determine sleep duration.
2. The function sleeps for the parsed duration (plus a 500ms safety buffer) and retries the request up to 5 times.
3. If all retry attempts are exhausted, it throws `ChineseTranscriptionError` with status code 422.
4. Unit tests mock the HTTP 429 response and verify that it retries the request the correct number of times and successfully recovers on subsequent attempts.
5. All 631+ tests pass, the production build compiles, and version guard checks succeed under a bumped version `0.10.116`.

## 5. Technical Plan

1. Implement `sleep` utility in `src/lib/multilingual-audio/groq-transcription.ts`.
2. Add a retry loop in `transcribeWithGroq` that intercepts 429 responses, parses the delay, logs a warning, and sleeps.
3. Write unit tests in `src/lib/multilingual-audio/groq-transcription.test.ts` verifying the rate-limit retry logic.
4. Bump version to `0.10.116` in `package.json` and `package-lock.json`.
5. Update `changelog/changelog.md` and `tasks/board.md`.

## 6. Code Change Impact

- Có thay đổi code không: Yes
- Module impacted:
  - `src/lib/multilingual-audio/groq-transcription.ts`
  - `src/lib/multilingual-audio/groq-transcription.test.ts`
  - `package.json`
  - `package-lock.json`
  - `changelog/changelog.md`
  - `tasks/board.md`

## 7. Test Plan

1. Run focused tests: `npx vitest run src/lib/multilingual-audio/groq-transcription.test.ts`
2. Run all tests: `npm run test`
3. Run version guard: `npm run guard:version`
4. Run production build: `npm run build`

## 8. Observability

- Console warnings logging retry attempts, HTTP 429 messages, and sleep durations.

## 9. Risks & Rollback

- Risks: Retrying could block execution threads for a few seconds. (Mitigated: Necessary to avoid outright failure, and Whisper calls are already run in the background).
- Rollback: Revert to single attempt without 429 handling.

## 10. Deliverables

1. Dynamic HTTP 429 retry implementation in Groq client.
2. Unit tests covering 429 retry behaviour.
3. Version bump and changelog update.

## 11. Changelog Note

- Add automatic HTTP 429 rate limit retries with dynamic delay parsing and backoff for Groq Whisper transcription requests.

## 12. Task Type Checklist

### 12.2 Improvement / Refactoring

- [x] Có chứng minh giải pháp tối ưu hơn (retry blocks rate limits, avoiding crash)
- [x] Không làm ảnh hưởng logic nghiệp vụ cũ (same normalization and outputs)
- [x] Có benchmark/test độ phủ tương đương (same tests pass, plus new retry tests)
