# [FAST-VIDEO-066] Render Video Composer Project to MP4

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

- Task ID: FAST-VIDEO-066
- Phase: FAST
- Target Phase: Video Composer
- Domain: Video Processing / FFmpeg Render
- Task Type: Feature
- Priority: P0
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

Owner correctly expects Save Project to return an actual final video, not project JSON. Video Composer already captures ordered clips and appearance/audio settings, so Save Project must make one explicit server render request that returns an MP4 with those settings.

## 3. Scope

- In scope:
  - New Node/FFmpeg Video Composer render endpoint accepting the ordered local clips, optional music, speed, original-audio volume, Vintage toggle, and text overlay settings.
  - One final Save Project action that downloads the returned MP4.
  - Merge via the existing concat format contract, then re-encode with the requested audio/video filters.
- Out of scope:
  - AI vocal stem separation.
  - Trim/transition editor or persistent project storage.
  - Automatic format conversion of incompatible source clips; the existing compatibility warning remains relevant.

## 4. Acceptance Criteria

1. Save Project sends selected clips in timeline order and returns a downloadable MP4 instead of JSON.
2. The render pipeline applies selected speed, original-audio volume, optional uploaded music mix, Vintage look, and text overlay position/font size.
3. Render rejects missing clips/settings with a clear JSON error and always removes temporary server files.
4. UI shows rendering state/errors and retains preview controls while not rendering.
5. Tests cover client request wiring, route input parsing/error response, and FFmpeg command construction.

## 5. Technical Plan

1. Add a composer render runtime that stages files, creates a concat list, derives safe FFmpeg filters, writes MP4, and cleans up.
2. Add a route returning binary MP4 with download headers.
3. Replace JSON project export with final render/download action in Video Composer.
4. Add tests, version/changelog/task evidence, and required checks.

## 6. Test Plan

1. Unit/runtime source tests for concat, speed, music mix, Vintage and text filters.
2. Route tests for missing clips and binary response contract.
3. Panel test for FormData render request and Blob download.
4. Required checks: focused tests, guard, build, diff check.

## 7. Observability

- UI shows a rendering state and server failures return a concise `COMPOSER_RENDER_FAILED` error. Temp render files are removed in `finally`.

## 8. Risks & Rollback

- Risk: concat demuxer requires compatible stream formats, including dimensions/codecs.
- Mitigation: pre-existing Video Tools format warning and a clear FFmpeg error if clips are incompatible.
- Rollback: revert endpoint/runtime/UI render action and metadata files.

## 9. Deliverables

1. One-click final MP4 render from Video Composer.
2. Actual music, speed, Vintage, and text rendering path.
3. Tests and release evidence.

## 10. Changelog Note

- Planned summary: Make Video Composer Save Project render and download the adjusted MP4.

## 11. Execution Notes

- “Save Project” is intentionally being redefined to the user-facing final output action, preserving the requested one-save workflow.

## 12. Test Evidence (Mandatory if code changed)

- `npm run test -- --run src/features/video-processing/video-composer-panel.test.ts src/lib/video-processing/video-composer-render.test.ts src/app/api/video-processing/composer-render/route.test.ts` pass (3 files / 7 tests).
- `npm run guard:version` pass.
- `npm run build` pass outside the filesystem sandbox because Turbopack requires an internal port.
- `git diff --check` pass.
- Residual risk: final concat currently relies on compatible source streams; use the Video Tools compatibility indicator before saving mixed-format clips.
