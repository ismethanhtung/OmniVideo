# FAST-AUDIO-040 Harden Transcript Translation JSON Parsing

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

- Task ID: FAST-AUDIO-040
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

- Lý do: Transcript translation often fails with `PRV_GROQ_TRANSLATION_FAILED: Translation returned invalid JSON` on free/limited AI providers such as OpenRouter models.
- Bài toán cần giải quyết: tolerate common non-perfect JSON responses and adaptively split chunks when model output is malformed/truncated.
- Tài liệu liên quan: `docs/governance/testing-rules.md`

## 3. Scope

- In scope: robust JSON extraction from model response, adaptive split/retry on invalid JSON, smaller default chunks for non-Groq providers, regression tests.
- Out of scope: changing provider credentials, adding OpenAI-specific APIs, or changing translation UI.

## 4. Input / Output

- Input: chat completion content from Groq/OpenRouter-compatible providers.
- Output mong đợi: fenced/prose-wrapped JSON parses successfully; malformed multi-segment chunks are retried as smaller chunks.

## 5. Acceptance Criteria

1. Translation parser accepts plain JSON, fenced JSON, and prose-wrapped JSON object.
2. Translation parser accepts a bare JSON array of segment objects.
3. Invalid JSON on a multi-segment chunk triggers adaptive split instead of failing immediately.
4. Non-Groq provider URLs use smaller translation chunks by default.
5. Regression tests cover invalid JSON recovery.

## 6. Technical Plan

1. Add robust model-content JSON extraction helper.
2. Mark invalid JSON as retryable and split chunks adaptively.
3. Tune non-Groq chunk sizing and update tests.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: Audio Transcript translation domain.

## 8. Test Plan

1. Unit tests: `src/lib/multilingual-audio/transcript-translation.test.ts`.
2. Build + version guard.

## 9. Observability

- Metrics: existing token usage remains best-effort.
- Logs: none.
- Error codes: unchanged.

## 10. Risks & Rollback

- Risks: smaller chunks increase calls for limited providers, but improves completion reliability.
- Rollback strategy: revert parser/adaptive split changes.

## 11. Deliverables

1. Robust translation JSON parser.
2. Adaptive invalid-JSON split retry.
3. Tests, version bump, changelog, task evidence.

## 12. Changelog Note

- Harden transcript translation against invalid JSON from limited/free OpenAI-compatible providers.

## 13. Task Type Checklist (Stamp [x])

### 13.2 Bugfix

- [x] Có mô tả cách tái hiện lỗi
- [x] Có root cause ngắn gọn
- [x] Có regression test
- [x] Có xác nhận lỗi cũ không tái diễn

## 14. Execution Notes

- Assumptions: many OpenRouter/free models return valid JSON embedded in markdown/prose or malformed JSON when chunks are too large.
- Blockers: None.
- Verification evidence:
  - Parser accepts fenced JSON, prose-wrapped JSON objects, and bare segment arrays.
  - Invalid JSON from multi-segment chunks is treated as retryable and split into smaller chunks.
  - Non-Groq providers use smaller initial chunks to better fit limited/free models.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated: `src/lib/multilingual-audio/transcript-translation.test.ts`
- Test commands executed: `npm run test -- --run src/lib/multilingual-audio/transcript-translation.test.ts`; `npm run build`; `npm run guard:version`; `git diff --check`
- Test results summary: targeted tests passed (1 file / 12 tests); production build passed with existing Turbopack warning outside scope; diff whitespace check passed.
- Version guard command/result (if runtime changed): `npm run guard:version` passed after patch bump to `0.4.20`.
