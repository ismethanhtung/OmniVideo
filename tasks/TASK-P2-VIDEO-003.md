# [P2-VIDEO-003] Implement AI Video Narrator Pipeline

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

- Task ID: P2-VIDEO-003
- Phase: P2
- Target Phase: Video Pipeline Extensibility
- Domain: Video Pipeline / AI Video Understanding
- Task Type: Feature / Innovation
- Priority: P1
- Size: M
- Owner: Antigravity
- Reviewer: Owner
- Status: Done

## 2. Context

- Users want to create video commentary and narration for YouTube Shorts style videos in Vietnamese (e.g., "This man is walking on the street when he meets a cow...").
- Currently, the system supports translation-based video dubbing (transcribing original speech, translating it, and generating voice).
- We want to implement a new pipeline "Video Narrator" that uses Google AI Studio Video Understanding (Gemini 1.5/2.x) to directly generate a timed Vietnamese narration script from a video, edit the script segments, and synthesize the narration voice using Piper + render the output video using FFmpeg, running locally or on EC2.

## 3. Scope

- In scope:
  - Register new `videoNarrator` navigation item in `src/components/layout/navigation.ts`.
  - Add mapping in `src/components/layout/content-router.tsx`.
  - Implement a new frontend panel `VideoNarratorPanel` in `src/features/video-narrator/video-narrator-panel.tsx` by cloning and adapting the Audio Transcript panel.
  - Implement Google Gemini File API (resumable upload) and generateContent API client in `src/lib/multilingual-audio/video-narrator.ts`.
  - Implement `/api/audio/video-narrator` backend API to handle script generation from videos.
  - Write unit tests in `src/lib/multilingual-audio/video-narrator.test.ts`.
  - Update `tasks/board.md` and bump app version.
- Out of scope:
  - Modifying the remote EC2 worker code. We will reuse the remote EC2 worker endpoint directly by passing faked original translation payloads.
  - Adding subtitle styles beyond the ones supported by VIP processing.

## 4. Acceptance Criteria

1. A new navigation item "Video Narrator" is available under the "Video Pipeline" group in the left navigation sidebar.
2. Clicking it opens the Video Narrator workspace which allows selecting a video asset (upload or from Storage library) and configuring settings (AI provider, model, narration prompt).
3. Clicking "Generate Script" uploads the video to Google AI Studio, polls for status, calls Gemini with JSON mode, and populates the timed narration segments.
4. Timed segments are fully editable (text, start time, end time) in the UI.
5. Clicking "Synthesize & Render" generates Piper voice segments and overlays them on the video using FFmpeg (ducking/muting original volume as configured).
6. Supports both local rendering (via local piper + ffmpeg) and remote EC2 rendering (via remote VIP voice-render worker).
7. The output video (`.mp4`) can be downloaded or previewed directly on the page.
8. Unit tests mock the Gemini APIs and verify script generation and error handling.
9. Version guard passes and app build completes successfully.

## 5. Technical Plan

1. Register the navigation route and view mapping.
2. Create `src/lib/multilingual-audio/video-narrator.ts` with Gemini File API upload, polling, and content generation functions.
3. Write unit tests in `src/lib/multilingual-audio/video-narrator.test.ts` to mock Gemini REST endpoints and verify file uploads and narration output parsing.
4. Implement `/api/audio/video-narrator` route.ts.
5. Create frontend UI in `src/features/video-narrator/video-narrator-panel.tsx` with segment tables, settings, preview, and local/remote rendering controls.
6. Verify and run version guards.
7. Bump app version and update changelog.

## 6. Code Change Impact

- Có thay đổi code không: Yes
- Module impacted:
  - `src/components/layout/navigation.ts`
  - `src/components/layout/content-router.tsx`
  - `src/lib/multilingual-audio/video-narrator.ts`
  - `src/lib/multilingual-audio/video-narrator.test.ts`
  - `src/app/api/audio/video-narrator/route.ts`
  - `src/features/video-narrator/video-narrator-panel.tsx`
  - `package.json`
  - `changelog/changelog.md`
  - `tasks/board.md`

## 7. Test Plan

1. Run focused tests: `npx vitest run src/lib/multilingual-audio/video-narrator.test.ts`
2. Run all tests: `npm run test`
3. Run version guard: `npm run guard:version`
4. Run production build: `npm run build`

## 8. Observability

- Console log timing and size metrics for Gemini uploads.
- Console error log for remote EC2 worker failures.

## 9. Risks & Rollback

- Risks: Video files can be large and take time to upload to Gemini. (Mitigated: Show clear upload progress and poll timeouts).
- Rollback: Disable Video Narrator navigation item.

## 10. Deliverables

1. Video Narrator panel UI.
2. Gemini Video Understanding REST API client.
3. Integration with Local/EC2 rendering.
4. Unit tests.

## 11. Changelog Note

- Add AI Video Narrator feature utilizing Google Gemini Video Understanding API, local/remote Piper voice synthesis, and FFmpeg video compositing.

## 12. Verification Evidence

### 1. Changed Files
- [src/components/layout/types.ts](file:///Users/thanhtung/Downloads/tung/OmniVideo/src/components/layout/types.ts) (Added `videoNarrator`AppSectionId)
- [src/components/layout/navigation.ts](file:///Users/thanhtung/Downloads/tung/OmniVideo/src/components/layout/navigation.ts) (Registered Video Narrator link in sidebar)
- [src/components/layout/content-router.tsx](file:///Users/thanhtung/Downloads/tung/OmniVideo/src/components/layout/content-router.tsx) (Wired router to VideoNarratorPanel)
- [src/lib/access-control/access-control.ts](file:///Users/thanhtung/Downloads/tung/OmniVideo/src/lib/access-control/access-control.ts) (Added `video-narrator` to DemoFeature list)
- [src/lib/multilingual-audio/video-narrator.ts](file:///Users/thanhtung/Downloads/tung/OmniVideo/src/lib/multilingual-audio/video-narrator.ts) (Implemented Gemini REST API for Video Upload & Script Generation)
- [src/lib/multilingual-audio/video-narrator.test.ts](file:///Users/thanhtung/Downloads/tung/OmniVideo/src/lib/multilingual-audio/video-narrator.test.ts) (Added focused unit tests for Video Narrator module)
- [src/app/api/audio/video-narrator/route.ts](file:///Users/thanhtung/Downloads/tung/OmniVideo/src/app/api/audio/video-narrator/route.ts) (Implemented API endpoint with Script Generation & synthesis render workflows)
- [src/app/api/audio/video-narrator/route.test.ts](file:///Users/thanhtung/Downloads/tung/OmniVideo/src/app/api/audio/video-narrator/route.test.ts) (Added route logic and validation tests)
- [src/features/video-narrator/video-narrator-panel.tsx](file:///Users/thanhtung/Downloads/tung/OmniVideo/src/features/video-narrator/video-narrator-panel.tsx) (Created Narrator panel workspace UI with segment timeline editor and playback)
- [package.json](file:///Users/thanhtung/Downloads/tung/OmniVideo/package.json) & [package-lock.json](file:///Users/thanhtung/Downloads/tung/OmniVideo/package-lock.json) (Bumped version from `0.10.118` to `0.11.0`)
- [changelog/changelog.md](file:///Users/thanhtung/Downloads/tung/OmniVideo/changelog/changelog.md) (Added changelog entry details)
- [tasks/board.md](file:///Users/thanhtung/Downloads/tung/OmniVideo/tasks/board.md) (Moved P2-VIDEO-003 to Done)

### 2. Main Tests
- Run focused module tests:
  - `npx vitest run src/lib/multilingual-audio/video-narrator.test.ts` (Pass)
  - `npx vitest run src/app/api/audio/video-narrator/route.test.ts` (Pass)
- Run all test suites: `npm run test` (120 files / 645 tests passed)
- Version Guard: `npm run guard:version` (Pass)
- Production Build: `npm run build` (Pass)

### 3. Open Risks
- Large video files upload time: Google File API resumable upload and polling are integrated, but extremely large files might still trigger timeout thresholds depending on network speed. (Mitigation: configured 30-attempt poll intervals).
