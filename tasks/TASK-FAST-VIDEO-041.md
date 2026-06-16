# [FAST-VIDEO-041] Add AI Image Studio page for Hugging Face generation

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

- Task ID: FAST-VIDEO-041
- Phase: FAST
- Target Phase: AI image-first video creation experiment
- Domain: Video Pipeline / AI Image Generation
- Task Type: Feature
- Priority: P1
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Owner wants to start exploring self-created video generation through AI-generated images.
- The first experiment should use free Hugging Face-style APIs.
- The new page must live inside Video Pipeline and visually match the existing Audio Transcript interface style.

## 3. Scope

- In scope:
  - Add an AI Image Studio page under Video Pipeline.
  - Add prompt/model/token controls, generation settings, preview, and download/copy actions.
  - Add a server route that calls Hugging Face Inference image generation and returns a browser-viewable image data URL.
  - Add focused tests for navigation registration, panel structure, and API behavior.
- Out of scope:
  - Full video generation/storyboard sequencing.
  - Storage persistence for generated images.
  - Account-level Hugging Face provider management.

## 4. Acceptance Criteria

1. New page appears in Video Pipeline navigation.
2. Page uses the compact bordered layout style consistent with Audio Transcript.
3. User can enter a prompt, model, token, dimensions, seed, guidance, and inference steps.
4. API route handles Hugging Face binary image responses and useful error JSON responses.
5. Tests, version guard, build, and diff check pass.

## 5. Technical Plan

1. Add `aiImageStudio` app section and route slug.
2. Add `AiImageStudioPanel` component.
3. Add `POST /api/ai-image/huggingface-generate`.
4. Add focused tests and update changelog/version.

## 6. Test Plan

1. `npm run test -- --run src/components/layout/navigation.test.ts src/features/ai-image/ai-image-studio-panel.test.ts src/app/api/ai-image/huggingface-generate/route.test.ts`
2. `npm run guard:version`
3. `npm run build`
4. `git diff --check`

## 7. Test Evidence

- `npm run test -- --run src/components/layout/navigation.test.ts src/features/ai-image/ai-image-studio-panel.test.ts src/app/api/ai-image/huggingface-generate/route.test.ts` pass (3 files / 13 tests).
- `npm run guard:version` pass.
- `npm run build` pass.
- `git diff --check` pass.

## 8. Changelog Note

- Add AI Image Studio page for Hugging Face image generation experiments.

## 9. Execution Notes

- Added `AI Image Studio` under Video Pipeline at `/ai-image-studio`.
- Added a compact tool UI matching Audio Transcript shell conventions: bordered header, metric cards, settings sidebar, and large output preview.
- Added Hugging Face Inference route for text-to-image models with optional browser-entered token or server env fallback.
- Current output is preview/download only; Storage persistence and storyboard-to-video sequencing remain out of scope for this first step.
