# [FAST-VIDEO-062] Show Merge Format Compatibility Before Render

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

- Task ID: FAST-VIDEO-062
- Phase: FAST
- Target Phase: Video Tools Lab
- Domain: Video Processing / UI
- Task Type: Feature
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

Merge Preview now verifies playback order, but an operator cannot see whether selected videos have incompatible dimensions or orientations. Stream-copy concat requires compatible video streams and a horizontal/vertical mix is a clear visual and technical risk.

## 3. Scope

- In scope:
  - Read local video dimensions and duration from browser metadata without upload.
  - Compare each queue file against the first valid file for width, height, and aspect ratio.
  - Show an at-a-glance format map with outline frames that reflect orientation/ratio and use blue for compatible, amber/red for mismatches.
  - Show a direct merge-risk warning when known dimensions are not an exact match.
- Out of scope:
  - Automatic crop, pad, scale, rotation, or re-encode.
  - Server-side probe/upload before merge.
  - Codec, FPS, audio-stream, or color-space compatibility detection.

## 4. Acceptance Criteria

1. Each selected local video shows decoded `width × height`, aspect ratio, and duration when browser metadata is available.
2. For equal dimensions, the format map uses the compatible blue frame/status.
3. For different dimensions or horizontal-vs-vertical orientation, the differing file has a high-visibility warning including both its format and the base format.
4. The UI states that a format mismatch can make stream-copy merge fail or produce an unsuitable result and must not claim a preview resolves it.
5. Metadata loading failure is shown per file without blocking reorder, preview, remove, or the existing merge action.
6. Focused tests cover metadata probing, format-map/status wiring, mismatch warning, and failure state.

## 5. Technical Plan

1. Add browser-only video metadata extraction tied to the existing local preview object URLs.
2. Derive an exact-dimension compatibility status relative to the queue’s first decodable file.
3. Render the ratio frames, format labels, and actionable merge-risk summary within Merge Preview.
4. Add focused test coverage, bump patch version, update changelog/task evidence, and run required checks.

## 6. Test Plan

1. UI regression: metadata event handling, exact dimension comparison, compatibility labels, mismatch warning, and metadata failure copy.
2. Existing merge tests: Video Splitter panel, merge API route, and merge runtime.
3. Required checks: `npm run guard:version`, `npm run build`, and `git diff --check`.

## 7. Observability

- Metadata is read locally. A decoding failure stays isolated to the file’s status and does not invoke the merge API.

## 8. Risks & Rollback

- Risk: browser metadata cannot guarantee codec/FPS/audio compatibility.
- Mitigation: call this an early dimension/orientation check and retain actual ffmpeg error reporting.
- Rollback: revert format metadata/map UI, tests, version/changelog, and this task entry.

## 9. Deliverables

1. Local metadata and format-compatibility inspection.
2. Visual aspect-ratio comparison map and clear mismatch warning.
3. Tests and governance evidence.

## 10. Changelog Note

- Planned summary: Show video dimensions and stream-copy merge format risks before Video Tools merge.

## 11. Execution Notes

- Exact width/height is treated as compatible for the current ffmpeg concat-copy implementation; equal aspect ratios at different resolutions still get a warning because concat copy can require matching stream parameters.

## 12. Test Evidence (Mandatory if code changed)

- `npm run test -- --run src/features/video-processing/video-splitter-panel.test.ts src/app/api/video-processing/merge/route.test.ts src/lib/video-processing/video-merge.test.ts` pass (3 files / 10 tests).
- `npm run guard:version` pass.
- `npm run build` pass outside the filesystem sandbox; the sandbox build cannot let Turbopack bind its required internal port.
- `git diff --check` pass.
- Residual risk: dimension compatibility is intentionally only an early local check. Codec, FPS, audio stream, and other ffmpeg concat-copy constraints can still reject a merge.
