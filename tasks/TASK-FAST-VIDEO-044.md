# [FAST-VIDEO-044] Rework AI Image Studio into storyboard planner

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

- Task ID: FAST-VIDEO-044
- Phase: FAST
- Target Phase: AI-assisted storyboard-to-video workflow
- Domain: Video Pipeline / AI Image Studio
- Task Type: Feature
- Priority: P1
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Owner no longer wants AI Image Studio to generate images directly through image APIs.
- New workflow starts with generating video content/storyboard, then user manually creates and uploads images for each scene.
- Each scene needs time range, visual suggestion, voiceover, copy buttons, and image upload.
- A reference image bank is needed so users can keep style/sample images and copy style prompts quickly.

## 3. Scope

- In scope:
  - Replace direct image generation UI with storyboard planner UI.
  - Add provider/model selection for script generation.
  - Add AI storyboard generation route.
  - Add retry/improve prompt workflow.
  - Add per-scene copy buttons and per-scene image upload.
  - Add reference image bank.
  - Add focused tests, changelog, and version bump.
- Out of scope:
  - Final ffmpeg video assembly.
  - TTS generation.
  - Subtitle rendering.
  - Persisting storyboard/session to database.

## 4. Acceptance Criteria

1. User can choose content category, provider, model, duration, and scene count.
2. User can generate a storyboard with time, visual, and voiceover fields.
3. User can retry or improve an existing storyboard with an instruction prompt.
4. User can copy each scene visual, voiceover, or full scene.
5. User can upload an image for each scene and maintain a reference image bank.
6. Tests, version guard, build, and diff check pass.

## 5. Technical Plan

1. Add `POST /api/ai-image/storyboard` using configured AI Providers and env Gemini.
2. Replace AI Image Studio UI with storyboard planner controls and scene cards.
3. Add focused route and panel tests.

## 6. Test Plan

1. `npm run test -- --run src/features/ai-image/ai-image-studio-panel.test.ts src/app/api/ai-image/storyboard/route.test.ts`
2. `npm run guard:version`
3. `npm run build`
4. `git diff --check`

## 7. Test Evidence

- `npm run test -- --run src/features/ai-image/ai-image-studio-panel.test.ts src/app/api/ai-image/storyboard/route.test.ts src/app/api/ai-image/huggingface-generate/route.test.ts` pass (3 files / 13 tests).
- `npm run guard:version` pass.
- `npm run build` pass.
- `git diff --check` pass.

## 8. Changelog Note

- Rework AI Image Studio into a storyboard-first video content planner.

## 9. Execution Notes

- AI Image Studio now starts with storyboard generation instead of direct image generation.
- Added per-scene copy controls for visual, voiceover, and full scene text.
- Added manual image upload slots per scene and a reference image bank.
- Video assembly, TTS, and subtitles are represented as next-phase placeholders.
