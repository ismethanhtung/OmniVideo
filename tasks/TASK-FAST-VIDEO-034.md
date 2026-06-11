# [FAST-VIDEO-034] Match Video Narrator workbench to tool page pattern

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

- Task ID: FAST-VIDEO-034
- Phase: FAST
- Target Phase: Video tools enhancement
- Domain: Video Processing / Video Narrator
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- User rejected the Video Narrator UI polish because it still looks unlike Video Tools Lab and Audio Transcript beyond just Source Video.
- Specific mismatch: Source Video, script generation, Piper/render controls, preview cards, and segment editor used inconsistent headings, backgrounds, button classes, and spacing.

## 3. Scope

- In scope:
  - Replace Video Narrator's native asset select with the same Browse/Close asset picker pattern.
  - Add search, row selection, metadata, lifecycle badges, and inline preview controls.
  - Align sidebar cards, headings, inputs, action buttons, preview cards, and timeline rows with the Video Tools Lab and Audio Transcript pattern.
  - Update changelog, version, board, and task evidence.
- Out of scope:
  - Changing render/subtitle business logic.
  - Redesigning other Video Narrator sections.

## 4. Input / Output

- Input: Video Narrator source video selection through local file or Storage asset.
- Output: Video Narrator workbench visually and behaviorally matches the existing tool page pattern.

## 5. Acceptance Criteria

1. Video Narrator Source Video uses a styled file input label matching the referenced pages.
2. Storage asset selection uses a Browse/Close button and searchable row picker, not a native select.
3. Asset rows show title, folder/tags/storage/size metadata, lifecycle badges, and Preview/Hide.
4. Script generation, Piper settings, render settings, preview cards, and narration timeline use the same panel tone, spacing, typography, and button styles as the reference pages.
5. Selecting a local file clears selected asset and closes the asset picker.
6. Selecting an asset clears local file, closes picker, clears preview, and preserves existing render behavior.

## 6. Technical Plan

1. Add asset picker UI state and visible asset filtering to `VideoNarratorPanel`.
2. Extend the stored asset type and helpers to support metadata display and search.
3. Replace Source Video JSX with the established row picker pattern.
4. Normalize remaining sidebar/workbench panel classes to match referenced pages.
5. Bump patch version and update changelog/task evidence.
6. Run targeted tests, build, and version guard.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Modules impacted:
  - `src/features/video-narrator/video-narrator-panel.tsx`
  - `package.json`
  - `package-lock.json`
  - `tasks/board.md`
  - `changelog/changelog.md`

## 8. Test Plan

1. Run `npm run test -- --run src/lib/video-processing/video-edit-pipeline.test.ts src/app/api/audio/video-narrator/route.test.ts`.
2. Run `npm run guard:version`.
3. Run `npm run build`.

## 9. Observability

- UI changes are covered by build/type checks.

## 10. Risks & Rollback

- Risks: Asset search may omit a field if the local asset type is incomplete.
- Rollback strategy: Restore native select source picker.

## 11. Deliverables

1. Matched Source Video picker UI.
2. Updated changelog/version/task evidence.

## 12. Changelog Note

- Matched Video Narrator workbench styling to Video Tools Lab and Audio Transcript patterns.

## 13. Task Type Checklist (Stamp [x])

### 13.2 Bugfix

- [x] Có mô tả cách tái hiện lỗi
- [x] Có root cause ngắn gọn
- [x] Có regression test
- [x] Có xác nhận lỗi cũ không tái diễn

## 14. Execution Notes

- Assumptions: Existing visual pattern in Audio Transcript and Video Tools Lab is the target across the whole workbench, not only Source Video.
- Blockers: None.
- Verification evidence: Targeted tests, version guard, and production build passed.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - No dedicated component test was added for this visual-only UI class alignment; existing Video Narrator API/subtitle regression tests were re-run.
- Test commands executed:
  - `npm run test -- --run src/lib/video-processing/video-edit-pipeline.test.ts src/app/api/audio/video-narrator/route.test.ts` (Pass: 2 files / 29 tests)
  - `npm run guard:version` (Pass)
  - `npm run build` (Pass)
- Test results summary:
  - Existing Video Narrator render API and subtitle mode tests remain green.
  - Production build/type checks pass after the broader workbench UI alignment.
- Version guard command/result (if runtime changed): `npm run guard:version` pass.
