# [FAST-INTAKE-016] Add Fast Media Extractor to Feature Sandbox

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

- Task ID: FAST-INTAKE-016
- Phase: FAST
- Target Phase: Feature Sandbox
- Domain: Source Management / Video Intake
- Task Type: Feature
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

Feature Sandbox needs a way to download videos and extract voice/audio files directly from a source link (TikTok, Douyin, Facebook, YouTube) quickly without setting up a full pipeline run.

## 3. Scope

- In scope:
  - Add a "Fast Media Extractor" section to the Feature Sandbox panel.
  - Call the existing `/api/video-intake/formats` API to analyze the URL and display video metadata (Title, Platform, Duration, Formats).
  - Let user choose the target download format (Video + Audio or Audio Only) and Quality Preference.
  - Trigger native browser downloads by redirecting to `/api/video-intake/resolve-file` via an iframe.
  - Integrate Cobalt API as a high-speed, bot-resistant alternative resolver when `COBALT_API_URL` is configured.
- Out of scope:
  - Creating new intake pipelines or storage records.

## 4. Acceptance Criteria

1. Feature Sandbox includes a "Fast Media Extractor" section.
2. User can enter a video link and click "Analyze Link" to view metadata.
3. User can choose "Video + Audio" or "Audio Only (Voice extract - Fast)" and a quality preference.
4. Clicking "Extract & Download" triggers a native browser download pointing to `/api/video-intake/resolve-file` with the correct formatSelector.
5. High-speed Cobalt resolve is attempted first if `COBALT_API_URL` is configured in environment.
6. Unit tests verify UI render, API call triggering, and download redirect.

## 5. Technical Plan

1. Map `COBALT_API_URL` and `COBALT_API_KEY` configurations in `src/lib/config/env.ts`.
2. Implement Cobalt resolver in `src/lib/video-intake/media-resolver.ts` and call it first inside `resolveMediaUrl`.
3. Add Cobalt fallback fetch helper in both `media-resolver.ts` and `formats/route.ts` to seamlessly support v10 (`/`) and v7/v8/v9 (`/api/json`) Cobalt API endpoints.
4. Add form settings, states, analyze and download handlers in `src/features/audio/piper-tts-sandbox-panel.tsx`.
5. Render UI form block and metadata detail panel with Cobalt setup instructions and links.
6. Write unit tests in `src/features/audio/piper-tts-sandbox-panel.test.ts` and `formats/route.test.ts`.

## 6. Test Plan

1. UI Render: Assert input fields, selector, and buttons exist.
2. User Interaction: Mock fetch of formats API, trigger Analyze, verify state update and render of metadata block.
3. Download Action: Verify click on Extract & Download schedules download to `/api/video-intake/resolve-file`.
4. Run `npm run test` and ESLint checks.

## 7. Observability

- Log analyze errors directly to the UI box for ease of troubleshooting.

## 8. Risks & Rollback

- Revert files.

## 9. Deliverables

1. Fast Media Extractor UI Lab in `src/features/audio/piper-tts-sandbox-panel.tsx`.
2. Cobalt resolver in `src/lib/video-intake/media-resolver.ts` and API extension in `src/app/api/video-intake/formats/route.ts`.
3. Config extensions in `src/lib/config/env.ts`.
4. Unit tests in `src/features/audio/piper-tts-sandbox-panel.test.ts` and `formats/route.test.ts`.
5. Changelog updates and package version bump.

## 10. Changelog Note

- Planned summary: Add Fast Media Extractor with Cobalt API resolver option to Feature Sandbox.

## 11. Execution Notes

- Cobalt API offers high-speed extraction and bypasses the Youtube bot checks. The developer is instructed to define `COBALT_API_URL` in `.env.local` to override local yt-dlp resolver.

## 12. Test Evidence (Mandatory if code changed)

- `npm run test -- src/features/audio/piper-tts-sandbox-panel.test.ts src/app/api/video-intake/resolve-file/route.test.ts src/app/api/video-intake/formats/route.test.ts` pass (3 files / 14 tests).
- `npm run lint && npm run guard:version` pass.
