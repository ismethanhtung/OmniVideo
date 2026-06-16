# [FAST-VIDEO-045] Render AI Image Studio storyboard video

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

- Task ID: FAST-VIDEO-045
- Phase: FAST
- Target Phase: Storyboard-to-video first render
- Domain: Video Pipeline / AI Image Studio
- Task Type: Feature
- Priority: P1
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- AI Image Studio currently generates storyboard content and accepts per-scene uploaded images.
- Owner expects the page to render a complete video, including TTS speech and subtitles.

## 3. Scope

- In scope:
  - Add server-side render route that accepts storyboard scenes and uploaded scene images.
  - Generate Piper TTS audio from scene voiceovers.
  - Build an MP4 slideshow from scene images using ffmpeg.
  - Burn simple subtitles per scene and mux TTS audio.
  - Add UI controls to render, preview, and download the video.
  - Add focused tests.
- Out of scope:
  - Advanced subtitle styling controls.
  - Remote EC2 rendering.
  - Storage persistence.

## 4. Acceptance Criteria

1. User can render video after every scene has an uploaded image.
2. Render output includes voice audio generated from scene voiceovers.
3. Render output includes subtitles matching scene voiceovers.
4. UI exposes preview/download for the rendered MP4.
5. Tests, version guard, build, and diff check pass.

## 5. Technical Plan

1. Add `POST /api/ai-image/render-video`.
2. Add ffmpeg slideshow/subtitle mux helpers in the route.
3. Add render UI and result state to AI Image Studio.
4. Add route and panel tests.

## 6. Test Plan

1. `npm run test -- --run src/features/ai-image/ai-image-studio-panel.test.ts src/app/api/ai-image/render-video/route.test.ts`
2. `npm run guard:version`
3. `npm run build`
4. `git diff --check`

## 7. Test Evidence

- `npm run test -- --run src/features/ai-image/ai-image-studio-panel.test.ts src/app/api/ai-image/render-video/route.test.ts src/features/video-processing/video-tools-lab-panel.test.ts src/lib/workspace/workspace-graph.test.ts src/app/api/thumbnails/gemini-generate/route.test.ts` pass (5 files / 72 tests).
- `npm run guard:version` pass.
- `npm run build` pass.
- `git diff --check` pass.

## 8. Changelog Note

- Add first storyboard-to-video render path for AI Image Studio.

## 9. Execution Notes

- Added `POST /api/ai-image/render-video` for per-scene uploaded images, Piper TTS voiceover, ffmpeg slideshow concat, burned SRT subtitles, and MP4 base64 response.
- Added AI Image Studio render controls, MP4 preview, metrics, error display, and download link.
- Residual risk: first pass renders vertical 9:16 MP4 and uses the existing local Piper/ffmpeg runtime; advanced render settings and remote EC2 rendering remain out of scope.
