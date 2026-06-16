# [FAST-VIDEO-043] Let AI Image Studio generate with configured AI Providers

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

- Task ID: FAST-VIDEO-043
- Phase: FAST
- Target Phase: AI Image Studio provider flexibility
- Domain: Video Pipeline / AI Image Generation
- Task Type: Feature
- Priority: P1
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Hugging Face `hf-inference` does not support every image model the owner wants to test.
- Owner already has OpenAI-compatible providers such as ChiaseGPU configured in AI Providers.
- AI Image Studio should let users select a configured AI Provider and model, not only Hugging Face.

## 3. Scope

- In scope:
  - Add provider mode selection in AI Image Studio.
  - Load configured active AI Providers and their models.
  - Add API route support for provider-backed OpenAI-compatible image generation.
  - Keep Hugging Face as an option.
  - Add focused tests.
- Out of scope:
  - Provider-specific image schemas beyond OpenAI-compatible `/images/generations`.
  - Storage persistence for generated images.
  - Video/storyboard sequencing.

## 4. Acceptance Criteria

1. User can choose Hugging Face or configured AI Provider.
2. User can select provider model from `/api/ai-providers/[providerId]/models`.
3. Provider-backed generation calls stored provider key server-side and does not expose it to the browser.
4. Provider image responses with `b64_json` or `url` are supported.
5. Tests, version guard, build, and diff check pass.

## 5. Technical Plan

1. Extend AI Image Studio panel state and runtime controls.
2. Extend generation route with `providerId` branch.
3. Add tests for provider image generation.

## 6. Test Plan

1. `npm run test -- --run src/features/ai-image/ai-image-studio-panel.test.ts src/app/api/ai-image/huggingface-generate/route.test.ts`
2. `npm run guard:version`
3. `npm run build`
4. `git diff --check`

## 7. Test Evidence

- `npm run test -- --run src/features/ai-image/ai-image-studio-panel.test.ts src/app/api/ai-image/huggingface-generate/route.test.ts` pass (2 files / 9 tests).
- `npm run guard:version` pass.
- `npm run build` pass.
- `git diff --check` pass.

## 8. Changelog Note

- Add configured AI Provider support to AI Image Studio generation.

## 9. Execution Notes

- AI Image Studio now defaults to `Configured AI Provider` mode and auto-selects a ChiaseGPU-labeled provider when present.
- Provider mode calls stored provider credentials server-side through OpenAI-compatible `/images/generations`.
- Hugging Face remains available as a secondary mode.
- If a provider does not support OpenAI-compatible image generation, it will return a provider error and needs a provider-specific adapter.
