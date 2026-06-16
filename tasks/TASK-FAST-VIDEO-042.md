# [FAST-VIDEO-042] Harden AI Image Studio Hugging Face network errors

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

- Task ID: FAST-VIDEO-042
- Phase: FAST
- Target Phase: AI Image Studio first-run reliability
- Domain: Video Pipeline / AI Image Generation
- Task Type: Bug Fix
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- AI Image Studio currently returns HTTP 500 with `fetch failed` when the Next server cannot reach Hugging Face.
- The UI needs a useful provider/network diagnostic instead of a generic system failure.
- The token must remain masked and not be printed in API responses.

## 3. Scope

- In scope:
  - Add timeout and network error mapping for Hugging Face image generation requests.
  - Return 502 provider network failures with actionable detail.
  - Keep token out of responses/logged payloads.
  - Add focused regression test.
- Out of scope:
  - Changing provider architecture.
  - Adding paid provider support.
  - Storage persistence for generated images.

## 4. Acceptance Criteria

1. Fetch/TLS/DNS failures from Hugging Face return `PRV_HUGGINGFACE_NETWORK_FAILED`.
2. Timeout failures return the same class of provider error with timeout detail.
3. HTTP JSON provider errors still map to provider failure responses.
4. Tests, version guard, build, and diff check pass.

## 5. Technical Plan

1. Add a network error formatter and `AbortSignal.timeout`.
2. Wrap only the Hugging Face fetch call to distinguish provider network failures from internal API bugs.
3. Add route tests.

## 6. Test Plan

1. `npm run test -- --run src/app/api/ai-image/huggingface-generate/route.test.ts`
2. `npm run guard:version`
3. `npm run build`
4. `git diff --check`

## 7. Test Evidence

- `npm run test -- --run src/app/api/ai-image/huggingface-generate/route.test.ts` pass (1 file / 5 tests).
- `npm run guard:version` pass.
- `npm run build` pass.
- `git diff --check` pass.

## 8. Changelog Note

- Harden AI Image Studio Hugging Face network/timeout error reporting.

## 9. Execution Notes

- Route now prefers `https://router.huggingface.co/hf-inference/models/{model}` and falls back to `https://api-inference.huggingface.co/models/{model}`.
- Model ids are encoded segment-by-segment so `owner/model` paths stay valid.
- DNS/TLS/timeout failures now return `PRV_HUGGINGFACE_NETWORK_FAILED` with endpoint diagnostics instead of a generic HTTP 500.
