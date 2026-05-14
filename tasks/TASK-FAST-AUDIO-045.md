# FAST-AUDIO-045 Harden Translation Fallback and Branding Intro Normalization

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

- Task ID: FAST-AUDIO-045
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

- Lý do: Translation on free/openai-compatible providers still often fails with `PRV_GROQ_TRANSLATION_FAILED: Translation returned invalid JSON`.
- Bài toán cần giải quyết:
  1. Improve translation robustness on weak/free models.
  2. Normalize production bumper text like `YoYo Television Series Exclusive` to a short Vietnamese phrase (`Phim ngắn.`).
  3. Expose raw model response snippet in API error message so Network tab explains why parse failed.
- Tài liệu liên quan: `docs/governance/testing-rules.md`

## 3. Scope

- In scope: translation parser hardening, single-segment plain-text fallback, bumper normalization, tests.
- Out of scope: changing provider accounts/quotas or changing transcription pipeline.

## 4. Input / Output

- Input: transcript segments + model response content from OpenAI-compatible provider.
- Output mong đợi: fewer invalid-JSON failures; clear network error details; bumper intros normalized for Vietnamese TTS.

## 5. Acceptance Criteria

1. Invalid JSON errors include a short raw model-content snippet.
2. Single-segment invalid JSON can recover using plain-text fallback translation.
3. Production bumper phrases are normalized to `Phim ngắn.` in translated output.
4. Tests cover parser error snippet, bumper normalization, and fallback path.

## 6. Technical Plan

1. Add parser error snippet and stronger candidate extraction in translation parser.
2. Add plain-text fallback request for single segment after JSON retries fail.
3. Add post-translation bumper normalization based on source/translated text heuristics.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `transcript-translation` domain and tests.

## 8. Test Plan

1. Unit tests: `src/lib/multilingual-audio/transcript-translation.test.ts`.
2. Build + version guard.

## 9. Observability

- Metrics: unchanged.
- Logs: unchanged.
- Error detail: `PRV_GROQ_TRANSLATION_FAILED` now carries raw content snippet when parse fails.

## 10. Risks & Rollback

- Risks: heuristic bumper normalization may over-normalize unusual English segments; scoped by keyword detection.
- Rollback strategy: revert bumper normalization helper and fallback branch.

## 11. Deliverables

1. More robust translation on free providers.
2. Bumper intro normalization for Vietnamese TTS.
3. Better parse-failure diagnostics in network error payload.

## 12. Changelog Note

- Improve transcript translation resilience for weak providers and normalize branding intros.

## 13. Task Type Checklist (Stamp [x])

### 13.2 Bugfix

- [x] Có mô tả cách tái hiện lỗi
- [x] Có root cause ngắn gọn
- [x] Có regression test
- [x] Có xác nhận lỗi cũ không tái diễn

## 14. Execution Notes

- Assumptions: weak models often return prose/fences/truncated JSON; single-segment plain text fallback is safer than failing whole translation.
- Blockers: None.
- Verification evidence:
  - Parse-failure errors now include a short raw content snippet for Network diagnostics.
  - Single-segment invalid-JSON cases now recover via plain-text fallback.
  - Branding bumper phrases like `YoYo Television Series Exclusive` are normalized to `Phim ngắn.`.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated: `src/lib/multilingual-audio/transcript-translation.test.ts`
- Test commands executed: `npm run test -- --run src/lib/multilingual-audio/transcript-translation.test.ts`; `npm run build`; `npm run guard:version`; `git diff --check`
- Test results summary: targeted tests passed (1 file / 14 tests); production build passed with existing Turbopack warning outside scope; diff whitespace check passed.
- Version guard command/result (if runtime changed): `npm run guard:version` passed after patch bump to `0.4.25`.
