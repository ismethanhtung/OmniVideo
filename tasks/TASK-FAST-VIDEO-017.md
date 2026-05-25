# [FAST-VIDEO-017] Add Video Tools Cover Box and Text Overlay

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Version guard passed (if runtime changed)
- [x] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [ ] Done

## 1. Metadata

- Task ID: FAST-VIDEO-017
- Phase: FAST
- Target Phase: Video local tools
- Domain: Video Pipeline / Video Tools Lab
- Task Type: Feature
- Priority: P1
- Size: M
- Owner: Codex
- Reviewer: Owner
- Status: Review

## 2. Context

Owner wants to reduce expensive blur usage in the speed/mix/mirror/blur/sub workflow. Two current blur uses should get lighter alternatives:

- old foreign subtitle cover should use a solid box matching the Vietnamese subtitle background instead of blur;
- old logo cover can be replaced by a simple channel-name text overlay in Video Tools Lab, modeled after Thumbnail Studio text controls.

Related docs: `docs/SYSTEM-SUMMARY.md`, `docs/domains/video-pipeline.md`, `docs/governance/ai-agent-rules.md`, `docs/governance/testing-rules.md`.

## 3. Scope

- In scope:
  - Add a no-blur subtitle cover box transform to the video edit pipeline.
  - Expose the cover box in Video Tools Lab and reuse the subtitle background color/opacity by default.
  - Add simple Text Overlay controls in Video Tools Lab for channel watermark text.
  - Persist/load the new setup fields through existing Video Tools Lab setup save flow.
  - Add API parsing and runtime tests for cover boxes/text overlays.
  - Update changelog, task evidence, and version guard.
- Out of scope:
  - Full Thumbnail Studio multi-layer editor parity.
  - Workspace inspector UI parity for editing new fields.
  - Automatic logo detection or OCR-driven subtitle box sizing.

## 4. Acceptance Criteria

1. Video Tools Lab can run subtitle cover boxes without enabling blur.
2. Cover boxes render as ffmpeg `drawbox` regions using configured color/opacity and timeline.
3. Existing partial blur behavior still works when explicitly enabled.
4. Video Tools Lab offers a simple Text Overlay section with channel-name text, font, size, color/stroke, position, and preview.
5. The edit API accepts cover box and text overlay fields and forwards normalized data to the runtime.
6. Runtime metadata reports cover box/text overlay transforms.
7. Existing setup save/load includes the new cover/text fields.
8. Focused regression tests and `npm run guard:version` pass or any unrelated failure is documented.

## 5. Technical Plan

1. Extend `video-edit-pipeline` types, validation, ffmpeg filter builder, and ASS generation for cover boxes/text overlays.
2. Parse new form fields in `/api/video-processing/edit`.
3. Update Video Tools Lab state, controls, preview, run request, and setup persistence.
4. Add/update focused tests for runtime, API, and panel source expectations.
5. Bump patch version, update changelog/board/task evidence, and run verification.

## 6. Test Plan

1. `npm run test -- --run src/lib/video-processing/video-edit-pipeline.test.ts src/app/api/video-processing/edit/route.test.ts src/features/video-processing/video-tools-lab-panel.test.ts`
2. `npm run guard:version`

## 7. Changelog Note

- Add no-blur subtitle cover boxes and simple channel text overlay to Video Tools Lab.

## 8. Execution Notes

- Assumptions:
  - Cover boxes should use the same drawn region/timeline model as current blur regions.
  - Cover box color should default to subtitle background color/opacity so old subtitles and new Vietnamese subtitles visually match.
  - Text Overlay can be a single simple channel-name layer for this task.
- Blockers:
  - None.
- Implementation summary:
  - Added ffmpeg `drawbox` cover-box filters before mirror/subtitle overlay.
  - Added ASS-based text overlay generation after subtitle overlay.
  - Added API parsing for cover/text fields.
  - Updated Video Tools Lab controls, preview, and setup persistence.
  - Updated `docs/domains/video-pipeline.md` and `changelog/changelog.md`.

## 9. Test Evidence

- Test files added/updated:
  - `src/lib/video-processing/video-edit-pipeline.test.ts`
  - `src/app/api/video-processing/edit/route.test.ts`
  - `src/features/video-processing/video-tools-lab-panel.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/video-processing/video-edit-pipeline.test.ts src/app/api/video-processing/edit/route.test.ts src/features/video-processing/video-tools-lab-panel.test.ts`
  - `npm run build`
  - `npm run guard:version`
- Test results summary:
  - Focused tests pass (3 files / 25 tests).
  - Build passes; existing ESLint circular-config warning remains unchanged from repo baseline.
  - Version guard passes after patch bump `0.10.44 -> 0.10.45`.
  - Browser visual verification was attempted on a temporary dev server at port 3001, but the in-app browser policy blocked navigation to that localhost target; the temporary server was stopped.
  - Residual risk: Workspace inspector UI does not yet expose first-class controls for the new cover/text fields; this task focused on Video Tools Lab and the shared edit API/runtime.
