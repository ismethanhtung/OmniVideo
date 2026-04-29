# P2-VIDEO-002 Partial Blur and Subtitle Overlay Pipeline

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [ ] Done

## 1. Metadata

- Task ID: P2-VIDEO-002
- Phase: P2
- Target Phase: P2
- Domain: Video Pipeline / Workspace
- Task Type: Feature
- Priority: P1
- Size: M
- Owner: AI Agent
- Reviewer: User
- Status: Review

## 2. Context

- Ly do: Video Tools Lab can only run Mirror Video today, while the video edit workflow needs mirror, partial blur, and Vietnamese subtitle overlay in one output video.
- Bai toan can giai quyet: Implement an executable video edit pipeline that can blur selected regions/timeline and burn translated subtitle segments, then expose it in both Video Tools Lab and Workspace.
- Tai lieu lien quan: `docs/SYSTEM-SUMMARY.md`, `docs/domains/video-pipeline.md`, `docs/architecture/node-architecture.md`, `docs/governance/testing-rules.md`.

## 3. Scope

- In scope:
  - Add reusable ffmpeg video edit pipeline for mirror + partial blur + subtitle overlay.
  - Add API `POST /api/video-processing/edit`.
  - Upgrade Video Tools Lab to configure and run combined edits.
  - Make Workspace `edit.mask-region` executable with video + translated transcript upstream support.
  - Add/update tests, task notes, board, docs, and changelog.
- Out of scope:
  - Persisting Video Tools Lab outputs automatically to Storage Library.
  - Full visual drag-to-select region editor on video preview.
  - Multi-region blur lists.
  - Production streaming/chunked large-video responses.

## 4. Input / Output

- Input: Uploaded video file or Workspace video artifact plus optional translated transcript segments with timestamps.
- Output mong doi: MP4 output preview/download containing selected mirror, blur/stamp, and Vietnamese subtitle overlay transforms.

## 5. Acceptance Criteria

1. Video Tools Lab can run one request that combines mirror, partial blur, and translated subtitle overlay when the user enables those options.
2. Partial blur requires a valid region/timeline and includes an overlay stamp/subtitle layer rather than blur-only behavior.
3. API `POST /api/video-processing/edit` returns structured JSON success/error payloads and maps validation/system failures to stable error codes.
4. Workspace can plan and execute `source.file -> audio.chinese-transcribe -> text.translate-transcript -> edit.mask-region -> storage.upload`.
5. Workspace `edit.mask-region` can consume a video upstream and translated transcript upstream, then produce a preview/download video artifact.
6. Tests cover the main ffmpeg args/validation behavior, API route behavior, and Workspace planning behavior.

## 6. Technical Plan

1. Add `src/lib/video-processing/video-edit-pipeline.ts` with validation, ASS subtitle generation, ffmpeg args builder, and run helper.
2. Add `src/app/api/video-processing/edit/route.ts` to parse `FormData`, translated segments JSON, and pipeline options.
3. Update `src/features/video-processing/video-tools-lab-panel.tsx` to expose combined edit controls and call the new API.
4. Update Workspace graph templates, connection selection, planner, executor, inspector, and step summaries for executable `edit.mask-region`.
5. Add targeted tests and update docs/changelog/task evidence.

## 7. Code Change Impact

- Co thay doi code khong: Yes
- Neu Yes, module impacted:
  - `src/lib/video-processing`
  - `src/app/api/video-processing`
  - `src/features/video-processing`
  - `src/lib/workspace`
  - `src/features/workspace`
  - `docs/architecture/node-architecture.md`
  - `changelog/changelog.md`
  - `tasks/board.md`

## 8. Test Plan

1. Unit/Integration can chay:
   - `src/lib/video-processing/video-edit-pipeline.test.ts`
   - `src/app/api/video-processing/edit/route.test.ts`
   - `src/lib/workspace/workspace-graph.test.ts`
2. Failure cases can thu:
   - Missing video file.
   - Invalid blur region/timeline.
   - Blur enabled without overlay subtitle/stamp.
   - Workspace edit node missing translated transcript when subtitle overlay is enabled.
3. Ket qua mong doi:
   - Targeted tests pass.
   - `npm run build` passes or any pre-existing unrelated warning is documented.

## 9. Observability

- Metrics: generation duration, byte length, enabled transform summary in API result.
- Logs: ffmpeg stderr surfaced through structured system error.
- Error codes: `VAL_VIDEO_EDIT_VIDEO_REQUIRED`, `VAL_VIDEO_EDIT_REGION_INVALID`, `VAL_VIDEO_EDIT_TIMELINE_INVALID`, `VAL_VIDEO_EDIT_SUBTITLES_REQUIRED`, `SYS_VIDEO_EDIT_FAILED`.

## 10. Risks & Rollback

- Risks:
  - ffmpeg filter escaping for subtitle files and time-gated blur can be brittle.
  - Vietnamese subtitle font rendering depends on server fonts.
  - Current JSON/base64 response pattern may be memory-heavy for large videos.
- Rollback strategy:
  - Revert the new edit API/UI/workspace changes; existing mirror API remains unchanged.

## 11. Deliverables

1. Combined video edit pipeline and API.
2. Updated Video Tools Lab combined workflow.
3. Executable Workspace `edit.mask-region` flow.
4. Tests and verification evidence.
5. Changelog/task/board/docs updates.

## 12. Changelog Note

- Tom tat dong changelog du kien: Add combined mirror + partial blur + Vietnamese subtitle overlay processing for Video Tools Lab and Workspace.

## 13. Task Type Checklist (Stamp [x])

### 13.1 Feature

- [x] Co user/system flow ro rang
- [x] Co acceptance criteria do duoc
- [x] Co test cho happy path
- [x] Co test cho failure path chinh

### 13.2 Bugfix

- [ ] Co mo ta cach tai hien loi
- [ ] Co root cause ngan gon
- [ ] Co regression test
- [ ] Co xac nhan loi cu khong tai dien

### 13.3 Research

- [ ] Co cau hoi nghien cuu ro
- [ ] Co ket qua/khuyen nghi cu the
- [ ] Co quyet dinh next step
- [ ] Co tai lieu tham chieu

## 14. Execution Notes

- Assumptions:
  - Region values are percentages of the final output frame.
  - Subtitle overlay uses translated segments from `TranscriptTranslationSegment`.
  - Video Tools Lab accepts pasted JSON segments for MVP while Workspace consumes upstream translation runtime state.
  - Audio Transcript now exposes copy actions so the pasted JSON source is discoverable from the Segments panel.
- Blockers:
  - None.
- Verification evidence:
  - `npm run test -- --run src/lib/video-processing/video-edit-pipeline.test.ts src/app/api/video-processing/edit/route.test.ts src/lib/workspace/workspace-graph.test.ts` pass (37 tests / 3 files).
  - `npm run build` pass. Existing unrelated warning remains in `src/features/workspace/display-preferences-panel.tsx` (`Image` unused); static generation still logs existing Mongo DNS `querySrv ECONNREFUSED` but exits 0.
  - Copy button follow-up verified with `npm run build` pass under the same known warning/log.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/video-processing/video-edit-pipeline.test.ts`
  - `src/app/api/video-processing/edit/route.test.ts`
  - `src/lib/workspace/workspace-graph.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/video-processing/video-edit-pipeline.test.ts src/app/api/video-processing/edit/route.test.ts src/lib/workspace/workspace-graph.test.ts`
  - `npm run build`
  - `npm run build` after Audio Transcript copy button follow-up
- Test results summary:
  - Targeted tests pass (37 tests / 3 files).
  - Build pass with pre-existing unrelated warning/log noted above.
