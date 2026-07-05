# [FAST-VIDEO-059] Add Video Tools Text Overlay Defaults and YouTube Short Crop

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

- Task ID: FAST-VIDEO-059
- Phase: FAST
- Target Phase: Video Tools / Video Tools Lab
- Domain: Video Pipeline / UX
- Task Type: Feature
- Priority: P0
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Owner wants Text Overlay enabled by default in Video Tools Lab.
- Owner wants the default channel watermark text changed from `An Khong Ngoi Roi` to `Lon Xon Review`, with a selectable channel list including `Lon Xon Review` and `Com Ao Review`.
- Owner wants the `Video Tools` page, not `Video Tools Lab`, to cut long source videos into YouTube Short-ready vertical clips, with configurable time cuts such as the first 1 or 2 minutes.

## 3. Scope

- In scope:
  - Make Text Overlay default enabled in the real Video Tools Lab default path.
  - Change the default overlay text to `Lon Xon Review` and size to `45`.
  - Replace the free text channel field with a select containing `Lon Xon Review` and `Com Ao Review`.
  - Add a `Video Tools` YouTube Short mode that crops output to 9:16 at 1080x1920 and trims by start/duration seconds.
  - Add UI controls, API parsing, ffmpeg args/filter support, and focused tests.
- Out of scope:
  - Manual crop repositioning beyond center crop.
  - Direct YouTube upload/publish workflow.
  - Saving YouTube Short trim settings into Workspace VIP setup.

## 4. Acceptance Criteria

1. Video Tools Lab starts with Text Overlay enabled when no saved setup overrides it.
2. Default Text Overlay text is `Lon Xon Review`, default font size is `45`, and the channel control is a select with `Lon Xon Review` and `Com Ao Review`.
3. Video Tools exposes a YouTube Short option with start seconds and duration seconds, including quick options for 1, 2, and 3 minutes.
4. When YouTube Short is enabled, the edit API forwards short clip settings to the video edit pipeline.
5. The video edit pipeline can run YouTube Short as a standalone transform, trimming by start/duration and producing a 9:16 1080x1920 crop.
6. Invalid short clip duration is rejected by validation.

## 5. Technical Plan

1. Update Video Tools Lab state/defaults and replace Text Overlay text input with a channel select.
2. Add YouTube Short state and controls to Video Tools and include short clip fields in the edit form request.
3. Extend `/api/video-processing/edit` parsing and `VideoEditInput` with short clip settings.
4. Add ffmpeg crop/scale and trim args to the edit pipeline.
5. Update focused tests, changelog, version, board, and verification evidence.

## 6. Code Change Impact

- Co thay doi code khong: Yes
- Neu Yes, module impacted:
  - `src/features/video-processing/video-tools-lab-panel.tsx`
  - `src/features/video-processing/video-tools-lab-panel.test.ts`
  - `src/features/video-processing/video-splitter-panel.tsx`
  - `src/features/video-processing/video-splitter-panel.test.ts`
  - `src/app/api/video-processing/edit/route.ts`
  - `src/app/api/video-processing/edit/route.test.ts`
  - `src/lib/video-processing/video-edit-pipeline.ts`
  - `src/lib/video-processing/video-edit-pipeline.test.ts`

## 7. Test Plan

1. Focused command:
   - `npm run test -- --run src/features/video-processing/video-tools-lab-panel.test.ts src/features/video-processing/video-splitter-panel.test.ts src/app/api/video-processing/edit/route.test.ts src/lib/video-processing/video-edit-pipeline.test.ts`
2. Required checks:
   - `npm run guard:version`
   - `npm run build`
   - `git diff --check`

## 8. Observability

- Video Tools progress center shows a YouTube Short task while short crop renders.
- API response transform metadata includes whether YouTube Short processing was applied and the chosen duration.

## 9. Risks & Rollback

- Risk: Center crop can cut off important side content in landscape videos.
- Risk: Center crop can hide important side content until a manual crop-position control exists.
- Rollback strategy: revert this task's UI/API/pipeline/test/changelog/version changes.

## 10. Deliverables

1. Text Overlay default and channel select update.
2. YouTube Short crop/trim control in Video Tools.
3. API/pipeline support for short crop/trim.
4. Focused tests and release metadata.

## 11. Changelog Note

- Tom tat dong changelog du kien: Add Video Tools Lab Text Overlay defaults and Video Tools YouTube Short crop/trim rendering.

## 12. Task Type Checklist (Stamp [x])

### 12.1 Feature

- [x] Co user/system flow ro rang
- [x] Co acceptance criteria do duoc
- [x] Co test cho happy path
- [x] Co test cho failure path chinh

### 12.2 Bugfix

- [ ] Co mo ta cach tai hien loi
- [ ] Co root cause ngan gon
- [ ] Co regression test
- [ ] Co xac nhan loi cu khong tai dien

### 12.3 Research

- [ ] Co cau hoi nghien cuu ro
- [ ] Co ket qua/khuyen nghi cu the

## 13. Execution Notes

- Updated Video Tools Lab defaults so Text Overlay starts enabled, resets to `Lon Xon Review`, uses font size `45`, and offers a channel select for `Lon Xon Review` / `Com Ao Review`.
- Added YouTube Short controls to Video Tools with start seconds, duration seconds, and quick duration buttons for 1, 2, and 3 minutes.
- Added visible Video Tools mode buttons so `YouTube Short 9:16` appears immediately on the page instead of only inside the split-mode dropdown.
- Extended the edit API and video edit pipeline with standalone short crop/trim support. The ffmpeg path trims with `-ss`/`-t`, center-crops to 9:16, scales to 1080x1920, and keeps optional audio mapping.
- Removed YouTube Short controls from Video Tools Lab after owner clarified the feature belongs in Video Tools.
- Added transform metadata for YouTube Short output and bumped app version to `0.11.56`.

## 14. Test Evidence (Mandatory if code changed)

- `npm run test -- --run src/features/video-processing/video-tools-lab-panel.test.ts src/features/video-processing/video-splitter-panel.test.ts src/app/api/video-processing/edit/route.test.ts src/lib/video-processing/video-edit-pipeline.test.ts` pass (4 files / 51 tests).
- `npm run guard:version` pass.
- `npm run build` pass.
- Host-side `curl -sS http://localhost:3000/video-splitter | rg -o "YouTube Short 9:16|Render Short \\+ Download MP4|Block|Parts|Head clip"` shows `YouTube Short 9:16`, `Block`, `Parts`, and `Head clip`.
- `git diff --check` pass.
- `npm run guard:version` pass.
- `npm run build` pass.
- `git diff --check` pass.
