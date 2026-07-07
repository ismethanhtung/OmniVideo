# [FAST-VIDEO-060] Fix Video Tools Lab Vertical Blur Mapping and Watermark Font

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

- Task ID: FAST-VIDEO-060
- Phase: FAST
- Target Phase: Video Tools Lab
- Domain: Video Processing / UI
- Task Type: Bugfix
- Priority: P0
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Owner reported that Video Tools Lab partial blur works for horizontal and long videos, but mouse-selected blur regions are wrong for Short/vertical videos because the preview includes black side bars and region coordinates are stored as percentages of the output preview frame.
- Owner also reported Text Overlay watermark does not use the same correct font as subtitles; the overlay appears to use a default font while subtitle preview/render font is correct.

## 3. Scope

- In scope:
  - Fix mouse-to-mask-region coordinate mapping so clicks/drags on a contained vertical video are normalized to the real video content area, not black preview bars.
  - Keep manual percentage region controls compatible with existing output-frame masks.
  - Align Text Overlay preview and render font with the subtitle font style where applicable.
  - Add regression tests for vertical video region mapping and overlay font output.
- Out of scope:
  - Redesigning Video Tools Lab layout.
  - Changing subtitle rendering behavior.
  - Adding a new visual region editor.

## 4. Acceptance Criteria

1. For vertical source video shown inside a wider preview, mouse-selected blur boxes ignore black side bars and clamp to the visible video content rectangle.
2. For horizontal source video, existing mouse-selection behavior remains unchanged.
3. Text Overlay watermark preview uses the same non-default font family as subtitles.
4. Text Overlay render path emits the same font family into the ffmpeg drawtext filter.
5. Focused tests, version guard, build, and diff check pass or failures are documented.

## 5. Technical Plan

1. Inspect Video Tools Lab preview coordinate conversion, mask-region storage, and ffmpeg render mapping.
2. Add a reusable coordinate helper for contained video preview boxes and cover it with tests.
3. Align text overlay preview/render font constants with subtitle font configuration.
4. Update tests, version, changelog, and task evidence.

## 6. Code Change Impact

- Co thay doi code khong: Yes
- Neu Yes, module impacted:
  - Video Tools Lab panel
  - Video edit pipeline
  - Focused tests for UI coordinate mapping and render filters

## 7. Test Plan

1. Focused tests:
   - `npm run test -- --run src/features/video-processing/video-tools-lab-panel.test.ts src/lib/video-processing/video-edit-pipeline.test.ts`
2. Required checks:
   - `npm run guard:version`
   - `npm run build`
   - `git diff --check`

## 8. Observability

- No new telemetry required; this is deterministic UI coordinate mapping and render filter output.

## 9. Risks & Rollback

- Risk: Existing saved manual percentage masks still refer to output-frame coordinates.
- Mitigation: Scope the fix to mouse-created regions while preserving manual controls.
- Rollback strategy: revert Video Tools Lab coordinate/font changes and associated tests/version/changelog updates.

## 10. Deliverables

1. Fixed vertical-video mouse blur region mapping.
2. Text Overlay watermark font aligned with subtitle font.
3. Regression tests and release metadata.

## 11. Changelog Note

- Tom tat dong changelog du kien: Fix Video Tools Lab vertical-video blur selection to ignore preview letterbox bars and align Text Overlay watermark font with subtitle rendering.

## 12. Task Type Checklist (Stamp [x])

### 12.1 Feature

- [ ] Co user/system flow ro rang
- [ ] Co acceptance criteria do duoc
- [ ] Co test cho happy path
- [ ] Co test cho failure path chinh

### 12.2 Bugfix

- [x] Co mo ta cach tai hien loi
- [x] Co root cause ngan gon
- [x] Co regression test
- [ ] Co xac nhan loi cu khong tai dien

### 12.3 Research

- [ ] Co cau hoi nghien cuu ro
- [ ] Co ket qua/khuyen nghi cu the

## 13. Execution Notes

- Added a contained-video preview coordinate helper and switched mouse-created blur/cover-box regions to map against the real source video content area instead of the full black preview frame.
- Reused the same contained-video coordinate system for Text Overlay preview placement so vertical-video watermarks preview on the actual video content.
- Changed the Text Overlay default font to `Bangers` and changed the ASS render fallback from default/Arial-style text to `Bangers`.
- Migrated old saved default channel watermarks from `Baloo 2` to `Bangers` when the text is one of the built-in channel options.
- Added focused regression coverage for vertical-video pointer mapping, horizontal-video mapping parity, and ASS Text Overlay default font output.

## 14. Test Evidence (Mandatory if code changed)

- `npm run test -- --run src/features/video-processing/video-tools-lab-panel.test.ts src/lib/video-processing/video-edit-pipeline.test.ts` pass (2 files / 42 tests).
- `npm run guard:version` pass.
- `npm run build` pass.
- `git diff --check` pass.
