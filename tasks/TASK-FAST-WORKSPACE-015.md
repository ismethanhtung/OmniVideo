# [FAST-WORKSPACE-015] Add Provider Thumbnails and Visual Workspace Asset Picker

## 0. Progress Stamp
- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [ ] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [ ] Done

## 1. Metadata
- Task ID: FAST-WORKSPACE-015
- Phase: FAST
- Target Phase: UX polish
- Domain: Workspace / Shared UX
- Task Type: Feature
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Review

## 2. Context
- Asset thumbnails should use provider-supplied images when available instead of probing video streams.
- Workspace `source.asset` currently uses a raw select that is hard to scan visually.

## 3. Scope
- In scope:
  - Use Google Drive provider thumbnails in Video Intake and Audio Transcript asset rows.
  - Avoid video-stream thumbnail requests for providers without reliable thumbnail images.
  - Replace Workspace `source.asset` select with visual asset picker.
- Out of scope:
  - Backend thumbnail generation.
  - Storage asset API changes.

## 4. Acceptance Criteria
1. Drive-backed assets render via Google Drive thumbnail URLs instead of video-stream probing.
2. Providers without reliable thumbnails fall back without video thumbnail requests.
3. Workspace source.asset UI offers a visual browseable picker with small thumbnails and metadata.
4. Focused tests pass.

## 5. Test Plan
1. `npm run test -- --run src/features/audio/chinese-transcription-panel.test.ts src/features/video-intake/video-intake-panel.test.ts src/features/workspace/workspace-canvas-panel.test.ts src/lib/video-intake/drive-thumbnail.test.ts`

## 6. Test Evidence
- Test files added/updated:
  - `src/features/audio/chinese-transcription-panel.test.ts`
  - `src/features/video-intake/video-intake-panel.test.ts`
  - `src/features/workspace/workspace-canvas-panel.test.ts`
- Test commands executed:
  - `npm run test -- --run src/features/audio/chinese-transcription-panel.test.ts src/features/video-intake/video-intake-panel.test.ts src/features/workspace/workspace-canvas-panel.test.ts src/lib/video-intake/drive-thumbnail.test.ts`
  - `npm run build`
  - `npm run guard:version`
- Test results summary:
  - Focused Vitest pass (4 files / 19 tests).
  - Build pass with existing ESLint circular-config warning outside scope.
